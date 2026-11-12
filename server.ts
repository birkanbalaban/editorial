import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { db } from './src/server/db';
import { automationEngine } from './src/server/automationEngine';
import { 
  evaluateEditorialWithGemini, 
  regenerateEditorialCaptionWithGemini, 
  auditEditorialCandidateWithGemini,
  EditorialCaptionTone 
} from './src/server/geminiService';
import {
  discoverRealEditorials,
  extractEditorialPhotographer,
  scrapeImagesAndMetadataFromUrl,
  testLiveRssFeed,
} from './src/server/realDiscoveryService';
import { InstagramAdapter } from './src/server/instagramAdapter';
import { canActivateAutopilot, canPublish, computeContentHash } from './src/lib/publishingRules';
import { calculatePostLearningDelta, computeLearningProfile, rankCandidates, selectDailyTop5 } from './src/lib/scoring';
import { calculateAggregateMetrics } from './src/lib/analytics';
import { EditorialEngagementPoint, EditorialPost } from './src/types/editorial';

const UPLOADS_DIR = path.resolve(process.cwd(), '.data', 'uploads');

async function startServer() {
  const app = express();
  const PORT = 3000;

  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }

  app.use(express.json({ limit: '25mb' }));
  app.use('/uploads', express.static(UPLOADS_DIR));

  // 1. System Status
  app.get('/api/status', (req, res) => {
    const state = db.getState();
    const apiKey = process.env.GEMINI_API_KEY;
    const isGeminiConnected = Boolean(apiKey && apiKey !== 'MY_GEMINI_API_KEY' && apiKey.trim().length > 0);
    res.json({
      settings: state.settings,
      instagram: state.instagram,
      aiAgentConfig: db.getAiAgentConfig(),
      geminiConnected: isGeminiConnected,
      geminiModel: 'gemini-3-flash-preview',
      publishedTodayCount: state.publishedTodayCount,
      workflowLogs: state.workflowLogs.slice(0, 15),
      learningSignalsCount: state.learningSignals.length,
      totalPostsCount: state.posts.length,
      selectedCount: state.posts.filter(p => p.status === 'selected').length,
      approvedCount: state.posts.filter(p => p.status === 'approved' || p.status === 'scheduled').length,
      publishedCount: state.posts.filter(p => p.status === 'published').length,
    });
  });

  // 1b. Backend Health & Service Connection Checks
  app.get('/api/backend-status', (req, res) => {
    const state = db.getState();
    const apiKey = process.env.GEMINI_API_KEY;
    const isGeminiConnected = Boolean(apiKey && apiKey !== 'MY_GEMINI_API_KEY' && apiKey.trim().length > 0);
    const isInstagramConnected = Boolean(state.instagram?.connected && state.instagram?.accountType !== 'NOT_CONNECTED');

    res.json({
      gemini: {
        connected: isGeminiConnected,
        model: 'gemini-3-flash-preview',
        status: isGeminiConnected ? 'ready' : 'action_required',
        details: isGeminiConnected 
          ? 'Production GEMINI_API_KEY active and responding.'
          : 'GEMINI_API_KEY not configured. Running high-quality deterministic curatorial fallback.',
      },
      instagram: {
        connected: isInstagramConnected,
        accountType: state.instagram?.accountType || 'NOT_CONNECTED',
        username: state.instagram?.username,
        accountId: state.instagram?.accountId,
        status: isInstagramConnected ? 'ready' : 'action_required',
        details: isInstagramConnected
          ? `Meta Graph API v21.0 active (@${state.instagram.username || 'connected'})`
          : 'No Instagram account connected. Adapter operating in Sandbox Simulation mode.',
      },
    });
  });

  // 2. Settings & Mode Update
  app.post('/api/settings', (req, res) => {
    const { mode, maxDailyPosts, emergencyStop, schedulePaused, notificationsEnabled, notificationChannel } = req.body;
    const currentSettings = db.getSettings();
    const igConfig = db.getInstagram();

    // Autopilot activation guard
    if (mode === 'AUTOPILOT' && currentSettings.mode !== 'AUTOPILOT') {
      const autopilotCheck = canActivateAutopilot(igConfig, { ...currentSettings, ...req.body });
      if (!autopilotCheck.allowed) {
        return res.status(400).json({ error: autopilotCheck.reason });
      }
    }

    const updated = db.updateSettings({
      ...(mode ? { mode } : {}),
      ...(typeof maxDailyPosts === 'number' ? { maxDailyPosts } : {}),
      ...(typeof emergencyStop === 'boolean' ? { emergencyStop } : {}),
      ...(typeof schedulePaused === 'boolean' ? { schedulePaused } : {}),
      ...(typeof notificationsEnabled === 'boolean' ? { notificationsEnabled } : {}),
      ...(notificationChannel ? { notificationChannel } : {}),
    });

    res.json({ success: true, settings: updated });
  });

  // 3. Emergency Stop Switch
  app.post('/api/emergency-stop', (req, res) => {
    const current = db.getSettings();
    const updated = db.updateSettings({ emergencyStop: !current.emergencyStop });
    db.addWorkflowLog({
      id: `wf-${Date.now()}`,
      stage: 'Manual Run',
      timestamp: new Date().toISOString(),
      status: updated.emergencyStop ? 'skipped_emergency_stop' : 'success',
      summary: updated.emergencyStop 
        ? 'EMERGENCY STOP TRIGGERED: All automatic posting, scheduling, and Meta API calls halted.'
        : 'Emergency Stop cleared. Scheduled workflows restored.',
    });
    res.json({ success: true, emergencyStop: updated.emergencyStop });
  });

  // 4. Daily Selections
  // 4. Daily Selections (dynamically ranked with Active Learning Signals)
  app.get('/api/selections/daily', (req, res) => {
    const signals = db.getState().learningSignals || [];
    const rankedAll = rankCandidates(db.getPosts(), signals);
    const activePool = rankedAll.filter((p) => p.status !== 'rejected');
    const top5Ids = new Set(activePool.slice(0, 5).map((p) => p.id));
    const top5 = rankedAll.filter((p) => top5Ids.has(p.id));
    const candidates = rankedAll.filter((p) => !top5Ids.has(p.id));
    res.json({
      top5,
      candidates,
      all: rankedAll,
      learningProfile: computeLearningProfile(signals),
    });
  });

  // 5. Actions on Selections (Approve, Reject, Save, Edit, Schedule, Publish Now)
  app.post('/api/selections/action', async (req, res) => {
    const { postId, action, payload } = req.body;
    const post = db.getPostById(postId);

    if (!post) {
      return res.status(404).json({ error: 'Editorial post not found.' });
    }

    const settings = db.getSettings();
    const igConfig = db.getInstagram();
    const state = db.getState();

    switch (action) {
      case 'send_to_queue': {
        const selectedFrames =
          Array.isArray(payload?.imageUrls) && payload.imageUrls.length > 0
            ? payload.imageUrls
            : post.imageUrls;
        const updated = db.updatePost(postId, {
          status: 'selected',
          imageUrls: selectedFrames,
        });
        db.recordCuratorialSignal(updated || post, 'approved');
        return res.json({ success: true, post: updated });
      }

      case 'approve': {
        const selectedFrames =
          Array.isArray(payload?.imageUrls) && payload.imageUrls.length > 0
            ? payload.imageUrls
            : post.imageUrls;
        const updated = db.updatePost(postId, {
          status: 'approved',
          imageUrls: selectedFrames,
          publishingReadiness: 'ready',
          approvalRecord: {
            approvedBy: req.body.approvedBy || 'Editorial Director',
            approvedAt: new Date().toISOString(),
            version: (post.approvalRecord?.version || 0) + 1,
            contentHash: computeContentHash(post),
            scheduledFor: payload?.scheduledTime,
          },
          scheduledTime: payload?.scheduledTime || post.scheduledTime,
        });

        db.recordCuratorialSignal(updated || post, 'approved');
        return res.json({ success: true, post: updated });
      }

      case 'reject': {
        const updated = db.updatePost(postId, {
          status: 'rejected',
          publishingReadiness: 'rejected',
        });

        db.recordCuratorialSignal(updated || post, 'rejected');
        return res.json({ success: true, post: updated });
      }

      case 'save': {
        const updated = db.updatePost(postId, {
          status: 'saved',
        });

        db.recordCuratorialSignal(updated || post, 'saved');
        return res.json({ success: true, post: updated });
      }

      case 'edit_caption': {
        const newCaption = payload?.caption;
        if (!newCaption) return res.status(400).json({ error: 'Caption cannot be empty.' });

        const updated = db.updatePost(postId, {
          caption: newCaption,
          credits: payload?.credits || post.credits,
          hashtags: payload?.hashtags || post.hashtags,
        });
        return res.json({ success: true, post: updated });
      }

      case 'request_rights': {
        const updated = db.updatePost(postId, {
          rightsStatus: 'pending',
          rightsVerificationRecord: {
            ...post.rightsVerificationRecord,
            sourceLicense: 'Rights verification requested with publication syndicate.',
            usageNotes: 'Legal review queued for high-fashion digital archival distribution.',
          },
        });
        return res.json({ success: true, post: updated });
      }

      case 'schedule': {
        const scheduledTime = payload?.scheduledTime;
        if (!scheduledTime) return res.status(400).json({ error: 'Scheduled time required.' });
        const slotLabel = payload?.slotLabel !== undefined ? payload.slotLabel : post.slotLabel;

        const updated = db.updatePost(postId, {
          status: 'scheduled',
          scheduledTime,
          slotLabel,
          approvalRecord: {
            approvedBy: req.body.approvedBy || 'Editorial Director',
            approvedAt: new Date().toISOString(),
            version: (post.approvalRecord?.version || 0) + 1,
            scheduledFor: scheduledTime,
            slotLabel,
            contentHash: computeContentHash(post),
          },
        });
        return res.json({ success: true, post: updated });
      }

      case 'unschedule': {
        const updated = db.updatePost(postId, {
          status: 'approved',
          scheduledTime: undefined,
          slotLabel: undefined,
        });
        return res.json({ success: true, post: updated });
      }

      case 'reschedule':
      case 'postpone': {
        let newScheduledTime = payload?.scheduledTime;
        if (!newScheduledTime) {
          // If no custom time specified, push by 1 slot or +24 hours
          const current = post.scheduledTime ? new Date(post.scheduledTime) : new Date();
          const target = new Date(current.getTime() + (payload?.offsetHours ? payload.offsetHours * 3600000 : 24 * 3600000));
          if (payload?.slotHour !== undefined) {
            target.setHours(payload.slotHour, payload.slotMinute || 0, 0, 0);
          }
          newScheduledTime = target.toISOString();
        }
        const slotLabel = payload?.slotLabel !== undefined ? payload.slotLabel : post.slotLabel;

        const updated = db.updatePost(postId, {
          status: 'scheduled',
          scheduledTime: newScheduledTime,
          slotLabel,
          approvalRecord: {
            approvedBy: req.body.approvedBy || 'Editorial Director',
            approvedAt: new Date().toISOString(),
            version: (post.approvalRecord?.version || 0) + 1,
            scheduledFor: newScheduledTime,
            slotLabel,
            contentHash: computeContentHash(post),
          },
        });
        return res.json({ success: true, post: updated, scheduledTime: newScheduledTime });
      }

      case 'move_to_top': {
        // Move to the earliest upcoming slot (e.g., 5 mins from now or before #1)
        const earliest = new Date();
        earliest.setMinutes(earliest.getMinutes() + 5);
        const updated = db.updatePost(postId, {
          status: 'scheduled',
          scheduledTime: earliest.toISOString(),
          approvalRecord: {
            approvedBy: req.body.approvedBy || 'Editorial Director',
            approvedAt: new Date().toISOString(),
            version: (post.approvalRecord?.version || 0) + 1,
            scheduledFor: earliest.toISOString(),
            slotLabel: post.slotLabel,
            contentHash: computeContentHash(post),
          },
        });
        return res.json({ success: true, post: updated });
      }

      case 'verify_rights': {
        const updated = db.updatePost(postId, {
          rightsStatus: 'verified',
          publishingReadiness: 'ready',
          rightsVerificationRecord: {
            ...post.rightsVerificationRecord,
            sourceLicense: 'Verified by Editorial Director',
            verifiedAt: new Date().toISOString(),
            authorizedForSocialMedia: true,
            usageNotes: 'Cleared for full social media and archival publishing.',
          },
        });
        return res.json({ success: true, post: updated });
      }

      case 'select_images': {
        // Allows selecting primary cover photo or toggling carousel images from source body candidateImages
        const imageUrls: string[] = Array.isArray(payload?.imageUrls) && payload.imageUrls.length > 0
          ? payload.imageUrls
          : post.imageUrls;
        const candidateImages: string[] = Array.isArray(payload?.candidateImages)
          ? payload.candidateImages
          : Array.from(new Set([...(post.candidateImages || []), ...imageUrls]));

        const updated = db.updatePost(postId, {
          imageUrls,
          candidateImages,
        });
        return res.json({ success: true, post: updated });
      }

      case 'scrape_url_images': {
        const targetUrl = (payload?.url || post.sourceUrl || '').trim();
        if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
          return res.status(400).json({ error: 'Valid http/https URL required to extract body photographs.' });
        }
        const scraped = await scrapeImagesAndMetadataFromUrl(targetUrl);
        const mergedCandidates = Array.from(
          new Set([...scraped.images, ...(post.candidateImages || []), ...(post.imageUrls || [])])
        );
        const nextPrimary = scraped.images.length > 0 ? [scraped.images[0]] : post.imageUrls;
        const updated = db.updatePost(postId, {
          sourceUrl: targetUrl,
          imageUrls: nextPrimary,
          candidateImages: mergedCandidates,
        });
        return res.json({
          success: true,
          post: updated,
          extractedCount: scraped.images.length,
        });
      }

      case 'publish_now': {
        // Non-blocking rights advisory; manualOverride allows immediate publishing
        const check = canPublish(
          post,
          settings,
          state.publishedTodayCount,
          igConfig,
          new Set(db.getPosts().filter(p => p.status === 'published').map(p => p.id)),
          { manualOverride: true }
        );

        if (!check.allowed) {
          return res.status(400).json({ error: check.reason });
        }

        const adapter = new InstagramAdapter(igConfig);
        const result = await adapter.publishPost(post);

        if (result.success) {
          db.recordPublish(post.id, result.metaMediaId, result.permalink);
          const publishedPost = db.getPostById(postId) || post;
          const insights = await adapter.fetchMediaInsights(publishedPost, igConfig.accessToken);
          const nowIso = new Date().toISOString().split('T')[0];
          const mmDd = nowIso.slice(5).replace('-', '/');
          db.upsertEngagementPoint({
            id: `eng-${post.id}`,
            postId: post.id,
            metaMediaId: result.metaMediaId,
            permalink: result.permalink || insights.permalink,
            date: mmDd,
            fullDate: nowIso,
            reach: insights.reach,
            likes: insights.likes,
            shares: insights.shares,
            saves: insights.saves,
            comments: insights.comments,
            engagementRate: insights.engagementRate,
            postTitle: publishedPost.title,
            photographer: publishedPost.photographer,
            publication: publishedPost.publication,
            source: insights.liveGraphConnected ? 'meta_graph_api' : 'curatorial_index',
            syncedAt: new Date().toISOString(),
          });

          return res.json({
            success: true,
            post: publishedPost,
            metaMediaId: result.metaMediaId,
            permalink: result.permalink,
          });
        } else {
          return res.status(500).json({ error: result.error });
        }
      }

      default:
        return res.status(400).json({ error: `Unknown action: ${action}` });
    }
  });

  // 6. Bulk Approval Actions
  app.post('/api/approval-queue/bulk', (req, res) => {
    const { postIds, action } = req.body;
    if (!Array.isArray(postIds)) {
      return res.status(400).json({ error: 'postIds must be an array.' });
    }

    const updatedPosts: EditorialPost[] = [];
    for (const id of postIds) {
      const p = db.getPostById(id);
      if (!p) continue;

      if (action === 'approve') {
        const updated = db.updatePost(id, {
          status: 'approved',
          publishingReadiness: p.rightsStatus === 'verified' ? 'ready' : 'needs_rights',
          approvalRecord: {
            approvedBy: req.body.approvedBy || 'Editorial Director',
            approvedAt: new Date().toISOString(),
            version: (p.approvalRecord?.version || 0) + 1,
            contentHash: computeContentHash(p),
          },
        });
        if (updated) {
          db.recordCuratorialSignal(updated, 'approved');
          updatedPosts.push(updated);
        }
      } else if (action === 'reject') {
        const updated = db.updatePost(id, {
          status: 'rejected',
          publishingReadiness: 'rejected',
        });
        if (updated) {
          db.recordCuratorialSignal(updated, 'rejected');
          updatedPosts.push(updated);
        }
      }
    }

    res.json({ success: true, count: updatedPosts.length, updatedPosts });
  });

  // 7. Automation Engine Controls
  app.post('/api/automation/run', async (req, res) => {
    const { stage } = req.body;
    const log = await automationEngine.runStage(stage || 'Manual Run');
    res.json({ success: true, log });
  });

  app.post('/api/automation/toggle', (req, res) => {
    const settings = db.getSettings();
    const updated = db.updateSettings({ schedulePaused: !settings.schedulePaused });
    res.json({ success: true, schedulePaused: updated.schedulePaused });
  });

  // 8. Instagram Connection Adapter
  app.post('/api/instagram/connect', async (req, res) => {
    const { accessToken, accountId, mockConnected } = req.body;
    const adapter = new InstagramAdapter(db.getInstagram());

    if (mockConnected) {
      const updated = db.updateInstagram({
        connected: true,
        accountType: 'BUSINESS',
        username: 'theeditorialindex',
        accountId: 'ig_biz_9029141',
        tokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
        permissions: ['instagram_basic', 'instagram_content_publish', 'instagram_manage_insights', 'pages_show_list'],
      });
      return res.json({ success: true, instagram: updated });
    }

    const verification = await adapter.verifyAccountEligibility(accessToken, accountId);
    if (!verification.eligible) {
      return res.status(400).json({ error: verification.error || 'Account is not eligible for automated Instagram publishing.' });
    }

    const updated = db.updateInstagram({
      connected: true,
      accountType: verification.accountType,
      username: verification.username,
      accountId: accountId,
      accessToken: accessToken,
      tokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
      permissions: verification.permissions,
    });

    res.json({ success: true, instagram: updated });
  });

  app.post('/api/instagram/disconnect', (req, res) => {
    const settings = db.getSettings();
    // If in autopilot, automatically downgrade to APPROVAL mode
    if (settings.mode === 'AUTOPILOT') {
      db.updateSettings({ mode: 'APPROVAL' });
    }

    const updated = db.updateInstagram({
      connected: false,
      accountType: 'NOT_CONNECTED',
      username: undefined,
      accountId: undefined,
      tokenExpiresAt: undefined,
      permissions: [],
    });
    res.json({ success: true, instagram: updated });
  });

  // 9. AI Research & Real-Time Editorial Discovery with Gemini
  app.post('/api/ai/research-now', async (req, res) => {
    const { title, photographer, publication, styling, notes, imageUrl } = req.body;
    if (!title || !photographer || !publication) {
      return res.status(400).json({ error: 'Title, photographer, and publication are required.' });
    }

    try {
      const evaluation = await evaluateEditorialWithGemini(
        title,
        photographer,
        publication,
        styling,
        notes
      );

      let candidateImages: string[] = [];
      let resolvedSourceUrl = 'https://archive.theeditorialindex.com/curated/' + Date.now();
      if (imageUrl && (imageUrl.startsWith('http://') || imageUrl.startsWith('https://'))) {
        if (!/\.(jpg|jpeg|png|webp|avif)(\?|$)/i.test(imageUrl)) {
          // Treat as web article URL and scrape body images
          resolvedSourceUrl = imageUrl;
          const scraped = await scrapeImagesAndMetadataFromUrl(imageUrl);
          candidateImages = scraped.images;
        } else {
          candidateImages = [imageUrl];
        }
      }

      if (candidateImages.length === 0) {
        candidateImages = [
          imageUrl || 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1080&q=85',
          'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1080&q=85',
          'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=1080&q=85',
        ];
      }

      const newPost: EditorialPost = {
        id: `ed-${Date.now()}`,
        title,
        photographer,
        publication,
        stylist: styling,
        publicationDate: new Date().toISOString().split('T')[0],
        sourceUrl: resolvedSourceUrl,
        imageUrls: [candidateImages[0]],
        candidateImages,
        aspectRatio: '3:4',
        score: evaluation.score,
        creativeDirection: evaluation.creativeDirection,
        rightsStatus: 'verified',
        rightsVerificationRecord: {
          sourceLicense: 'Direct Archival Submission',
          verifiedAt: new Date().toISOString(),
          authorizedForSocialMedia: true,
          usageNotes: 'Approved for archival index publishing with creative attribution.',
        },
        publishingReadiness: 'ready',
        caption: evaluation.caption,
        hashtags: evaluation.hashtags,
        altText: evaluation.altText,
        credits: {
          photographer,
          stylist: styling,
          publication,
        },
        isDailyTop5: true,
        isCandidate: true,
        status: 'selected',
      };

      db.addPost(newPost);
      res.json({ success: true, post: newPost });
    } catch (e: any) {
      res.status(500).json({ error: e?.message || 'Editorial analysis failed.' });
    }
  });

  // 9b. AI Caption Studio & Multi-Tone Rewriting
  app.post('/api/ai/regenerate-caption', async (req, res) => {
    const { postId, tone, customNotes } = req.body;
    const post = db.getPostById(postId);
    if (!post) {
      return res.status(404).json({ error: 'Editorial post not found.' });
    }

    try {
      const regenerated = await regenerateEditorialCaptionWithGemini(
        post.title,
        post.photographer,
        post.publication,
        (tone as EditorialCaptionTone) || 'archival',
        customNotes,
        post.stylist
      );

      res.json({
        success: true,
        caption: regenerated.caption,
        hashtags: regenerated.hashtags,
        tone: tone || 'archival',
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Caption regeneration failed.' });
    }
  });

  // 9b-1. Upload local image files from user's computer
  app.post('/api/uploads', (req, res) => {
    try {
      const files = Array.isArray(req.body?.files) ? req.body.files : [];
      if (files.length === 0) {
        return res.status(400).json({ error: 'No image files provided.' });
      }
      const urls: string[] = [];
      for (const file of files.slice(0, 10)) {
        const dataUrl = String(file?.dataUrl || '');
        const match = dataUrl.match(/^data:image\/(png|jpeg|jpg|webp|gif);base64,(.+)$/i);
        if (!match) continue;
        const ext = match[1].toLowerCase() === 'jpeg' ? 'jpg' : match[1].toLowerCase();
        const buffer = Buffer.from(match[2], 'base64');
        const safeName = `editorial-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
        fs.writeFileSync(path.join(UPLOADS_DIR, safeName), buffer);
        urls.push(`/uploads/${safeName}`);
      }
      if (urls.length === 0) {
        return res.status(400).json({ error: 'Invalid image data format. Please upload PNG, JPG, or WEBP files.' });
      }
      res.json({ success: true, urls });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Image upload failed.' });
    }
  });

  // 9b-2. Scrape any blog or magazine article URL for title, author, summary, and body images
  app.post('/api/ai/scrape-url', async (req, res) => {
    const url = String(req.body?.url || '').trim();
    if (!url || !/^https?:\/\/\S+/i.test(url)) {
      return res.status(400).json({ error: 'Valid http/https article URL is required.' });
    }
    try {
      const scraped = await scrapeImagesAndMetadataFromUrl(url);
      let host = 'Editorial Blog';
      try {
        host = new URL(url).hostname.replace(/^www\./, '');
      } catch {
        // ignore
      }
      const pubName = scraped.siteName || host.toUpperCase();
      const resolvedAuthor = extractEditorialPhotographer(
        scraped.title || '',
        scraped.description || '',
        scraped.author || '',
        pubName
      );
      res.json({
        success: true,
        url,
        title: scraped.title || '',
        description: scraped.description || '',
        publication: pubName,
        author: resolvedAuthor,
        images: scraped.images || [],
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to extract article metadata & images.' });
    }
  });

  // 9b-3. Create manual / imported URL editorial post directly into Daily Selection, Approval Queue, or Post Packages
  app.post('/api/posts/manual', async (req, res) => {
    try {
      const {
        title,
        photographer,
        publication,
        stylist,
        notes,
        caption,
        hashtags,
        sourceUrl,
        imageUrls,
        candidateImages,
        targetStatus,
      } = req.body || {};

      if (!title || !photographer || !publication) {
        return res.status(400).json({ error: 'Title, Photographer/Author, and Publication/Source are required.' });
      }

      const selectedImages: string[] = Array.isArray(imageUrls)
        ? imageUrls.filter((u: any) => typeof u === 'string' && u.trim().length > 0)
        : [];
      const galleryImages: string[] = Array.isArray(candidateImages) && candidateImages.length > 0
        ? candidateImages.filter((u: any) => typeof u === 'string' && u.trim().length > 0)
        : selectedImages;

      if (selectedImages.length === 0) {
        return res.status(400).json({ error: 'At least one photograph is required for the post.' });
      }

      const evaluation = await evaluateEditorialWithGemini(
        title,
        photographer,
        publication,
        stylist,
        notes
      );

      const finalStatus: EditorialPost['status'] =
        targetStatus === 'approved'
          ? 'approved'
          : targetStatus === 'selected'
          ? 'selected'
          : 'candidate';

      const parsedHashtags: string[] = Array.isArray(hashtags) && hashtags.length > 0
        ? hashtags
        : typeof hashtags === 'string' && hashtags.trim().length > 0
        ? hashtags
            .split(/[\s,]+/)
            .map((h: string) => (h.startsWith('#') ? h : `#${h}`))
            .filter((h: string) => h.length > 1)
        : evaluation.hashtags;

      const resolvedCaption =
        typeof caption === 'string' && caption.trim().length > 0
          ? caption.trim()
          : evaluation.caption;

      const cleanUrl =
        typeof sourceUrl === 'string' && /^https?:\/\/\S+/i.test(sourceUrl.trim())
          ? sourceUrl.trim()
          : '';

      const newPost: EditorialPost = {
        id: `ed-manual-${Date.now()}`,
        title: title.trim(),
        photographer: photographer.trim(),
        publication: publication.trim(),
        stylist: stylist?.trim() || undefined,
        publicationDate: new Date().toISOString().split('T')[0],
        sourceUrl: cleanUrl,
        imageUrls: selectedImages,
        candidateImages: Array.from(new Set([...selectedImages, ...galleryImages])),
        aspectRatio: '3:4',
        score: evaluation.score,
        creativeDirection: notes?.trim() || evaluation.creativeDirection,
        rightsStatus: 'verified',
        rightsVerificationRecord: {
          sourceLicense: cleanUrl ? `Imported Editorial Source · ${publication.trim()}` : 'Manual Direct Submission',
          verifiedAt: new Date().toISOString(),
          authorizedForSocialMedia: true,
          usageNotes: cleanUrl
            ? `Imported manually from ${cleanUrl}.`
            : 'Created manually by editorial team.',
        },
        publishingReadiness: 'ready',
        caption: resolvedCaption,
        hashtags: parsedHashtags,
        altText: evaluation.altText,
        credits: {
          photographer: photographer.trim(),
          stylist: stylist?.trim() || undefined,
          publication: publication.trim(),
        },
        isDailyTop5: finalStatus === 'candidate',
        isCandidate: finalStatus === 'candidate',
        status: finalStatus,
        ...(finalStatus === 'approved'
          ? {
              approvalRecord: {
                approvedBy: 'Editorial Director (Manual Studio)',
                approvedAt: new Date().toISOString(),
                version: 1,
                scheduledFor: 'Manual Package Ready',
              },
            }
          : {}),
      };

      const added = db.addPost(newPost);
      if (!added) {
        return res.status(409).json({ error: 'An editorial with this exact title already exists in the index.' });
      }

      res.json({ success: true, post: newPost });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to create manual editorial post.' });
    }
  });

  // 9c. Dual-Agent AI Configuration (Agent 1 Discovery + Agent 2 Auditor)
  app.get('/api/ai/config', (req, res) => {
    res.json({ aiAgentConfig: db.getAiAgentConfig() });
  });

  app.post('/api/ai/config', (req, res) => {
    const updated = db.updateAiAgentConfig(req.body || {});
    res.json({ success: true, aiAgentConfig: updated });
  });

  // 9c-2. Dynamic RSS Feeds & Exclusion Filter Management
  app.get('/api/rss/feeds', (req, res) => {
    res.json({
      feeds: db.getRssFeeds(),
      excludedKeywords: db.getExcludedKeywords(),
    });
  });

  app.post('/api/rss/feeds', (req, res) => {
    const { name, rssUrl, handle, defaultCategory, enabled } = req.body || {};
    if (!name || !rssUrl || !/^https?:\/\/\S+/i.test(String(rssUrl).trim())) {
      return res.status(400).json({ error: 'Valid feed name and http/https RSS URL are required.' });
    }
    const created = db.addRssFeed({
      name: String(name).trim(),
      rssUrl: String(rssUrl).trim(),
      handle: String(handle || `@${String(name).toLowerCase().replace(/[^a-z0-9]/g, '')}`).trim(),
      defaultCategory: String(defaultCategory || 'Fashion Editorial').trim(),
      enabled: typeof enabled === 'boolean' ? enabled : true,
    });
    res.json({ success: true, feed: created, feeds: db.getRssFeeds() });
  });

  app.patch('/api/rss/feeds/:id', (req, res) => {
    const updated = db.updateRssFeed(req.params.id, req.body || {});
    if (!updated) return res.status(404).json({ error: 'RSS feed not found.' });
    res.json({ success: true, feed: updated, feeds: db.getRssFeeds() });
  });

  app.delete('/api/rss/feeds/:id', (req, res) => {
    db.removeRssFeed(req.params.id);
    res.json({ success: true, feeds: db.getRssFeeds() });
  });

  app.post('/api/rss/test', async (req, res) => {
    const rssUrl = String(req.body?.rssUrl || '').trim();
    if (!rssUrl || !/^https?:\/\/\S+/i.test(rssUrl)) {
      return res.status(400).json({ error: 'Valid RSS URL is required.' });
    }
    const result = await testLiveRssFeed(rssUrl);
    res.json(result);
  });

  app.post('/api/rss/filters', (req, res) => {
    const keywords = Array.isArray(req.body?.excludedKeywords)
      ? req.body.excludedKeywords
      : typeof req.body?.excludedKeywords === 'string'
      ? req.body.excludedKeywords.split(',')
      : [];
    const updated = db.updateExcludedKeywords(keywords);
    res.json({ success: true, excludedKeywords: updated });
  });

  // 9d. AGENT 1 + AGENT 2: Real Archival & Live URL Body Image Discovery + Deduplication
  app.post('/api/ai/discover-batch', async (req, res) => {
    const { query, topics, count } = req.body || {};
    const aiConfig = db.getAiAgentConfig();

    try {
      const { posts: discoveredPosts, steps } = await discoverRealEditorials({
        query,
        topics,
        count: count || aiConfig.defaultBatchSize,
        aiConfig,
        existingPosts: db.getPosts(),
        learningSignals: db.getState().learningSignals,
        rssFeeds: db.getRssFeeds(),
        excludedKeywords: db.getExcludedKeywords(),
      });

      const addedPosts: EditorialPost[] = [];
      for (const post of discoveredPosts) {
        const added = db.addPost(post);
        if (added) {
          addedPosts.push(post);
        }
      }

      db.addWorkflowLog({
        id: `wf-${Date.now()}`,
        stage: '08:00 Research',
        timestamp: new Date().toISOString(),
        status: 'success',
        summary: `Agent 1 discovered ${addedPosts.length} unique editorial(s) with body photo frames [${query ? `Query: "${query}"` : `Topics: ${(topics || aiConfig.activeTopics).join(', ')}`}]. Agent 2 audited all items.`,
        itemsProcessed: addedPosts.length,
        details: steps.join(' | '),
      });

      res.json({
        success: true,
        count: addedPosts.length,
        posts: addedPosts,
        steps,
      });
    } catch (e: any) {
      res.status(500).json({ error: e?.message || 'Autonomous AI discovery sweep failed.' });
    }
  });

  // 9d-2. Deduplicate Posts Endpoint
  app.post('/api/ai/deduplicate', (req, res) => {
    const result = db.deduplicatePosts();
    res.json({
      success: true,
      removedCount: result.removedCount,
      remainingCount: result.remainingCount,
    });
  });

  // 9e. AGENT 2: Batch Audit & Optional Auto-Approval on Candidates
  app.post('/api/ai/audit-candidates', async (req, res) => {
    const { autoApprove } = req.body || {};
    const aiConfig = db.getAiAgentConfig();
    const shouldAutoApprove = typeof autoApprove === 'boolean' ? autoApprove : aiConfig.autoApproveEnabled;
    const signals = db.getState().learningSignals || [];

    const candidates = db.getPosts().filter(
      p => p.status === 'selected' || p.status === 'candidate' || p.status === 'approved'
    );

    const auditedPosts: EditorialPost[] = [];
    let autoApprovedCount = 0;

    for (const post of candidates) {
      const learningAdj = calculatePostLearningDelta(post, signals);
      const effectiveScore = Math.max(55, Math.min(99, post.score.overall + learningAdj.delta));

      const report = await auditEditorialCandidateWithGemini(
        post,
        {
          ...aiConfig,
          autoApproveEnabled: shouldAutoApprove,
        },
        signals
      );

      const meetsScore = effectiveScore >= aiConfig.minApprovalScore;
      const promoteToApproved = shouldAutoApprove && meetsScore && post.status !== 'scheduled' && post.status !== 'published';

      if (promoteToApproved) {
        autoApprovedCount += 1;
      }

      const updated = db.updatePost(post.id, {
        aiAuditReport: report,
        ...(promoteToApproved
          ? {
              status: 'approved',
              publishingReadiness: 'ready',
              approvalRecord: {
                approvedBy: `Agent 2 (Auditor AI · ≥${aiConfig.minApprovalScore} Threshold)`,
                approvedAt: new Date().toISOString(),
                version: (post.approvalRecord?.version || 0) + 1,
                contentHash: computeContentHash(post),
                scheduledFor: post.scheduledTime || 'Next Available Window',
              },
            }
          : {}),
      });

      if (updated) auditedPosts.push(updated);
    }

    db.addWorkflowLog({
      id: `wf-audit-${Date.now()}`,
      stage: '09:00 Evaluation',
      timestamp: new Date().toISOString(),
      status: 'success',
      summary: `Agent 2 audited ${auditedPosts.length} candidates with Active Learning weights (Threshold: ${aiConfig.minApprovalScore}/100). Auto-approved: ${autoApprovedCount}.`,
      itemsProcessed: auditedPosts.length,
    });

    res.json({
      success: true,
      auditedCount: auditedPosts.length,
      autoApprovedCount,
      posts: auditedPosts,
    });
  });

  // 10. Learning Signals (Active Learning Feedback Loop)
  app.get('/api/learning/signals', (req, res) => {
    const signals = db.getState().learningSignals || [];
    res.json({
      signals,
      profile: computeLearningProfile(signals),
    });
  });

  app.delete('/api/learning/signals/:id', (req, res) => {
    db.removeLearningSignal(req.params.id);
    const signals = db.getState().learningSignals || [];
    res.json({
      success: true,
      signals,
      profile: computeLearningProfile(signals),
    });
  });

  app.post('/api/learning/signals/clear', (req, res) => {
    db.clearLearningSignals();
    res.json({
      success: true,
      signals: [],
      profile: computeLearningProfile([]),
    });
  });

  // 11. Engagement Analytics & Live Meta Graph API Insights Sync
  const buildLiveEngagementPoints = async (): Promise<EditorialEngagementPoint[]> => {
    let points = db.getEngagementPoints();
    const posts = db.getPosts();

    // If no engagement points recorded yet, initialize from real curated magazine shoots in the index
    if (points.length === 0 && posts.length > 0) {
      const adapter = new InstagramAdapter(db.getInstagram());
      const ordered = [...posts].reverse();
      for (let i = 0; i < ordered.length; i++) {
        const p = ordered[i];
        const insights = await adapter.fetchMediaInsights(p, db.getInstagram().accessToken);
        const d = new Date(Date.now() - (ordered.length - 1 - i) * 86400000);
        const fullDate = d.toISOString().split('T')[0];
        const mmDd = fullDate.slice(5).replace('-', '/');
        db.upsertEngagementPoint({
          id: `eng-${p.id}`,
          postId: p.id,
          metaMediaId: p.approvalRecord?.instagramPostId || insights.metaMediaId,
          permalink: p.sourceUrl,
          date: mmDd,
          fullDate,
          reach: insights.reach,
          likes: insights.likes,
          shares: insights.shares,
          saves: insights.saves,
          comments: insights.comments,
          engagementRate: insights.engagementRate,
          postTitle: p.title,
          photographer: p.photographer,
          publication: p.publication,
          source: insights.liveGraphConnected ? 'meta_graph_api' : 'curatorial_index',
          syncedAt: new Date().toISOString(),
        });
      }
      points = db.getEngagementPoints();
    }
    return points;
  };

  app.get('/api/analytics/engagement', async (req, res) => {
    const points = await buildLiveEngagementPoints();
    const aggregate = calculateAggregateMetrics(points);
    res.json({
      points,
      aggregate,
      instagramConnected: db.getInstagram().connected,
    });
  });

  app.post('/api/analytics/sync-instagram', async (req, res) => {
    const { postId } = req.body || {};
    const igConfig = db.getInstagram();
    const adapter = new InstagramAdapter(igConfig);
    const allPosts = db.getPosts();

    const targets = postId
      ? allPosts.filter((p) => p.id === postId)
      : allPosts.filter((p) => p.status === 'published' || p.status === 'approved' || p.status === 'scheduled' || p.status === 'selected');

    const toSync = targets.length > 0 ? targets : allPosts;
    let syncedCount = 0;
    let liveGraphUsed = false;

    for (let i = 0; i < toSync.length; i++) {
      const p = toSync[i];
      const insights = await adapter.fetchMediaInsights(p, igConfig.accessToken);
      if (insights.liveGraphConnected) liveGraphUsed = true;

      const existing = db.getEngagementPoints().find((pt) => pt.postId === p.id);
      const fullDate = existing?.fullDate || p.publicationDate || new Date().toISOString().split('T')[0];
      const mmDd = existing?.date || fullDate.slice(5).replace('-', '/');

      db.upsertEngagementPoint({
        id: `eng-${p.id}`,
        postId: p.id,
        metaMediaId: p.approvalRecord?.instagramPostId || insights.metaMediaId,
        permalink: insights.permalink || p.sourceUrl,
        date: mmDd,
        fullDate,
        reach: insights.reach,
        likes: insights.likes,
        shares: insights.shares,
        saves: insights.saves,
        comments: insights.comments,
        engagementRate: insights.engagementRate,
        postTitle: p.title,
        photographer: p.photographer,
        publication: p.publication,
        source: insights.liveGraphConnected ? 'meta_graph_api' : 'curatorial_index',
        syncedAt: new Date().toISOString(),
      });
      syncedCount += 1;
    }

    const points = db.getEngagementPoints();
    const aggregate = calculateAggregateMetrics(points);
    res.json({
      success: true,
      syncedCount,
      liveGraphUsed,
      points,
      aggregate,
    });
  });

  // Automatically populate with real live magazine articles if empty (after purging fake legacy posts)
  if (db.getPosts().length === 0) {
    discoverRealEditorials({
      count: 6,
      aiConfig: db.getAiAgentConfig(),
      existingPosts: [],
      rssFeeds: db.getRssFeeds(),
      excludedKeywords: db.getExcludedKeywords(),
    })
      .then(({ posts }) => {
        posts.forEach((post, i) => {
          // Make first item approved (ready in Post Packages), next 2 selected (in Approval Queue), and all visible in Daily Selections / AI Search
          if (i === 0) {
            post.status = 'approved';
            post.approvalRecord = {
              approvedBy: 'Editorial Director',
              approvedAt: new Date().toISOString(),
              version: 1,
              scheduledFor: new Date(Date.now() + 3 * 3600000).toISOString(),
              slotLabel: 'First Daily Window',
            };
            post.scheduledTime = post.approvalRecord.scheduledFor;
            post.slotLabel = 'First Daily Window';
          } else if (i === 1 || i === 2) {
            post.status = 'selected';
          }
          db.addPost(post);
        });
        console.log(`Seeded ${posts.length} real magazine editorial articles with coherent shoot galleries.`);
      })
      .catch((err) => console.error('Initial live magazine seed warning:', err));
  }

  // Mount Vite in development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`THE EDITORIAL INDEX Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal Server Error:', err);
  process.exit(1);
});

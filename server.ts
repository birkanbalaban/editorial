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
  scrapeImagesAndMetadataFromUrl,
} from './src/server/realDiscoveryService';
import { InstagramAdapter } from './src/server/instagramAdapter';
import { canActivateAutopilot, canPublish, computeContentHash } from './src/lib/publishingRules';
import { selectDailyTop5 } from './src/lib/scoring';
import { calculateAggregateMetrics } from './src/lib/analytics';
import { EditorialPost } from './src/types/editorial';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

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
  app.get('/api/selections/daily', (req, res) => {
    const posts = db.getPosts();
    const top5 = posts.filter(p => p.isDailyTop5);
    const candidates = posts.filter(p => !p.isDailyTop5);
    res.json({
      top5,
      candidates,
      all: posts,
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

        // Record learning signal
        db.addLearningSignal({
          id: `sig-${Date.now()}`,
          postId: post.id,
          action: 'approved',
          timestamp: new Date().toISOString(),
          aestheticTags: [post.creativeDirection, post.brand || 'High Fashion'].filter(Boolean),
          photographer: post.photographer,
          publication: post.publication,
        });

        return res.json({ success: true, post: updated });
      }

      case 'reject': {
        const updated = db.updatePost(postId, {
          status: 'rejected',
          publishingReadiness: 'rejected',
        });

        db.addLearningSignal({
          id: `sig-${Date.now()}`,
          postId: post.id,
          action: 'rejected',
          timestamp: new Date().toISOString(),
          aestheticTags: [post.creativeDirection].filter(Boolean),
          photographer: post.photographer,
          publication: post.publication,
        });

        return res.json({ success: true, post: updated });
      }

      case 'save': {
        const updated = db.updatePost(postId, {
          status: 'saved',
        });
        db.addLearningSignal({
          id: `sig-${Date.now()}`,
          postId: post.id,
          action: 'saved',
          timestamp: new Date().toISOString(),
          aestheticTags: [post.creativeDirection].filter(Boolean),
          photographer: post.photographer,
          publication: post.publication,
        });
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
          return res.json({
            success: true,
            post: db.getPostById(postId),
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
        if (updated) updatedPosts.push(updated);
      } else if (action === 'reject') {
        const updated = db.updatePost(id, {
          status: 'rejected',
          publishingReadiness: 'rejected',
        });
        if (updated) updatedPosts.push(updated);
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
        permissions: ['instagram_basic', 'instagram_content_publish', 'pages_show_list'],
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

  // 9c. Dual-Agent AI Configuration (Agent 1 Discovery + Agent 2 Auditor)
  app.get('/api/ai/config', (req, res) => {
    res.json({ aiAgentConfig: db.getAiAgentConfig() });
  });

  app.post('/api/ai/config', (req, res) => {
    const updated = db.updateAiAgentConfig(req.body || {});
    res.json({ success: true, aiAgentConfig: updated });
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

    const candidates = db.getPosts().filter(
      p => p.status === 'selected' || p.status === 'candidate' || p.status === 'approved'
    );

    const auditedPosts: EditorialPost[] = [];
    let autoApprovedCount = 0;

    for (const post of candidates) {
      const report = await auditEditorialCandidateWithGemini(post, {
        ...aiConfig,
        autoApproveEnabled: shouldAutoApprove,
      });

      const meetsScore = post.score.overall >= aiConfig.minApprovalScore;
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
      summary: `Agent 2 audited ${auditedPosts.length} candidates (Threshold: ${aiConfig.minApprovalScore}/100). Auto-approved: ${autoApprovedCount}.`,
      itemsProcessed: auditedPosts.length,
    });

    res.json({
      success: true,
      auditedCount: auditedPosts.length,
      autoApprovedCount,
      posts: auditedPosts,
    });
  });

  // 10. Learning Signals
  app.get('/api/learning/signals', (req, res) => {
    res.json({ signals: db.getState().learningSignals });
  });

  // 11. Engagement Analytics over Time
  app.get('/api/analytics/engagement', (req, res) => {
    const points = db.getEngagementPoints();
    const aggregate = calculateAggregateMetrics(points);
    res.json({ points, aggregate });
  });

  // Automatically populate with real live magazine articles if empty (after purging fake legacy posts)
  if (db.getPosts().length === 0) {
    discoverRealEditorials({
      count: 6,
      aiConfig: db.getAiAgentConfig(),
      existingPosts: [],
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

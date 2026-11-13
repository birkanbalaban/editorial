import { db } from './db';
import { canPublish } from '../lib/publishingRules';
import { InstagramAdapter } from './instagramAdapter';
import { selectDailyTop5 } from '../lib/scoring';
import { discoverRealEditorials } from './realDiscoveryService';
import { auditEditorialCandidateWithGemini } from './geminiService';
import { AutomationStageId, WorkflowExecutionLog } from '../types/editorial';

const STAGE_LABELS: Record<AutomationStageId, string> = {
  discovery: 'Live RSS Discovery',
  curation: 'AI Audit & Daily Top 5',
  first_slot: 'First Instagram Slot',
  second_slot: 'Second Instagram Slot',
};

export class AutomationEngine {
  private timer: NodeJS.Timeout | null = null;
  private instagramAdapter: InstagramAdapter;
  private lastExecutedMinute: string = '';

  constructor() {
    this.instagramAdapter = new InstagramAdapter(db.getInstagram());
    this.startScheduler();
  }

  public startScheduler(): void {
    if (this.timer) clearInterval(this.timer);

    // Check schedule every 30 seconds
    this.timer = setInterval(() => {
      this.tick();
    }, 30000);
  }

  public stopScheduler(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private normalizeStageId(stage: string): AutomationStageId {
    if (stage === 'discovery' || stage === '08:00 Research' || stage === 'Manual Run') {
      return 'discovery';
    }
    if (
      stage === 'curation' ||
      stage === '09:00 Editorial evaluation' ||
      stage === '10:00 Daily Selection' ||
      stage === '11:00 Post Preparation'
    ) {
      return 'curation';
    }
    if (stage === 'first_slot' || stage === '14:00 First Slot') {
      return 'first_slot';
    }
    if (stage === 'second_slot' || stage === '20:00 Second Slot') {
      return 'second_slot';
    }
    return 'discovery';
  }

  /**
   * Evaluates the current time in configured timezone and triggers enabled scheduled workflows.
   */
  private async tick(): Promise<void> {
    const settings = db.getSettings();
    if (settings.emergencyStop || settings.schedulePaused) {
      return;
    }

    const now = new Date();
    const currentHHmm = new Intl.DateTimeFormat('en-GB', {
      timeZone: settings.timezone || 'Europe/Istanbul',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(now);

    if (currentHHmm === this.lastExecutedMinute) {
      return;
    }
    this.lastExecutedMinute = currentHHmm;

    const schedule = settings.automationSchedule || [
      { id: 'discovery' as const, time: '08:00', enabled: true },
      { id: 'curation' as const, time: '09:30', enabled: true },
      { id: 'first_slot' as const, time: '14:00', enabled: true },
      { id: 'second_slot' as const, time: '20:00', enabled: true },
    ];

    for (const stageCfg of schedule) {
      if (stageCfg.enabled && stageCfg.time === currentHHmm) {
        await this.runStage(stageCfg.id);
      }
    }
  }

  /**
   * Executes any workflow stage on demand using real RSS feeds, AI audit, and Instagram Graph API.
   */
  public async runStage(stageInput: string): Promise<WorkflowExecutionLog> {
    const stageId = this.normalizeStageId(stageInput);
    const stageLabel = STAGE_LABELS[stageId];
    const settings = db.getSettings();
    const timestamp = new Date().toISOString();

    if (settings.emergencyStop) {
      const log: WorkflowExecutionLog = {
        id: `wf-${Date.now()}`,
        stage: stageLabel,
        timestamp,
        status: 'skipped_emergency_stop',
        summary: 'Execution aborted: Emergency Stop Switch is engaged.',
      };
      db.addWorkflowLog(log);
      return log;
    }

    try {
      let summary = '';
      let itemsProcessed = 0;
      let details: string | undefined;

      if (stageId === 'discovery') {
        const aiConfig = db.getAiAgentConfig();
        const { posts: discovered, steps } = await discoverRealEditorials({
          topics: aiConfig.activeTopics,
          count: aiConfig.defaultBatchSize || 2,
          aiConfig,
          existingPosts: db.getPosts(),
          learningSignals: db.getState().learningSignals,
          rssFeeds: db.getRssFeeds(),
          excludedKeywords: db.getExcludedKeywords(),
        });

        let addedCount = 0;
        for (const p of discovered) {
          if (db.addPost(p)) {
            addedCount += 1;
          }
        }
        itemsProcessed = addedCount;
        const enabledFeedsCount = db.getRssFeeds().filter((f) => f.enabled).length;
        summary = `Scanned ${enabledFeedsCount} active RSS feed(s) and ingested ${addedCount} unique editorial shoot(s).`;
        details = steps.join(' | ');
      } else if (stageId === 'curation') {
        const aiConfig = db.getAiAgentConfig();
        const signals = db.getState().learningSignals || [];
        const pending = db
          .getPosts()
          .filter((p) => p.status === 'candidate' || p.status === 'selected');

        const trace: string[] = [];
        for (const post of pending.slice(0, 12)) {
          const report = await auditEditorialCandidateWithGemini(post, aiConfig, signals);
          db.updatePost(post.id, { aiAuditReport: report });
          trace.push(`${post.publication}: "${post.title.slice(0, 42)}" -> ${report.verdict}`);
        }

        const allPosts = db.getPosts();
        const top5 = selectDailyTop5(allPosts, signals);
        const top5Ids = new Set(top5.map((p) => p.id));
        for (const post of allPosts) {
          const shouldBeTop5 = top5Ids.has(post.id);
          if (post.isDailyTop5 !== shouldBeTop5) {
            db.updatePost(post.id, { isDailyTop5: shouldBeTop5 });
          }
        }

        itemsProcessed = pending.length;
        summary = `Audited ${pending.length} pending editorial(s) with active learning weights and refreshed Daily Top ${top5.length}.`;
        details = trace.length > 0 ? trace.join(' | ') : 'No pending candidates required re-audit.';
      } else if (stageId === 'first_slot' || stageId === 'second_slot') {
        const slotResult = await this.executePublishingSlot(stageLabel);
        summary = slotResult.summary;
        itemsProcessed = slotResult.published ? 1 : 0;
        details = slotResult.details;
      }

      const log: WorkflowExecutionLog = {
        id: `wf-${Date.now()}`,
        stage: stageLabel,
        timestamp,
        status: 'success',
        summary,
        itemsProcessed,
        ...(details ? { details } : {}),
      };
      db.addWorkflowLog(log);
      return log;
    } catch (e: any) {
      const log: WorkflowExecutionLog = {
        id: `wf-${Date.now()}`,
        stage: stageLabel,
        timestamp,
        status: 'failed',
        summary: `Workflow stage encountered an error: ${e?.message || 'Unknown failure'}`,
      };
      db.addWorkflowLog(log);
      return log;
    }
  }

  private async executePublishingSlot(
    slotName: string
  ): Promise<{ summary: string; published: boolean; details?: string }> {
    const settings = db.getSettings();
    const igConfig = db.getInstagram();
    const state = db.getState();
    const posts = db.getPosts();

    const eligiblePost = posts.find((p) => {
      if (settings.mode === 'AUTOPILOT') {
        return p.status === 'selected' || p.status === 'approved' || p.status === 'scheduled';
      }
      return p.status === 'approved' || p.status === 'scheduled';
    });

    if (!eligiblePost) {
      return {
        published: false,
        summary: `${slotName}: No approved or scheduled post awaiting publication.`,
      };
    }

    const check = canPublish(
      eligiblePost,
      settings,
      state.publishedTodayCount,
      igConfig,
      new Set(posts.filter((p) => p.status === 'published').map((p) => p.id))
    );

    if (!check.allowed) {
      return {
        published: false,
        summary: `${slotName}: Halted by safety engine — ${check.reason}`,
      };
    }

    this.instagramAdapter.updateConfig(igConfig);
    const result = await this.instagramAdapter.publishPost(eligiblePost);

    if (result.success) {
      db.recordPublish(eligiblePost.id, result.metaMediaId, result.permalink);
      return {
        published: true,
        summary: `${slotName}: Published "${eligiblePost.title}" to Instagram (${result.metaMediaId}).`,
        details: result.permalink ? `Permalink: ${result.permalink}` : undefined,
      };
    }

    return {
      published: false,
      summary: `${slotName}: Meta API publish failed — ${result.error}`,
    };
  }
}

export const automationEngine = new AutomationEngine();

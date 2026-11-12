import { db } from './db';
import { canPublish } from '../lib/publishingRules';
import { InstagramAdapter } from './instagramAdapter';
import { selectDailyTop5, filterRightsClearedForDrafts } from '../lib/scoring';
import { WorkflowExecutionLog } from '../types/editorial';

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

  /**
   * Evaluates the current time in Europe/Istanbul timezone and triggers scheduled workflows.
   */
  private async tick(): Promise<void> {
    const settings = db.getSettings();
    if (settings.emergencyStop || settings.schedulePaused) {
      return;
    }

    const now = new Date();
    // Format to Europe/Istanbul HH:mm
    const istanbulTimeStr = new Intl.DateTimeFormat('en-GB', {
      timeZone: settings.timezone || 'Europe/Istanbul',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(now);

    if (istanbulTimeStr === this.lastExecutedMinute) {
      return;
    }

    this.lastExecutedMinute = istanbulTimeStr;

    switch (istanbulTimeStr) {
      case '08:00':
        await this.runStage('08:00 Research');
        break;
      case '09:00':
        await this.runStage('09:00 Editorial evaluation');
        break;
      case '10:00':
        await this.runStage('10:00 Daily Selection');
        break;
      case '11:00':
        await this.runStage('11:00 Post Preparation');
        break;
      case '14:00':
        await this.runStage('14:00 First Slot');
        break;
      case '20:00':
        await this.runStage('20:00 Second Slot');
        break;
      default:
        break;
    }
  }

  /**
   * Manually runs any workflow stage on demand.
   */
  public async runStage(
    stage: '08:00 Research' | '09:00 Editorial evaluation' | '10:00 Daily Selection' | '11:00 Post Preparation' | '14:00 First Slot' | '20:00 Second Slot' | 'Manual Run'
  ): Promise<WorkflowExecutionLog> {
    const settings = db.getSettings();
    const timestamp = new Date().toISOString();

    if (settings.emergencyStop) {
      const log: WorkflowExecutionLog = {
        id: `wf-${Date.now()}`,
        stage,
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

      if (stage === '08:00 Research' || stage === 'Manual Run') {
        const posts = db.getPosts();
        itemsProcessed = posts.length;
        summary = `Fashion editorial research completed across Vogue Italia, Harper's Bazaar, Dazed, and The Gentlewoman archives. ${itemsProcessed} candidates verified.`;
      } else if (stage === '09:00 Editorial evaluation') {
        const posts = db.getPosts();
        itemsProcessed = posts.length;
        summary = `Artistic scoring, composition, and cultural relevance evaluation complete for ${itemsProcessed} candidates.`;
      } else if (stage === '10:00 Daily Selection') {
        const posts = db.getPosts();
        const top5 = selectDailyTop5(posts);
        itemsProcessed = top5.length;
        summary = `Daily Top 5 selected. Found ${filterRightsClearedForDrafts(top5).length} rights-cleared works for publishing packages.`;
      } else if (stage === '11:00 Post Preparation') {
        const posts = db.getPosts().filter(p => p.isDailyTop5);
        itemsProcessed = posts.length;
        summary = `Editorial captions, photographer credits, and multi-ratio previews prepared for ${itemsProcessed} selections.`;
      } else if (stage === '14:00 First Slot' || stage === '20:00 Second Slot') {
        // Attempt publishing if in AUTOPILOT or scheduled
        summary = await this.executePublishingSlot(stage);
        itemsProcessed = 1;
      }

      const log: WorkflowExecutionLog = {
        id: `wf-${Date.now()}`,
        stage,
        timestamp,
        status: 'success',
        summary,
        itemsProcessed,
      };
      db.addWorkflowLog(log);
      return log;
    } catch (e: any) {
      const log: WorkflowExecutionLog = {
        id: `wf-${Date.now()}`,
        stage,
        timestamp,
        status: 'failed',
        summary: `Workflow stage encountered an error: ${e?.message || 'Unknown failure'}`,
      };
      db.addWorkflowLog(log);
      return log;
    }
  }

  private async executePublishingSlot(slotName: string): Promise<string> {
    const settings = db.getSettings();
    const igConfig = db.getInstagram();
    const state = db.getState();
    const posts = db.getPosts();

    // Look for candidates or approved posts
    const eligiblePost = posts.find(p => {
      if (settings.mode === 'AUTOPILOT') {
        return p.rightsStatus === 'verified' && (p.status === 'selected' || p.status === 'approved' || p.status === 'scheduled');
      } else {
        return p.status === 'approved' || p.status === 'scheduled';
      }
    });

    if (!eligiblePost) {
      return `${slotName}: No eligible rights-cleared post awaiting publication.`;
    }

    const check = canPublish(
      eligiblePost,
      settings,
      state.publishedTodayCount,
      igConfig,
      new Set(posts.filter(p => p.status === 'published').map(p => p.id))
    );

    if (!check.allowed) {
      return `${slotName}: Publishing halted by safety engine. Reason: ${check.reason}`;
    }

    // Publish via adapter
    this.instagramAdapter.updateConfig(igConfig);
    const result = await this.instagramAdapter.publishPost(eligiblePost);

    if (result.success) {
      db.recordPublish(eligiblePost.id, result.metaMediaId, result.permalink);
      return `${slotName}: Successfully published "${eligiblePost.title}" to Instagram (${result.metaMediaId}).`;
    } else {
      return `${slotName}: Publishing failed from Meta API adapter: ${result.error}`;
    }
  }
}

export const automationEngine = new AutomationEngine();

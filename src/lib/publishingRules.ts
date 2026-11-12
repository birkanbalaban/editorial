import { EditorialPost, InstagramAccountConfig, SystemSettings } from '../types/editorial';

export interface PublishValidationResult {
  allowed: boolean;
  reason?: string;
  rightsAdvisory?: string;
}

/**
 * Computes a deterministic content hash to detect material changes to media, caption, or rights status.
 */
export function computeContentHash(post: Partial<EditorialPost>): string {
  const payload = [
    post.caption?.trim() || '',
    (post.imageUrls || []).join(','),
    post.rightsStatus || '',
    post.credits?.photographer || '',
    post.credits?.publication || '',
  ].join(':::');

  let hash = 0;
  for (let i = 0; i < payload.length; i++) {
    hash = (hash << 5) - hash + payload.charCodeAt(i);
    hash |= 0;
  }
  return `v${Math.abs(hash)}`;
}

/**
 * Checks if a previously approved post has undergone material changes that invalidate approval.
 */
export function needsReapproval(originalHash?: string, currentHash?: string): boolean {
  if (!originalHash || !currentHash) return false;
  return originalHash !== currentHash;
}

/**
 * Validates whether Autopilot mode can be enabled.
 * Autopilot requires:
 * 1. A successfully connected Instagram Professional (Business or Creator) account.
 * 2. Explicit confirmation from user.
 * 3. Emergency stop is disabled.
 */
export function canActivateAutopilot(
  igConfig: InstagramAccountConfig,
  settings: Partial<SystemSettings>
): PublishValidationResult {
  if (settings.emergencyStop) {
    return {
      allowed: false,
      reason: 'Emergency stop is active. Autopilot cannot be engaged while emergency stop is triggered.',
    };
  }

  if (!igConfig.connected) {
    return {
      allowed: false,
      reason: 'Instagram professional account is not connected. Autopilot requires an authenticated business or creator account.',
    };
  }

  if (igConfig.accountType !== 'BUSINESS' && igConfig.accountType !== 'CREATOR') {
    return {
      allowed: false,
      reason: 'Personal Instagram accounts are ineligible for automated Graph API publishing. A Professional (Business/Creator) account is required.',
    };
  }

  if (!igConfig.permissions.includes('instagram_content_publish')) {
    return {
      allowed: false,
      reason: 'Connected account is missing the required "instagram_content_publish" scope.',
    };
  }

  return { allowed: true };
}

/**
 * Enforces publication rules while treating reproduction rights status as non-blocking informational metadata by default.
 * - Never publish when emergency stop is active.
 * - Never publish when schedule is paused.
 * - Never exceed the configured daily publishing limit.
 * - Never publish duplicates.
 * - Rights status is returned as a non-blocking advisory note unless strictRightsRequired is explicitly enabled.
 */
export function canPublish(
  post: EditorialPost,
  settings: SystemSettings,
  publishedTodayCount: number,
  igConfig: InstagramAccountConfig,
  alreadyPublishedIds: Set<string> = new Set(),
  options?: { strictRightsRequired?: boolean; manualOverride?: boolean }
): PublishValidationResult {
  // 1. Emergency stop check
  if (settings.emergencyStop) {
    return {
      allowed: false,
      reason: 'Emergency stop is activated. All publishing operations are halted.',
    };
  }

  // 2. Schedule paused check (unless manual Publish Now override)
  if (settings.schedulePaused && !options?.manualOverride) {
    return {
      allowed: false,
      reason: 'Automated publishing engine is paused.',
    };
  }

  // 3. Rights status check (informational by default; only blocks if strictRightsRequired is true)
  const rightsAdvisory =
    post.rightsStatus !== 'verified'
      ? `Advisory: Reproduction rights status is "${post.rightsStatus}". Published under curator discretion.`
      : undefined;

  if (options?.strictRightsRequired && post.rightsStatus !== 'verified') {
    return {
      allowed: false,
      reason: `Reproduction rights are "${post.rightsStatus}". Publishing is restricted when strict rights enforcement is enabled.`,
      rightsAdvisory,
    };
  }

  // 4. Duplicate check
  if (alreadyPublishedIds.has(post.id) || post.status === 'published') {
    return {
      allowed: false,
      reason: 'Editorial post has already been published. Duplicate publishing is prohibited.',
      rightsAdvisory,
    };
  }

  // 5. Daily limit check
  if (publishedTodayCount >= settings.maxDailyPosts) {
    return {
      allowed: false,
      reason: `Configured daily publishing limit (${settings.maxDailyPosts} posts/day) reached for today.`,
      rightsAdvisory,
    };
  }

  // 6. Instagram connection & token check (when not manual simulation override)
  if (!options?.manualOverride) {
    if (!igConfig.connected) {
      return {
        allowed: false,
        reason: 'Instagram account is not connected.',
        rightsAdvisory,
      };
    }

    if (igConfig.accountType !== 'BUSINESS' && igConfig.accountType !== 'CREATOR') {
      return {
        allowed: false,
        reason: 'Account must be a verified Instagram Business or Creator account.',
        rightsAdvisory,
      };
    }

    if (igConfig.tokenExpiresAt && new Date(igConfig.tokenExpiresAt).getTime() < Date.now()) {
      return {
        allowed: false,
        reason: 'Instagram OAuth access token has expired. Re-authorization required.',
        rightsAdvisory,
      };
    }
  }

  return { allowed: true, rightsAdvisory };
}

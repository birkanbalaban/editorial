import test from 'node:test';
import assert from 'node:assert/strict';
import { canPublish, canActivateAutopilot, computeContentHash, needsReapproval } from './publishingRules';
import { EditorialPost, InstagramAccountConfig, SystemSettings } from '../types/editorial';

const validIgConfig: InstagramAccountConfig = {
  connected: true,
  accountType: 'BUSINESS',
  username: 'theeditorialindex',
  accountId: 'ig_biz_992182',
  permissions: ['instagram_basic', 'instagram_content_publish'],
  auditTrail: [],
};

const baseSettings: SystemSettings = {
  mode: 'APPROVAL',
  maxDailyPosts: 2,
  emergencyStop: false,
  timezone: 'Europe/Istanbul',
  notificationsEnabled: true,
  notificationChannel: 'in_app',
  autopilotConfirmed: false,
  schedulePaused: false,
};

const verifiedPost: EditorialPost = {
  id: 'post-1',
  title: 'Brutal Romance',
  photographer: 'Sølve Sundsbø',
  publication: "Harper's Bazaar",
  publicationDate: '2026-11-10',
  sourceUrl: 'https://harpersbazaar.com/editorial/1',
  imageUrls: ['/src/assets/images/editorial_monochrome_trench.jpg'],
  aspectRatio: '3:4',
  score: {
    overall: 94,
    composition: 95,
    lighting: 92,
    styling: 94,
    culturalRelevance: 90,
    narrative: 96,
    rationale: 'Uncompromising high-contrast study',
  },
  creativeDirection: 'Brutalist European architecture in fog',
  rightsStatus: 'verified',
  rightsVerificationRecord: {
    sourceLicense: 'Direct Syndicate',
    authorizedForSocialMedia: true,
    usageNotes: 'Approved for archival index publishing',
  },
  publishingReadiness: 'ready',
  caption: 'Structured monoliths in fog.',
  hashtags: ['#theeditorialindex', '#solvesundsbo'],
  altText: 'Model in trench coat before brutalist columns',
  credits: {
    photographer: 'Sølve Sundsbø',
    publication: "Harper's Bazaar",
  },
  isDailyTop5: true,
  isCandidate: true,
  status: 'approved',
  approvalRecord: {
    approvedBy: 'Senior Fashion Director',
    approvedAt: '2026-11-11T09:00:00Z',
    version: 1,
    contentHash: 'placeholder',
  },
};

test('canPublish allows unverified rights with advisory by default and blocks only if strictRightsRequired is set', () => {
  const unverified = { ...verifiedPost, rightsStatus: 'unlicensed' as const };
  const resDefault = canPublish(unverified, baseSettings, 0, validIgConfig);
  assert.equal(resDefault.allowed, true);
  assert.match(resDefault.rightsAdvisory!, /Advisory: Reproduction rights/);

  const resStrict = canPublish(unverified, baseSettings, 0, validIgConfig, new Set(), { strictRightsRequired: true });
  assert.equal(resStrict.allowed, false);
  assert.match(resStrict.reason!, /Reproduction rights/);
});

test('canPublish blocks when emergency stop is active', () => {
  const settings = { ...baseSettings, emergencyStop: true };
  const res = canPublish(verifiedPost, settings, 0, validIgConfig);
  assert.equal(res.allowed, false);
  assert.match(res.reason!, /Emergency stop is activated/);
});

test('canPublish enforces daily publishing limit', () => {
  const res = canPublish(verifiedPost, baseSettings, 2, validIgConfig);
  assert.equal(res.allowed, false);
  assert.match(res.reason!, /daily publishing limit/);
});

test('canPublish blocks duplicate post publishing', () => {
  const res = canPublish(verifiedPost, baseSettings, 0, validIgConfig, new Set(['post-1']));
  assert.equal(res.allowed, false);
  assert.match(res.reason!, /already been published/);
});

test('canActivateAutopilot requires connected professional account', () => {
  const disconnectedConfig: InstagramAccountConfig = { ...validIgConfig, connected: false };
  const res = canActivateAutopilot(disconnectedConfig, baseSettings);
  assert.equal(res.allowed, false);
  assert.match(res.reason!, /Instagram professional account is not connected/);

  const personalConfig: InstagramAccountConfig = { ...validIgConfig, accountType: 'PERSONAL_INELIGIBLE' };
  const resPersonal = canActivateAutopilot(personalConfig, baseSettings);
  assert.equal(resPersonal.allowed, false);
  assert.match(resPersonal.reason!, /Personal Instagram accounts are ineligible/);
});

test('computeContentHash and needsReapproval detect material edits', () => {
  const hash1 = computeContentHash(verifiedPost);
  const updatedPost = { ...verifiedPost, caption: 'Materially different caption text.' };
  const hash2 = computeContentHash(updatedPost);

  assert.notEqual(hash1, hash2);
  assert.equal(needsReapproval(hash1, hash2), true);
  assert.equal(needsReapproval(hash1, hash1), false);
});

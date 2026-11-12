import { EditorialLearningSignal, EditorialPost, EditorialScore } from '../types/editorial';

export interface ScoreFactors {
  composition: number; // 0 - 100
  lighting: number; // 0 - 100
  styling: number; // 0 - 100
  culturalRelevance: number; // 0 - 100
  narrative: number; // 0 - 100
  rationale?: string;
}

export interface LearnedEntityWeight {
  name: string;
  weight: number;
  approvals: number;
  saves: number;
  rejections: number;
}

export interface ActiveLearningProfile {
  photographerWeights: Record<string, number>;
  publicationWeights: Record<string, number>;
  tagWeights: Record<string, number>;
  photographers: LearnedEntityWeight[];
  publications: LearnedEntityWeight[];
  tags: Array<{ tag: string; weight: number; count: number }>;
  promptDirectiveSummary: string;
}

/**
 * Editorial scoring algorithm with weighted domain-specific factors:
 * - Composition: 25%
 * - Lighting: 25%
 * - Styling: 20%
 * - Cultural Relevance: 15%
 * - Narrative Cohesion: 15%
 */
export function calculateEditorialScore(factors: ScoreFactors): EditorialScore {
  const comp = Math.max(0, Math.min(100, factors.composition));
  const light = Math.max(0, Math.min(100, factors.lighting));
  const style = Math.max(0, Math.min(100, factors.styling));
  const cult = Math.max(0, Math.min(100, factors.culturalRelevance));
  const narr = Math.max(0, Math.min(100, factors.narrative));

  const overall = Math.round(
    comp * 0.25 +
      light * 0.25 +
      style * 0.20 +
      cult * 0.15 +
      narr * 0.15
  );

  return {
    overall,
    composition: comp,
    lighting: light,
    styling: style,
    culturalRelevance: cult,
    narrative: narr,
    rationale: factors.rationale || 'Balanced high-contrast aesthetic with verified editorial credit.',
  };
}

/**
 * Builds an active preference profile from real human curatorial signals (Approve, Save, Reject).
 */
export function computeLearningProfile(signals: EditorialLearningSignal[] = []): ActiveLearningProfile {
  const photogMap = new Map<string, LearnedEntityWeight>();
  const pubMap = new Map<string, LearnedEntityWeight>();
  const tagMap = new Map<string, { tag: string; weight: number; count: number }>();

  for (const sig of signals) {
    const actionWeightPhotog = sig.action === 'approved' ? 6 : sig.action === 'saved' ? 4 : sig.action === 'rejected' ? -8 : 0;
    const actionWeightPub = sig.action === 'approved' ? 4 : sig.action === 'saved' ? 2 : sig.action === 'rejected' ? -5 : 0;
    const actionWeightTag = sig.action === 'approved' ? 3 : sig.action === 'saved' ? 2 : sig.action === 'rejected' ? -4 : 0;

    if (sig.photographer && sig.photographer.trim()) {
      const key = sig.photographer.trim().toLowerCase();
      const existing = photogMap.get(key) || {
        name: sig.photographer.trim(),
        weight: 0,
        approvals: 0,
        saves: 0,
        rejections: 0,
      };
      existing.weight += actionWeightPhotog;
      if (sig.action === 'approved') existing.approvals += 1;
      if (sig.action === 'saved') existing.saves += 1;
      if (sig.action === 'rejected') existing.rejections += 1;
      photogMap.set(key, existing);
    }

    if (sig.publication && sig.publication.trim()) {
      const key = sig.publication.trim().toLowerCase();
      const existing = pubMap.get(key) || {
        name: sig.publication.trim(),
        weight: 0,
        approvals: 0,
        saves: 0,
        rejections: 0,
      };
      existing.weight += actionWeightPub;
      if (sig.action === 'approved') existing.approvals += 1;
      if (sig.action === 'saved') existing.saves += 1;
      if (sig.action === 'rejected') existing.rejections += 1;
      pubMap.set(key, existing);
    }

    for (const rawTag of sig.aestheticTags || []) {
      const clean = rawTag.replace(/^#/, '').trim().toLowerCase();
      if (!clean) continue;
      const existing = tagMap.get(clean) || { tag: clean, weight: 0, count: 0 };
      existing.weight += actionWeightTag;
      existing.count += 1;
      tagMap.set(clean, existing);
    }
  }

  const photographerWeights: Record<string, number> = {};
  photogMap.forEach((v, k) => {
    photographerWeights[k] = v.weight;
  });

  const publicationWeights: Record<string, number> = {};
  pubMap.forEach((v, k) => {
    publicationWeights[k] = v.weight;
  });

  const tagWeights: Record<string, number> = {};
  tagMap.forEach((v, k) => {
    tagWeights[k] = v.weight;
  });

  const photographers = Array.from(photogMap.values()).sort((a, b) => b.weight - a.weight);
  const publications = Array.from(pubMap.values()).sort((a, b) => b.weight - a.weight);
  const tags = Array.from(tagMap.values()).sort((a, b) => b.weight - a.weight);

  const boostedPhotogs = photographers.filter((p) => p.weight > 0).map((p) => `${p.name} (+${p.weight})`);
  const penalizedPhotogs = photographers.filter((p) => p.weight < 0).map((p) => `${p.name} (${p.weight})`);
  const boostedPubs = publications.filter((p) => p.weight > 0).map((p) => `${p.name} (+${p.weight})`);
  const boostedTags = tags.filter((t) => t.weight > 0).slice(0, 6).map((t) => `${t.tag} (+${t.weight})`);

  const parts: string[] = [];
  if (boostedPhotogs.length > 0) parts.push(`Boosted Photographers: ${boostedPhotogs.join(', ')}`);
  if (boostedPubs.length > 0) parts.push(`Preferred Publications: ${boostedPubs.join(', ')}`);
  if (boostedTags.length > 0) parts.push(`Preferred Aesthetic Vectors: ${boostedTags.join(', ')}`);
  if (penalizedPhotogs.length > 0) parts.push(`Deprioritized / Rejected: ${penalizedPhotogs.join(', ')}`);

  return {
    photographerWeights,
    publicationWeights,
    tagWeights,
    photographers,
    publications,
    tags,
    promptDirectiveSummary:
      parts.length > 0
        ? parts.join(' | ')
        : 'No human approval/rejection signals recorded yet; operating on baseline curatorial weights.',
  };
}

/**
 * Calculates how much a candidate post's score should be boosted or penalized
 * based on active Learning Signals.
 */
export function calculatePostLearningDelta(
  post: EditorialPost,
  signals: EditorialLearningSignal[] = []
): { delta: number; matchedReasons: string[] } {
  if (!signals || signals.length === 0) {
    return { delta: 0, matchedReasons: [] };
  }

  const profile = computeLearningProfile(signals);
  let rawDelta = 0;
  const matchedReasons: string[] = [];

  const photogKey = (post.photographer || '').trim().toLowerCase();
  if (photogKey && profile.photographerWeights[photogKey]) {
    const w = profile.photographerWeights[photogKey];
    rawDelta += w;
    matchedReasons.push(`Photographer ${post.photographer} (${w > 0 ? `+${w}` : w})`);
  }

  const pubKey = (post.publication || '').trim().toLowerCase();
  if (pubKey && profile.publicationWeights[pubKey]) {
    const w = profile.publicationWeights[pubKey];
    rawDelta += w;
    matchedReasons.push(`Publication ${post.publication} (${w > 0 ? `+${w}` : w})`);
  }

  const hay = `${post.title} ${post.creativeDirection} ${post.brand || ''} ${(post.hashtags || []).join(' ')}`.toLowerCase();
  let tagBonus = 0;
  for (const t of profile.tags) {
    if (t.tag.length > 2 && hay.includes(t.tag)) {
      tagBonus += Math.sign(t.weight) * Math.min(3, Math.abs(t.weight));
    }
  }
  if (tagBonus !== 0) {
    rawDelta += tagBonus;
    matchedReasons.push(`Aesthetic Tags (${tagBonus > 0 ? `+${tagBonus}` : tagBonus})`);
  }

  const clampedDelta = Math.max(-15, Math.min(15, rawDelta));
  return { delta: clampedDelta, matchedReasons };
}

/**
 * Ranks fashion editorial discoveries by overall editorial score + active learning signal weights.
 */
export function rankCandidates(
  candidates: EditorialPost[],
  signals: EditorialLearningSignal[] = []
): EditorialPost[] {
  return [...candidates].sort((a, b) => {
    const scoreA = a.score.overall + calculatePostLearningDelta(a, signals).delta;
    const scoreB = b.score.overall + calculatePostLearningDelta(b, signals).delta;
    return scoreB - scoreA;
  });
}

/**
 * Selects the top 5 highest-ranked candidates for the daily curation, incorporating active learning weights.
 */
export function selectDailyTop5(
  candidates: EditorialPost[],
  signals: EditorialLearningSignal[] = []
): EditorialPost[] {
  const ranked = rankCandidates(candidates, signals);
  return ranked.slice(0, 5).map((post) => ({
    ...post,
    isDailyTop5: true,
    status: post.status === 'candidate' ? 'selected' : post.status,
  }));
}

/**
 * Filters rights-cleared items for Instagram draft preparation (up to limit, typically 2).
 */
export function filterRightsClearedForDrafts(posts: EditorialPost[], limit = 2): EditorialPost[] {
  return posts
    .filter((post) => post.rightsStatus === 'verified')
    .slice(0, limit);
}

import { EditorialPost, EditorialScore } from '../types/editorial';

export interface ScoreFactors {
  composition: number; // 0 - 100
  lighting: number; // 0 - 100
  styling: number; // 0 - 100
  culturalRelevance: number; // 0 - 100
  narrative: number; // 0 - 100
  rationale?: string;
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
    rationale: factors.rationale || 'Balanced high-contrast aesthetic with verified editorial credit.'
  };
}

/**
 * Ranks fashion editorial discoveries by overall editorial score in descending order.
 */
export function rankCandidates(candidates: EditorialPost[]): EditorialPost[] {
  return [...candidates].sort((a, b) => b.score.overall - a.score.overall);
}

/**
 * Selects the top 5 highest-ranked candidates for the daily curation.
 */
export function selectDailyTop5(candidates: EditorialPost[]): EditorialPost[] {
  const ranked = rankCandidates(candidates);
  return ranked.slice(0, 5).map((post, idx) => ({
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

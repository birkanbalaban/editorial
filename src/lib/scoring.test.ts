import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateEditorialScore, rankCandidates, selectDailyTop5, filterRightsClearedForDrafts } from './scoring';
import { EditorialPost } from '../types/editorial';

function createDummyPost(id: string, scoreVal: number, rights: 'verified' | 'pending' | 'unlicensed'): EditorialPost {
  return {
    id,
    title: `Editorial ${id}`,
    photographer: 'Paolo Roversi',
    publication: 'Vogue Italia',
    publicationDate: '2026-11-10',
    sourceUrl: 'https://vogue.it/archive/123',
    imageUrls: ['/image1.jpg'],
    aspectRatio: '3:4',
    score: {
      overall: scoreVal,
      composition: scoreVal,
      lighting: scoreVal,
      styling: scoreVal,
      culturalRelevance: scoreVal,
      narrative: scoreVal,
      rationale: 'Exemplary editorial vision',
    },
    creativeDirection: 'Sculptural minimalism',
    rightsStatus: rights,
    rightsVerificationRecord: {
      sourceLicense: 'Syndication Direct',
      authorizedForSocialMedia: rights === 'verified',
      usageNotes: 'Approved for digital archival feed',
    },
    publishingReadiness: rights === 'verified' ? 'ready' : 'needs_rights',
    caption: 'Haute couture editorial monograph.',
    hashtags: ['#fashioneditorial', '#vogueitalia'],
    altText: 'Model in architectural black couture gown',
    credits: {
      photographer: 'Paolo Roversi',
      publication: 'Vogue Italia',
    },
    isDailyTop5: false,
    isCandidate: true,
    status: 'candidate',
  };
}

test('calculateEditorialScore correctly weights factors', () => {
  const score = calculateEditorialScore({
    composition: 90, // 22.5
    lighting: 90,    // 22.5
    styling: 80,     // 16.0
    culturalRelevance: 70, // 10.5
    narrative: 70,   // 10.5 => Total 82
  });

  assert.equal(score.overall, 82);
  assert.equal(score.composition, 90);
  assert.equal(score.lighting, 90);
});

test('rankCandidates sorts items in descending order of score', () => {
  const posts = [
    createDummyPost('1', 75, 'verified'),
    createDummyPost('2', 95, 'verified'),
    createDummyPost('3', 88, 'pending'),
  ];
  const ranked = rankCandidates(posts);
  assert.equal(ranked[0].id, '2');
  assert.equal(ranked[1].id, '3');
  assert.equal(ranked[2].id, '1');
});

test('selectDailyTop5 selects exactly up to 5 items and tags them', () => {
  const pool = Array.from({ length: 10 }, (_, i) => createDummyPost(`p-${i}`, 70 + i, 'verified'));
  const top5 = selectDailyTop5(pool);
  assert.equal(top5.length, 5);
  assert.equal(top5[0].id, 'p-9'); // highest score
  assert.equal(top5[0].isDailyTop5, true);
  assert.equal(top5[0].status, 'selected');
});

test('filterRightsClearedForDrafts restricts to verified rights and max limit', () => {
  const posts = [
    createDummyPost('v1', 90, 'verified'),
    createDummyPost('u1', 88, 'unlicensed'),
    createDummyPost('v2', 85, 'verified'),
    createDummyPost('v3', 82, 'verified'),
  ];
  const drafts = filterRightsClearedForDrafts(posts, 2);
  assert.equal(drafts.length, 2);
  assert.equal(drafts[0].id, 'v1');
  assert.equal(drafts[1].id, 'v2');
  assert.ok(drafts.every(d => d.rightsStatus === 'verified'));
});

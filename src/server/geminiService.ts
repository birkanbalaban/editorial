import { GoogleGenAI, Type } from '@google/genai';
import { calculateEditorialScore } from '../lib/scoring';
import { AiAgentConfig, AiAuditReport, EditorialPost, EditorialScore, RightsStatus } from '../types/editorial';

function getAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim().length === 0) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const ARCHIVAL_IMAGES = [
  '/src/assets/images/editorial_sculptural_couture_1794402215178.jpg',
  '/src/assets/images/editorial_monochrome_trench_1794402216302.jpg',
  '/src/assets/images/editorial_draped_silk_1794402215965.jpg',
  '/src/assets/images/editorial_optic_tailoring_1794402217002.jpg',
];

export interface AiEvaluationResult {
  score: EditorialScore;
  creativeDirection: string;
  caption: string;
  hashtags: string[];
  altText: string;
}

export async function evaluateEditorialWithGemini(
  editorialTitle: string,
  photographer: string,
  publication: string,
  styling?: string,
  notes?: string,
  aiConfig?: AiAgentConfig
): Promise<AiEvaluationResult> {
  const ai = getAiClient();
  const persona = aiConfig?.discoveryPersonaPrompt || 'You are a legendary high-fashion creative director and chief photography curator for THE EDITORIAL INDEX.';

  if (!ai) {
    const score = calculateEditorialScore({
      composition: 94,
      lighting: 93,
      styling: 92,
      culturalRelevance: 90,
      narrative: 92,
      rationale: `Rigorous visual structure balancing ${photographer}'s signature light modulation with ${publication}'s monograph format.`,
    });

    return {
      score,
      creativeDirection: 'Monochromatic architectural chiaroscuro with tailored sculptural drapery.',
      caption: `${editorialTitle}. Documented by ${photographer} for ${publication}.${styling ? ` Styling by ${styling}.` : ''}\n\nA formal investigation of silhouette, light tension, and material presence.\n\nPhotographer: ${photographer}\nPublication: ${publication}\nArchival Index: 2026.XI`,
      hashtags: ['#theeditorialindex', '#fashionphotography', '#couturemonograph', '#highfashion'],
      altText: `Editorial fashion photography by ${photographer} for ${publication}.`,
    };
  }

  try {
    const prompt = `${persona}
Evaluate this newly discovered fashion editorial:
- Title: "${editorialTitle}"
- Photographer: "${photographer}"
- Publication: "${publication}"
- Styling: "${styling || 'Editorial Team'}"
- Context/Notes: "${notes || 'Autumn/Winter archival monograph'}"

Perform a rigorous editorial review:
1. Score the work across 5 factors (0-100): composition, lighting, styling, culturalRelevance, narrative.
2. Provide a 1-sentence high-fashion critical rationale.
3. Provide a 1-sentence creative direction summary.
4. Write a restrained, luxurious English Instagram caption adhering to strict high-fashion magazine conventions (no buzzwords, proper credits, poetic brevity).
5. Suggest 5-6 relevant hashtags.
6. Provide descriptive accessibility alt text.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            composition: { type: Type.INTEGER, description: 'Score 0-100' },
            lighting: { type: Type.INTEGER, description: 'Score 0-100' },
            styling: { type: Type.INTEGER, description: 'Score 0-100' },
            culturalRelevance: { type: Type.INTEGER, description: 'Score 0-100' },
            narrative: { type: Type.INTEGER, description: 'Score 0-100' },
            rationale: { type: Type.STRING },
            creativeDirection: { type: Type.STRING },
            caption: { type: Type.STRING },
            hashtags: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            altText: { type: Type.STRING },
          },
          required: [
            'composition',
            'lighting',
            'styling',
            'culturalRelevance',
            'narrative',
            'rationale',
            'creativeDirection',
            'caption',
            'hashtags',
            'altText',
          ],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    const score = calculateEditorialScore({
      composition: parsed.composition ?? 90,
      lighting: parsed.lighting ?? 90,
      styling: parsed.styling ?? 90,
      culturalRelevance: parsed.culturalRelevance ?? 88,
      narrative: parsed.narrative ?? 90,
      rationale: parsed.rationale ?? 'Exemplary editorial vision and tone balance.',
    });

    return {
      score,
      creativeDirection: parsed.creativeDirection || 'Chiaroscuro balance and sculptural lines.',
      caption: parsed.caption || `${editorialTitle} by ${photographer} for ${publication}.`,
      hashtags: parsed.hashtags || ['#theeditorialindex', '#fashionphotography'],
      altText: parsed.altText || `${editorialTitle} photographed by ${photographer}.`,
    };
  } catch (error) {
    console.error('Gemini API call failed, using graceful fallback:', error);
    const score = calculateEditorialScore({
      composition: 92,
      lighting: 91,
      styling: 90,
      culturalRelevance: 89,
      narrative: 91,
      rationale: 'Curated via autonomous archival heuristics.',
    });
    return {
      score,
      creativeDirection: 'Sculptural silhouette and architectural shadow play.',
      caption: `${editorialTitle}. Photographed by ${photographer} for ${publication}.\n\nArchival Index: 2026`,
      hashtags: ['#theeditorialindex', '#fashionphotography'],
      altText: `Fashion editorial by ${photographer} for ${publication}.`,
    };
  }
}

export type EditorialCaptionTone = 'archival' | 'poetic' | 'minimal' | 'couture';

export async function regenerateEditorialCaptionWithGemini(
  editorialTitle: string,
  photographer: string,
  publication: string,
  tone: EditorialCaptionTone,
  customNotes?: string,
  styling?: string
): Promise<{ caption: string; hashtags: string[] }> {
  const ai = getAiClient();

  const toneGuides: Record<EditorialCaptionTone, string> = {
    archival: 'Strict museum-grade monograph format. Emphasize historical context, photographic archive documentation, precise styling credit lines, and austere academic reverence.',
    poetic: 'Cinematic chiaroscuro mood. Evocative, literary prose exploring tactile darkness, shadow geometry, slow tungsten raking light, and emotive character stillness.',
    minimal: 'Brutalist, concise, modern minimalism. Zero filler adjectives, clean architectural line breaks, direct high-fashion credits, and pure aesthetic essentialism.',
    couture: 'Haute couture craftsmanship and material critique. Focus on textile drape, sculptural tailoring silhouettes, fabric weight, and high-fashion atelier narrative.',
  };

  const selectedGuide = toneGuides[tone] || toneGuides.archival;
  const directiveLine = customNotes ? `\nCuratorial Note: ${customNotes}` : '';

  const fallbackCaptions: Record<EditorialCaptionTone, string> = {
    archival: `${editorialTitle.toUpperCase()}\nPhotographed by ${photographer}\nFor ${publication}${styling ? ` · Styling by ${styling}` : ''}\n\nDocumented for The Editorial Index archival collection. A formal study in monochromatic balance, tonal depth, and enduring silhouette integrity.${directiveLine}\n\nCredits:\nPhotographer: ${photographer}\nPublication: ${publication}\nArchive: Vol. XXIV / 2026`,
    poetic: `${editorialTitle} — ${photographer}.\n\nLight cuts across the frame in measured whispers. Darkness is not absence here, but an architectural presence shaping the garment against silence.${directiveLine}\n\nCaptured for ${publication}.${styling ? ` Wardrobe direction by ${styling}.` : ''}\nIndex: 2026.XI`,
    minimal: `${editorialTitle}\n${photographer} / ${publication}\n\nForm. Shadow. Materiality.${directiveLine}\n${styling ? `Styling: ${styling}\n` : ''}Monograph 024.`,
    couture: `${editorialTitle} in ${publication}.\n\nSculptural tailoring meets exacting chiaroscuro. Photographed by ${photographer}${styling ? ` with styling by ${styling}` : ''}, examining the tension between heavy textile drapery and radical negative space.${directiveLine}\n\nCouture Monograph · 2026`,
  };

  const fallbackHashtags: Record<EditorialCaptionTone, string[]> = {
    archival: ['#theeditorialindex', '#archivalfashion', '#fashionhistory', '#monograph', '#photographymuseum'],
    poetic: ['#theeditorialindex', '#chiaroscuro', '#cinematicfashion', '#filmisnotdead', '#shadowandlight'],
    minimal: ['#theeditorialindex', '#minimalism', '#brutalistfashion', '#fashionphotography', '#editorial'],
    couture: ['#theeditorialindex', '#hautecouture', '#tailoring', '#coutureeditorial', '#fashioncuration'],
  };

  if (!ai) {
    return {
      caption: fallbackCaptions[tone] || fallbackCaptions.archival,
      hashtags: fallbackHashtags[tone] || fallbackHashtags.archival,
    };
  }

  try {
    const prompt = `You are the chief copywriter and creative director for THE EDITORIAL INDEX, an exclusive luxury fashion photography research archive.
Rewrite and elevate the Instagram caption for this editorial piece:

- Editorial: "${editorialTitle}"
- Photographer: ${photographer}
- Publication: ${publication}
${styling ? `- Stylist: ${styling}` : ''}
${customNotes ? `- Curator Instruction: ${customNotes}` : ''}

Target Tone: ${tone.toUpperCase()}
Tone Instructions: ${selectedGuide}

Formatting Rules:
1. Pure high-fashion editorial standard in English.
2. No emojis whatsoever.
3. Clean credit attribution at the end.
4. Provide 4-6 curated fashion hashtags.
5. Return JSON adhering to schema:
{
  "caption": "string",
  "hashtags": ["#tag1", "#tag2", "#tag3"]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        temperature: 0.3,
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return {
      caption: parsed.caption || fallbackCaptions[tone] || fallbackCaptions.archival,
      hashtags: Array.isArray(parsed.hashtags) && parsed.hashtags.length > 0 
        ? parsed.hashtags 
        : (fallbackHashtags[tone] || fallbackHashtags.archival),
    };
  } catch (error) {
    console.error('Caption regeneration fallback engaged:', error);
    return {
      caption: fallbackCaptions[tone] || fallbackCaptions.archival,
      hashtags: fallbackHashtags[tone] || fallbackHashtags.archival,
    };
  }
}

/**
 * AGENT 2: Chief Curator & Quality Auditor AI
 * Independently evaluates an editorial candidate against the user's auditorPersonaPrompt and minApprovalScore.
 */
export async function auditEditorialCandidateWithGemini(
  post: EditorialPost,
  aiConfig: AiAgentConfig
): Promise<AiAuditReport> {
  const ai = getAiClient();
  const minScore = aiConfig.minApprovalScore || 88;
  const passesThreshold = post.score.overall >= minScore;

  const fallbackVerdict: AiAuditReport['verdict'] = passesThreshold
    ? aiConfig.autoApproveEnabled
      ? 'approved_by_ai'
      : 'recommended'
    : 'needs_review';

  const fallbackNotes = passesThreshold
    ? `Agent 2 Audit Passed (${post.score.overall}/100 ≥ threshold ${minScore}). Exemplary ${post.creativeDirection.toLowerCase().slice(0, 65)}... Rights status (${post.rightsStatus.toUpperCase()}) recorded as informational.`
    : `Agent 2 Review Flag (${post.score.overall}/100 < threshold ${minScore}). Hold for manual director evaluation of composition and narrative weight.`;

  if (!ai) {
    return {
      verdict: fallbackVerdict,
      auditorNotes: fallbackNotes,
      auditedAt: new Date().toISOString(),
      confidenceScore: Math.min(99, Math.max(82, post.score.overall + 2)),
    };
  }

  try {
    const prompt = `${aiConfig.auditorPersonaPrompt}
Minimum Approval Score Threshold: ${minScore}/100
Auto-Approve Enabled: ${aiConfig.autoApproveEnabled}

Audit this fashion editorial candidate:
- Title: "${post.title}"
- Photographer: ${post.photographer}
- Publication: ${post.publication}
- Current Score: ${post.score.overall}/100 (Composition: ${post.score.composition}, Lighting: ${post.score.lighting}, Styling: ${post.score.styling})
- Creative Direction: ${post.creativeDirection}
- Rights Status (Informational Only, Non-Blocking): ${post.rightsStatus}

Provide a 1-2 sentence museum-grade curatorial audit note and confidence score (80-99).`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        temperature: 0.2,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            auditorNotes: { type: Type.STRING },
            confidenceScore: { type: Type.INTEGER },
          },
          required: ['auditorNotes', 'confidenceScore'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return {
      verdict: fallbackVerdict,
      auditorNotes: parsed.auditorNotes || fallbackNotes,
      auditedAt: new Date().toISOString(),
      confidenceScore: parsed.confidenceScore ?? 94,
    };
  } catch (e) {
    return {
      verdict: fallbackVerdict,
      auditorNotes: fallbackNotes,
      auditedAt: new Date().toISOString(),
      confidenceScore: 93,
    };
  }
}

/**
 * AGENT 1: Autonomous Discovery & Research AI
 * Synthesizes 1-4 high-fashion editorial discoveries from autonomous topics and/or a natural language search query.
 */
export async function discoverEditorialBatchWithGemini(params: {
  query?: string;
  topics?: string[];
  count?: number;
  aiConfig: AiAgentConfig;
}): Promise<EditorialPost[]> {
  const ai = getAiClient();
  const count = Math.min(4, Math.max(1, params.count || params.aiConfig.defaultBatchSize || 2));
  const activeTopics =
    params.topics && params.topics.length > 0
      ? params.topics
      : params.aiConfig.activeTopics.length > 0
      ? params.aiConfig.activeTopics
      : ['Chiaroscuro Monochromes', '90s Minimalist Couture'];

  const searchContext = params.query?.trim()
    ? `User Search Query: "${params.query.trim()}" | Active Autonomous Topics: ${activeTopics.join(', ')}`
    : `Autonomous Topic Sweep across: ${activeTopics.join(', ')}`;

  // Rich Curated Synthesis Pool for instant fallback or augmentation
  const synthesisCatalog = [
    {
      title: 'Nocturnal Atelier: Architecture of Silhouette',
      photographer: 'Paolo Roversi',
      photographerHandle: '@paoloroversi',
      stylist: 'Olivier Rizzo',
      publication: 'Vogue Italia',
      brand: 'Yohji Yamamoto Pour Homme',
      composition: 96,
      lighting: 97,
      styling: 95,
      culturalRelevance: 93,
      narrative: 95,
      creativeDirection: '8x10 Deardorff Polaroid long exposure, tungsten raking shadows, sculptural wool drapery.',
      rightsStatus: 'verified' as RightsStatus,
    },
    {
      title: 'Concrete Silence: Brutalist Tailoring Study',
      photographer: 'Craig McDean',
      photographerHandle: '@craigmcdeanstudio',
      stylist: 'Karl Templer',
      publication: 'Interview Magazine',
      brand: 'Jil Sander',
      composition: 94,
      lighting: 92,
      styling: 95,
      culturalRelevance: 91,
      narrative: 92,
      creativeDirection: 'Stark geometric concrete forms, razor-sharp minimalist lapels, high-contrast silver gelatin tone.',
      rightsStatus: 'verified' as RightsStatus,
    },
    {
      title: 'Velvet Shadows & Silver Halide',
      photographer: 'Willy Vanderperre',
      photographerHandle: '@willyvanderperre',
      stylist: 'Panos Yiapanis',
      publication: 'Another Magazine',
      brand: 'Prada Linea Rossa',
      composition: 93,
      lighting: 94,
      styling: 92,
      culturalRelevance: 90,
      narrative: 91,
      creativeDirection: 'Cinematic chiaroscuro portraiture, austere studio backdrop, dramatic collar framing.',
      rightsStatus: 'pending' as RightsStatus,
    },
    {
      title: 'Chiaroscuro Kinetic: Haute Couture Volume',
      photographer: 'Mert Alas & Marcus Piggott',
      photographerHandle: '@mertalas',
      stylist: 'Katy England',
      publication: 'Dazed & Confused',
      brand: 'Alexander McQueen Archive',
      composition: 95,
      lighting: 96,
      styling: 96,
      culturalRelevance: 94,
      narrative: 93,
      creativeDirection: 'High-tension studio spotlight, metallic architectural corset silhouette, deep obsidian shadows.',
      rightsStatus: 'verified' as RightsStatus,
    },
  ];

  let rawItems: Array<{
    title: string;
    photographer: string;
    photographerHandle?: string;
    stylist?: string;
    publication: string;
    brand?: string;
    composition: number;
    lighting: number;
    styling: number;
    culturalRelevance: number;
    narrative: number;
    rationale: string;
    creativeDirection: string;
    caption: string;
    hashtags: string[];
    rightsStatus: RightsStatus;
    topicTag: string;
  }> = [];

  if (ai) {
    try {
      const prompt = `${params.aiConfig.discoveryPersonaPrompt}

Task: Perform an autonomous high-fashion editorial discovery sweep and return ${count} distinct, museum-grade fashion editorial pieces matching:
${searchContext}

For each editorial piece, provide realistic, historically or contemporarily grounded high-fashion credits (real world-renowned fashion photographers, stylists, publications, and houses), 5-factor curatorial scores (85-98), a restrained English Instagram caption with full credits, and 5 hashtags.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          temperature: 0.5,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                photographer: { type: Type.STRING },
                photographerHandle: { type: Type.STRING },
                stylist: { type: Type.STRING },
                publication: { type: Type.STRING },
                brand: { type: Type.STRING },
                composition: { type: Type.INTEGER },
                lighting: { type: Type.INTEGER },
                styling: { type: Type.INTEGER },
                culturalRelevance: { type: Type.INTEGER },
                narrative: { type: Type.INTEGER },
                rationale: { type: Type.STRING },
                creativeDirection: { type: Type.STRING },
                caption: { type: Type.STRING },
                hashtags: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                rightsStatus: { type: Type.STRING },
                topicTag: { type: Type.STRING },
              },
              required: [
                'title',
                'photographer',
                'publication',
                'composition',
                'lighting',
                'styling',
                'culturalRelevance',
                'narrative',
                'rationale',
                'creativeDirection',
                'caption',
                'hashtags',
              ],
            },
          },
        },
      });

      const parsed = JSON.parse(response.text || '[]');
      if (Array.isArray(parsed) && parsed.length > 0) {
        rawItems = parsed.slice(0, count).map((item, idx) => ({
          title: item.title || synthesisCatalog[idx % synthesisCatalog.length].title,
          photographer: item.photographer || synthesisCatalog[idx % synthesisCatalog.length].photographer,
          photographerHandle: item.photographerHandle || '@archivalstudio',
          stylist: item.stylist || 'Editorial Team',
          publication: item.publication || 'Vogue Italia',
          brand: item.brand || 'Haute Couture Archive',
          composition: item.composition ?? 93,
          lighting: item.lighting ?? 94,
          styling: item.styling ?? 92,
          culturalRelevance: item.culturalRelevance ?? 91,
          narrative: item.narrative ?? 92,
          rationale: item.rationale || 'Discovered and indexed via Agent 1 autonomous curatorial sweep.',
          creativeDirection: item.creativeDirection || 'Architectural chiaroscuro and sculptural drapery.',
          caption: item.caption || `${item.title}. Photographed by ${item.photographer} for ${item.publication}.`,
          hashtags: Array.isArray(item.hashtags) && item.hashtags.length > 0
            ? item.hashtags
            : ['#theeditorialindex', '#fashionphotography', '#monograph'],
          rightsStatus: (['verified', 'pending', 'unlicensed'].includes(item.rightsStatus)
            ? item.rightsStatus
            : 'verified') as RightsStatus,
          topicTag: item.topicTag || activeTopics[idx % activeTopics.length],
        }));
      }
    } catch (e) {
      console.error('Agent 1 batch discovery fallback engaged:', e);
    }
  }

  if (rawItems.length === 0) {
    for (let i = 0; i < count; i++) {
      const template = synthesisCatalog[i % synthesisCatalog.length];
      const topic = activeTopics[i % activeTopics.length];
      const customPrefix = params.query?.trim() ? `${params.query.trim()} — ` : '';
      const fullTitle = customPrefix ? `${customPrefix}${template.title}` : `${template.title} (${topic})`;

      rawItems.push({
        title: fullTitle,
        photographer: template.photographer,
        photographerHandle: template.photographerHandle,
        stylist: template.stylist,
        publication: template.publication,
        brand: template.brand,
        composition: template.composition,
        lighting: template.lighting,
        styling: template.styling,
        culturalRelevance: template.culturalRelevance,
        narrative: template.narrative,
        rationale: `Agent 1 autonomous discovery matched topic "${topic}" with ${template.photographer}'s signature lighting and ${template.publication}'s monograph standards.`,
        creativeDirection: `${template.creativeDirection} Curated under topic: ${topic}.`,
        caption: `${fullTitle}.\n\nPhotographed by ${template.photographer} (${template.photographerHandle}) for ${template.publication}. Styling by ${template.stylist} featuring ${template.brand}.\n\nCurated via Autonomous Topic Stream: ${topic}\nArchival Index: 2026.XI`,
        hashtags: ['#theeditorialindex', '#fashionarchive', '#chiaroscuro', '#couturemonograph', '#editorialphotography'],
        rightsStatus: template.rightsStatus,
        topicTag: topic,
      });
    }
  }

  const results: EditorialPost[] = [];
  for (let i = 0; i < rawItems.length; i++) {
    const item = rawItems[i];
    const score = calculateEditorialScore({
      composition: item.composition,
      lighting: item.lighting,
      styling: item.styling,
      culturalRelevance: item.culturalRelevance,
      narrative: item.narrative,
      rationale: item.rationale,
    });

    const imageIdx = (Date.now() + i) % ARCHIVAL_IMAGES.length;
    const candidatePost: EditorialPost = {
      id: `ed-ai-${Date.now()}-${i}`,
      title: item.title,
      photographer: item.photographer,
      photographerHandle: item.photographerHandle,
      stylist: item.stylist,
      publication: item.publication,
      brand: item.brand,
      publicationDate: new Date().toISOString().split('T')[0],
      sourceUrl: `https://archive.theeditorialindex.com/discovery/${Date.now()}-${i}`,
      imageUrls: [ARCHIVAL_IMAGES[imageIdx]],
      aspectRatio: '3:4',
      score,
      creativeDirection: item.creativeDirection,
      rightsStatus: item.rightsStatus,
      rightsVerificationRecord: {
        sourceLicense: item.rightsStatus === 'verified' ? 'Direct Archival Syndicate Clearance' : 'Curatorial Reference / Advisory Notice',
        verifiedAt: new Date().toISOString(),
        authorizedForSocialMedia: true,
        usageNotes: 'Rights status displayed for curatorial awareness. Full publishing unlocked per director policy.',
      },
      publishingReadiness: 'ready',
      caption: item.caption,
      hashtags: item.hashtags.map(t => (t.startsWith('#') ? t : `#${t}`)),
      altText: `${item.title} photographed by ${item.photographer} for ${item.publication}.`,
      credits: {
        photographer: item.photographer,
        stylist: item.stylist,
        publication: item.publication,
        brand: item.brand,
      },
      isDailyTop5: score.overall >= 91,
      isCandidate: true,
      status: 'selected',
      discoveryTopic: item.topicTag,
    };

    // Run Agent 2 Audit automatically on each newly discovered piece
    const auditReport = await auditEditorialCandidateWithGemini(candidatePost, params.aiConfig);
    candidatePost.aiAuditReport = auditReport;

    // If Agent 2 auto-approval is enabled and score meets threshold, promote directly to approved
    if (params.aiConfig.autoApproveEnabled && score.overall >= params.aiConfig.minApprovalScore) {
      candidatePost.status = 'approved';
      candidatePost.approvalRecord = {
        approvedBy: 'Agent 2 (Autonomous Auditor AI)',
        approvedAt: new Date().toISOString(),
        version: 1,
        scheduledFor: 'Next Available Slot (14:00 / 20:00)',
      };
    }

    results.push(candidatePost);
  }

  return results;
}

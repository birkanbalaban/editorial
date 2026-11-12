import fs from 'node:fs';
import path from 'node:path';
import { 
  EditorialPost, 
  InstagramAccountConfig, 
  SystemSettings, 
  WorkflowExecutionLog,
  EditorialLearningSignal,
  EditorialEngagementPoint,
  AiAgentConfig,
  RssFeedConfig
} from '../types/editorial';
import { computeContentHash } from '../lib/publishingRules';

const DATA_DIR = path.resolve(process.cwd(), '.data');
const DB_FILE = path.join(DATA_DIR, 'editorial_db.json');

export interface DatabaseState {
  posts: EditorialPost[];
  settings: SystemSettings;
  instagram: InstagramAccountConfig;
  aiAgentConfig: AiAgentConfig;
  rssFeeds: RssFeedConfig[];
  excludedKeywords: string[];
  workflowLogs: WorkflowExecutionLog[];
  learningSignals: EditorialLearningSignal[];
  engagementPoints: EditorialEngagementPoint[];
  publishedTodayCount: number;
  lastResetDate: string;
}

const DEFAULT_POSTS: EditorialPost[] = [
  {
    id: 'ed-01',
    title: 'Monolith in Motion: Brutal Romance',
    photographer: 'Sølve Sundsbø',
    photographerHandle: '@solvesundsbostudio',
    stylist: 'Edward Enninful',
    model: 'Mica Argañaraz',
    publication: "Harper's Bazaar UK",
    brand: 'Saint Laurent by Anthony Vaccarello',
    publicationDate: '2026-11-10',
    sourceUrl: 'https://archive.harpersbazaar.com/2026/brutal-romance',
    imageUrls: ['/src/assets/images/editorial_monochrome_trench_1794402216302.jpg'],
    candidateImages: [
      '/src/assets/images/editorial_monochrome_trench_1794402216302.jpg',
      'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1080&q=85',
      'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1080&q=85',
      'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=1080&q=85',
    ],
    aspectRatio: '3:4',
    score: {
      overall: 96,
      composition: 98,
      lighting: 95,
      styling: 97,
      culturalRelevance: 94,
      narrative: 96,
      rationale: 'Masterful architectural framing within London brutalist estate. Chiaroscuro morning fog highlights tailored leather silhouette.',
    },
    creativeDirection: 'Brutalist European architecture in natural morning mist. Heavy grain, stark geometric balance.',
    rightsStatus: 'verified',
    rightsVerificationRecord: {
      sourceLicense: 'Syndication Direct / Condé Nast & Hearst Archival',
      verifiedAt: '2026-11-10T14:30:00Z',
      authorizedForSocialMedia: true,
      usageNotes: 'Global digital archival publishing permitted with explicit photographer & publication attribution.',
      contractRef: 'CN-SYND-2026-8841',
    },
    publishingReadiness: 'ready',
    caption: 'Structured monoliths in London morning mist. Sølve Sundsbø frames Mica Argañaraz in Saint Laurent tailored leather, contrasting brutalist concrete with fluid restraint.\n\nPhotographer: @solvesundsbostudio\nStyling: @edward_enninful\nPublication: @bazaaruk\nArchival Index: 2026.XI.10',
    hashtags: ['#theeditorialindex', '#solvesundsbo', '#harpersbazaar', '#saintlaurent', '#fashionphotography', '#editorialmonograph'],
    altText: 'Full-length fashion editorial of model in black leather trench standing on concrete balcony against misty brutalist towers.',
    credits: {
      photographer: 'Sølve Sundsbø',
      stylist: 'Edward Enninful',
      model: 'Mica Argañaraz',
      publication: "Harper's Bazaar UK",
      brand: 'Saint Laurent',
    },
    isDailyTop5: true,
    isCandidate: true,
    status: 'selected',
  },
  {
    id: 'ed-02',
    title: 'Sculptural Geometry & Chiaroscuro',
    photographer: 'Paolo Roversi',
    photographerHandle: '@paoloroversi',
    stylist: 'Grace Coddington',
    model: 'Mariacarla Boscono',
    publication: 'Vogue Italia',
    brand: 'Balenciaga Haute Couture',
    publicationDate: '2026-11-09',
    sourceUrl: 'https://vogue.it/moda/article/sculptural-geometry-roversi',
    imageUrls: ['/src/assets/images/editorial_sculptural_couture_1794402215178.jpg'],
    candidateImages: [
      '/src/assets/images/editorial_sculptural_couture_1794402215178.jpg',
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1080&q=85',
      'https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=1080&q=85',
      'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1080&q=85',
    ],
    aspectRatio: '3:4',
    score: {
      overall: 95,
      composition: 96,
      lighting: 97,
      styling: 94,
      culturalRelevance: 93,
      narrative: 95,
      rationale: 'Signature 8x10 Deardorff camera depth with slow directional tungsten glow. Exaggerated midnight wool silhouette elevates haute couture sculpturing.',
    },
    creativeDirection: 'Slow-shutter painterly chiaroscuro, raw industrial concrete floor, exaggerated dark architectural drapery.',
    rightsStatus: 'verified',
    rightsVerificationRecord: {
      sourceLicense: 'Vogue Italia Archival Retrospective License',
      verifiedAt: '2026-11-09T18:00:00Z',
      authorizedForSocialMedia: true,
      usageNotes: 'Approved for non-commercial curation and official editorial publishing.',
      contractRef: 'VI-LIC-9022-A',
    },
    publishingReadiness: 'ready',
    caption: 'The architectural resonance of haute couture. Paolo Roversi captures Mariacarla Boscono in Balenciaga Couture, exploring dramatic volume against minimalist concrete.\n\nPhotographer: @paoloroversi\nStyling: @therealgracecoddington\nPublication: @vogueitalia',
    hashtags: ['#theeditorialindex', '#paoloroversi', '#vogueitalia', '#balenciagacouture', '#mariacarlaboscono', '#couturephotography'],
    altText: 'Avant-garde couture portrait of model in architectural midnight blue sculptural gown with flared shoulders in concrete studio.',
    credits: {
      photographer: 'Paolo Roversi',
      stylist: 'Grace Coddington',
      model: 'Mariacarla Boscono',
      publication: 'Vogue Italia',
      brand: 'Balenciaga Haute Couture',
    },
    isDailyTop5: true,
    isCandidate: true,
    status: 'approved',
    approvalRecord: {
      approvedBy: 'Senior Editorial Curator',
      approvedAt: '2026-11-11T07:45:00Z',
      version: 1,
      scheduledFor: '2026-11-11T14:00:00+03:00',
    },
  },
  {
    id: 'ed-03',
    title: 'Textured Shroud & Raw Sensation',
    photographer: 'Harley Weir',
    photographerHandle: '@harleyweir',
    stylist: 'Robbie Spencer',
    publication: 'Dazed & Confused',
    brand: 'Rick Owens',
    publicationDate: '2026-11-08',
    sourceUrl: 'https://dazeddigital.com/fashion/article/textured-shroud-weir',
    imageUrls: ['/src/assets/images/editorial_draped_silk_1794402215965.jpg'],
    candidateImages: [
      '/src/assets/images/editorial_draped_silk_1794402215965.jpg',
      'https://images.unsplash.com/photo-1502716119720-b23a93e5fe1b?auto=format&fit=crop&w=1080&q=85',
      'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1080&q=85',
      'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=1080&q=85',
    ],
    aspectRatio: '3:4',
    score: {
      overall: 92,
      composition: 91,
      lighting: 94,
      styling: 93,
      culturalRelevance: 90,
      narrative: 92,
      rationale: 'Raw organic intimacy. Frayed garment textures combined with natural raking window light create a timeless, tactile study.',
    },
    creativeDirection: 'Intimate portraiture, organic muted dyes, soft natural raking daylight, raw tactile materiality.',
    rightsStatus: 'verified',
    rightsVerificationRecord: {
      sourceLicense: 'Dazed Media Syndication',
      verifiedAt: '2026-11-08T11:15:00Z',
      authorizedForSocialMedia: true,
      usageNotes: 'Social publishing clearance granted with verified creative credits.',
      contractRef: 'DM-SYND-2026-441',
    },
    publishingReadiness: 'ready',
    caption: 'Tactile vulnerability and draped organic textiles. Harley Weir for Dazed, styled by Robbie Spencer in Rick Owens.\n\nPhotographer: @harleyweir\nStylist: @robbiespencer\nPublication: @dazed',
    hashtags: ['#theeditorialindex', '#harleyweir', '#dazed', '#rickowens', '#rawtexture', '#fashionportrait'],
    altText: 'Close-up editorial portrait of model draped in frayed dark and earth-toned hooded silks.',
    credits: {
      photographer: 'Harley Weir',
      stylist: 'Robbie Spencer',
      publication: 'Dazed & Confused',
      brand: 'Rick Owens',
    },
    isDailyTop5: true,
    isCandidate: true,
    status: 'selected',
  },
  {
    id: 'ed-04',
    title: 'Monolithic Proportions & Tailored Restraint',
    photographer: 'Alasdair McLellan',
    photographerHandle: '@alasdairmclellan',
    stylist: 'Jane How',
    publication: 'The Gentlewoman',
    brand: 'The Row',
    publicationDate: '2026-11-07',
    sourceUrl: 'https://thegentlewoman.co.uk/library/monolithic-proportions',
    imageUrls: ['/src/assets/images/editorial_optic_tailoring_1794402217002.jpg'],
    candidateImages: [
      '/src/assets/images/editorial_optic_tailoring_1794402217002.jpg',
      'https://images.unsplash.com/photo-1485230895905-ec40ba36b9bc?auto=format&fit=crop&w=1080&q=85',
      'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1080&q=85',
      'https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?auto=format&fit=crop&w=1080&q=85',
    ],
    aspectRatio: '3:4',
    score: {
      overall: 91,
      composition: 93,
      lighting: 89,
      styling: 94,
      culturalRelevance: 91,
      narrative: 88,
      rationale: 'Sharp rectilinear tailoring paired with brutalist pillars. Clean, calm authority without excess decoration.',
    },
    creativeDirection: 'Quiet luxury, sharp double-breasted lines, hard concrete brutalist architecture, midday sunlight.',
    rightsStatus: 'verified',
    rightsVerificationRecord: {
      sourceLicense: 'Gentlewoman Archive Collective',
      verifiedAt: '2026-11-07T16:00:00Z',
      authorizedForSocialMedia: true,
      usageNotes: 'Approved for digital monograph publication.',
      contractRef: 'GW-ARCH-2026-092',
    },
    publishingReadiness: 'ready',
    caption: 'Precision and presence. Alasdair McLellan documents The Row double-breasted tailoring against modernist architecture for The Gentlewoman.\n\nPhotographer: @alasdairmclellan\nStyling: Jane How\nPublication: @thegentlewoman',
    hashtags: ['#theeditorialindex', '#alasdairmclellan', '#thegentlewoman', '#therow', '#minimaltailoring'],
    altText: 'Full-length fashion editorial of model standing between concrete architectural pillars wearing oversized charcoal double-breasted suit.',
    credits: {
      photographer: 'Alasdair McLellan',
      stylist: 'Jane How',
      publication: 'The Gentlewoman',
      brand: 'The Row',
    },
    isDailyTop5: true,
    isCandidate: true,
    status: 'selected',
  },
  {
    id: 'ed-05',
    title: 'Submerged Nocturne: The Glass Pavilion',
    photographer: 'Steven Meisel',
    photographerHandle: '@stevenmeiselofficial',
    stylist: 'Carine Roitfeld',
    publication: 'Vogue France',
    brand: 'Maison Margiela Artisanal',
    publicationDate: '2026-11-06',
    sourceUrl: 'https://vogue.fr/mode/article/submerged-nocturne-meisel',
    imageUrls: ['https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1080&q=85'],
    candidateImages: [
      'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1080&q=85',
      'https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=1080&q=85',
      'https://images.unsplash.com/photo-1550614000-4895a10e1bfd?auto=format&fit=crop&w=1080&q=85',
      'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1080&q=85',
    ],
    aspectRatio: '3:4',
    score: {
      overall: 90,
      composition: 92,
      lighting: 91,
      styling: 92,
      culturalRelevance: 89,
      narrative: 86,
      rationale: 'Nocturnal cinematic narrative with deep emerald reflections and deconstructed couture silhouettes.',
    },
    creativeDirection: 'Cinematic nocturne, cinematic neon reflections, wet asphalt, deconstructed couture lines.',
    rightsStatus: 'unlicensed',
    rightsVerificationRecord: {
      sourceLicense: 'Pending Rights Negotiation',
      authorizedForSocialMedia: false,
      usageNotes: 'Reproduction rights currently unverified. Advisory notice recorded.',
    },
    publishingReadiness: 'ready',
    caption: 'Nocturnal glass pavilion and deconstructed couture silhouettes. Steven Meisel for Vogue France, styled by Carine Roitfeld in Maison Margiela Artisanal.',
    hashtags: ['#theeditorialindex', '#stevenmeisel', '#voguefrance', '#maisonmargiela'],
    altText: 'Editorial study of nocturnal couture photography.',
    credits: {
      photographer: 'Steven Meisel',
      stylist: 'Carine Roitfeld',
      publication: 'Vogue France',
      brand: 'Maison Margiela Artisanal',
    },
    isDailyTop5: true,
    isCandidate: true,
    status: 'selected',
  },
  {
    id: 'ed-06',
    title: 'Solarization Study in Monochrome',
    photographer: 'David Sims',
    photographerHandle: '@davidsimsoffice',
    publication: 'Self Service',
    brand: 'Prada',
    publicationDate: '2026-11-05',
    sourceUrl: 'https://selfservicemagazine.com/archive/david-sims-solarization',
    imageUrls: ['https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1080&q=85'],
    candidateImages: [
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1080&q=85',
      'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=1080&q=85',
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=1080&q=85',
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1080&q=85',
    ],
    aspectRatio: '3:4',
    score: {
      overall: 88,
      composition: 89,
      lighting: 90,
      styling: 86,
      culturalRelevance: 87,
      narrative: 88,
      rationale: 'Experimental silver gelatin solarization and stark high-contrast framing.',
    },
    creativeDirection: 'Silver gelatin solarization, high contrast black and white, avant-garde studio.',
    rightsStatus: 'pending',
    rightsVerificationRecord: {
      sourceLicense: 'Self Service Syndicate clearance requested',
      authorizedForSocialMedia: false,
      usageNotes: 'Rights negotiation active; advisory notice only.',
    },
    publishingReadiness: 'ready',
    caption: 'Experimental darkroom processing and monochrome structure. David Sims for Self Service.',
    hashtags: ['#theeditorialindex', '#davidsims', '#selfservice'],
    altText: 'Monochrome darkroom study of model.',
    credits: {
      photographer: 'David Sims',
      publication: 'Self Service',
      brand: 'Prada',
    },
    isDailyTop5: false,
    isCandidate: true,
    status: 'candidate',
  },
  {
    id: 'ed-07',
    title: 'Atmospheric Horizon: Icelandic Volcanic Plain',
    photographer: 'Juergen Teller',
    publication: 'Purple Fashion',
    brand: 'Celine',
    publicationDate: '2026-11-04',
    sourceUrl: 'https://purple.fr/fashion/iceland-teller',
    imageUrls: ['https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=1080&q=85'],
    candidateImages: [
      'https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=1080&q=85',
      'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1080&q=85',
      'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1080&q=85',
      'https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=1080&q=85',
    ],
    aspectRatio: '3:4',
    score: {
      overall: 86,
      composition: 85,
      lighting: 88,
      styling: 87,
      culturalRelevance: 84,
      narrative: 86,
      rationale: 'Direct flash aesthetic against desolate volcanic terrain. Authentic anti-glamour approach.',
    },
    creativeDirection: 'Raw daylight flash, black volcanic sand, desolate Icelandic landscape.',
    rightsStatus: 'unlicensed',
    rightsVerificationRecord: {
      sourceLicense: 'Third-Party Archival',
      authorizedForSocialMedia: false,
      usageNotes: 'Advisory reference notice.',
    },
    publishingReadiness: 'ready',
    caption: 'Direct flash and raw wilderness. Juergen Teller for Purple.',
    hashtags: ['#theeditorialindex', '#juergenteller', '#purplefashion'],
    altText: 'Fashion editorial portrait on volcanic terrain.',
    credits: {
      photographer: 'Juergen Teller',
      publication: 'Purple Fashion',
      brand: 'Celine',
    },
    isDailyTop5: false,
    isCandidate: true,
    status: 'candidate',
  },
];

const DEFAULT_SETTINGS: SystemSettings = {
  mode: 'APPROVAL', // Default per requirements
  maxDailyPosts: 2,
  emergencyStop: false,
  timezone: 'Europe/Istanbul',
  notificationsEnabled: true,
  notificationChannel: 'in_app',
  autopilotConfirmed: false,
  schedulePaused: false,
};

const DEFAULT_INSTAGRAM: InstagramAccountConfig = {
  connected: false,
  accountType: 'NOT_CONNECTED',
  permissions: [],
  auditTrail: [],
};

const DEFAULT_AI_AGENT_CONFIG: AiAgentConfig = {
  discoveryPersonaPrompt:
    'You are Agent 1 (Chief Archival Discovery & Research AI) for THE EDITORIAL INDEX. Prioritize high-contrast chiaroscuro lighting, sculptural haute couture silhouettes, brutalist architectural framing, and seminal fashion monographs (Vogue Italia, Dazed, Harper\'s Bazaar UK, Self Service, The Gentlewoman).',
  activeTopics: [
    'Chiaroscuro Monochromes',
    '90s Minimalist Couture',
    'Sculptural Avant-Garde Tailoring',
    'Brutalist Architectural Framing',
  ],
  availableTopics: [
    'Chiaroscuro Monochromes',
    '90s Minimalist Couture',
    'Sculptural Avant-Garde Tailoring',
    'Brutalist Architectural Framing',
    'Deardorff 8x10 Polaroid Portraiture',
    'Subversive Street Casting & Raw Flash',
    'Paris Haute Couture Atelier Lineage',
    'Silver Gelatin Darkroom Solarization',
  ],
  autonomousStreamEnabled: false,
  defaultBatchSize: 2,
  auditorPersonaPrompt:
    'You are Agent 2 (Chief Curator & Quality Auditor AI). Evaluate each candidate with uncompromising museum-grade standards across composition, lighting tension, styling originality, and narrative weight. Recommend or auto-approve pieces scoring at or above the curatorial threshold.',
  minApprovalScore: 89,
  autoApproveEnabled: false,
  defaultCaptionTone: 'archival',
};

const DEFAULT_WORKFLOWS: WorkflowExecutionLog[] = [
  {
    id: 'wf-01',
    stage: '08:00 Research',
    timestamp: '2026-11-11T08:00:15+03:00',
    status: 'success',
    summary: 'Discovered 20 fashion editorial candidates across primary publications (Vogue, Harper\'s Bazaar UK, Dazed, The Gentlewoman).',
    itemsProcessed: 20,
    details: 'Duplicates filtered by canonical editorial metadata and photographer attribution.',
  },
  {
    id: 'wf-02',
    stage: '09:00 Editorial evaluation',
    timestamp: '2026-11-11T09:00:22+03:00',
    status: 'success',
    summary: 'Evaluated artistic composition, chiaroscuro lighting, and cultural relevance. Ranked candidate pool.',
    itemsProcessed: 20,
    details: 'Scoring engine generated full weighted assessments.',
  },
  {
    id: 'wf-03',
    stage: '10:00 Daily Selection',
    timestamp: '2026-11-11T10:00:08+03:00',
    status: 'success',
    summary: 'Curated top 5 daily editorial selections for review. Verified rights for 4 selections.',
    itemsProcessed: 5,
    details: 'Prepared draft Instagram packages for 2 rights-cleared works.',
  },
  {
    id: 'wf-04',
    stage: '11:00 Post Preparation',
    timestamp: '2026-11-11T11:00:30+03:00',
    status: 'success',
    summary: 'Generated high-fashion captions, structured credits, and aspect ratio crop definitions.',
    itemsProcessed: 2,
    details: 'Verified photographer handles and typography tags.',
  },
];

const DEFAULT_RSS_FEEDS: RssFeedConfig[] = [
  {
    id: 'numero-series-1',
    name: 'Numéro Magazine',
    rssUrl: 'https://numero.com/en/?s=fashion+series&feed=rss2',
    handle: '@numeromagazine',
    defaultCategory: 'High-Fashion Editorial Series',
    enabled: true,
  },
  {
    id: 'vogue-runway',
    name: 'Vogue',
    rssUrl: 'https://www.vogue.com/feed/runway/rss',
    handle: '@voguemagazine',
    defaultCategory: 'Archival & Runway Monograph',
    enabled: true,
  },
  {
    id: 'interview-fashion',
    name: 'Interview Magazine',
    rssUrl: 'https://www.interviewmagazine.com/category/fashion/feed',
    handle: '@interviewmag',
    defaultCategory: 'Editorial Portraiture & Styling',
    enabled: true,
  },
  {
    id: 'dazed',
    name: 'Dazed Digital',
    rssUrl: 'https://www.dazeddigital.com/rss',
    handle: '@dazed',
    defaultCategory: 'Avant-Garde Photography & Fashion',
    enabled: true,
  },
  {
    id: 'numero-series-2',
    name: 'Numéro Magazine (Archive)',
    rssUrl: 'https://numero.com/en/page/2/?s=fashion+series&feed=rss2',
    handle: '@numeromagazine',
    defaultCategory: 'Photographic Fashion Story',
    enabled: true,
  },
  {
    id: 'interview-photo',
    name: 'Interview Magazine (Photo)',
    rssUrl: 'https://www.interviewmagazine.com/?s=photographed+by&feed=rss2',
    handle: '@interviewmag',
    defaultCategory: 'Photographer Monograph',
    enabled: true,
  },
];

const DEFAULT_EXCLUDED_KEYWORDS: string[] = [
  "men's shoes",
  'rolex',
  'watchmaking',
  'watches',
  'luggage',
  'rimowa',
  'handbags',
  'winter coats',
  'gift guide',
  'tv shows',
  'horoscope',
  'soccer',
];

const DEFAULT_LEARNING_SIGNALS: EditorialLearningSignal[] = [];

const DEFAULT_ENGAGEMENT_POINTS: EditorialEngagementPoint[] = [];

const LEGACY_MOCK_ENGAGEMENT_TITLES = new Set([
  'atmospheric horizon: icelandic volcanic plain',
  'solarization study in monochrome',
  'submerged nocturne: the glass pavilion',
  'monolithic proportions & tailored restraint',
  'textured shroud & raw sensation',
  'sculptural geometry & chiaroscuro',
  'monolith in motion: brutal romance',
  'autonomous index midday broadcast',
]);

function normalizeTitleKey(title: string): string {
  return title
    .toLowerCase()
    .replace(/\([^)]*\)/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

function isLegacySyntheticPost(post: EditorialPost): boolean {
  const url = (post.sourceUrl || '').toLowerCase();
  const title = (post.title || '').toLowerCase();
  const hay = `${title} ${url}`;
  if (
    url.includes('archive.harpersbazaar.com') ||
    url.includes('vogue.it/moda/article/sculptural-geometry-roversi') ||
    url.includes('dazeddigital.com/fashion/article/textured-shroud-weir') ||
    url.includes('thegentlewoman.co.uk/library/monolithic-proportions') ||
    url.includes('vogue.fr/mode/article/submerged-nocturne-meisel') ||
    url.includes('selfservicemagazine.com/archive/david-sims-solarization') ||
    url.includes('purple.fr/fashion/iceland-teller') ||
    url.includes('archive.theeditorialindex.com') ||
    url.includes('hanifa-relaunch')
  ) {
    return true;
  }
  // Purge commercial shopping / product roundups (shoes, Rolex watches, Rimowa luggage, bags, gift guides)
  if (
    /\b(men’s shoes|men's shoes|high shine|rolex|watchmaking|watches|luggage|rimowa|handbags|80 handbags|le city|irresistible .* coats|winter coats|coat collections|timeless coats|mules and slippers|wellington boots|kim kardashian|gift guide|gifts|fashionista)\b/i.test(
      hay
    )
  ) {
    return true;
  }
  const hasUnsplashOrLocalMock = (post.candidateImages || post.imageUrls || []).some(
    (img) => img.includes('images.unsplash.com') || img.startsWith('/src/assets/images/')
  );
  if (hasUnsplashOrLocalMock && post.id.startsWith('ed-0')) {
    return true;
  }
  return false;
}

class Database {
  private state: DatabaseState;

  constructor() {
    this.state = this.load();
    if (!this.state.engagementPoints) {
      this.state.engagementPoints = [];
    }
    if (!this.state.learningSignals) {
      this.state.learningSignals = [];
    }
    if (!this.state.aiAgentConfig) {
      this.state.aiAgentConfig = DEFAULT_AI_AGENT_CONFIG;
    }
    if (!Array.isArray(this.state.rssFeeds) || this.state.rssFeeds.length === 0) {
      this.state.rssFeeds = DEFAULT_RSS_FEEDS;
    }
    if (!Array.isArray(this.state.excludedKeywords)) {
      this.state.excludedKeywords = DEFAULT_EXCLUDED_KEYWORDS;
    }
    this.deduplicatePosts();
    this.purgeLegacyAnalyticsAndSignals();
    this.state.posts = this.state.posts.map((post) => {
      if (post.approvalRecord && !post.approvalRecord.contentHash) {
        post.approvalRecord.contentHash = computeContentHash(post);
      }
      if (!post.candidateImages || post.candidateImages.length === 0) {
        post.candidateImages = [...(post.imageUrls || [])];
      }
      return post;
    });
    this.save();
  }

  public purgeLegacyAnalyticsAndSignals(): void {
    this.state.learningSignals = (this.state.learningSignals || []).filter((sig) => {
      if (sig.id === 'sig-01' || sig.id === 'sig-02' || sig.id === 'sig-03') return false;
      if (sig.postId && /^ed-0[1-7]$/.test(sig.postId)) return false;
      return true;
    });

    this.state.engagementPoints = (this.state.engagementPoints || []).filter((pt) => {
      const titleLower = (pt.postTitle || '').trim().toLowerCase();
      if (LEGACY_MOCK_ENGAGEMENT_TITLES.has(titleLower)) return false;
      return true;
    });
  }

  public deduplicatePosts(): { removedCount: number; remainingCount: number } {
    const beforeCount = this.state.posts.length;
    const seenTitleKeys = new Set<string>();
    const seenSourceUrls = new Set<string>();
    const unique: EditorialPost[] = [];

    for (let i = 0; i < this.state.posts.length; i++) {
      const post = this.state.posts[i];
      if (isLegacySyntheticPost(post)) {
        continue;
      }
      const titleKey = normalizeTitleKey(post.title);
      const urlKey = (post.sourceUrl || '').split('?')[0].toLowerCase();
      if (seenTitleKeys.has(titleKey) || (urlKey && seenSourceUrls.has(urlKey))) {
        continue;
      }
      seenTitleKeys.add(titleKey);
      if (urlKey) seenSourceUrls.add(urlKey);

      if (post.photographer && post.photographer.includes('@')) {
        const poss = post.title.match(/([A-Z][a-z]+\s+[A-Z][a-z-]+)(?:'s|’s)\s+(?:exclusive\s+)?fashion/i);
        post.photographer = poss?.[1] || `${post.publication} Visual Archive`;
        if (post.credits) post.credits.photographer = post.photographer;
      }

      // Remove any stray unsplash URLs from candidateImages if mixed in
      if (post.candidateImages && post.candidateImages.length > 0) {
        const cleanCandidates = post.candidateImages.filter(
          (u) => !u.includes('images.unsplash.com') && !u.startsWith('/src/assets/images/')
        );
        if (cleanCandidates.length > 0) {
          post.candidateImages = cleanCandidates;
          const validSelected = (post.imageUrls || []).filter((u) => cleanCandidates.includes(u));
          post.imageUrls = validSelected.length > 0 ? validSelected : cleanCandidates.slice(0, Math.min(3, cleanCandidates.length));
        }
      }

      unique.push(post);
    }

    this.state.posts = unique;
    this.save();
    return {
      removedCount: Math.max(0, beforeCount - unique.length),
      remainingCount: unique.length,
    };
  }

  private load(): DatabaseState {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (!parsed.engagementPoints) {
          parsed.engagementPoints = [];
        }
        if (!parsed.learningSignals) {
          parsed.learningSignals = [];
        }
        if (!parsed.aiAgentConfig) {
          parsed.aiAgentConfig = DEFAULT_AI_AGENT_CONFIG;
        }
        if (!Array.isArray(parsed.rssFeeds)) {
          parsed.rssFeeds = DEFAULT_RSS_FEEDS;
        }
        if (!Array.isArray(parsed.excludedKeywords)) {
          parsed.excludedKeywords = DEFAULT_EXCLUDED_KEYWORDS;
        }
        return parsed;
      }
    } catch (e) {
      console.error('Failed to load database from file, using defaults', e);
    }

    return {
      posts: [],
      settings: DEFAULT_SETTINGS,
      instagram: DEFAULT_INSTAGRAM,
      aiAgentConfig: DEFAULT_AI_AGENT_CONFIG,
      rssFeeds: DEFAULT_RSS_FEEDS,
      excludedKeywords: DEFAULT_EXCLUDED_KEYWORDS,
      workflowLogs: DEFAULT_WORKFLOWS,
      learningSignals: DEFAULT_LEARNING_SIGNALS,
      engagementPoints: DEFAULT_ENGAGEMENT_POINTS,
      publishedTodayCount: 0,
      lastResetDate: new Date().toISOString().split('T')[0],
    };
  }

  public save(): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(this.state, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to write database to disk', e);
    }
  }

  public getState(): DatabaseState {
    return this.state;
  }

  public getPosts(): EditorialPost[] {
    return this.state.posts;
  }

  public getPostById(id: string): EditorialPost | undefined {
    return this.state.posts.find(p => p.id === id);
  }

  public updatePost(id: string, updates: Partial<EditorialPost>): EditorialPost | null {
    const idx = this.state.posts.findIndex(p => p.id === id);
    if (idx === -1) return null;

    const existing = this.state.posts[idx];
    const updated: EditorialPost = {
      ...existing,
      ...updates,
      credits: { ...existing.credits, ...(updates.credits || {}) },
      rightsVerificationRecord: { ...existing.rightsVerificationRecord, ...(updates.rightsVerificationRecord || {}) },
    };

    this.state.posts[idx] = updated;
    this.save();
    return updated;
  }

  public addPost(post: EditorialPost): boolean {
    const incomingKey = normalizeTitleKey(post.title);
    const exists = this.state.posts.some(p => normalizeTitleKey(p.title) === incomingKey);
    if (exists) {
      return false;
    }
    this.state.posts.unshift(post);
    this.save();
    return true;
  }

  public getSettings(): SystemSettings {
    return this.state.settings;
  }

  public updateSettings(updates: Partial<SystemSettings>): SystemSettings {
    this.state.settings = { ...this.state.settings, ...updates };
    this.save();
    return this.state.settings;
  }

  public getInstagram(): InstagramAccountConfig {
    return this.state.instagram;
  }

  public updateInstagram(updates: Partial<InstagramAccountConfig>): InstagramAccountConfig {
    this.state.instagram = { ...this.state.instagram, ...updates };
    this.save();
    return this.state.instagram;
  }

  public getAiAgentConfig(): AiAgentConfig {
    if (!this.state.aiAgentConfig) {
      this.state.aiAgentConfig = DEFAULT_AI_AGENT_CONFIG;
    }
    return this.state.aiAgentConfig;
  }

  public updateAiAgentConfig(updates: Partial<AiAgentConfig>): AiAgentConfig {
    this.state.aiAgentConfig = {
      ...this.getAiAgentConfig(),
      ...updates,
    };
    this.save();
    return this.state.aiAgentConfig;
  }

  public getRssFeeds(): RssFeedConfig[] {
    if (!Array.isArray(this.state.rssFeeds) || this.state.rssFeeds.length === 0) {
      this.state.rssFeeds = DEFAULT_RSS_FEEDS;
    }
    return this.state.rssFeeds;
  }

  public addRssFeed(feed: Omit<RssFeedConfig, 'id'>): RssFeedConfig {
    const newFeed: RssFeedConfig = {
      ...feed,
      id: `rss-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    };
    this.state.rssFeeds = [newFeed, ...this.getRssFeeds()];
    this.save();
    return newFeed;
  }

  public updateRssFeed(id: string, updates: Partial<RssFeedConfig>): RssFeedConfig | null {
    const feeds = this.getRssFeeds();
    const idx = feeds.findIndex((f) => f.id === id);
    if (idx === -1) return null;
    feeds[idx] = { ...feeds[idx], ...updates };
    this.state.rssFeeds = feeds;
    this.save();
    return feeds[idx];
  }

  public removeRssFeed(id: string): void {
    this.state.rssFeeds = this.getRssFeeds().filter((f) => f.id !== id);
    this.save();
  }

  public getExcludedKeywords(): string[] {
    if (!Array.isArray(this.state.excludedKeywords)) {
      this.state.excludedKeywords = DEFAULT_EXCLUDED_KEYWORDS;
    }
    return this.state.excludedKeywords;
  }

  public updateExcludedKeywords(keywords: string[]): string[] {
    this.state.excludedKeywords = keywords
      .map((k) => k.trim().toLowerCase())
      .filter((k) => k.length > 0);
    this.save();
    return this.state.excludedKeywords;
  }

  public addWorkflowLog(log: WorkflowExecutionLog): void {
    this.state.workflowLogs.unshift(log);
    // keep last 50
    if (this.state.workflowLogs.length > 50) {
      this.state.workflowLogs = this.state.workflowLogs.slice(0, 50);
    }
    this.save();
  }

  public addLearningSignal(signal: EditorialLearningSignal): void {
    this.state.learningSignals = (this.state.learningSignals || []).filter(
      (s) => !(s.postId === signal.postId && s.action === signal.action)
    );
    this.state.learningSignals.unshift(signal);
    this.save();
  }

  public recordCuratorialSignal(
    post: EditorialPost,
    action: 'approved' | 'rejected' | 'saved'
  ): EditorialLearningSignal {
    const extractedTags = Array.from(
      new Set([
        ...(post.hashtags || []).map((h) => h.replace(/^#/, '').toLowerCase()).filter((h) => h !== 'theeditorialindex'),
        ...(post.brand ? [post.brand.toLowerCase()] : []),
        post.publication.toLowerCase(),
      ])
    ).slice(0, 6);

    const scoreDelta = action === 'approved' ? 10 : action === 'saved' ? 6 : -12;

    const signal: EditorialLearningSignal = {
      id: `sig-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      postId: post.id,
      postTitle: post.title,
      sourceUrl: post.sourceUrl,
      action,
      timestamp: new Date().toISOString(),
      aestheticTags: extractedTags,
      photographer: post.photographer,
      publication: post.publication,
      scoreDelta,
    };

    this.addLearningSignal(signal);
    return signal;
  }

  public removeLearningSignal(signalId: string): void {
    this.state.learningSignals = (this.state.learningSignals || []).filter((s) => s.id !== signalId);
    this.save();
  }

  public clearLearningSignals(): void {
    this.state.learningSignals = [];
    this.save();
  }

  public recordPublish(postId: string, metaMediaId?: string, permalink?: string): void {
    const post = this.getPostById(postId);
    if (!post) return;

    post.status = 'published';
    post.publishingReadiness = 'published';
    if (!post.approvalRecord) {
      post.approvalRecord = {
        approvedBy: 'System Automation',
        approvedAt: new Date().toISOString(),
        version: 1,
      };
    }
    post.approvalRecord.publishedAt = new Date().toISOString();
    post.approvalRecord.instagramPostId = metaMediaId || `meta_${Date.now()}`;

    this.state.publishedTodayCount += 1;

    // Add to Instagram audit log
    this.state.instagram.auditTrail.unshift({
      id: `audit-${Date.now()}`,
      postId: post.id,
      editorialTitle: post.title,
      timestamp: new Date().toISOString(),
      status: 'success',
      metaMediaId: post.approvalRecord.instagramPostId,
      permalink: permalink || `https://instagram.com/p/${post.approvalRecord.instagramPostId}`,
      mode: this.state.settings.mode,
    });

    this.save();
  }

  public getEngagementPoints(): EditorialEngagementPoint[] {
    return this.state.engagementPoints || [];
  }

  public upsertEngagementPoint(point: EditorialEngagementPoint): EditorialEngagementPoint {
    if (!this.state.engagementPoints) {
      this.state.engagementPoints = [];
    }
    const existingIdx = this.state.engagementPoints.findIndex(
      (p) => (point.postId && p.postId === point.postId) || (point.postTitle && p.postTitle === point.postTitle)
    );
    if (existingIdx >= 0) {
      this.state.engagementPoints[existingIdx] = {
        ...this.state.engagementPoints[existingIdx],
        ...point,
      };
    } else {
      this.state.engagementPoints.push(point);
    }
    this.save();
    return point;
  }

  public addEngagementPoint(point: EditorialEngagementPoint): void {
    this.upsertEngagementPoint(point);
  }
}

export const db = new Database();


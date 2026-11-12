export type OperationMode = 'MANUAL' | 'APPROVAL' | 'AUTOPILOT';

export type RightsStatus = 
  | 'verified' 
  | 'pending' 
  | 'unlicensed' 
  | 'editorial_reference_only';

export type PublishingReadiness = 
  | 'ready' 
  | 'needs_approval' 
  | 'needs_rights' 
  | 'scheduled' 
  | 'published' 
  | 'rejected';

export interface EditorialScore {
  overall: number; // 0 - 100
  composition: number;
  lighting: number;
  styling: number;
  culturalRelevance: number;
  narrative: number;
  rationale: string;
}

export interface AiAuditReport {
  verdict: 'approved_by_ai' | 'recommended' | 'needs_review';
  auditorNotes: string;
  auditedAt: string;
  confidenceScore: number;
}

export interface AiAgentConfig {
  discoveryPersonaPrompt: string;
  activeTopics: string[];
  availableTopics: string[];
  autonomousStreamEnabled: boolean;
  defaultBatchSize: number;
  auditorPersonaPrompt: string;
  minApprovalScore: number;
  autoApproveEnabled: boolean;
  defaultCaptionTone: 'archival' | 'poetic' | 'minimal' | 'couture';
}

export interface EditorialPost {
  id: string;
  title: string;
  photographer: string;
  photographerHandle?: string;
  stylist?: string;
  model?: string;
  publication: string;
  brand?: string;
  publicationDate: string;
  sourceUrl: string;
  imageUrls: string[];
  candidateImages?: string[];
  aspectRatio: '4:5' | '1:1' | '3:4';
  score: EditorialScore;
  creativeDirection: string;
  rightsStatus: RightsStatus;
  rightsVerificationRecord: {
    sourceLicense: string;
    verifiedAt?: string;
    authorizedForSocialMedia: boolean;
    usageNotes: string;
    contractRef?: string;
  };
  publishingReadiness: PublishingReadiness;
  caption: string;
  hashtags: string[];
  altText: string;
  credits: {
    photographer: string;
    stylist?: string;
    model?: string;
    publication: string;
    brand?: string;
  };
  isDailyTop5: boolean;
  isCandidate: boolean;
  status: 'candidate' | 'selected' | 'approved' | 'scheduled' | 'published' | 'rejected' | 'saved';
  scheduledTime?: string;
  slotLabel?: string;
  discoveryTopic?: string;
  aiAuditReport?: AiAuditReport;
  approvalRecord?: {
    approvedBy: string;
    approvedAt: string;
    version: number;
    scheduledFor?: string;
    slotLabel?: string;
    publishedAt?: string;
    instagramPostId?: string;
    contentHash?: string;
  };
}

export interface WorkflowExecutionLog {
  id: string;
  stage: '08:00 Research' | '09:00 Evaluation' | '09:00 Editorial evaluation' | '10:00 Daily Selection' | '11:00 Post Preparation' | '14:00 First Slot' | '20:00 Second Slot' | 'Manual Run';
  timestamp: string;
  status: 'success' | 'running' | 'failed' | 'skipped_emergency_stop';
  summary: string;
  itemsProcessed?: number;
  details?: string;
}

export interface InstagramAuditLog {
  id: string;
  postId: string;
  editorialTitle: string;
  timestamp: string;
  status: 'success' | 'failed' | 'retrying';
  metaMediaId?: string;
  permalink?: string;
  errorMessage?: string;
  mode: OperationMode;
}

export interface InstagramAccountConfig {
  connected: boolean;
  accountType: 'BUSINESS' | 'CREATOR' | 'PERSONAL_INELIGIBLE' | 'NOT_CONNECTED';
  username?: string;
  accountId?: string;
  accessToken?: string;
  tokenExpiresAt?: string;
  permissions: string[];
  lastPublishError?: string;
  auditTrail: InstagramAuditLog[];
}

export interface SystemSettings {
  mode: OperationMode;
  maxDailyPosts: number;
  emergencyStop: boolean;
  timezone: string;
  notificationsEnabled: boolean;
  notificationChannel: 'in_app' | 'webhook' | 'email';
  autopilotConfirmed: boolean;
  schedulePaused: boolean;
}

export interface EditorialLearningSignal {
  id: string;
  postId: string;
  postTitle?: string;
  sourceUrl?: string;
  action: 'approved' | 'rejected' | 'saved' | 'rated';
  rating?: number;
  timestamp: string;
  aestheticTags: string[];
  photographer: string;
  publication: string;
  scoreDelta?: number;
}

export interface EditorialEngagementPoint {
  id?: string;
  postId?: string;
  metaMediaId?: string;
  permalink?: string;
  date: string;
  fullDate: string;
  reach: number;
  likes: number;
  shares: number;
  saves: number;
  comments?: number;
  engagementRate: number;
  postTitle?: string;
  photographer?: string;
  publication?: string;
  source?: 'meta_graph_api' | 'curatorial_index';
  syncedAt?: string;
}


export type AIModelId = 'gemini' | 'chatgpt' | 'claude' | 'meta';

export interface AISubscriptionInfo {
  id: AIModelId;
  name: string;
  planName: string; // e.g. "Gemini Advanced (Google One)", "ChatGPT Plus / Codex", "Claude Pro / Code", "Meta AI Plus"
  company: string;
  color: string;
  accentBg: string;
  badgeBorder: string;
  avatarIcon: string;
  connected: boolean;
  authMethod: 'subscription_session' | 'oauth_bridge' | 'web_connector' | 'api_fallback';
  userEmail?: string;
  sessionToken?: string;
  autoSync: boolean;
  status: 'active' | 'connecting' | 'idle' | 'error';
  lastActive?: string;
  capabilities: string[];
}

export interface AttachedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  content: string; // base64 or text
  isText: boolean;
  uploadedAt: string;
  includedInContext: boolean;
  language?: string;
}

export interface AIMessage {
  id: string;
  modelId: AIModelId | 'user' | 'system' | 'orchestrator';
  senderName: string;
  content: string;
  timestamp: string;
  inReplyTo?: string; // which message or AI this is responding to
  debateRound?: number;
  isStreaming?: boolean;
  codeBlocks?: { language: string; code: string }[];
  reactions?: Record<string, string>;
  filesReferenced?: string[];
}

export type ViewLayout = 'split_4' | 'split_2' | 'tabs' | 'unified_feed' | 'code_review';

export type OrchestrationMode = 
  | 'parallel'        // Todas responden al mismo tiempo al usuario
  | 'round_robin'     // Interacción en cadena: ChatGPT propone -> Claude revisa -> Gemini optimiza -> Meta evalúa
  | 'cross_debate'    // Debate cruzado con crítica mutua
  | 'consensus';      // Las 4 IAs colaboran para crear una respuesta única y definitiva

export interface ContextVersion {
  id: string;
  timestamp: string;
  dateFormatted: string;
  title: string;
  content: string;
  characterCount: number;
  wordCount: number;
  tag: 'manual' | 'auto' | 'template' | 'initial';
}

export interface ImageRule {
  id: string;
  title: string;
  description: string;
  category: 'quality' | 'style' | 'composition' | 'negative' | 'format';
  enabled: boolean;
  priority: 'mandatory' | 'recommended';
}

export interface GeneratedImage {
  id: string;
  title: string;
  prompt: string;
  aspectRatio: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
  format: 'png' | 'jpg';
  resolution: '1K' | '2K' | '4K';
  style: string;
  url: string;
  timestamp: string;
  rulesApplied: string[];
  contributions: {
    gemini: string;
    chatgpt: string;
    claude: string;
    meta: string;
  };
  authorAI: AIModelId | 'collaborative';
  liked?: boolean;
}

export interface MediaLibraryItem {
  id: string;
  name: string;
  type: 'image' | 'code' | 'document' | 'archive';
  format: string;
  size: number;
  url: string;
  date: string;
  tags: string[];
  source: 'generated' | 'uploaded';
}

export interface SecurityIntegrationStatus {
  userEmail: string;
  googleSSOVerified: boolean;
  encryptionMode: string;
  verifiedAt: string;
  integrations: Record<AIModelId, {
    connected: boolean;
    verifiedAccount: string;
    securityTokenStatus: 'active_valid' | 'revoked' | 'needs_refresh';
    lastEncryptedSync: string;
  }>;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'ai_finished' | 'intervention_needed' | 'consensus_ready' | 'image_ready' | 'security_alert' | 'system';
  timestamp: string;
  modelId?: AIModelId;
  read: boolean;
  actionLabel?: string;
  sourceAI?: string;
}


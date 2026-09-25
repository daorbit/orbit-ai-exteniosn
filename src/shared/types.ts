export type OrbitPlan = {
  slug: string;
  name: string;
  tier: "basic" | "standard" | "advanced";
  monthlyQuota: number;
  maxQuestionChars: number;
  imageGeneration: boolean;
};

export type OrbitModel = {
  id: string;
  label: string;
  hint: string;
  locked: boolean;
  tier: "basic" | "standard" | "advanced";
};

export type OrbitStatus = {
  configured: boolean;
  plan: OrbitPlan;
  models: OrbitModel[];
};

export type OrbitHistoryTurn = { role: "user" | "assistant"; content: string };

export type PendingDocument = { name: string; mime: string; data: string };

export type AskOrbitRequest = {
  question: string;
  history: OrbitHistoryTurn[];
  model?: string;
  conversationId?: string;
  image?: string;
  generateImage?: boolean;
  document?: PendingDocument;
};

export type AskOrbitResponse = {
  reply: string;
  suggestions: string[];
  model: string;
  modelLabel: string;
  imageUrl?: string;
  dataDigest?: unknown;
  citations?: { url: string; title: string }[];
  remaining: number | null;
  conversationId: string | null;
};

export type OrbitConversationSummary = {
  id: string;
  title: string;
  messageCount: number;
  lastMessageAt: string;
  lastModelLabel: string;
  createdAt: string;
  userId: string | null;
};

export type OrbitConversationsPage = {
  conversations: OrbitConversationSummary[];
  nextCursor: string | null;
};

export type OrbitConversationMessage = {
  id: string;
  seq: number;
  role: "user" | "assistant";
  content: string;
  imageUrl?: string;
  suggestions: string[];
  dataDigest?: unknown;
  citations?: { url: string; title: string }[];
  failed: boolean;
  modelLabel?: string;
  createdAt: string;
};

export type OrbitConversationDetail = {
  id: string;
  title: string;
  messageCount: number;
  lastMessageAt: string;
  createdAt: string;
  hasMore: boolean;
  nextBefore: number | null;
  messages: OrbitConversationMessage[];
};

export type OrbitMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  imageUrl?: string;
  failed?: boolean;
  stopped?: boolean;
  suggestions?: string[];
  modelLabel?: string;
  dataDigest?: unknown;
  digestAt?: string;
  citations?: { url: string; title: string }[];
  documentName?: string;
};

export type Verdict =
  | "SUPPORTED"
  | "MISLEADING"
  | "FALSE"
  | "UNVERIFIED";

export interface EvidenceItem {
  title: string;
  publisher: string;
  url: string;
  publishedAt: string | null;
  summary: string;
  relationship: "SUPPORTS" | "CONTRADICTS" | "CONTEXT";
}

export interface VerificationConfidence {
  score: number | null;
  reason: string;
}

export interface VerificationReport {
  id: string;
  originalInput: string;
  inputType: "TEXT" | "URL";
  extractedClaim: string;
  verdict: Verdict;
  explanation: string;
  confidence: VerificationConfidence;
  supportingEvidence: EvidenceItem[];
  contradictingEvidence: EvidenceItem[];
  citations: EvidenceItem[];
  limitations: string[];
  verifiedAt: string;
}

export interface NewsArticleItem {
  id: string;
  title: string;
  description: string;
  sourceName: string;
  articleUrl: string;
  publishedAt: string;
  category?: string;
}

export interface SystemHealthStatus {
  status: "ok" | "degraded" | "error";
  timestamp: string;
  kie: {
    configured: boolean;
    baseUrl: string;
    model: string;
    reachable: boolean | null;
    authenticated?: boolean | null;
    message?: string;
  };
  research: {
    tavilyConfigured: boolean;
    factCheckConfigured: boolean;
    provider: string;
  };
  storage: {
    type: "supabase" | "local_memory";
    connected: boolean;
  };
}

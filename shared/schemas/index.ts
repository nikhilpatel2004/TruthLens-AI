import { z } from 'zod';

export const EvidenceItemSchema = z.object({
  title: z.string().min(1, "Title is required"),
  publisher: z.string().min(1, "Publisher is required"),
  url: z.string().url("Valid URL required"),
  publishedAt: z.string().nullable().optional(),
  summary: z.string().min(1, "Summary is required"),
  relationship: z.enum(["SUPPORTS", "CONTRADICTS", "CONTEXT"]),
});

export const VerificationConfidenceSchema = z.object({
  score: z.number().min(0).max(100).nullable(),
  reason: z.string().min(1, "Confidence reason is required"),
});

export const VerdictEnum = z.enum(["SUPPORTED", "MISLEADING", "FALSE", "UNVERIFIED"]);

export const VerificationReportSchema = z.object({
  id: z.string(),
  originalInput: z.string().min(1),
  inputType: z.enum(["TEXT", "URL"]),
  extractedClaim: z.string().min(1),
  verdict: VerdictEnum,
  explanation: z.string().min(1),
  confidence: VerificationConfidenceSchema,
  supportingEvidence: z.array(EvidenceItemSchema),
  contradictingEvidence: z.array(EvidenceItemSchema),
  citations: z.array(EvidenceItemSchema),
  limitations: z.array(z.string()),
  verifiedAt: z.string(),
});

export const VerifyInputSchema = z.object({
  input: z.string().trim().min(3, "Claim or URL must be at least 3 characters").max(5000, "Input exceeds maximum allowed length of 5000 characters"),
});

export const NewsArticleSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  sourceName: z.string(),
  articleUrl: z.string().url(),
  publishedAt: z.string(),
  category: z.string().optional(),
});

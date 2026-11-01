import { randomUUID } from 'node:crypto';
import { extractArticleFromUrl, type ExtractedArticle } from './extractor.service';
import { kieService } from './kie.service';
import { searchService } from './search.service';
import { dbService } from './db.service';
import { VerificationReportSchema, type VerifyInputSchema } from '../../../shared/schemas/index';
import type { VerificationReport, Verdict } from '../../../shared/types/index';

export interface WorkflowProgressCallback {
  (stage: 'UNDERSTANDING' | 'SEARCHING' | 'COMPARING' | 'PREPARING', message: string): void;
}

export class VerificationWorkflow {
  /**
   * Run end-to-end verification orchestrator
   */
  public async execute(
    rawInput: string,
    onProgress?: WorkflowProgressCallback
  ): Promise<VerificationReport> {
    const input = rawInput.trim();
    if (!input || input.length < 3) {
      throw new Error('Please submit a claim, headline, or article URL with at least 3 characters.');
    }

    // Step 1: Detect input type
    const isUrl = /^https?:\/\/[^\s$.?#].[^\s]*$/i.test(input);
    const inputType: 'TEXT' | 'URL' = isUrl ? 'URL' : 'TEXT';

    let contentToAnalyze = input;
    let articleInfo: ExtractedArticle | null = null;

    // Step 2: Extract article if input is URL
    if (inputType === 'URL') {
      onProgress?.('UNDERSTANDING', 'Fetching and extracting article content from URL...');
      try {
        articleInfo = await extractArticleFromUrl(input);
        contentToAnalyze = `Headline: ${articleInfo.title}\nPublisher: ${articleInfo.publisher}\nArticle Content:\n${articleInfo.content}`;
      } catch (err: any) {
        throw new Error(`Failed to extract article from URL: ${err.message || 'Page unavailable'}`);
      }
    } else {
      onProgress?.('UNDERSTANDING', 'Analyzing submitted text and isolating factual claims...');
    }

    // Step 3 & 4: Claim extraction & search query generation via KIE.ai
    let extractedClaim = input;
    let searchQueries: string[] = [input];

    if (kieService.isConfigured()) {
      try {
        const extraction = await kieService.extractClaimAndQueries(contentToAnalyze, inputType);
        extractedClaim = extraction.extractedClaim;
        searchQueries = extraction.searchQueries;
      } catch (err: any) {
        console.warn('KIE claim extraction failed, using fallback:', err.message);
        extractedClaim = articleInfo ? articleInfo.title : input.slice(0, 200);
        searchQueries = [extractedClaim];
      }
    } else {
      // If KIE_API_KEY is not configured, inform transparently
      throw new Error(
        'KIE.ai API key is missing. Please configure KIE_API_KEY in your environment to run AI claim verification.'
      );
    }

    // Step 5: Web Research & Evidence Collection
    onProgress?.('SEARCHING', 'Retrieving evidence and checking independent news sources...');
    const retrievedSources = await searchService.researchClaim(extractedClaim, searchQueries);

    // Step 6 & 7: Evidence Evaluation & Verdict Generation via KIE.ai
    onProgress?.('COMPARING', 'Evaluating supporting and contradicting sources against claim...');
    const evaluation = await kieService.evaluateEvidenceAndVerdict(extractedClaim, retrievedSources);

    // Step 8: Build Verification Report
    onProgress?.('PREPARING', 'Validating citations and assembling final verification report...');

    const finalLimitations = [...evaluation.limitations];
    if (articleInfo?.restrictedAccess) {
      finalLimitations.unshift(
        `Publisher ${articleInfo.publisher} restricted direct automated page retrieval (HTTP 403/Paywall). Verification was performed on the extracted headline and independent corroborating sources.`
      );
    }

    const report: VerificationReport = {
      id: randomUUID(),
      originalInput: input,
      inputType,
      extractedClaim,
      verdict: evaluation.verdict,
      explanation: evaluation.explanation,
      confidence: evaluation.confidence,
      supportingEvidence: evaluation.supportingEvidence,
      contradictingEvidence: evaluation.contradictingEvidence,
      citations: evaluation.citations,
      limitations: finalLimitations,
      verifiedAt: new Date().toISOString(),
    };

    // Validate with Zod before finalizing
    const validationResult = VerificationReportSchema.safeParse(report);
    if (!validationResult.success) {
      console.error('Report schema validation issues:', validationResult.error.format());
      throw new Error('Internal validation failed: verification report structure is malformed.');
    }

    // Persist to database / memory
    await dbService.saveVerification(validationResult.data as VerificationReport);

    return validationResult.data as VerificationReport;
  }
}

export const verificationWorkflow = new VerificationWorkflow();

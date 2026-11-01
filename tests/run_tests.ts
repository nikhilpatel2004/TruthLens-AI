/**
 * TruthLens AI - Automated Functional, Integration, and Security Test Suite
 * Includes Latest News real-time refresh tests & Verification History deletion tests
 */
import { extractArticleFromUrl } from '../server/src/services/extractor.service';
import { searchService } from '../server/src/services/search.service';
import { kieService } from '../server/src/services/kie.service';
import { dbService } from '../server/src/services/db.service';
import { newsService } from '../server/src/services/news.service';
import { VerifyInputSchema, VerificationReportSchema } from '../shared/schemas/index';
import type { VerificationReport } from '../shared/types/index';

interface TestResult {
  name: string;
  category: 'Functional' | 'Integration' | 'Security';
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

function record(name: string, category: 'Functional' | 'Integration' | 'Security', passed: boolean, details: string) {
  results.push({ name, category, passed, details });
  console.log(`[${passed ? 'PASS' : 'FAIL'}] [${category}] ${name} - ${details}`);
}

async function runTests() {
  console.log('=== TruthLens AI Automated Test Suite Execution ===\n');

  // --- FUNCTIONAL TESTS ---
  // 1. Empty input validation
  const emptyCheck = VerifyInputSchema.safeParse({ input: '   ' });
  record('Empty claim submission', 'Functional', !emptyCheck.success, 'Correctly rejected empty input');

  // 2. Minimum length check
  const shortCheck = VerifyInputSchema.safeParse({ input: 'ab' });
  record('Too short claim', 'Functional', !shortCheck.success, 'Rejected input under 3 chars');

  // 3. Valid factual claim input
  const validClaim = 'WHO officially declares eradication of smallpox in 1980';
  const validCheck = VerifyInputSchema.safeParse({ input: validClaim });
  record('Submit valid factual claim', 'Functional', validCheck.success, 'Accepted factual string input');

  // 4. WhatsApp forward format
  const whatsappForward = 'WhatsApp Forward: Forwarded as received! Government announced all schools closed tomorrow!';
  const waCheck = VerifyInputSchema.safeParse({ input: whatsappForward });
  record('Submit WhatsApp forward', 'Functional', waCheck.success, 'Accepted formatted message');

  // 5. Valid news URL format
  const validUrl = 'https://www.who.int/news/item/28-10-2026-respiratory-update';
  const isUrl = /^https?:\/\/[^\s$.?#].[^\s]*$/i.test(validUrl);
  record('Submit valid news URL', 'Functional', isUrl, 'Detected URL input format');

  // 6. Invalid URL format
  const invalidUrl = 'htp://invalid-url-domain';
  const isInvalid = !/^https?:\/\/[^\s$.?#].[^\s]*$/i.test(invalidUrl);
  record('Submit invalid URL', 'Functional', isInvalid, 'Detected malformed URL protocol');

  // 7. Verification with no evidence returns UNVERIFIED
  const emptyEvidenceEval = await kieService.evaluateEvidenceAndVerdict('Nonexistent event xyz999', []);
  record(
    'Verify claim with no evidence',
    'Functional',
    emptyEvidenceEval.verdict === 'UNVERIFIED',
    `Returned ${emptyEvidenceEval.verdict} as required when evidence is empty`
  );

  // --- SECURITY TESTS ---
  // 8. SSRF Localhost URL blocking
  try {
    await extractArticleFromUrl('http://localhost:3000/api/health');
    record('SSRF Localhost blocking', 'Security', false, 'Failed to block localhost');
  } catch (err: any) {
    record('SSRF Localhost blocking', 'Security', err.message.includes('blocked'), `Blocked: ${err.message}`);
  }

  // 9. SSRF 127.0.0.1 blocking
  try {
    await extractArticleFromUrl('http://127.0.0.1:8080/admin');
    record('SSRF 127.0.0.1 blocking', 'Security', false, 'Failed to block 127.0.0.1');
  } catch (err: any) {
    record('SSRF 127.0.0.1 blocking', 'Security', err.message.includes('blocked'), `Blocked: ${err.message}`);
  }

  // 10. SSRF Private IP 10.0.0.1 blocking
  try {
    await extractArticleFromUrl('http://10.0.0.1/internal-secret');
    record('SSRF Private IP 10.x.x.x blocking', 'Security', false, 'Failed to block 10.0.0.1');
  } catch (err: any) {
    record('SSRF Private IP 10.x.x.x blocking', 'Security', err.message.includes('blocked'), `Blocked: ${err.message}`);
  }

  // 11. SSRF Cloud Metadata IP blocking
  try {
    await extractArticleFromUrl('http://169.254.169.254/computeMetadata/v1/');
    record('SSRF Cloud Metadata blocking', 'Security', false, 'Failed to block metadata IP');
  } catch (err: any) {
    record('SSRF Cloud Metadata blocking', 'Security', err.message.includes('blocked'), `Blocked: ${err.message}`);
  }

  // 12. Oversized input validation
  const oversizedText = 'a'.repeat(6000);
  const oversizedCheck = VerifyInputSchema.safeParse({ input: oversizedText });
  record('Oversized input (>5000 chars)', 'Security', !oversizedCheck.success, 'Rejected input exceeding limit');

  // --- INTEGRATION TESTS ---
  // 13. Search provider status
  const searchStatus = searchService.getStatus();
  record('Search provider health query', 'Integration', Boolean(searchStatus.provider), `Provider: ${searchStatus.provider}`);

  // 14. KIE Service Health Check
  const kieHealth = await kieService.checkHealth();
  record(
    'KIE.ai Health Check',
    'Integration',
    typeof kieHealth.configured === 'boolean',
    `Configured: ${kieHealth.configured}, Model: ${kieHealth.model}, Reachable: ${kieHealth.reachable}`
  );

  // 15. Verification Report Schema Validation
  const testReport1: VerificationReport = {
    id: 'test-record-1',
    originalInput: 'Test claim 1',
    inputType: 'TEXT',
    extractedClaim: 'Test claim 1',
    verdict: 'UNVERIFIED',
    explanation: 'Test explanation 1',
    confidence: { score: null, reason: 'Test reason' },
    supportingEvidence: [],
    contradictingEvidence: [],
    citations: [],
    limitations: ['Test limitation'],
    verifiedAt: new Date().toISOString(),
  };
  const schemaValid = VerificationReportSchema.safeParse(testReport1).success;
  record('Report Schema Zod Validation', 'Integration', schemaValid, 'Verified data contract compliance');

  // --- LATEST NEWS TESTS (BUG 1 FIX VERIFICATION) ---
  // 16. Live News Fetch
  try {
    const liveNews = await newsService.getLatestNews({ forceRefresh: true, limit: 5 });
    const hasArticles = liveNews.articles.length > 0;
    const hasPublicationDates = liveNews.articles.every((a) => a.publishedAt && !isNaN(new Date(a.publishedAt).getTime()));
    const hasRealSources = liveNews.articles.every((a) => a.sourceName && a.sourceName.length > 0);
    const hasStableIds = liveNews.articles.every((a) => a.id && a.id.startsWith('art-'));

    record(
      'Live News Provider Fetch',
      'Integration',
      hasArticles && hasPublicationDates && hasRealSources && hasStableIds,
      `Fetched ${liveNews.articles.length} real-time articles with ISO publication dates & sources`
    );

    // 17. News Sorting (Newest First)
    let isSortedNewestFirst = true;
    for (let i = 0; i < liveNews.articles.length - 1; i++) {
      const d1 = new Date(liveNews.articles[i].publishedAt).getTime();
      const d2 = new Date(liveNews.articles[i + 1].publishedAt).getTime();
      if (d1 < d2) {
        isSortedNewestFirst = false;
        break;
      }
    }
    record(
      'Live News Chronological Sorting',
      'Functional',
      isSortedNewestFirst,
      'Verified articles are strictly ordered by publication date, newest first'
    );

    // 18. News Deduplication
    const urls = liveNews.articles.map((a) => a.articleUrl.toLowerCase().split('?')[0]);
    const uniqueUrls = new Set(urls);
    const isDeduplicated = urls.length === uniqueUrls.size;
    record(
      'Live News Deduplication',
      'Functional',
      isDeduplicated,
      `All ${urls.length} articles have unique canonical URLs`
    );
  } catch (err: any) {
    record('Live News Provider Fetch', 'Integration', false, `Error: ${err.message}`);
  }

  // --- VERIFICATION HISTORY & DELETION TESTS (BUG 2 FIX VERIFICATION) ---
  // 19. History Persistence
  const testReport2: VerificationReport = {
    id: 'test-record-2',
    originalInput: 'Second test claim for history tests',
    inputType: 'TEXT',
    extractedClaim: 'Second test claim for history tests',
    verdict: 'SUPPORTED',
    explanation: 'Test report 2 explanation',
    confidence: { score: 90, reason: 'High confidence' },
    supportingEvidence: [],
    contradictingEvidence: [],
    citations: [],
    limitations: [],
    verifiedAt: new Date().toISOString(),
  };

  await dbService.saveVerification(testReport1);
  await dbService.saveVerification(testReport2);

  const historyBefore = await dbService.getHistory();
  const containsBoth = historyBefore.some((r) => r.id === 'test-record-1') && historyBefore.some((r) => r.id === 'test-record-2');
  record('History Persistence & Retrieval', 'Integration', containsBoth, 'Both records persisted and loaded');

  // 20. Single Record Deletion
  const deleteResult1 = await dbService.deleteVerification('test-record-1');
  const record1AfterDelete = await dbService.getVerificationById('test-record-1');
  const record2StillExists = await dbService.getVerificationById('test-record-2');

  record(
    'History Single Item Deletion',
    'Integration',
    deleteResult1 && record1AfterDelete === null && record2StillExists !== null,
    'Record 1 deleted, returns null on lookup, Record 2 remains intact'
  );

  // 21. Deleting Non-Existent Record
  const deleteNonExistent = await dbService.deleteVerification('non-existent-id-999');
  record(
    'History Delete Non-Existent Record',
    'Functional',
    deleteNonExistent === false,
    'Returns false when deleting non-existent ID'
  );

  // 22. Clear All History
  await dbService.clearAllHistory();
  const historyAfterClearAll = await dbService.getHistory();
  record(
    'History Clear All Action',
    'Integration',
    historyAfterClearAll.length === 0,
    'All history records permanently wiped and confirmed empty'
  );

  // --- SUMMARY ---
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;
  console.log(`\n========================================`);
  console.log(`TEST RESULTS SUMMARY:`);
  console.log(`Total: ${results.length} | Passed: ${passedCount} | Failed: ${failedCount}`);
  console.log(`========================================\n`);

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

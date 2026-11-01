import { Router, type Request, type Response } from 'express';
import { VerifyInputSchema } from '../../../shared/schemas/index';
import { verificationWorkflow } from '../services/verification.workflow';
import { kieService } from '../services/kie.service';
import { searchService } from '../services/search.service';
import { dbService } from '../services/db.service';
import type { SystemHealthStatus } from '../../../shared/types/index';

export const apiRouter = Router();

/**
 * POST /api/verify - Run end-to-end claim or URL verification
 */
apiRouter.post('/verify', async (req: Request, res: Response) => {
  try {
    const parseResult = VerifyInputSchema.safeParse(req.body);
    if (!parseResult.success) {
      const issue = parseResult.error.issues[0]?.message || 'Invalid input format.';
      res.status(400).json({ success: false, error: issue });
      return;
    }

    const { input } = parseResult.data;
    const report = await verificationWorkflow.execute(input);

    res.status(200).json({
      success: true,
      data: report,
    });
  } catch (err: any) {
    console.error('Verification error:', err);
    res.status(err.status || 500).json({
      success: false,
      error: err.message || 'An unexpected error occurred during verification.',
    });
  }
});

/**
 * GET /api/news - Get latest live news articles with optional force refresh & pagination
 */
apiRouter.get('/news', async (req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  try {
    const forceRefresh = req.query.refresh === 'true';
    const page = parseInt((req.query.page as string) || '1', 10);
    const limit = parseInt((req.query.limit as string) || '10', 10);

    const result = await dbService.getNews({ forceRefresh, page, limit });

    res.status(200).json({
      success: true,
      data: result.articles,
      lastUpdated: result.lastUpdated,
      total: result.total,
      hasMore: result.hasMore,
      page: result.page,
    });
  } catch (err: any) {
    console.error('Failed to retrieve news feed:', err.message);
    res.status(502).json({
      success: false,
      error: err.message || 'Unable to fetch real-time news feed from external providers.',
    });
  }
});

/**
 * GET /api/history - Get verification history
 */
apiRouter.get('/history', async (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  try {
    const history = await dbService.getHistory();
    res.status(200).json({
      success: true,
      data: history,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve verification history.',
    });
  }
});

/**
 * GET /api/history/:id - Retrieve single report
 */
apiRouter.get('/history/:id', async (req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  try {
    const report = await dbService.getVerificationById(req.params.id);
    if (!report) {
      res.status(404).json({ success: false, error: 'Verification report not found.' });
      return;
    }
    res.status(200).json({
      success: true,
      data: report,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve verification report.',
    });
  }
});

/**
 * DELETE /api/history - Clear all verification history records
 */
apiRouter.delete('/history', async (_req: Request, res: Response) => {
  try {
    await dbService.clearAllHistory();
    res.status(200).json({
      success: true,
      message: 'All verification history records have been permanently cleared.',
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to clear verification history.',
    });
  }
});

/**
 * DELETE /api/history/:id - Delete single verification report
 */
apiRouter.delete('/history/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    if (!id || id.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: 'Record ID is required.',
      });
      return;
    }

    const deleted = await dbService.deleteVerification(id);
    if (!deleted) {
      res.status(404).json({
        success: false,
        error: 'Verification record not found or already deleted.',
      });
      return;
    }

    res.status(200).json({
      success: true,
      deleted: true,
      id,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to delete verification record.',
    });
  }
});

/**
 * GET /api/health - System and integration health diagnostics
 */
apiRouter.get('/health', async (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  try {
    const kieHealth = await kieService.checkHealth();
    const researchStatus = searchService.getStatus();
    const storageStatus = dbService.getStorageStatus();

    const overallStatus: 'ok' | 'degraded' | 'error' =
      kieHealth.configured && kieHealth.authenticated
        ? 'ok'
        : kieHealth.configured
        ? 'degraded'
        : 'degraded';

    const payload: SystemHealthStatus = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      kie: kieHealth,
      research: researchStatus,
      storage: storageStatus,
    };

    res.status(200).json(payload);
  } catch (err: any) {
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: err.message,
    });
  }
});

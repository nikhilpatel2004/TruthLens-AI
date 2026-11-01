import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from '../config/env';
import { newsService } from './news.service';
import type { VerificationReport, NewsArticleItem } from '../../../shared/types/index';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');
const HISTORY_FILE_PATH = path.join(DATA_DIR, 'verification_history.json');

class DbService {
  private memoryHistory: Map<string, VerificationReport> = new Map();
  private supabaseConfigured: boolean;
  private supabaseTableAvailable = true;

  constructor() {
    this.supabaseConfigured = Boolean(
      config.supabase.url &&
      config.supabase.url.trim().length > 0 &&
      config.supabase.serviceRoleKey &&
      config.supabase.serviceRoleKey.trim().length > 0
    );

    // Initialize local file storage
    this.initLocalFileStore();
  }

  private initLocalFileStore() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(HISTORY_FILE_PATH)) {
        const raw = fs.readFileSync(HISTORY_FILE_PATH, 'utf-8');
        if (raw.trim()) {
          const records = JSON.parse(raw) as VerificationReport[];
          if (Array.isArray(records)) {
            for (const r of records) {
              if (r && r.id) {
                this.memoryHistory.set(r.id, r);
              }
            }
          }
        }
      } else {
        fs.writeFileSync(HISTORY_FILE_PATH, JSON.stringify([], null, 2), 'utf-8');
      }
    } catch (err: any) {
      console.warn('Failed to load local history file:', err.message);
    }
  }

  private persistLocalFileStore() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const allRecords = Array.from(this.memoryHistory.values()).sort(
        (a, b) => new Date(b.verifiedAt).getTime() - new Date(a.verifiedAt).getTime()
      );
      fs.writeFileSync(HISTORY_FILE_PATH, JSON.stringify(allRecords, null, 2), 'utf-8');
    } catch (err: any) {
      console.error('Failed to write local history file:', err.message);
    }
  }

  public isSupabaseConfigured(): boolean {
    return this.supabaseConfigured && this.supabaseTableAvailable;
  }

  public getStorageStatus() {
    return {
      type: (this.isSupabaseConfigured() ? 'supabase' : 'local_memory') as 'supabase' | 'local_memory',
      connected: true,
    };
  }

  public async saveVerification(report: VerificationReport): Promise<void> {
    if (this.supabaseConfigured && this.supabaseTableAvailable) {
      try {
        const response = await fetch(`${config.supabase.url}/rest/v1/verification_records`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: config.supabase.serviceRoleKey,
            Authorization: `Bearer ${config.supabase.serviceRoleKey}`,
            Prefer: 'return=minimal',
          },
          body: JSON.stringify({
            id: report.id,
            original_input: report.originalInput,
            input_type: report.inputType,
            extracted_claim: report.extractedClaim,
            verdict: report.verdict,
            explanation: report.explanation,
            confidence: report.confidence,
            evidence: {
              supporting: report.supportingEvidence,
              contradicting: report.contradictingEvidence,
            },
            citations: report.citations,
            limitations: report.limitations,
            created_at: report.verifiedAt,
          }),
        });

        if (!response.ok) {
          if (response.status === 404) {
            this.supabaseTableAvailable = false;
            console.warn('Supabase verification_records table not found. Using persistent local file storage.');
          }
        }
      } catch (err: any) {
        console.warn('Supabase request error, using local store:', err.message);
      }
    }

    this.memoryHistory.set(report.id, report);
    this.persistLocalFileStore();
  }

  public async getHistory(): Promise<VerificationReport[]> {
    if (this.supabaseConfigured && this.supabaseTableAvailable) {
      try {
        const response = await fetch(
          `${config.supabase.url}/rest/v1/verification_records?select=*&order=created_at.desc&limit=100`,
          {
            headers: {
              apikey: config.supabase.serviceRoleKey,
              Authorization: `Bearer ${config.supabase.serviceRoleKey}`,
            },
          }
        );

        if (response.ok) {
          const rows = (await response.json()) as any[];
          return rows.map((r) => ({
            id: r.id,
            originalInput: r.original_input,
            inputType: r.input_type,
            extractedClaim: r.extracted_claim,
            verdict: r.verdict,
            explanation: r.explanation,
            confidence: r.confidence,
            supportingEvidence: r.evidence?.supporting || [],
            contradictingEvidence: r.evidence?.contradicting || [],
            citations: r.citations || [],
            limitations: r.limitations || [],
            verifiedAt: r.created_at,
          }));
        } else if (response.status === 404) {
          this.supabaseTableAvailable = false;
        }
      } catch (err: any) {
        console.warn('Supabase fetch failed, falling back to local file history:', err.message);
      }
    }

    return Array.from(this.memoryHistory.values()).sort(
      (a, b) => new Date(b.verifiedAt).getTime() - new Date(a.verifiedAt).getTime()
    );
  }

  public async getVerificationById(id: string): Promise<VerificationReport | null> {
    if (this.supabaseConfigured && this.supabaseTableAvailable) {
      try {
        const response = await fetch(
          `${config.supabase.url}/rest/v1/verification_records?id=eq.${encodeURIComponent(id)}&select=*`,
          {
            headers: {
              apikey: config.supabase.serviceRoleKey,
              Authorization: `Bearer ${config.supabase.serviceRoleKey}`,
            },
          }
        );

        if (response.ok) {
          const rows = (await response.json()) as any[];
          if (rows.length > 0) {
            const r = rows[0];
            return {
              id: r.id,
              originalInput: r.original_input,
              inputType: r.input_type,
              extractedClaim: r.extracted_claim,
              verdict: r.verdict,
              explanation: r.explanation,
              confidence: r.confidence,
              supportingEvidence: r.evidence?.supporting || [],
              contradictingEvidence: r.evidence?.contradicting || [],
              citations: r.citations || [],
              limitations: r.limitations || [],
              verifiedAt: r.created_at,
            };
          }
        }
      } catch (err: any) {
        console.warn('Supabase get by id failed:', err.message);
      }
    }

    return this.memoryHistory.get(id) || null;
  }

  public async deleteVerification(id: string): Promise<boolean> {
    const existed = this.memoryHistory.has(id);

    if (this.supabaseConfigured && this.supabaseTableAvailable) {
      try {
        await fetch(
          `${config.supabase.url}/rest/v1/verification_records?id=eq.${encodeURIComponent(id)}`,
          {
            method: 'DELETE',
            headers: {
              apikey: config.supabase.serviceRoleKey,
              Authorization: `Bearer ${config.supabase.serviceRoleKey}`,
            },
          }
        );
      } catch (err: any) {
        console.warn('Supabase delete error:', err.message);
      }
    }

    const deleted = this.memoryHistory.delete(id);
    if (deleted || existed) {
      this.persistLocalFileStore();
      return true;
    }

    return false;
  }

  public async clearAllHistory(): Promise<boolean> {
    if (this.supabaseConfigured && this.supabaseTableAvailable) {
      try {
        // Delete all records in table
        await fetch(
          `${config.supabase.url}/rest/v1/verification_records?id=neq.00000000-0000-0000-0000-000000000000`,
          {
            method: 'DELETE',
            headers: {
              apikey: config.supabase.serviceRoleKey,
              Authorization: `Bearer ${config.supabase.serviceRoleKey}`,
            },
          }
        );
      } catch (err: any) {
        console.warn('Supabase clear all error:', err.message);
      }
    }

    this.memoryHistory.clear();
    this.persistLocalFileStore();
    return true;
  }

  public async getNews(options?: { forceRefresh?: boolean; page?: number; limit?: number }) {
    return await newsService.getLatestNews(options);
  }
}

export const dbService = new DbService();

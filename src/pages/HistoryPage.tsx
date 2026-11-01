import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  History,
  Trash2,
  ExternalLink,
  CheckCircle,
  AlertTriangle,
  XCircle,
  HelpCircle,
  ArrowRight,
  Loader2,
  Search,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import type { VerificationReport, Verdict } from '../../shared/types/index';

interface HistoryPageProps {
  onOpenReport: (report: VerificationReport) => void;
}

const LOCAL_STORAGE_KEY = 'truthlens_verification_history_mirror';

export const HistoryPage: React.FC<HistoryPageProps> = ({ onOpenReport }) => {
  const [history, setHistory] = useState<VerificationReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');
  const [verdictFilter, setVerdictFilter] = useState<string>('ALL');

  // Track deletion in progress per record ID to prevent double-clicks
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [isClearingAll, setIsClearingAll] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Sync with client-side localStorage mirror
  const syncWithLocalStorage = (records: VerificationReport[]) => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(records));
    } catch (e) {
      console.warn('Could not sync history to localStorage:', e);
    }
  };

  const getFromLocalStorage = (): VerificationReport[] => {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  };

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setActionError(null);

    try {
      const res = await fetch('/api/history', {
        cache: 'no-store',
        headers: {
          'Pragma': 'no-cache',
          'Cache-Control': 'no-cache',
        },
      });

      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }

      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setHistory(data.data);
        syncWithLocalStorage(data.data);
      } else {
        // Fallback to local storage mirror if backend returned unexpected payload
        const local = getFromLocalStorage();
        setHistory(local);
      }
    } catch (err: any) {
      console.warn('Failed to fetch history from backend, checking local cache:', err);
      const local = getFromLocalStorage();
      setHistory(local);
      if (!local.length) {
        setActionError('Unable to connect to verification history service.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Handle single record deletion
  const handleDeleteSingle = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (deletingIds.has(id)) return; // Prevent double-clicking

    const target = history.find((h) => h.id === id);
    const claimSnippet = target ? `"${target.extractedClaim.slice(0, 50)}..."` : 'this record';
    const confirmed = window.confirm(`Are you sure you want to permanently delete verification history for ${claimSnippet}?`);
    if (!confirmed) return;

    setActionError(null);
    setSuccessNotice(null);

    // Mark as in-flight
    setDeletingIds((prev) => new Set(prev).add(id));

    try {
      const res = await fetch(`/api/history/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || `Failed to delete record (HTTP ${res.status})`);
      }

      // Immediately remove from state and local storage
      setHistory((prev) => {
        const updated = prev.filter((item) => item.id !== id);
        syncWithLocalStorage(updated);
        return updated;
      });

      setSuccessNotice('Record permanently removed.');
      setTimeout(() => setSuccessNotice(null), 3000);
    } catch (err: any) {
      console.error('Delete failed:', err);
      setActionError(err.message || 'Failed to delete record. Please check your network and try again.');
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  // Handle Clear All History
  const handleClearAllHistory = async () => {
    if (isClearingAll || history.length === 0) return;

    const confirmed = window.confirm(
      `Are you sure you want to permanently delete ALL ${history.length} verification records? This action cannot be undone.`
    );
    if (!confirmed) return;

    setIsClearingAll(true);
    setActionError(null);
    setSuccessNotice(null);

    try {
      const res = await fetch('/api/history', {
        method: 'DELETE',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || `Failed to clear history (HTTP ${res.status})`);
      }

      // Clear memory and local storage
      setHistory([]);
      syncWithLocalStorage([]);

      setSuccessNotice('All verification history records have been cleared.');
      setTimeout(() => setSuccessNotice(null), 3000);
    } catch (err: any) {
      console.error('Clear all failed:', err);
      setActionError(err.message || 'Failed to clear all records. Please try again.');
    } finally {
      setIsClearingAll(false);
    }
  };

  const getVerdictStyle = (verdict: Verdict) => {
    switch (verdict) {
      case 'SUPPORTED':
        return { color: 'text-[#087A50]', bg: 'bg-[#E8F4EE]', icon: CheckCircle };
      case 'MISLEADING':
        return { color: 'text-amber-700', bg: 'bg-amber-50', icon: AlertTriangle };
      case 'FALSE':
        return { color: 'text-rose-700', bg: 'bg-rose-50', icon: XCircle };
      case 'UNVERIFIED':
      default:
        return { color: 'text-slate-700', bg: 'bg-slate-100', icon: HelpCircle };
    }
  };

  const filteredHistory = history.filter((item) => {
    const matchesSearch =
      item.extractedClaim.toLowerCase().includes(searchFilter.toLowerCase()) ||
      item.explanation.toLowerCase().includes(searchFilter.toLowerCase());
    const matchesVerdict = verdictFilter === 'ALL' || item.verdict === verdictFilter;
    return matchesSearch && matchesVerdict;
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E7EB] pb-5">
        <div>
          <h1 className="text-2xl font-bold text-[#172B3A] tracking-tight">Verification History</h1>
          <p className="text-sm text-[#64748B] mt-1">
            Review and manage past research reports, evidentiary verdicts, and source citations.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {history.length > 0 && (
            <button
              onClick={handleClearAllHistory}
              disabled={isClearingAll || loading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors shadow-2xs disabled:opacity-50"
              title="Delete all verification records"
            >
              {isClearingAll ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5" />
              )}
              <span>{isClearingAll ? 'Clearing...' : 'Clear All History'}</span>
            </button>
          )}

          <button
            onClick={fetchHistory}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#172B3A] bg-white border border-[#E5E7EB] hover:bg-[#F5F8F6] rounded-lg transition-colors shadow-2xs disabled:opacity-50"
            title="Refresh history list"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#64748B] ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Action alerts */}
      {actionError && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold">Action Alert: </span>
            {actionError}
          </div>
          <button
            onClick={() => setActionError(null)}
            className="text-rose-600 hover:text-rose-900 font-bold ml-2 text-sm"
          >
            ✕
          </button>
        </div>
      )}

      {successNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>{successNotice}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Search verified claims or explanations..."
            className="w-full pl-9 pr-3 py-2 bg-white text-xs border border-[#E5E7EB] rounded-lg outline-none focus:border-[#087A50]"
          />
        </div>

        {/* Verdict filter tabs */}
        <div className="flex items-center gap-1 p-1 bg-[#F5F8F6] rounded-lg shrink-0 overflow-x-auto">
          {['ALL', 'SUPPORTED', 'MISLEADING', 'FALSE', 'UNVERIFIED'].map((tab) => (
            <button
              key={tab}
              onClick={() => setVerdictFilter(tab)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                verdictFilter === tab
                  ? 'bg-white text-[#172B3A] shadow-xs'
                  : 'text-[#64748B] hover:text-[#172B3A]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 bg-white border border-[#E5E7EB] rounded-2xl shadow-2xs">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#087A50] mb-2" />
          <p className="text-sm text-[#64748B]">Loading verification records...</p>
        </div>
      ) : filteredHistory.length === 0 ? (
        <div className="p-12 text-center bg-white border border-[#E5E7EB] rounded-2xl space-y-2 shadow-2xs">
          <History className="w-8 h-8 text-[#64748B] mx-auto opacity-40" />
          <h3 className="text-sm font-bold text-[#172B3A]">No Verification Records Found</h3>
          <p className="text-xs text-[#64748B] max-w-sm mx-auto">
            {history.length === 0
              ? 'Claims and news articles you verify will be archived here for future reference.'
              : 'No records match your active search and verdict filter.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredHistory.map((item) => {
            const style = getVerdictStyle(item.verdict);
            const Icon = style.icon;
            const isDeleting = deletingIds.has(item.id);

            return (
              <div
                key={item.id}
                onClick={() => onOpenReport(item)}
                className={`p-4 bg-white border rounded-xl transition-all shadow-2xs cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  isDeleting
                    ? 'opacity-50 pointer-events-none border-rose-200'
                    : 'border-[#E5E7EB] hover:border-[#087A50]/50'
                }`}
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-xs">
                    <span className={`inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded ${style.bg} ${style.color}`}>
                      <Icon className="w-3 h-3" />
                      {item.verdict}
                    </span>
                    <span className="text-[#64748B]">·</span>
                    <span className="text-[#64748B] font-mono-data">
                      {new Date(item.verifiedAt).toLocaleDateString()}
                    </span>
                    <span className="text-[#64748B]">·</span>
                    <span className="text-[#64748B]">{item.citations.length} sources cited</span>
                  </div>

                  <h3 className="text-sm font-bold text-[#172B3A] line-clamp-2 leading-snug">
                    "{item.extractedClaim}"
                  </h3>

                  <p className="text-xs text-[#64748B] line-clamp-1">
                    {item.explanation}
                  </p>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <button
                    onClick={(e) => handleDeleteSingle(item.id, e)}
                    disabled={isDeleting}
                    className="p-2 text-[#64748B] hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-40"
                    title="Delete this record permanently"
                    aria-label={`Delete record for ${item.extractedClaim.slice(0, 30)}`}
                  >
                    {isDeleting ? (
                      <Loader2 className="w-4 h-4 animate-spin text-rose-600" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>

                  <div className="flex items-center gap-1 text-xs font-semibold text-[#087A50] pl-2 border-l border-[#E5E7EB]">
                    <span>View Report</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

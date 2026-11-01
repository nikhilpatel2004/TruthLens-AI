import React, { useState } from 'react';
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  HelpCircle,
  ExternalLink,
  Copy,
  Check,
  Share2,
  Calendar,
  Building,
  Info,
  ArrowLeft,
  ShieldAlert,
} from 'lucide-react';
import type { VerificationReport, EvidenceItem, Verdict } from '../../../shared/types/index';

interface VerificationReportViewProps {
  report: VerificationReport;
  onReset: () => void;
}

export const VerificationReportView: React.FC<VerificationReportViewProps> = ({ report, onReset }) => {
  const [copied, setCopied] = useState(false);
  const [activeEvidenceTab, setActiveEvidenceTab] = useState<'all' | 'supporting' | 'contradicting'>('all');

  const copyReportSummary = () => {
    const text = `[TruthLens AI Verification Report]
Verdict: ${report.verdict}
Claim: ${report.extractedClaim}
Explanation: ${report.explanation}
Citations: ${report.citations.length} sources evaluated.
Verified at: ${new Date(report.verifiedAt).toLocaleString()}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getVerdictBadge = (verdict: Verdict) => {
    switch (verdict) {
      case 'SUPPORTED':
        return {
          bg: 'bg-[#E8F4EE]',
          text: 'text-[#087A50]',
          border: 'border-[#087A50]/30',
          icon: CheckCircle,
          label: 'Supported by Evidence',
          tagline: 'Available authoritative evidence and reports substantiate the core claim.',
        };
      case 'MISLEADING':
        return {
          bg: 'bg-amber-50',
          text: 'text-amber-800',
          border: 'border-amber-300',
          icon: AlertTriangle,
          label: 'Misleading / Missing Context',
          tagline: 'The claim contains partial truth but distorts context, omits key caveats, or misrepresents timelines.',
        };
      case 'FALSE':
        return {
          bg: 'bg-rose-50',
          text: 'text-rose-800',
          border: 'border-rose-300',
          icon: XCircle,
          label: 'False / Contradicted',
          tagline: 'Credible reporting and primary public records directly refute this assertion.',
        };
      case 'UNVERIFIED':
      default:
        return {
          bg: 'bg-slate-50',
          text: 'text-slate-700',
          border: 'border-slate-300',
          icon: HelpCircle,
          label: 'Unverified / Insufficient Evidence',
          tagline: 'Current public documentation and reputable news indexes do not provide sufficient corroboration.',
        };
    }
  };

  const meta = getVerdictBadge(report.verdict);
  const VerdictIcon = meta.icon;

  const displayedEvidence =
    activeEvidenceTab === 'supporting'
      ? report.supportingEvidence
      : activeEvidenceTab === 'contradicting'
      ? report.contradictingEvidence
      : report.citations;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Top action bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={onReset}
          className="flex items-center gap-1.5 text-xs font-semibold text-[#64748B] hover:text-[#172B3A] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Verify Another Claim</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={copyReportSummary}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#172B3A] bg-white border border-[#E5E7EB] hover:bg-[#F5F8F6] rounded-md transition-colors shadow-2xs"
          >
            {copied ? <Check className="w-3 h-3 text-[#087A50]" /> : <Copy className="w-3 h-3 text-[#64748B]" />}
            <span>{copied ? 'Copied' : 'Copy Summary'}</span>
          </button>
        </div>
      </div>

      {/* Primary Verdict Card */}
      <div className={`p-6 rounded-xl border ${meta.border} ${meta.bg} shadow-2xs transition-all`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-lg bg-white shadow-xs shrink-0 ${meta.text}`}>
              <VerdictIcon className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                TruthLens Verdict
              </div>
              <h2 className={`text-xl font-bold tracking-tight ${meta.text}`}>{meta.label}</h2>
            </div>
          </div>

          {report.confidence.score !== null ? (
            <div className="bg-white/90 border border-black/5 px-3.5 py-2 rounded-lg shrink-0">
              <div className="text-[11px] text-[#64748B] uppercase tracking-wider">Evidence Confidence</div>
              <div className="text-lg font-bold font-mono-data text-[#172B3A]">
                {report.confidence.score}%
              </div>
            </div>
          ) : (
            <div className="bg-white/90 border border-black/5 px-3 py-1.5 rounded-lg shrink-0 text-xs text-[#64748B]">
              Confidence: Inconclusive
            </div>
          )}
        </div>

        <p className="mt-3 text-sm text-[#172B3A]/90 font-medium leading-relaxed">{meta.tagline}</p>
      </div>

      {/* Claim & Input Box */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-6 shadow-2xs space-y-4">
        <div>
          <div className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-1">
            Extracted Central Claim
          </div>
          <p className="text-base font-semibold text-[#172B3A] leading-snug">
            "{report.extractedClaim}"
          </p>
        </div>

        {report.originalInput !== report.extractedClaim && (
          <div className="pt-3 border-t border-[#E5E7EB] text-xs text-[#64748B]">
            <span className="font-medium text-[#172B3A]">Original Submission ({report.inputType}): </span>
            <span className="italic break-words">{report.originalInput}</span>
          </div>
        )}
      </div>

      {/* Explanation & Assessment */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-6 shadow-2xs space-y-4">
        <h3 className="text-sm font-bold text-[#172B3A] uppercase tracking-wider">
          Evidence-Based Analysis
        </h3>
        <div className="text-sm text-[#172B3A] leading-relaxed whitespace-pre-line font-serif-editorial">
          {report.explanation}
        </div>

        {report.confidence.reason && (
          <div className="p-3.5 bg-[#F5F8F6] border border-[#E5E7EB] rounded-lg text-xs text-[#64748B] flex items-start gap-2.5">
            <Info className="w-4 h-4 text-[#087A50] shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-[#172B3A]">Confidence Assessment: </span>
              {report.confidence.reason}
            </div>
          </div>
        )}
      </div>

      {/* Evidence & Citations Section */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E7EB] pb-3">
          <div>
            <h3 className="text-sm font-bold text-[#172B3A] uppercase tracking-wider">
              Retrieved Evidence & Citations ({report.citations.length})
            </h3>
            <p className="text-xs text-[#64748B]">All citations link to original external publishers.</p>
          </div>

          {/* Interactive filter tabs */}
          <div className="flex items-center gap-1 p-1 bg-[#F5F8F6] rounded-lg">
            <button
              onClick={() => setActiveEvidenceTab('all')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                activeEvidenceTab === 'all'
                  ? 'bg-white text-[#172B3A] shadow-xs'
                  : 'text-[#64748B] hover:text-[#172B3A]'
              }`}
            >
              All ({report.citations.length})
            </button>
            <button
              onClick={() => setActiveEvidenceTab('supporting')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                activeEvidenceTab === 'supporting'
                  ? 'bg-white text-[#087A50] shadow-xs'
                  : 'text-[#64748B] hover:text-[#172B3A]'
              }`}
            >
              Supporting ({report.supportingEvidence.length})
            </button>
            <button
              onClick={() => setActiveEvidenceTab('contradicting')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                activeEvidenceTab === 'contradicting'
                  ? 'bg-white text-rose-700 shadow-xs'
                  : 'text-[#64748B] hover:text-[#172B3A]'
              }`}
            >
              Contradicting ({report.contradictingEvidence.length})
            </button>
          </div>
        </div>

        {displayedEvidence.length === 0 ? (
          <div className="text-center py-8 text-xs text-[#64748B]">
            No sources cataloged under this specific filter.
          </div>
        ) : (
          <div className="space-y-3">
            {displayedEvidence.map((src, idx) => (
              <div
                key={src.url + idx}
                className="p-4 rounded-lg border border-[#E5E7EB] bg-white hover:border-[#087A50]/40 transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-[#64748B]">
                      <span className="font-medium text-[#172B3A] flex items-center gap-1">
                        <Building className="w-3 h-3 text-[#64748B]" />
                        {src.publisher}
                      </span>
                      {src.publishedAt && (
                        <>
                          <span>·</span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-[#64748B]" />
                            {src.publishedAt.slice(0, 10)}
                          </span>
                        </>
                      )}
                      <span>·</span>
                      <span
                        className={`text-[11px] font-semibold ${
                          src.relationship === 'SUPPORTS'
                            ? 'text-[#087A50]'
                            : src.relationship === 'CONTRADICTS'
                            ? 'text-rose-700'
                            : 'text-[#64748B]'
                        }`}
                      >
                        {src.relationship}
                      </span>
                    </div>

                    <h4 className="text-sm font-semibold text-[#172B3A] leading-snug">
                      {src.title}
                    </h4>

                    <p className="text-xs text-[#64748B] leading-relaxed mt-1">
                      {src.summary}
                    </p>
                  </div>

                  <a
                    href={src.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-[#64748B] hover:text-[#087A50] hover:bg-[#F5F8F6] rounded-md transition-colors shrink-0"
                    title="Open original source"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Limitations Box */}
      {report.limitations && report.limitations.length > 0 && (
        <div className="bg-[#FAFCFB] border border-[#E5E7EB] rounded-xl p-5 shadow-2xs space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-[#172B3A] uppercase tracking-wider">
            <ShieldAlert className="w-3.5 h-3.5 text-[#087A50]" />
            <span>Methodological Caveats & Limitations</span>
          </div>
          <ul className="text-xs text-[#64748B] space-y-1 list-disc list-inside">
            {report.limitations.map((lim, i) => (
              <li key={i}>{lim}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Verification Timestamp */}
      <div className="text-center text-xs text-[#64748B]">
        Verified on {new Date(report.verifiedAt).toLocaleDateString()} at{' '}
        {new Date(report.verifiedAt).toLocaleTimeString()} · Record ID: {report.id.slice(0, 8)}
      </div>
    </div>
  );
};

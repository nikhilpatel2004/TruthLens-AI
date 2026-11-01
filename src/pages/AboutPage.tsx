import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  Brain,
  Search,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  XCircle,
  Activity,
  Database,
  Lock,
  RefreshCw,
} from 'lucide-react';
import type { SystemHealthStatus } from '../../shared/types/index';

interface AboutPageProps {
  health: SystemHealthStatus | null;
  onRefreshHealth: () => void;
}

export const AboutPage: React.FC<AboutPageProps> = ({ health, onRefreshHealth }) => {
  const [checking, setChecking] = useState(false);

  const handleRefresh = async () => {
    setChecking(true);
    await onRefreshHealth();
    setChecking(false);
  };

  const steps = [
    {
      num: '01',
      title: 'Input Validation & SSRF Guard',
      desc: 'Text claims, social posts, WhatsApp forwards, or article URLs are sanitized. Destination IPs are checked against SSRF policies (blocking private/loopback addresses).',
    },
    {
      num: '02',
      title: 'Claim Extraction via KIE.ai',
      desc: 'The KIE.ai language engine isolates the central factual assertion, parses entities (people, dates, organizations), and formulates targeted research queries.',
    },
    {
      num: '03',
      title: 'Real-World Evidence Gathering',
      desc: 'Dedicated search providers (Tavily Search API & Google Fact Check Tools) query reputable news desks, official government agencies, and fact-checking institutions.',
    },
    {
      num: '04',
      title: 'Evidentiary Cross-Examination',
      desc: 'KIE.ai cross-references the retrieved sources against the claim with prompt isolation (preventing web snippets from manipulating system instructions).',
    },
    {
      num: '05',
      title: 'Verdict & Transparent Confidence',
      desc: 'A strict 4-state verdict is rendered with full source citations, confidence estimation, and explicit methodological limitations.',
    },
  ];

  const verdicts = [
    {
      name: 'SUPPORTED',
      color: 'text-[#087A50]',
      bg: 'bg-[#E8F4EE]',
      desc: 'Corroborated by direct, consistent reporting from independent, reliable primary or secondary sources.',
    },
    {
      name: 'MISLEADING',
      color: 'text-amber-800',
      bg: 'bg-amber-50',
      desc: 'Contains genuine elements but omits vital context, exaggerates figures, or attaches outdated media to recent events.',
    },
    {
      name: 'FALSE',
      color: 'text-rose-800',
      bg: 'bg-rose-50',
      desc: 'Directly contradicted, fabricated, or disproven by authoritative records and verified fact-checking institutions.',
    },
    {
      name: 'UNVERIFIED',
      color: 'text-slate-700',
      bg: 'bg-slate-100',
      desc: 'Public documentation is absent, contradictory, or insufficient to reach an objective determination.',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Overview Banner */}
      <div className="space-y-3 border-b border-[#E5E7EB] pb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#172B3A] tracking-tight">
          About TruthLens AI & Verification Methodology
        </h1>
        <p className="text-sm text-[#64748B] leading-relaxed max-w-2xl font-serif-editorial">
          TruthLens AI is an open, evidence-first fact-checking platform built to help citizens,
          researchers, and journalists navigate misinformation, deceptive headlines, and viral rumors.
        </p>
      </div>

      {/* System Health Diagnostics */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#087A50]" />
            <h2 className="text-sm font-bold text-[#172B3A] uppercase tracking-wider">
              Integration & Provider Status
            </h2>
          </div>

          <button
            onClick={handleRefresh}
            disabled={checking}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-[#172B3A] bg-[#F5F8F6] hover:bg-[#E8F4EE] rounded-md transition-colors"
          >
            <RefreshCw className={`w-3 h-3 text-[#087A50] ${checking ? 'animate-spin' : ''}`} />
            <span>Check Status</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* KIE.ai Provider */}
          <div className="p-3.5 rounded-lg border border-[#E5E7EB] bg-[#FAFCFB] space-y-1">
            <div className="flex items-center justify-between text-xs font-semibold text-[#172B3A]">
              <span className="flex items-center gap-1.5">
                <Brain className="w-3.5 h-3.5 text-[#087A50]" />
                KIE.ai LLM
              </span>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  health?.kie?.configured ? 'bg-[#E8F4EE] text-[#087A50]' : 'bg-amber-100 text-amber-800'
                }`}
              >
                {health?.kie?.configured ? 'Active' : 'Unconfigured'}
              </span>
            </div>
            <div className="text-[11px] font-mono-data text-[#64748B] truncate">
              Model: {health?.kie?.model || 'gemini-3-8-flash-openai'}
            </div>
            <div className="text-[11px] text-[#64748B] leading-tight">
              {health?.kie?.message || 'Extracts claims & reasons over evidence.'}
            </div>
          </div>

          {/* Research Service */}
          <div className="p-3.5 rounded-lg border border-[#E5E7EB] bg-[#FAFCFB] space-y-1">
            <div className="flex items-center justify-between text-xs font-semibold text-[#172B3A]">
              <span className="flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-[#087A50]" />
                Web Research
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#E8F4EE] text-[#087A50]">
                {health?.research?.tavilyConfigured ? 'Tavily API' : 'Live Search Index'}
              </span>
            </div>
            <div className="text-[11px] font-mono-data text-[#64748B] truncate">
              Provider: {health?.research?.provider || 'Active'}
            </div>
            <div className="text-[11px] text-[#64748B] leading-tight">
              Collects real citations from news & official agencies.
            </div>
          </div>

          {/* Storage Service */}
          <div className="p-3.5 rounded-lg border border-[#E5E7EB] bg-[#FAFCFB] space-y-1">
            <div className="flex items-center justify-between text-xs font-semibold text-[#172B3A]">
              <span className="flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-[#087A50]" />
                Database
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#E8F4EE] text-[#087A50]">
                {health?.storage?.type === 'supabase' ? 'Supabase' : 'Local Persistence'}
              </span>
            </div>
            <div className="text-[11px] font-mono-data text-[#64748B]">
              Mode: {health?.storage?.type || 'Memory/Local'}
            </div>
            <div className="text-[11px] text-[#64748B] leading-tight">
              Stores verification reports and history records.
            </div>
          </div>
        </div>
      </div>

      {/* 5-Stage Verification Architecture */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-[#172B3A] uppercase tracking-wider">
          How Verification Works
        </h2>
        <div className="grid grid-cols-1 gap-3">
          {steps.map((st) => (
            <div
              key={st.num}
              className="p-4 bg-white border border-[#E5E7EB] rounded-xl flex items-start gap-4 shadow-2xs"
            >
              <div className="text-base font-bold font-mono-data text-[#087A50] shrink-0 pt-0.5">
                {st.num}
              </div>
              <div className="space-y-0.5">
                <h3 className="text-sm font-bold text-[#172B3A]">{st.title}</h3>
                <p className="text-xs text-[#64748B] leading-relaxed">{st.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Verdict Classifications */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-[#172B3A] uppercase tracking-wider">
          Evidentiary Verdict Criteria
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {verdicts.map((v) => (
            <div key={v.name} className="p-4 bg-white border border-[#E5E7EB] rounded-xl space-y-1.5 shadow-2xs">
              <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded ${v.bg} ${v.color}`}>
                {v.name}
              </span>
              <p className="text-xs text-[#64748B] leading-relaxed">{v.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Methodological Boundaries */}
      <div className="bg-[#F5F8F6] border border-[#E5E7EB] rounded-xl p-5 space-y-2">
        <h3 className="text-xs font-bold text-[#172B3A] uppercase tracking-wider flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5 text-[#087A50]" />
          Methodological Boundaries & Integrity Rules
        </h3>
        <p className="text-xs text-[#64748B] leading-relaxed">
          TruthLens AI does not invent evidence, synthesize fake citations, or force conclusions when data is
          missing. When authoritative sources conflict or when an offline event has not yet been documented by
          independent journalists, the engine outputs an <strong className="text-[#172B3A]">UNVERIFIED</strong> verdict with complete transparency.
        </p>
      </div>
    </div>
  );
};

import React from 'react';
import { ShieldCheck, Plus, ExternalLink, Activity } from 'lucide-react';

interface HeaderProps {
  onNewVerification: () => void;
  onOpenAbout: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onNewVerification, onOpenAbout }) => {
  return (
    <header className="flex items-center justify-between gap-8 px-6 py-3.5 bg-white border-b border-[#E5E7EB] sticky top-0 z-20">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-2 shrink-0">
        <a href="/" className="text-base font-bold tracking-tight text-[#172B3A] whitespace-nowrap shrink-0 flex items-center gap-2">
          <span>TruthLens AI</span>
        </a>
      </div>

      {/* Zone 2: 4 clean single-line nav items */}
      <nav className="hidden lg:flex items-center gap-6 text-xs font-medium text-[#64748B]">
        <button onClick={onNewVerification} className="hover:text-[#172B3A] transition-colors whitespace-nowrap shrink-0">
          Verify Claim
        </button>
        <span className="text-[#E5E7EB]">·</span>
        <a href="#evidence" onClick={onOpenAbout} className="hover:text-[#172B3A] transition-colors whitespace-nowrap shrink-0">
          Evidentiary Standards
        </a>
        <span className="text-[#E5E7EB]">·</span>
        <a href="#transparency" onClick={onOpenAbout} className="hover:text-[#172B3A] transition-colors whitespace-nowrap shrink-0">
          Transparency & Sources
        </a>
        <span className="text-[#E5E7EB]">·</span>
        <a href="#faq" onClick={onOpenAbout} className="hover:text-[#172B3A] transition-colors whitespace-nowrap shrink-0">
          Limitations
        </a>
      </nav>

      {/* Zone 3: 1 primary action */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onNewVerification}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#087A50] hover:bg-[#066240] rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Verification</span>
        </button>
      </div>
    </header>
  );
};

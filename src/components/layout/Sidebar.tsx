import React from 'react';
import { ShieldCheck, Newspaper, History, Info, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import type { SystemHealthStatus } from '../../../shared/types/index';

interface SidebarProps {
  currentTab: 'home' | 'news' | 'history' | 'about';
  onSelectTab: (tab: 'home' | 'news' | 'history' | 'about') => void;
  health: SystemHealthStatus | null;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab, health }) => {
  const navItems = [
    { id: 'home' as const, label: 'Home', icon: ShieldCheck, subtitle: 'Verify claims & news' },
    { id: 'news' as const, label: 'Latest News', icon: Newspaper, subtitle: 'Curated headlines' },
    { id: 'history' as const, label: 'Verification History', icon: History, subtitle: 'Past verified records' },
    { id: 'about' as const, label: 'About & Methodology', icon: Info, subtitle: 'How TruthLens works' },
  ];

  return (
    <aside className="w-full md:w-64 bg-[#FFFFFF] border-r border-[#E5E7EB] flex flex-col justify-between shrink-0 h-auto md:h-screen md:sticky md:top-0">
      <div>
        {/* Brand Header */}
        <div className="p-5 border-b border-[#E5E7EB]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-[#087A50] flex items-center justify-center text-white shadow-sm shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-base font-bold text-[#172B3A] tracking-tight leading-tight">TruthLens AI</div>
              <div className="text-xs text-[#64748B]">Evidence-Based Verification</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                  isActive
                    ? 'bg-[#E8F4EE] text-[#087A50]'
                    : 'text-[#172B3A] hover:bg-[#F5F8F6] hover:text-[#087A50]'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#087A50]' : 'text-[#64748B]'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer & Status */}
      <div className="p-4 border-t border-[#E5E7EB] space-y-3 bg-[#FAFCFB]">
        {/* Health status summary */}
        <div className="text-xs text-[#64748B] space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-medium text-[#172B3A]">AI Engine</span>
            <span className="text-[11px] font-mono-data text-[#087A50]">
              {health?.kie?.model || 'KIE.ai'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px]">
            {health?.kie?.configured ? (
              <CheckCircle2 className="w-3 h-3 text-[#087A50]" />
            ) : (
              <AlertCircle className="w-3 h-3 text-amber-600" />
            )}
            <span>
              {health?.kie?.configured ? 'KIE.ai Ready' : 'KIE.ai Config Needed'}
            </span>
          </div>
        </div>

        <div className="pt-2 border-t border-[#E5E7EB]/60 text-center">
          <p className="text-xs font-medium text-[#64748B]">
            Fight Misinformation Together
          </p>
        </div>
      </div>
    </aside>
  );
};

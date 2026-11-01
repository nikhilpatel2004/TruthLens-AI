import React, { useEffect, useState } from 'react';
import { Search, Brain, FileCheck, Layers, Loader2 } from 'lucide-react';

interface VerificationLoadingProps {
  currentStage?: 'UNDERSTANDING' | 'SEARCHING' | 'COMPARING' | 'PREPARING';
}

export const VerificationLoading: React.FC<VerificationLoadingProps> = ({ currentStage }) => {
  const [activeStep, setActiveStep] = useState(0);

  const stages = [
    {
      title: 'Understanding your claim',
      desc: 'Isolating factual assertions, entities, dates, and core context via KIE.ai',
      icon: Brain,
    },
    {
      title: 'Searching for evidence',
      desc: 'Retrieving official registries, verified fact checks, and reputable news reports',
      icon: Search,
    },
    {
      title: 'Comparing available sources',
      desc: 'Evaluating corroboration, contradictions, publication dates, and primary records',
      icon: Layers,
    },
    {
      title: 'Preparing your report',
      desc: 'Synthesizing evidence-based verdict, confidence metrics, and verifiable citations',
      icon: FileCheck,
    },
  ];

  useEffect(() => {
    if (currentStage === 'UNDERSTANDING') setActiveStep(0);
    else if (currentStage === 'SEARCHING') setActiveStep(1);
    else if (currentStage === 'COMPARING') setActiveStep(2);
    else if (currentStage === 'PREPARING') setActiveStep(3);
    else {
      // Natural fallback timer for smooth visual feedback
      const interval = setInterval(() => {
        setActiveStep((prev) => (prev < 3 ? prev + 1 : prev));
      }, 3500);
      return () => clearInterval(interval);
    }
  }, [currentStage]);

  return (
    <div className="max-w-2xl mx-auto my-8 p-8 bg-white border border-[#E5E7EB] rounded-xl shadow-xs">
      <div className="text-center mb-8">
        <div className="w-12 h-12 mx-auto mb-3 bg-[#E8F4EE] rounded-full flex items-center justify-center text-[#087A50]">
          <Loader2 className="w-6 h-6 animate-spin text-[#087A50]" />
        </div>
        <h3 className="text-lg font-bold text-[#172B3A]">Researching Claim In Real-Time</h3>
        <p className="text-sm text-[#64748B] mt-1">
          TruthLens is cross-referencing your submission against authoritative publications.
        </p>
      </div>

      <div className="space-y-4">
        {stages.map((stage, idx) => {
          const Icon = stage.icon;
          const isDone = idx < activeStep;
          const isCurrent = idx === activeStep;

          return (
            <div
              key={stage.title}
              className={`flex items-start gap-4 p-3.5 rounded-lg border transition-all ${
                isCurrent
                  ? 'bg-[#F5F8F6] border-[#087A50]/40 shadow-xs'
                  : isDone
                  ? 'bg-white border-[#E5E7EB] opacity-75'
                  : 'bg-white border-transparent opacity-40'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs font-semibold ${
                  isDone
                    ? 'bg-[#087A50] text-white'
                    : isCurrent
                    ? 'bg-[#087A50] text-white'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {isCurrent ? <Loader2 className="w-4 h-4 animate-spin" /> : isDone ? '✓' : idx + 1}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-semibold ${isCurrent ? 'text-[#087A50]' : 'text-[#172B3A]'}`}>
                    {stage.title}
                  </span>
                </div>
                <p className="text-xs text-[#64748B] mt-0.5 leading-relaxed">{stage.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

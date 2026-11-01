import React, { useState } from 'react';
import { Search, Sparkles, Link, ShieldCheck, ArrowRight, CornerDownLeft, AlertCircle } from 'lucide-react';

interface VerificationFormProps {
  onVerify: (input: string) => Promise<void>;
  isLoading: boolean;
  errorMessage: string | null;
  onClearError: () => void;
  initialValue?: string;
}

export const VerificationForm: React.FC<VerificationFormProps> = ({
  onVerify,
  isLoading,
  errorMessage,
  onClearError,
  initialValue = '',
}) => {
  const [input, setInput] = useState(initialValue);

  const sampleClaims = [
    {
      label: 'WhatsApp Forward',
      claim: 'WhatsApp Forward: The government just announced that 5G cellular towers will be turned off nationwide tomorrow for security maintenance.',
    },
    {
      label: 'Health Claim',
      claim: 'Drinking boiled garlic water cures and completely prevents respiratory viral infections within 24 hours.',
    },
    {
      label: 'News Headline',
      claim: 'NASA discovers signs of ancient microbial life in sediment samples from Mars river delta.',
    },
    {
      label: 'Social Media Rumor',
      claim: 'Central banks in Europe ordered commercial banks to restrict daily cash ATM withdrawals to 50 euros starting next week.',
    },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onClearError();
    onVerify(input.trim());
  };

  const handleSelectSample = (sample: string) => {
    setInput(sample);
    onClearError();
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Hero Content */}
      <div className="text-center space-y-3 pt-4">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#172B3A] tracking-tight leading-tight">
          Check Any News or Claim Instantly
        </h1>
        <p className="text-base text-[#64748B] max-w-xl mx-auto leading-relaxed">
          Verify information using AI-powered research and reliable sources.
        </p>
      </div>

      {/* Main Verification Input Card */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-xs overflow-hidden">
        <form onSubmit={handleSubmit} className="p-4 sm:p-5">
          <div className="relative">
            <textarea
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                if (errorMessage) onClearError();
              }}
              placeholder="Paste a news link or claim..."
              rows={4}
              disabled={isLoading}
              className="w-full p-4 bg-[#F5F8F6] hover:bg-[#F0F5F2] focus:bg-white text-sm sm:text-base text-[#172B3A] placeholder-[#64748B] rounded-xl border border-transparent focus:border-[#087A50] focus:ring-2 focus:ring-[#087A50]/15 outline-none resize-none transition-all"
            />
          </div>

          {/* Form Action Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-3 pt-2">
            <div className="flex items-center gap-2 text-xs text-[#64748B]">
              <ShieldCheck className="w-4 h-4 text-[#087A50] shrink-0" />
              <span>Paste URL, headline, social media post, or forwarded message</span>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              {input.length > 0 && !isLoading && (
                <button
                  type="button"
                  onClick={() => {
                    setInput('');
                    onClearError();
                  }}
                  className="px-3 py-2 text-xs font-medium text-[#64748B] hover:text-[#172B3A] transition-colors"
                >
                  Clear
                </button>
              )}

              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="flex items-center gap-2 px-6 py-2.5 bg-[#087A50] hover:bg-[#066240] disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl shadow-xs transition-colors"
              >
                <span>Verify</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </form>

        {/* Error message alert */}
        {errorMessage && (
          <div className="mx-4 mb-4 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-xs text-rose-800">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">
              <span className="font-semibold">Verification Alert: </span>
              {errorMessage}
            </div>
          </div>
        )}

        {/* Privacy Note */}
        <div className="px-5 py-3 bg-[#F9FBFA] border-t border-[#E5E7EB] text-center text-xs text-[#64748B]">
          Privacy Note: TruthLens analyzes public information and does not store personal identifiable data.
        </div>
      </div>

      {/* Quick Test Samples */}
      <div className="space-y-3">
        <div className="text-xs font-semibold text-[#64748B] uppercase tracking-wider text-center">
          Or try a sample claim to see how verification works
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {sampleClaims.map((sample) => (
            <button
              key={sample.label}
              onClick={() => handleSelectSample(sample.claim)}
              disabled={isLoading}
              className="p-3 text-left bg-white hover:bg-[#F5F8F6] border border-[#E5E7EB] hover:border-[#087A50]/40 rounded-xl transition-all group disabled:opacity-50"
            >
              <div className="text-xs font-bold text-[#087A50] mb-0.5 flex items-center justify-between">
                <span>{sample.label}</span>
                <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[11px] font-normal text-[#64748B]">
                  Click to test →
                </span>
              </div>
              <p className="text-xs text-[#172B3A] line-clamp-2 leading-relaxed">
                {sample.claim}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { HomePage } from './pages/HomePage';
import { NewsPage } from './pages/NewsPage';
import { HistoryPage } from './pages/HistoryPage';
import { AboutPage } from './pages/AboutPage';
import type { VerificationReport, SystemHealthStatus } from '../shared/types/index';

export default function App() {
  const [currentTab, setCurrentTab] = useState<'home' | 'news' | 'history' | 'about'>('home');
  const [isLoading, setIsLoading] = useState(false);
  const [currentReport, setCurrentReport] = useState<VerificationReport | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [prefilledClaim, setPrefilledClaim] = useState<string>('');
  const [health, setHealth] = useState<SystemHealthStatus | null>(null);

  // Fetch initial health diagnostics
  const fetchHealth = async () => {
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        const data = (await res.json()) as SystemHealthStatus;
        setHealth(data);
      }
    } catch (err) {
      console.warn('Health check query failed:', err);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  // Main verification trigger
  const handleVerify = async (input: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    setCurrentReport(null);
    setCurrentTab('home');

    try {
      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ input }),
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Failed to complete verification.');
      }

      setCurrentReport(result.data);
    } catch (err: any) {
      console.error('Verification request failed:', err);
      setErrorMessage(
        err.message || 'Unable to connect to verification server. Please check your network and configuration.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetReport = () => {
    setCurrentReport(null);
    setErrorMessage(null);
    setPrefilledClaim('');
  };

  const handleNewVerification = () => {
    handleResetReport();
    setCurrentTab('home');
  };

  const handleOpenReportFromHistory = (report: VerificationReport) => {
    setCurrentReport(report);
    setCurrentTab('home');
  };

  const handleVerifyArticleFromNews = (articleTextOrUrl: string) => {
    setPrefilledClaim(articleTextOrUrl);
    setCurrentReport(null);
    setCurrentTab('home');
    // Trigger verification automatically
    handleVerify(articleTextOrUrl);
  };

  return (
    <div className="min-h-screen bg-[#F5F8F6] flex flex-col md:flex-row text-[#172B3A]">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          if (tab !== 'home') {
            setErrorMessage(null);
          }
        }}
        health={health}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <Header
          onNewVerification={handleNewVerification}
          onOpenAbout={() => setCurrentTab('about')}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto">
          {currentTab === 'home' && (
            <HomePage
              onVerify={handleVerify}
              isLoading={isLoading}
              currentReport={currentReport}
              errorMessage={errorMessage}
              onClearError={() => setErrorMessage(null)}
              onResetReport={handleResetReport}
              prefilledClaim={prefilledClaim}
            />
          )}

          {currentTab === 'news' && (
            <NewsPage onVerifyArticle={handleVerifyArticleFromNews} />
          )}

          {currentTab === 'history' && (
            <HistoryPage onOpenReport={handleOpenReportFromHistory} />
          )}

          {currentTab === 'about' && (
            <AboutPage health={health} onRefreshHealth={fetchHealth} />
          )}
        </main>
      </div>
    </div>
  );
}

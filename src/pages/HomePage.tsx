import React from 'react';
import { VerificationForm } from '../components/verification/VerificationForm';
import { VerificationLoading } from '../components/verification/VerificationLoading';
import { VerificationReportView } from '../components/verification/VerificationReportView';
import type { VerificationReport } from '../../shared/types/index';

interface HomePageProps {
  onVerify: (input: string) => Promise<void>;
  isLoading: boolean;
  currentReport: VerificationReport | null;
  errorMessage: string | null;
  onClearError: () => void;
  onResetReport: () => void;
  prefilledClaim?: string;
}

export const HomePage: React.FC<HomePageProps> = ({
  onVerify,
  isLoading,
  currentReport,
  errorMessage,
  onClearError,
  onResetReport,
  prefilledClaim = '',
}) => {
  if (isLoading) {
    return <VerificationLoading />;
  }

  if (currentReport) {
    return <VerificationReportView report={currentReport} onReset={onResetReport} />;
  }

  return (
    <VerificationForm
      onVerify={onVerify}
      isLoading={isLoading}
      errorMessage={errorMessage}
      onClearError={onClearError}
      initialValue={prefilledClaim}
    />
  );
};

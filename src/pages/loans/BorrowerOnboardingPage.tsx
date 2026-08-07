/**
 * BorrowerOnboardingPage — solo actúa como página (router shell).
 * Toda la implementación vive en BorrowerOnboarding/ (MVVM feature-based):
 *   View → useBorrowerOnboarding() → Api/Constants/documents/components.
 */
import React from 'react';
import './BorrowerOnboardingPage.css';
import BorrowerOnboardingView from './BorrowerOnboarding/BorrowerOnboardingView';

const BorrowerOnboardingPage: React.FC = () => {
  return <BorrowerOnboardingView />;
};

export default BorrowerOnboardingPage;

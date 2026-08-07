/**
 * LenderDashboardPage — solo actúa como página (router shell).
 * Toda la implementación vive en LenderDashboard/ (MVVM feature-based):
 *   View → useLenderDashboard() → Constants/components.
 */
import React from 'react';
import './LenderDashboardPage.css';
import LenderDashboardView from './LenderDashboard/LenderDashboardView';

const LenderDashboardPage: React.FC = () => {
  return <LenderDashboardView />;
};

export default LenderDashboardPage;

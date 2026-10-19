/**
 * JuridicalDashboardPage — router shell only. Implementation lives in
 * JuridicalDashboard/ (MVVM). Route: /juridical-dashboard/:clientId
 */
import React from 'react';
import './JuridicalDashboardPage.css';
import JuridicalDashboardView from './JuridicalDashboard/JuridicalDashboardView';

const JuridicalDashboardPage: React.FC = () => <JuridicalDashboardView />;

export default JuridicalDashboardPage;

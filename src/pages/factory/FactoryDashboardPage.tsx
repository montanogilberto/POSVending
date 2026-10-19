/**
 * FactoryDashboardPage — router shell only. Implementation lives in
 * FactoryDashboard/ (MVVM). Route: /factory-dashboard/:clientId
 */
import React from 'react';
import './FactoryDashboardPage.css';
import FactoryDashboardView from './FactoryDashboard/FactoryDashboardView';

const FactoryDashboardPage: React.FC = () => <FactoryDashboardView />;

export default FactoryDashboardPage;

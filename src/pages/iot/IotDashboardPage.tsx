/**
 * IotDashboardPage — router shell. Implementation lives in IotDashboard/
 * (MVVM): View → useIotDashboard() → api/laundryDevicesApi.
 */
import React from 'react';
import './IotDashboardPage.css';
import IotDashboardView from './IotDashboard/IotDashboardView';

const IotDashboardPage: React.FC = () => <IotDashboardView />;

export default IotDashboardPage;

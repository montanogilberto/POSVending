/**
 * WhatsAppSetupPage — router shell. Implementation lives in
 * WhatsAppSetup/ (MVVM): View → useWhatsAppSetup() → api/whatsappSetupApi.
 */
import React from 'react';
import './WhatsAppSetupPage.css';
import WhatsAppSetupView from './WhatsAppSetup/WhatsAppSetupView';

const WhatsAppSetupPage: React.FC = () => <WhatsAppSetupView />;

export default WhatsAppSetupPage;

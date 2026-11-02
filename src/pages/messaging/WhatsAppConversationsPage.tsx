/**
 * WhatsAppConversationsPage — router shell. Implementation lives in
 * WhatsAppConversations/ (MVVM): View → useWhatsAppConversations() → api/whatsappAgentApi.
 */
import React from 'react';
import './WhatsAppConversationsPage.css';
import WhatsAppConversationsView from './WhatsAppConversations/WhatsAppConversationsView';

const WhatsAppConversationsPage: React.FC = () => <WhatsAppConversationsView />;

export default WhatsAppConversationsPage;

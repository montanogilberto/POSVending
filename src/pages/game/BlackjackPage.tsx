/**
 * BlackjackPage — solo actúa como página (router shell).
 * La implementación vive en Blackjack/ (MVVM feature-based).
 */
import React from 'react';
import './BlackjackPage.css';
import BlackjackView from './Blackjack/BlackjackView';

const BlackjackPage: React.FC = () => <BlackjackView />;

export default BlackjackPage;

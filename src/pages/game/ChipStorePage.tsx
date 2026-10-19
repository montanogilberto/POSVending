/**
 * ChipStorePage — solo actúa como página (router shell).
 * La implementación vive en ChipStore/ (MVVM feature-based).
 */
import React from 'react';
import './ChipStorePage.css';
import ChipStoreView from './ChipStore/ChipStoreView';

const ChipStorePage: React.FC = () => <ChipStoreView />;

export default ChipStorePage;

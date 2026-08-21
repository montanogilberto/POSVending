/**
 * ArcadePage — solo actúa como página (router shell).
 * Toda la implementación vive en Arcade/ (MVVM feature-based):
 *   View → useArcade() → api/arcadeApi + Constants/components.
 */
import React from 'react';
import './ArcadePage.css';
import ArcadeView from './Arcade/ArcadeView';

const ArcadePage: React.FC = () => <ArcadeView />;

export default ArcadePage;

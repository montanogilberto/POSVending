/**
 * MolePage — solo actúa como página (router shell).
 * La implementación vive en Mole/ (MVVM feature-based).
 */
import React from 'react';
import './MolePage.css';
import MoleView from './Mole/MoleView';

const MolePage: React.FC = () => <MoleView />;

export default MolePage;

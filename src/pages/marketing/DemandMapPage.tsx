import React from 'react';
import 'leaflet/dist/leaflet.css';
import './DemandMap/DemandMap.css';
import DemandMapView from './DemandMap/DemandMapView';
import { useDemandMap } from './DemandMap/DemandMapLogic';

const DemandMapPage: React.FC = () => {
  const vm = useDemandMap();
  return <DemandMapView vm={vm} />;
};

export default DemandMapPage;

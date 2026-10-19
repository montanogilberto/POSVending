import React from 'react';
import 'leaflet/dist/leaflet.css';
import ClientsMapView from './ClientsMap/ClientsMapView';
import { useClientsMap } from './ClientsMap/ClientsMapLogic';

const ClientsMapPage: React.FC = () => {
  const vm = useClientsMap();
  return <ClientsMapView vm={vm} />;
};

export default ClientsMapPage;

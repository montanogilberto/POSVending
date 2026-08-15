import React from 'react';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton,
  IonContent, IonSpinner, IonIcon, IonRefresher, IonRefresherContent,
} from '@ionic/react';
import { locationOutline, alertCircleOutline } from 'ionicons/icons';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import EmptyState from '../../../components/ui/EmptyState';
import { mxDate } from '../../../utils/format';
import { ClientsMapVM } from './ClientsMapTypes';
import './ClientsMap.css';

// Los íconos por defecto de Leaflet apuntan a rutas relativas que Vite no
// resuelve — se reemplazan por los assets ya empaquetados del paquete.
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const DEFAULT_CENTER: [number, number] = [23.6345, -102.5528]; // centro de México

const ClientsMapView: React.FC<{ vm: ClientsMapVM }> = ({ vm }) => {
  const center: [number, number] = vm.points.length > 0
    ? [vm.points[0].latitude, vm.points[0].longitude]
    : DEFAULT_CENTER;

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/clients" />
          </IonButtons>
          <IonTitle>Mapa de clientes</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonRefresher slot="fixed" onIonRefresh={e => { vm.reload(); setTimeout(() => e.detail.complete(), 500); }}>
          <IonRefresherContent />
        </IonRefresher>

        {vm.loading && (
          <div className="cmap-loading">
            <IonSpinner name="crescent" />
            <span>Cargando ubicaciones…</span>
          </div>
        )}

        {!vm.loading && vm.error && (
          <EmptyState icon={alertCircleOutline} text={vm.error} />
        )}

        {!vm.loading && !vm.error && vm.points.length === 0 && (
          <EmptyState
            icon={locationOutline}
            text="Ningún cliente tiene ubicación capturada todavía. La ubicación se registra durante la verificación de presencia (KYC)."
          />
        )}

        {!vm.loading && !vm.error && vm.points.length > 0 && (
          <>
            <p className="cmap-count">{vm.points.length} cliente(s) con ubicación</p>
            <div className="cmap-container">
              <MapContainer center={center} zoom={5} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {vm.points.map(p => (
                  <Marker key={p.clientId} position={[p.latitude, p.longitude]}>
                    <Popup>
                      <strong>{p.name}</strong>
                      {p.capturedAt && <div>{mxDate(p.capturedAt)}</div>}
                      {p.accuracyMeters != null && <div>Precisión: ±{Math.round(p.accuracyMeters)} m</div>}
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          </>
        )}
      </IonContent>
    </IonPage>
  );
};

export default ClientsMapView;

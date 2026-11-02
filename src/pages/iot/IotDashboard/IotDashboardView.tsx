import React from 'react';
import {
  IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonPage, IonRefresher, IonRefresherContent,
  IonSpinner, IonTitle, IonToast, IonToolbar,
} from '@ionic/react';
import { refreshOutline, hardwareChipOutline } from 'ionicons/icons';
import ConfirmBackButton from '../../../components/ui/ConfirmBackButton';
import EmptyState from '../../../components/ui/EmptyState';
import PageLoading from '../../../components/ui/PageLoading';
import { useIotDashboard } from './IotDashboardLogic';
import KpiGrid from './components/KpiGrid';
import DevicesCard from './components/DevicesCard';
import IncomesCard from './components/IncomesCard';
import ErrorLogCard from './components/ErrorLogCard';

const IotDashboardView: React.FC = () => {
  const vm = useIotDashboard();
  const { loading, firstLoad, loadFailed, updatedAt, reload, toastProps, rows } = vm;
  const showEmptyFailure = !firstLoad && loadFailed && rows.length === 0;

  return (
    <IonPage className="iot-page">
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <ConfirmBackButton defaultHref="/" />
          </IonButtons>
          <IonTitle>Tablero IOT</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={reload} disabled={loading} aria-label="Actualizar">
              {loading ? <IonSpinner name="dots" /> : <IonIcon icon={refreshOutline} slot="icon-only" />}
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <IonRefresher slot="fixed" onIonRefresh={e => { reload().finally(() => e.detail.complete()); }}>
          <IonRefresherContent />
        </IonRefresher>

        {firstLoad ? (
          <PageLoading text="Cargando máquinas…" />
        ) : showEmptyFailure ? (
          <EmptyState icon={hardwareChipOutline} text="No se pudo cargar el tablero de máquinas."
            action={<IonButton size="small" onClick={reload}>Reintentar</IonButton>} />
        ) : (
          <div className="iot-layout">
            {updatedAt && (
              <p className="iot-updated">
                Actualizado {updatedAt.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                {' · se refresca cada minuto'}
              </p>
            )}
            <KpiGrid vm={vm} />
            <div className="iot-columns">
              <DevicesCard vm={vm} />
              <ErrorLogCard vm={vm} />
            </div>
            <IncomesCard vm={vm} />
          </div>
        )}
        <IonToast {...toastProps} />
      </IonContent>
    </IonPage>
  );
};

export default IotDashboardView;

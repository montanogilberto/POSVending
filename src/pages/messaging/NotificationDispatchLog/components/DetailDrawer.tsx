import React from 'react';
import { IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonModal, IonTitle, IonToolbar } from '@ionic/react';
import { closeOutline } from 'ionicons/icons';
import type { NotificationDispatchLogVM } from '../NotificationDispatchLogLogic';
import DetailBody from './detail/DetailBody';

/**
 * Message details. Desktop: a column to the right of the dashboard, which stays visible
 * and usable (filters, list, KPIs). Phone: a full-screen modal.
 */
const DetailDrawer: React.FC<{ vm: NotificationDispatchLogVM }> = ({ vm }) => {
  if (vm.isDesktop) {
    if (!vm.selected) return null;
    return (
      <aside className="ndl-drawer" aria-label="Detalles del mensaje">
        <div className="ndl-drawer-head">
          <h2>Detalles del mensaje</h2>
          <IonButton fill="clear" size="small" onClick={vm.closeDetail} aria-label="Cerrar">
            <IonIcon icon={closeOutline} slot="icon-only" />
          </IonButton>
        </div>
        <div className="ndl-drawer-body"><DetailBody vm={vm} /></div>
      </aside>
    );
  }
  return (
    <IonModal isOpen={!!vm.selected} onDidDismiss={vm.closeDetail}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Detalles del mensaje</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={vm.closeDetail} aria-label="Cerrar"><IonIcon icon={closeOutline} slot="icon-only" /></IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding"><DetailBody vm={vm} /></IonContent>
    </IonModal>
  );
};

export default DetailDrawer;

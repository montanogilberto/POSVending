import React from 'react';
import { IonAlert, IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonModal, IonTitle, IonToolbar } from '@ionic/react';
import { closeOutline } from 'ionicons/icons';
import type { PushNotificationsVM } from '../PushNotificationsLogic';
import PushDetailBody from './PushDetailBody';

/** Desktop: a column right of the dashboard (it stays usable). Phone: a full-screen modal. */
const PushDetailDrawer: React.FC<{ vm: PushNotificationsVM }> = ({ vm }) => (
  <>
    {vm.isDesktop ? (vm.selected && (
      <aside className="pnd-drawer" aria-label="Detalles de la notificación">
        <div className="pnd-drawer-head">
          <h2>Detalles de la notificación</h2>
          <IonButton fill="clear" size="small" onClick={vm.closeDetail} aria-label="Cerrar">
            <IonIcon icon={closeOutline} slot="icon-only" />
          </IonButton>
        </div>
        <div className="pnd-drawer-body"><PushDetailBody vm={vm} /></div>
      </aside>
    )) : (
      <IonModal isOpen={!!vm.selected} onDidDismiss={vm.closeDetail}
        {...(vm.isPhone ? { initialBreakpoint: 0.85, breakpoints: [0, 0.85, 1] } : {})}>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Detalles de la notificación</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={vm.closeDetail} aria-label="Cerrar"><IonIcon icon={closeOutline} slot="icon-only" /></IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding"><PushDetailBody vm={vm} /></IonContent>
      </IonModal>
    )}

    <IonAlert
      isOpen={!!vm.deleteTarget}
      onDidDismiss={() => vm.setDeleteTarget(null)}
      header="Eliminar notificación"
      message="Se borra el registro de esta notificación. Si ya le llegó al teléfono, ahí se queda."
      buttons={[
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Eliminar', role: 'destructive', handler: () => { vm.removeTarget(); } },
      ]}
    />
  </>
);

export default PushDetailDrawer;

import React from 'react';
import { IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonItem, IonLabel, IonList } from '@ionic/react';
import type { NotificationDetailVM } from '../NotificationDetailLogic';

/** Datos extra que trajo el push en `data` (origen, referencia, ids…). */
const NotificationDataCard: React.FC<{ vm: NotificationDetailVM }> = ({ vm }) => {
  if (vm.detailRows.length === 0) return null;
  return (
    <IonCard className="ntd-card">
      <IonCardHeader>
        <IonCardTitle className="ntd-section-title">Información relacionada</IonCardTitle>
      </IonCardHeader>
      <IonCardContent className="ntd-data">
        <IonList lines="full">
          {vm.detailRows.map(r => (
            <IonItem key={r.key} className="ntd-data-row">
              <IonLabel color="medium">{r.label}</IonLabel>
              <IonLabel slot="end" className="ntd-data-value">{r.value}</IonLabel>
            </IonItem>
          ))}
        </IonList>
      </IonCardContent>
    </IonCard>
  );
};

export default NotificationDataCard;

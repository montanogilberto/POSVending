import React from 'react';
import {
  IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonIcon, IonItem, IonLabel, IonList, IonNote,
} from '@ionic/react';
import { alertCircleOutline, checkmarkCircleOutline, cloudOfflineOutline, closeCircleOutline } from 'ionicons/icons';
import EmptyState from '../../../../components/ui/EmptyState';
import { hermosilloTime, mxDate } from '../../../../utils/format';
import { IotDashboardVM } from '../IotDashboardLogic';
import type { ErrorKind } from '../IotDashboardTypes';

interface Props { vm: IotDashboardVM }

const KIND: Record<ErrorKind, { icon: string; label: string }> = {
  device_error: { icon: alertCircleOutline, label: 'Error de máquina' },
  offline: { icon: cloudOfflineOutline, label: 'Sin conexión' },
  rejected: { icon: closeCircleOutline, label: 'Cobro rechazado' },
};

/** Bitácora: current device faults plus rejected charges (most recent first). */
const ErrorLogCard: React.FC<Props> = ({ vm }) => (
  <IonCard className="iot-card">
    <IonCardHeader>
      <IonCardTitle>Errores</IonCardTitle>
    </IonCardHeader>
    <IonCardContent>
      {vm.errorLog.length === 0 ? (
        <EmptyState icon={checkmarkCircleOutline} text="Sin errores: todas las máquinas están en línea." />
      ) : (
        <IonList lines="full">
          {vm.errorLog.map(e => (
            <IonItem key={e.key} className={`iot-log iot-log-${e.kind}`}>
              <IonIcon icon={KIND[e.kind].icon} slot="start" />
              <IonLabel>
                <h3>{KIND[e.kind].label} · {e.deviceName}</h3>
                <p>{e.detail}</p>
              </IonLabel>
              <IonNote slot="end">{e.atUtc ? `${mxDate(e.atUtc)} ${hermosilloTime(e.atUtc)}` : '—'}</IonNote>
            </IonItem>
          ))}
        </IonList>
      )}
    </IonCardContent>
  </IonCard>
);

export default ErrorLogCard;

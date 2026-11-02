import React from 'react';
import {
  IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonIcon, IonItem, IonLabel, IonList, IonNote,
} from '@ionic/react';
import { hardwareChipOutline, timerOutline } from 'ionicons/icons';
import EmptyState from '../../../../components/ui/EmptyState';
import StatusBadge from '../../../../components/ui/StatusBadge';
import { LAUNDRY_DEVICE_STATUS } from '../../../../components/ui/statusMaps';
import { fmtInt, fmtMXN, hermosilloTime, mxDate } from '../../../../utils/format';
import { MACHINE_TYPE_LABEL } from '../IotDashboardConstants';
import { IotDashboardVM } from '../IotDashboardLogic';
import type { DeviceRow } from '../IotDashboardTypes';

interface Props { vm: IotDashboardVM }

const signalLabel = (rssi: number | null) => {
  if (rssi == null) return null;
  if (rssi >= -60) return `Señal excelente (${rssi} dBm)`;
  if (rssi >= -70) return `Señal buena (${rssi} dBm)`;
  if (rssi >= -80) return `Señal débil (${rssi} dBm)`;
  return `Señal mala (${rssi} dBm)`;
};

const lastSeen = (utc: string | null) => (utc ? `Visto ${mxDate(utc)} ${hermosilloTime(utc)}` : 'Nunca conectada');

/** Running machines first, then problems, then the rest. */
const ORDER: Record<DeviceRow['state'], number> = { running: 0, error: 1, offline: 2, idle: 3, inactive: 4 };

/** Máquinas: estado en vivo, ciclo en curso y salud del ESP32. */
const DevicesCard: React.FC<Props> = ({ vm }) => {
  const rows = [...vm.rows].sort((a, b) => ORDER[a.state] - ORDER[b.state] || a.device.name.localeCompare(b.device.name));

  return (
    <IonCard className="iot-card">
      <IonCardHeader>
        <IonCardTitle>Máquinas</IonCardTitle>
      </IonCardHeader>
      <IonCardContent>
        {rows.length === 0 ? (
          <EmptyState icon={hardwareChipOutline} text="Aún no hay máquinas ESP32 registradas para esta empresa." />
        ) : (
          <IonList lines="full">
            {rows.map(r => {
              const d = r.device;
              const meta = [
                MACHINE_TYPE_LABEL[d.machineType] ?? d.machineType,
                signalLabel(d.lastRssi),
                d.firmwareVersion ? `FW ${d.firmwareVersion}` : null,
                lastSeen(d.lastSeenAtUtc),
              ].filter(Boolean).join(' · ');
              return (
                <IonItem key={d.deviceId} className={`iot-device iot-device-${r.state}`}>
                  <IonLabel>
                    <h3>{d.name}</h3>
                    {r.minutesLeft != null && (
                      <p className="iot-device-cycle">
                        <IonIcon icon={timerOutline} /> Quedan ~{fmtInt(r.minutesLeft)} min
                        {r.lastUse?.choiceName ? ` · ${r.lastUse.choiceName}` : ''}
                      </p>
                    )}
                    <p>{meta}</p>
                  </IonLabel>
                  <div slot="end" className="iot-device-end">
                    <StatusBadge status={r.state} map={LAUNDRY_DEVICE_STATUS} />
                    <IonNote>{fmtMXN(r.incomeToday)} · {fmtInt(r.usesToday)} hoy</IonNote>
                  </div>
                </IonItem>
              );
            })}
          </IonList>
        )}
      </IonCardContent>
    </IonCard>
  );
};

export default DevicesCard;

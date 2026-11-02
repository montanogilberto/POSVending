import React from 'react';
import { IonCard, IonCardContent, IonCol, IonGrid, IonIcon, IonRow } from '@ionic/react';
import {
  wifiOutline, playCircleOutline, warningOutline, cashOutline,
  receiptOutline, pricetagOutline, closeCircleOutline, trendingUpOutline,
} from 'ionicons/icons';
import { fmtInt, fmtMXN } from '../../../../utils/format';
import { INCOME_DAYS } from '../IotDashboardConstants';
import { IotDashboardVM } from '../IotDashboardLogic';

interface Props { vm: IotDashboardVM }

/** KPI tiles — live machine state on top, money below. */
const KpiGrid: React.FC<Props> = ({ vm }) => {
  const k = vm.kpis;
  const tiles = [
    { icon: wifiOutline, label: 'En línea', value: `${fmtInt(k.online)} / ${fmtInt(k.activeDevices)}`,
      tone: k.online < k.activeDevices ? 'warn' : 'ok' },
    { icon: playCircleOutline, label: 'En uso ahora', value: fmtInt(k.inUse), tone: 'info' },
    { icon: warningOutline, label: 'Con falla / sin conexión', value: fmtInt(k.withErrors),
      tone: k.withErrors ? 'bad' : 'ok' },
    { icon: closeCircleOutline, label: 'Cobros rechazados hoy', value: fmtInt(k.rejectedToday),
      tone: k.rejectedToday ? 'warn' : 'ok' },
    { icon: cashOutline, label: 'Ingresos hoy', value: fmtMXN(k.incomeToday), tone: 'money' },
    { icon: receiptOutline, label: 'Usos hoy', value: fmtInt(k.usesToday), tone: 'money' },
    { icon: pricetagOutline, label: 'Ticket promedio hoy', value: fmtMXN(k.avgTicketToday), tone: 'money' },
    { icon: trendingUpOutline, label: `Ingresos ${INCOME_DAYS} días`, value: fmtMXN(k.incomePeriod),
      note: `${fmtInt(k.usesPeriod)} usos`, tone: 'money' },
  ];

  return (
    <IonGrid className="iot-kpi-grid">
      <IonRow>
        {tiles.map(t => (
          <IonCol key={t.label} size="6" sizeMd="3">
            <IonCard className={`iot-kpi-card iot-tone-${t.tone}`}>
              <IonCardContent>
                <IonIcon icon={t.icon} className="iot-kpi-icon" />
                <p className="iot-kpi-label">{t.label}</p>
                <p className="iot-kpi-value">{t.value}</p>
                {t.note && <p className="iot-kpi-note">{t.note}</p>}
              </IonCardContent>
            </IonCard>
          </IonCol>
        ))}
      </IonRow>
    </IonGrid>
  );
};

export default KpiGrid;

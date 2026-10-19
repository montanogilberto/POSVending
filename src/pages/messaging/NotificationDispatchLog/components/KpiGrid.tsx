import React from 'react';
import { IonCard, IonCardContent, IonIcon } from '@ionic/react';
import { chatbubblesOutline, checkmarkCircle, chevronForward, closeCircle, timeOutline } from 'ionicons/icons';
import { fmtInt } from '../../../../utils/format';
import { percent } from '../NotificationStats';
import { PERIOD_LABELS } from '../../../../utils/period';
import type { DeliveryFilter } from '../NotificationDispatchLogTypes';
import type { NotificationDispatchLogVM } from '../NotificationDispatchLogLogic';

interface Kpi { key: DeliveryFilter; label: string; value: number; sub: string; tone: string; icon: string; }

/**
 * A · overview of the selected period. Only "Entrega confirmada" means the person got it;
 * accepted-by-provider stays in "Pendiente de confirmación". Each card filters the list.
 */
const KpiGrid: React.FC<{ vm: NotificationDispatchLogVM }> = ({ vm }) => {
  const { kpis } = vm;
  const items: Kpi[] = [
    { key: 'all', label: 'Total de mensajes', value: kpis.total, sub: `${PERIOD_LABELS[vm.dateFilter]} · Todos los canales`, tone: 'primary', icon: chatbubblesOutline },
    { key: 'confirmed', label: 'Entrega confirmada', value: kpis.confirmed, sub: `${percent(kpis.confirmed, kpis.total)}% de todos los mensajes`, tone: 'success', icon: checkmarkCircle },
    { key: 'awaiting', label: 'Pendiente de confirmación', value: kpis.awaiting, sub: 'Esperando un estado final', tone: 'warning', icon: timeOutline },
    { key: 'failed', label: 'Fallidos', value: kpis.failed, sub: 'Revisar y reintentar si aplica', tone: 'danger', icon: closeCircle },
  ];
  return (
    <div className="ndl-kpis">
      {items.map(k => (
        <IonCard key={k.key} button className={`ndl-kpi ndl-kpi--${k.tone}`} onClick={() => vm.showInList({ delivery: k.key })}>
          <IonCardContent>
            <IonIcon className="ndl-kpi-icon" icon={k.icon} />
            <div className="ndl-kpi-body">
              <span className="ndl-kpi-label">{k.label}</span>
              <strong>{fmtInt(k.value)}</strong>
              <em>{k.sub}</em>
            </div>
            <IonIcon className="ndl-kpi-go" icon={chevronForward} />
          </IonCardContent>
        </IonCard>
      ))}
    </div>
  );
};

export default KpiGrid;

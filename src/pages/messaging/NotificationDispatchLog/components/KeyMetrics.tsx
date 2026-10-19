import React from 'react';
import { IonCard, IonCardContent, IonIcon } from '@ionic/react';
import { barChartOutline, chevronForward, peopleOutline, pulseOutline, refreshCircleOutline } from 'ionicons/icons';
import { fmtInt } from '../../../../utils/format';
import { PROVIDER_LABELS } from '../NotificationDispatchLogConstants';
import type { DeliveryFilter, FocusFilter } from '../NotificationDispatchLogTypes';
import type { NotificationDispatchLogVM } from '../NotificationDispatchLogLogic';

interface Metric {
  key: string; icon: string; tone: string; label: string; value: string; sub: string;
  target: { delivery?: DeliveryFilter; focus?: FocusFilter };
}

/**
 * A · second KPI row, in the owner's priority. Cost is not shown: there is no real
 * billing data per message (Twilio leaves October SMS unpriced, Meta billing isn't read).
 */
const KeyMetrics: React.FC<{ vm: NotificationDispatchLogVM }> = ({ vm }) => {
  const { metrics, actions, providers } = vm;
  const incidents = providers.incidents.reduce((n, i) => n + i.failures, 0);
  const healthy = incidents === 0 && providers.twilioReachable !== false;
  const worst = providers.incidents[0];
  const items: Metric[] = [
    {
      key: 'retry', icon: refreshCircleOutline, tone: 'danger', label: 'Reintento requerido', value: fmtInt(actions.retryCandidates),
      sub: 'Fallidos sin causa permanente', target: { focus: 'retry' },
    },
    {
      key: 'reached', icon: peopleOutline, tone: 'success', label: 'Clientes alcanzados', value: fmtInt(metrics.clientsReached),
      sub: 'Clientes únicos con entrega confirmada', target: { delivery: 'confirmed' },
    },
    {
      key: 'health', icon: pulseOutline, tone: healthy ? 'success' : 'warning', label: 'Salud de proveedores',
      value: healthy ? 'Sin incidentes' : incidents ? `${fmtInt(incidents)} fallos` : 'Twilio no responde',
      sub: worst ? `Últimas 24 h · más en ${PROVIDER_LABELS[worst.provider] ?? worst.provider}` : 'Últimas 24 h',
      target: { focus: 'recentFailures' },
    },
    {
      key: 'rate', icon: barChartOutline, tone: 'tertiary', label: 'Tasa de entrega',
      value: metrics.finalStates ? `${metrics.deliveryRate}%` : '—',
      sub: `Solo ${fmtInt(metrics.finalStates)} mensajes con estado final`, target: { focus: 'final' },
    },
  ];
  return (
    <div className="ndl-metrics">
      {items.map(m => (
        <IonCard key={m.key} button className={`ndl-metric ndl-metric--${m.tone}`} onClick={() => vm.showInList(m.target)}>
          <IonCardContent>
            <IonIcon className="ndl-metric-icon" icon={m.icon} />
            <div>
              <span>{m.label}</span>
              <strong>{m.value}</strong>
              <em>{m.sub}</em>
            </div>
            <IonIcon className="ndl-kpi-go" icon={chevronForward} />
          </IonCardContent>
        </IonCard>
      ))}
    </div>
  );
};

export default KeyMetrics;

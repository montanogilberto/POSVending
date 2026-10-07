import React from 'react';
import { IonCard, IonCardContent } from '@ionic/react';
import { fmtInt } from '../../../../utils/format';
import { percent } from '../NotificationStats';
import type { NotificationDispatchLogVM } from '../NotificationDispatchLogLogic';

interface Kpi { key: string; label: string; value: number; sub?: string; tone: string; }

/** This month's counters (Hermosillo calendar month). */
const KpiGrid: React.FC<{ vm: NotificationDispatchLogVM }> = ({ vm }) => {
  const { kpis } = vm;
  const items: Kpi[] = [
    { key: 'total', label: 'Mensajes este mes', value: kpis.total, tone: 'primary' },
    { key: 'confirmed', label: 'Confirmadas', value: kpis.confirmed, sub: `${percent(kpis.confirmed, kpis.total)}%`, tone: 'success' },
    { key: 'unconfirmed', label: 'Sin confirmar', value: kpis.unconfirmed, sub: `${percent(kpis.unconfirmed, kpis.total)}%`, tone: 'warning' },
    { key: 'failed', label: 'Fallidas', value: kpis.failed, sub: `${percent(kpis.failed, kpis.total)}%`, tone: 'danger' },
  ];
  return (
    <div className="ndl-kpis">
      {items.map(k => (
        <IonCard key={k.key} className={`ndl-kpi ndl-kpi--${k.tone}`}>
          <IonCardContent>
            <strong>{fmtInt(k.value)}</strong>
            <span>{k.label}</span>
            {k.sub && <em>{k.sub}</em>}
          </IonCardContent>
        </IonCard>
      ))}
    </div>
  );
};

export default KpiGrid;

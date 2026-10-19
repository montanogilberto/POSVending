import React from 'react';
import { IonCard, IonCardContent, IonIcon } from '@ionic/react';
import { checkmarkDoneOutline, chevronForward, mailUnreadOutline, notificationsOutline, peopleOutline } from 'ionicons/icons';
import { fmtInt, percent } from '../../../../utils/format';
import { PERIOD_LABELS } from '../../../../utils/period';
import type { ReadFilter } from '../PushNotificationsTypes';
import type { PushNotificationsVM } from '../PushNotificationsLogic';

interface Kpi { key: string; label: string; value: number; sub: string; tone: string; icon: string; read: ReadFilter; }

/**
 * Overview of the period. "Leída" is the only receipt a push has (the recipient's app marks
 * it); per-device delivery is not readable from here, so there is no "Entregadas" card.
 */
const PushKpis: React.FC<{ vm: PushNotificationsVM }> = ({ vm }) => {
  const { kpis } = vm;
  const items: Kpi[] = [
    {
      key: 'total', label: 'Notificaciones', value: kpis.total, tone: 'primary', icon: notificationsOutline, read: 'all',
      sub: `${PERIOD_LABELS[vm.period]}${kpis.broadcasts ? ` · ${fmtInt(kpis.broadcasts)} a todo el negocio` : ''}`,
    },
    { key: 'read', label: 'Leídas', value: kpis.read, sub: `${percent(kpis.read, kpis.total)}% · el destinatario la abrió`, tone: 'success', icon: checkmarkDoneOutline, read: 'read' },
    { key: 'unread', label: 'Sin leer', value: kpis.unread, sub: 'Aún no la abren en la app', tone: 'warning', icon: mailUnreadOutline, read: 'unread' },
    { key: 'recipients', label: 'Destinatarios', value: kpis.recipients, sub: 'Usuarios únicos (envíos individuales)', tone: 'tertiary', icon: peopleOutline, read: 'all' },
  ];
  return (
    <div className="pnd-kpis">
      {items.map(k => (
        <IonCard key={k.key} button className={`pnd-kpi pnd-kpi--${k.tone}`} onClick={() => vm.showInList({ read: k.read })}>
          <IonCardContent>
            <IonIcon className="pnd-kpi-icon" icon={k.icon} />
            <div className="pnd-kpi-body">
              <span>{k.label}</span>
              <strong>{fmtInt(k.value)}</strong>
              <em>{k.sub}</em>
            </div>
            <IonIcon className="pnd-kpi-go" icon={chevronForward} />
          </IonCardContent>
        </IonCard>
      ))}
    </div>
  );
};

export default PushKpis;

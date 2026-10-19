import React from 'react';
import { IonBadge, IonIcon, IonItem, IonLabel, IonList } from '@ionic/react';
import { alertCircleOutline, closeCircleOutline, construct, hourglassOutline, refreshCircleOutline, settingsOutline } from 'ionicons/icons';
import { fmtInt } from '../../../../utils/format';
import { STALE_PENDING_HOURS } from '../NotificationDispatchLogConstants';
import type { DeliveryFilter, FocusFilter } from '../NotificationDispatchLogTypes';
import type { NotificationDispatchLogVM } from '../NotificationDispatchLogLogic';

interface Action {
  key: string; icon: string; color: string; title: string; detail: string; count: number;
  target: { delivery?: DeliveryFilter; focus?: FocusFilter };
}

/** C · what needs a person in the selected period. Every row opens the matching messages. */
const ActionCenter: React.FC<{ vm: NotificationDispatchLogVM }> = ({ vm }) => {
  const { actions, configWarnings } = vm;
  const items: Action[] = [
    {
      key: 'failed', icon: closeCircleOutline, color: 'danger', count: actions.failed, title: 'Mensajes fallidos',
      detail: 'Abre cada uno para ver el código del proveedor y qué significa.', target: { delivery: 'failed' },
    },
    {
      key: 'retry', icon: refreshCircleOutline, color: 'warning', count: actions.retryCandidates, title: 'Candidatos a reintento',
      detail: 'Fallaron sin una causa permanente conocida.', target: { focus: 'retry' },
    },
    {
      key: 'config', icon: construct, color: 'danger', count: actions.configFailures, title: 'Fallos por configuración',
      detail: 'Plantilla no aprobada, ventana de 24 h o pago de la cuenta: se corrigen en Meta/Twilio.', target: { focus: 'config' },
    },
    {
      key: 'stale', icon: hourglassOutline, color: 'warning', count: actions.stalePending,
      title: `Sin estado final hace más de ${STALE_PENDING_HOURS} h`,
      detail: 'WhatsApp/SMS sin confirmación del proveedor: puede faltar el webhook de estado.', target: { focus: 'stale' },
    },
  ];
  const open = items.filter(i => i.count > 0);

  return (
    <section className="ndl-section ndl-actions">
      <h3 className="ndl-section-title">Centro de acciones</h3>
      <IonList lines="full" className="ndl-action-list">
        {configWarnings.map(w => (
          <IonItem key={w} className="ndl-action ndl-action--config">
            <IonIcon slot="start" color="warning" icon={settingsOutline} />
            <IonLabel className="ion-text-wrap"><h3>Configuración requerida</h3><p>{w}</p></IonLabel>
          </IonItem>
        ))}
        {open.map(i => (
          <IonItem key={i.key} button detail className="ndl-action" onClick={() => vm.showInList(i.target)}>
            <IonIcon slot="start" color={i.color} icon={i.icon} />
            <IonLabel className="ion-text-wrap"><h3>{i.title}</h3><p>{i.detail}</p></IonLabel>
            <IonBadge slot="end" color={i.color}>{fmtInt(i.count)}</IonBadge>
          </IonItem>
        ))}
        {open.length === 0 && configWarnings.length === 0 && (
          <IonItem className="ndl-action">
            <IonIcon slot="start" color="success" icon={alertCircleOutline} />
            <IonLabel>Nada pendiente en este periodo.</IonLabel>
          </IonItem>
        )}
      </IonList>
    </section>
  );
};

export default ActionCenter;

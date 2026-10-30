import React from 'react';
import { IonBadge, IonCard, IonCardContent, IonIcon, IonItem, IonLabel, IonList } from '@ionic/react';
import { callOutline, checkmarkCircleOutline, construct, helpCircleOutline, timeOutline } from 'ionicons/icons';
import { fmtInt } from '../../../../utils/format';
import { FAILURE_CAUSE_LABELS } from '../NotificationDispatchLogConstants';
import type { FailureCause, FocusFilter } from '../NotificationDispatchLogTypes';
import type { NotificationDispatchLogVM } from '../NotificationDispatchLogLogic';

const CAUSES: { cause: FailureCause; icon: string; color: string; focus: FocusFilter }[] = [
  { cause: 'config', icon: construct, color: 'danger', focus: 'config' },
  { cause: 'recipient', icon: callOutline, color: 'warning', focus: 'failRecipient' },
  { cause: 'temporary', icon: timeOutline, color: 'warning', focus: 'failTemporary' },
  { cause: 'unknown', icon: helpCircleOutline, color: 'medium', focus: 'failUnknown' },
];

/** Operaciones · the period's failures split by cause (provider error code); each row opens them. */
const FailureBreakdown: React.FC<{ vm: NotificationDispatchLogVM }> = ({ vm }) => {
  const { failures } = vm;
  return (
    <IonCard className="ndl-failures">
      <IonCardContent>
        <h3 className="ndl-section-title">Fallos por causa · {fmtInt(failures.total)}</h3>
        <IonList lines="full" className="ndl-action-list">
          {failures.total === 0 && (
            <IonItem className="ndl-action">
              <IonIcon slot="start" color="success" icon={checkmarkCircleOutline} />
              <IonLabel>Sin fallos en este periodo.</IonLabel>
            </IonItem>
          )}
          {failures.total > 0 && CAUSES.filter(c => failures.causes[c.cause] > 0).map(c => (
            <IonItem key={c.cause} button detail className="ndl-action"
              onClick={() => vm.showInList({ delivery: 'failed', focus: c.focus })}>
              <IonIcon slot="start" color={c.color} icon={c.icon} />
              <IonLabel className="ion-text-wrap">
                <h3>{FAILURE_CAUSE_LABELS[c.cause].title}</h3>
                <p>{FAILURE_CAUSE_LABELS[c.cause].detail}</p>
              </IonLabel>
              <IonBadge slot="end" color={c.color}>{fmtInt(failures.causes[c.cause])}</IonBadge>
            </IonItem>
          ))}
        </IonList>
      </IonCardContent>
    </IonCard>
  );
};

export default FailureBreakdown;

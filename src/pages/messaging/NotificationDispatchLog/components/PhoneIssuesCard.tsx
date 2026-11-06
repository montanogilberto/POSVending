import React from 'react';
import { IonBadge, IonCard, IonCardContent, IonIcon, IonItem, IonLabel, IonList } from '@ionic/react';
import { callOutline, checkmarkCircleOutline, closeCircleOutline } from 'ionicons/icons';
import { fmtInt } from '../../../../utils/format';
import { PHONE_ISSUE_LABELS } from '../NotificationDispatchLogConstants';
import type { NotificationDispatchLogVM } from '../NotificationDispatchLogLogic';

/** Operaciones · clients whose number keeps failing; each row opens the client to correct it. */
const PhoneIssuesCard: React.FC<{ vm: NotificationDispatchLogVM }> = ({ vm }) => {
  const { phones } = vm;
  return (
    <IonCard className="ndl-failures">
      <IonCardContent>
        <h3 className="ndl-section-title">Teléfonos por revisar · {fmtInt(phones.length)}</h3>
        <IonList lines="full" className="ndl-action-list ndl-phone-list">
          {phones.length === 0 && (
            <IonItem className="ndl-action">
              <IonIcon slot="start" color="success" icon={checkmarkCircleOutline} />
              <IonLabel>Ningún teléfono por revisar en este periodo.</IonLabel>
            </IonItem>
          )}
          {phones.map(p => (
            <IonItem key={p.clientId} button detail className="ndl-action" onClick={() => vm.openClient(p.clientId)}>
              <IonIcon slot="start" icon={p.problem === 'invalid' ? closeCircleOutline : callOutline}
                color={p.problem === 'invalid' ? 'danger' : 'warning'} />
              <IonLabel className="ion-text-wrap">
                <h3>{p.clientName || `Cliente #${p.clientId}`}{p.clientPhone ? ` · ${p.clientPhone}` : ''}</h3>
                <p>{PHONE_ISSUE_LABELS[p.problem]}</p>
              </IonLabel>
              <IonBadge slot="end" color={p.problem === 'invalid' ? 'danger' : 'warning'}>{fmtInt(p.failures)}</IonBadge>
            </IonItem>
          ))}
        </IonList>
      </IonCardContent>
    </IonCard>
  );
};

export default PhoneIssuesCard;

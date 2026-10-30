import React from 'react';
import { IonBadge, IonLabel, IonSegment, IonSegmentButton } from '@ionic/react';
import { fmtInt } from '../../../../utils/format';
import type { CenterSection } from '../NotificationDispatchLogTypes';
import type { NotificationDispatchLogVM } from '../NotificationDispatchLogLogic';

/** Resumen (is it working?) · Operaciones (what needs a person) · Historial (every message). */
const CenterTabs: React.FC<{ vm: NotificationDispatchLogVM }> = ({ vm }) => {
  const pending = vm.actions.failed + vm.actions.stalePending;
  return (
    <IonSegment className="ndl-tabs" value={vm.section}
      onIonChange={e => vm.setSection((e.detail.value as CenterSection) ?? 'overview')}>
      <IonSegmentButton value="overview"><IonLabel>Resumen</IonLabel></IonSegmentButton>
      <IonSegmentButton value="operations" layout="icon-end">
        <IonLabel>Operaciones</IonLabel>
        {pending > 0 && <IonBadge color="danger">{fmtInt(pending)}</IonBadge>}
      </IonSegmentButton>
      <IonSegmentButton value="history"><IonLabel>Historial</IonLabel></IonSegmentButton>
    </IonSegment>
  );
};

export default CenterTabs;

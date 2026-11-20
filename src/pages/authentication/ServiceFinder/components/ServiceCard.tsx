import React from 'react';
import { IonCard, IonIcon, IonSpinner } from '@ionic/react';
import { openOutline, chevronForward } from 'ionicons/icons';
import { SERVICES } from '../ServiceFinderConstants';
import type { ServiceFinderVM } from '../ServiceFinderLogic';
import type { ServiceId } from '../ServiceFinderTypes';

interface Props {
  vm: ServiceFinderVM;
  id: ServiceId;
  highlighted?: boolean;
}

/** A service row: continues the signup here, or opens the service's own site. */
const ServiceCard: React.FC<Props> = ({ vm, id, highlighted }) => {
  const s = SERVICES[id];
  const here = vm.continuesHere(id);
  const busy = vm.redirectingTo === id;
  return (
    <IonCard
      button
      disabled={!!vm.redirectingTo}
      className={`sf-service sf-service--${id}${highlighted ? ' sf-service--highlight' : ''}`}
      onClick={() => vm.pickService(id)}
    >
      <span className="sf-service-icon"><IonIcon icon={s.icon} aria-hidden="true" /></span>
      <span className="sf-service-text">
        <strong>{s.label}</strong>
        <span>{s.tagline}</span>
        {highlighted && <span className="sf-service-desc">{s.description}</span>}
        {!here && <span className="sf-service-host">{new URL(s.url).host}</span>}
      </span>
      {busy
        ? <IonSpinner name="crescent" className="sf-service-spin" />
        : <IonIcon className="sf-service-go" icon={here ? chevronForward : openOutline} aria-hidden="true" />}
    </IonCard>
  );
};

export default ServiceCard;

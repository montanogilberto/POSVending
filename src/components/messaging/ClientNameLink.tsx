import React from 'react';
import { IonRouterLink } from '@ionic/react';

interface Props { name: string; clientId?: number | null }

/** Chat header name: links to the client's POS dashboard when the phone matches a client. */
const ClientNameLink: React.FC<Props> = ({ name, clientId }) => {
  if (!clientId) return <>{name}</>;
  return (
    <IonRouterLink routerLink={`/client-pos/${clientId}`} className="wa-client-link"
      title="Ver panel del cliente"
      // The dock header toggles minimize on click — opening the client must not also do that.
      onClick={(e) => e.stopPropagation()}>
      {name}
    </IonRouterLink>
  );
};

export default ClientNameLink;

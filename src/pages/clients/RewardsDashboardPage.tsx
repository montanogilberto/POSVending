import React from 'react';
import { Redirect, useParams } from 'react-router-dom';
import './ClientDashboardPOS/ClientDashboardPOS.css';
import ClientDashboardPOSView from './ClientDashboardPOS/ClientDashboardPOSView';
import { canAccess } from '../../config/rolePermissions';
import { useUser } from '../../contexts/UserContext';

/** The customer's own home: the SAME view as /client-pos (audience
 * 'customer' hides Conversaciones, Seguimiento and staff actions). Staff
 * looking up another client are sent to /client-pos. */
const RewardsDashboardPage: React.FC = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const { roleCode, clientId: ownClientId } = useUser();

  if (canAccess(roleCode, 'clients') && Number(clientId) !== ownClientId) {
    return <Redirect to={`/client-pos/${clientId}`} />;
  }
  return <ClientDashboardPOSView audience="customer" />;
};

export default RewardsDashboardPage;

import React from 'react';
import { Redirect, useParams } from 'react-router-dom';
import './RewardsDashboard/RewardsDashboard.css';
import RewardsDashboardView from './RewardsDashboard/RewardsDashboardView';
import { canAccess } from '../../config/rolePermissions';
import { useUser } from '../../contexts/UserContext';

/** The customer's own home. Staff looking up another client use /client-pos,
 * which shows the same points plus wallet, purchases and follow-ups. */
const RewardsDashboardPage: React.FC = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const { roleCode, clientId: ownClientId } = useUser();

  if (canAccess(roleCode, 'clients') && Number(clientId) !== ownClientId) {
    return <Redirect to={`/client-pos/${clientId}`} />;
  }
  return <RewardsDashboardView />;
};

export default RewardsDashboardPage;

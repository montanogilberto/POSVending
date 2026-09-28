import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useIonViewWillEnter } from '@ionic/react';
import { useUser } from '../../../contexts/UserContext';
import { isStaffRole, hasCapability } from '../../../config/rolePermissions';
import { ClientFollowUp, createClientFollowUp, getAllClientFollowUps } from '../../../api/clientFollowUpApi';
import { notifyDataChanged, onDataChanged } from '../../../utils/refreshBus';
import { useToast } from '../../../hooks/useToast';

/** Title prefix that marks a clientFollowUp as a Factory AI request. The
 * Discover modal's lead ("Interesado en Factory AI Software") counts too. */
export const FACTORY_REQUEST_PREFIX = 'Factory AI:';
const isFactoryRequest = (f: ClientFollowUp) =>
  f.title?.startsWith(FACTORY_REQUEST_PREFIX) || f.title?.includes('Factory AI Software');

/**
 * Factory AI Software dashboard (FACTORY_AI capability). The commercial
 * Factory backend (organizations → projects → runs) exists only as factory
 * PRDs, so a client's software requests are recorded as clientFollowUps that
 * staff pick up — the same table the Discover lead uses.
 */
export function useFactoryDashboard() {
  const { clientId: clientIdParam } = useParams<{ clientId?: string }>();
  const { clientId: contextClientId, companyId, roleCode, userId, username, clientCapabilities } = useUser();
  const paramId = clientIdParam ? Number(clientIdParam) : null;
  const clientId = paramId !== null && isStaffRole(roleCode) ? paramId : contextClientId;
  const isMember = isStaffRole(roleCode) || hasCapability(clientCapabilities, 'FACTORY_AI');
  const { showToast, toastProps } = useToast();

  const [requests, setRequests] = useState<ClientFollowUp[]>([]);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    if (!companyId || !clientId || !isMember) return;
    setLoading(true);
    try {
      const rows = await getAllClientFollowUps(companyId, clientId);
      const mine = rows.filter(isFactoryRequest)
        .sort((a, b) => (b.created_At ?? '').localeCompare(a.created_At ?? ''));
      console.log('[FactoryDashboard] requests for clientId=%d: %d', clientId, mine.length);
      setRequests(mine);
    } finally {
      setLoading(false);
    }
  }, [companyId, clientId, isMember]);

  useIonViewWillEnter(() => { load(); });
  useEffect(() => onDataChanged(() => { load(); }), [load]);

  const canSend = title.trim().length >= 3 && description.trim().length >= 10 && !sending;

  const sendRequest = async () => {
    if (!canSend) return;
    setSending(true);
    try {
      await createClientFollowUp({
        companyId,
        clientId,
        followUpType: 'call',
        status: 'pending',
        riskStatus: 'on_track',
        title: `${FACTORY_REQUEST_PREFIX} ${title.trim()}`,
        notes: description.trim(),
        createdBy: userId,
      });
      setTitle('');
      setDescription('');
      showToast('Solicitud enviada — un asesor te contactará.');
      notifyDataChanged('factory-request');
    } catch (err) {
      console.error('[FactoryDashboard] request failed:', err);
      showToast('No se pudo enviar la solicitud. Intenta de nuevo.', 'danger');
    } finally {
      setSending(false);
    }
  };

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  return {
    username, isMember, requests, loading, load, pendingCount,
    title, setTitle, description, setDescription, sending, canSend, sendRequest, toastProps,
  };
}

export type FactoryDashboardVM = ReturnType<typeof useFactoryDashboard>;

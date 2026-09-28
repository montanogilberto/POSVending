import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useIonViewWillEnter, useIonViewWillLeave } from '@ionic/react';
import { useUser } from '../../../contexts/UserContext';
import { isStaffRole, hasCapability } from '../../../config/rolePermissions';
import { ClientFollowUp, getAllClientFollowUps } from '../../../api/clientFollowUpApi';
import { onDataChanged } from '../../../utils/refreshBus';
import { CONTRACT_TEXT } from '../../loans/BorrowerOnboarding/documents/contract';
import { PAGARE_TEXT } from '../../loans/BorrowerOnboarding/documents/pagare';

export const LEGAL_TEMPLATES = [
  { id: 'contrato', title: 'Contrato de crédito personal P2P', text: CONTRACT_TEXT },
  { id: 'pagare',   title: 'Pagaré (LGTOC arts. 170-174)',     text: PAGARE_TEXT },
] as const;

export type LegalTemplate = typeof LEGAL_TEMPLATES[number];

/**
 * Juridical (SMARTLOANS_JURIDICAL) dashboard. Scope is deliberately the
 * lawyer's OWN record: there is no assignment model yet saying which other
 * clients' contracts a lawyer may read, so none are exposed. Assignments are
 * recorded by staff as clientFollowUps on the lawyer's client file (Clientes →
 * Seguimiento), and the legal templates come from the same static documents
 * the borrower signs.
 */
export function useJuridicalDashboard() {
  const { clientId: clientIdParam } = useParams<{ clientId?: string }>();
  const { clientId: contextClientId, companyId, roleCode, username, clientCapabilities } = useUser();
  // Same rule as MyLoans: the URL id only counts for staff.
  const paramId = clientIdParam ? Number(clientIdParam) : null;
  const clientId = paramId !== null && isStaffRole(roleCode) ? paramId : contextClientId;
  const isMember = isStaffRole(roleCode) || hasCapability(clientCapabilities, 'SMARTLOANS_JURIDICAL');

  const [items, setItems] = useState<ClientFollowUp[]>([]);
  const [loading, setLoading] = useState(false);
  const [openTemplate, setOpenTemplate] = useState<LegalTemplate | null>(null);

  const load = useCallback(async () => {
    if (!companyId || !clientId || !isMember) return;
    setLoading(true);
    try {
      const rows = await getAllClientFollowUps(companyId, clientId);
      console.log('[JuridicalDashboard] follow-ups for clientId=%d: %d', clientId, rows.length);
      setItems([...rows].sort((a, b) => (b.created_At ?? '').localeCompare(a.created_At ?? '')));
    } finally {
      setLoading(false);
    }
  }, [companyId, clientId, isMember]);

  useIonViewWillEnter(() => { load(); });
  // Ionic keeps this page mounted: close the template viewer when leaving
  // (e.g. switching product) so it doesn't float over the next page.
  useIonViewWillLeave(() => { setOpenTemplate(null); });
  useEffect(() => onDataChanged(() => { load(); }), [load]);

  const pendingCount = items.filter(i => i.status === 'pending').length;

  return { username, isMember, items, loading, load, pendingCount, openTemplate, setOpenTemplate };
}

export type JuridicalDashboardVM = ReturnType<typeof useJuridicalDashboard>;

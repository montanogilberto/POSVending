/**
 * Mis chats — conversation list for loan negotiation.
 * Route: /loan-chats. Both roles land here from the menu; tapping opens the
 * conversation. New chats START from an offer (P2P) so both parties are always
 * known — this page never creates lenderId=0 garbage conversations.
 */
import React, { useCallback, useState } from 'react';
import {
  IonPage, IonContent, IonRefresher, IonRefresherContent, IonIcon, IonBadge,
  IonButton, IonSpinner, useIonViewWillEnter,
} from '@ionic/react';
import { chatbubblesOutline, sparklesOutline, storefrontOutline } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { useUser } from '../../components/UserContext';
import Header from '../../components/Header';
import AlertPopover from '../../components/PopOver/AlertPopover';
import MailPopover from '../../components/PopOver/MailPopover';
import { loanChatApi, LoanConversation } from '../../api/loanChatApi';
import { getAllClients, Client } from '../../api/clientsApi';

const STATUS_META: Record<string, { label: string; color: string }> = {
  open:     { label: 'Abierta',   color: 'primary' },
  accepted: { label: 'Aceptada',  color: 'success' },
  rejected: { label: 'Rechazada', color: 'danger' },
  closed:   { label: 'Cerrada',   color: 'medium' },
};

const LoanChatListPage: React.FC = () => {
  const history = useHistory();
  const { clientId, companyId, roleCode } = useUser();
  const [convs, setConvs] = useState<LoanConversation[]>([]);
  const [clientMap, setClientMap] = useState<Record<number, Client>>({});
  const [loading, setLoading] = useState(false);

  const [showAlert, setShowAlert] = useState(false);
  const [showMail, setShowMail] = useState(false);
  const [popEvent, setPopEvent] = useState<React.MouseEvent | undefined>();

  const load = useCallback(async () => {
    if (!companyId || !clientId) return;
    setLoading(true);
    try {
      const [res, clients] = await Promise.all([
        loanChatApi.listConversations(companyId, clientId),
        getAllClients().catch(() => [] as Client[]),
      ]);
      const list: LoanConversation[] = Array.isArray(res) ? res : (res?.conversations ?? []);
      setConvs(list);
      setClientMap(Object.fromEntries(clients.map(c => [c.clientId, c])));
      console.log('[ChatList] load ✅', JSON.stringify({ conversations: list.length }));
    } catch (e) {
      console.log('[ChatList] load ❌', String(e));
    }
    setLoading(false);
  }, [companyId, clientId]);

  useIonViewWillEnter(() => { load(); }, [load]);

  const counterpartName = (c: LoanConversation) => {
    const otherId = c.borrowerId === clientId ? c.lenderId : c.borrowerId;
    const other = clientMap[otherId];
    return other ? `${other.first_name} ${other.last_name}`.trim() : `Cliente #${otherId}`;
  };

  return (
    <IonPage>
      <Header
        screenTitle="Mis chats"
        presentAlertPopover={(e) => { setPopEvent(e); setShowAlert(true); }}
        presentMailPopover={(e) => { setPopEvent(e); setShowMail(true); }}
      />
      <AlertPopover isOpen={showAlert} event={popEvent as any} onDidDismiss={() => setShowAlert(false)} />
      <MailPopover isOpen={showMail} event={popEvent as any} onDidDismiss={() => setShowMail(false)} />
      <IonContent className="ion-padding">
        <IonRefresher slot="fixed" onIonRefresh={(e) => { load().then(() => e.detail.complete()); }}>
          <IonRefresherContent />
        </IonRefresher>

        {loading && convs.length === 0 && (
          <div style={{ textAlign: 'center', padding: 24 }}><IonSpinner name="crescent" /></div>
        )}

        {!loading && convs.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 16px', color: '#6b7280' }}>
            <IonIcon icon={chatbubblesOutline} style={{ fontSize: 44, color: '#cbd5e1' }} />
            <p>Aún no tienes conversaciones.</p>
            <IonButton size="small" onClick={() => history.push('/p2p-lending')}>
              <IonIcon icon={storefrontOutline} slot="start" />
              {roleCode === 'borrower' ? 'Busca una oferta y chatea' : 'Ir al marketplace'}
            </IonButton>
          </div>
        )}

        {convs.map(c => {
          const meta = STATUS_META[c.status] ?? STATUS_META.open;
          return (
            <div key={c.conversationId}
              onClick={() => { console.log('[ChatList] open →', c.conversationId); history.push(`/loan-chat/${c.conversationId}`); }}
              style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '12px 8px',
                       borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}>
              <IonIcon icon={chatbubblesOutline} style={{ fontSize: 26, color: '#2563eb', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <strong style={{ fontSize: 14 }}>{counterpartName(c)}</strong>
                  <IonBadge color={meta.color}>{meta.label}</IonBadge>
                </div>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {c.title ?? 'Negociación de préstamo'}
                  {c.agreedAmount ? ` · $${c.agreedAmount}` : c.requestedAmount ? ` · $${c.requestedAmount}` : ''}
                </p>
                {c.lastMessageAt && (
                  <span style={{ fontSize: 11, color: '#9ca3af' }}>
                    {new Date(c.lastMessageAt + 'Z').toLocaleString('es-MX')}
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {/* Asistente IA de SmartLoans (clientId del agente = LOANCHAT_AGENT_CLIENT_ID) */}
        {roleCode === 'borrower' && (
          <IonButton expand="block" fill="outline" style={{ marginTop: 16 }}
            onClick={() => history.push('/loan-chat/new?lenderId=2127')}>
            <IonIcon icon={sparklesOutline} slot="start" />
            Chatear con el asistente SmartLoans
          </IonButton>
        )}
      </IonContent>
    </IonPage>
  );
};

export default LoanChatListPage;

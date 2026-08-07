/**
 * Mis chats — conversation list for loan negotiation.
 * Route: /loan-chats. Both roles land here from the menu; tapping opens the
 * conversation. New chats START from an offer (P2P) so both parties are always
 * known — this page never creates lenderId=0 garbage conversations.
 */
import React, { useCallback, useState } from 'react';
import {
  IonPage, IonContent, IonRefresher, IonRefresherContent, IonIcon, IonBadge,
  IonButton, IonSpinner, IonList, IonItem, IonLabel, IonNote,
  useIonViewWillEnter,
} from '@ionic/react';
import { chatbubblesOutline, sparklesOutline, storefrontOutline } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { useUser } from '../../contexts/UserContext';
import Header from '../../components/layout/Header';
import AlertPopover from '../../components/popovers/AlertPopover';
import MailPopover from '../../components/popovers/MailPopover';
import { loanChatApi, getChatConfig, LoanConversation } from '../../api/loanChatApi';
import { getAllClients, Client } from '../../api/clientsApi';
import { onDataChanged } from '../../utils/refreshBus';
import { usePopovers } from '../../hooks/usePopovers';
import StatusBadge from '../../components/ui/StatusBadge';
import { CONVERSATION_STATUS } from '../../components/ui/statusMaps';
import EmptyState from '../../components/ui/EmptyState';
import './LoanChatListPage.css';

const LoanChatListPage: React.FC = () => {
  const history = useHistory();
  const { clientId, companyId, roleCode } = useUser();
  const [convs, setConvs] = useState<LoanConversation[]>([]);
  const [clientMap, setClientMap] = useState<Record<number, Client>>({});
  const [loading, setLoading] = useState(false);
  // Agent identity from backend config — button hidden when not configured.
  const [agentClientId, setAgentClientId] = useState(0);

  const pops = usePopovers();

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

  useIonViewWillEnter(() => {
    load();
    getChatConfig().then(c => setAgentClientId(c.agentEnabled ? c.agentClientId : 0));
  }, [load]);

  // Refresco global: un push (mensaje/propuesta nueva) recarga la lista abierta.
  React.useEffect(() => onDataChanged(() => load()), [load]);

  const counterpartName = (c: LoanConversation) => {
    const otherId = c.borrowerId === clientId ? c.lenderId : c.borrowerId;
    const other = clientMap[otherId];
    return other ? `${other.first_name} ${other.last_name}`.trim() : `Cliente #${otherId}`;
  };

  return (
    <IonPage>
      <Header screenTitle="Mis chats" {...pops.headerProps} />
      <AlertPopover {...pops.alertPopoverProps} />
      <MailPopover {...pops.mailPopoverProps} />
      <IonContent className="ion-padding">
        <IonRefresher slot="fixed" onIonRefresh={(e) => { load().then(() => e.detail.complete()); }}>
          <IonRefresherContent />
        </IonRefresher>

        {loading && convs.length === 0 && (
          <div className="clst-center"><IonSpinner name="crescent" /></div>
        )}

        {!loading && convs.length === 0 && (
          <EmptyState className="clst-empty" icon={chatbubblesOutline}
            text="Aún no tienes conversaciones."
            action={
              <IonButton size="small" onClick={() => history.push('/p2p-lending')}>
                <IonIcon icon={storefrontOutline} slot="start" />
                {roleCode === 'borrower' ? 'Busca una oferta y chatea' : 'Ir al marketplace'}
              </IonButton>
            } />
        )}

        <IonList className="clst-list" lines="none">
          {convs.map(c => {
            return (
              <IonItem key={c.conversationId} button detail={false} lines="full" className="clst-item"
                onClick={() => { console.log('[ChatList] open →', c.conversationId); history.push(`/loan-chat/${c.conversationId}`); }}>
                <IonIcon icon={chatbubblesOutline} slot="start" className="clst-icon" />
                <IonLabel className="clst-label">
                  <div className="clst-row">
                    <strong>{counterpartName(c)}</strong>
                    <StatusBadge status={c.status} map={CONVERSATION_STATUS} />
                  </div>
                  <p className="clst-sub">
                    {c.title ?? 'Negociación de préstamo'}
                    {c.agreedAmount ? ` · $${c.agreedAmount}` : c.requestedAmount ? ` · $${c.requestedAmount}` : ''}
                  </p>
                  {c.lastMessageAt && (
                    <IonNote className="clst-time">
                      {new Date(c.lastMessageAt + 'Z').toLocaleString('es-MX')}
                    </IonNote>
                  )}
                </IonLabel>
              </IonItem>
            );
          })}
        </IonList>

        {/* Asistente IA — identidad desde GET /loanChat/config (LOANCHAT_AGENT_CLIENT_ID);
            oculto si el backend no lo tiene configurado. Ambos roles: el
            borrower para negociar/preguntar, el lender para soporte
            (cuenta · contratos · legal GUÍA). */}
        {agentClientId > 0 && (
          <IonButton expand="block" fill="outline" className="ion-margin-top"
            onClick={() => history.push(`/loan-chat/new?lenderId=${agentClientId}`)}>
            <IonIcon icon={sparklesOutline} slot="start" />
            Chatear con el asistente SmartLoans
          </IonButton>
        )}
      </IonContent>
    </IonPage>
  );
};

export default LoanChatListPage;

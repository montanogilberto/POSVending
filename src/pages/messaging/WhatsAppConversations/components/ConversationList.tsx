import React from 'react';
import { IonAvatar, IonBadge, IonItem, IonLabel, IonList, IonNote, IonSearchbar } from '@ionic/react';
import { chatbubblesOutline, searchOutline } from 'ionicons/icons';
import EmptyState from '../../../../components/ui/EmptyState';
import PageLoading from '../../../../components/ui/PageLoading';
import { fmtInt, hermosilloTime, mxChatDate } from '../../../../utils/format';
import { hermosilloDayKey } from '../../../../utils/period';
import { fmtPhone10 } from '../WhatsAppConversationsConstants';
import { WhatsAppConversationsVM } from '../WhatsAppConversationsLogic';

interface Props { vm: WhatsAppConversationsVM }

/** Today → "3:45 p. m.", other days → "02 nov". */
const when = (utc: string) =>
  hermosilloDayKey(utc) === hermosilloDayKey(new Date().toISOString()) ? hermosilloTime(utc) : mxChatDate(utc);

const initial = (name: string | null) => (name?.trim()?.[0] ?? '#').toUpperCase();

const ConversationList: React.FC<Props> = ({ vm }) => {
  const { conversations, listFirstLoad, listError, selected, appliedSearch } = vm;

  let body: React.ReactNode;
  if (listFirstLoad) {
    body = <PageLoading text="Cargando conversaciones…" />;
  } else if (listError && conversations.length === 0) {
    body = <EmptyState icon={chatbubblesOutline} text="No se pudieron cargar las conversaciones." />;
  } else if (conversations.length === 0) {
    body = appliedSearch
      ? <EmptyState icon={searchOutline} text={`Nadie escribió "${appliedSearch}" en el periodo.`} />
      : <EmptyState icon={chatbubblesOutline} text="Ningún cliente le escribió al agente en el periodo." />;
  } else {
    body = (
      <IonList lines="full" className="wac-list">
        {conversations.map(c => (
          <IonItem key={c.phone10} button detail={false} onClick={() => vm.openConversation(c)}
            className={selected?.phone10 === c.phone10 ? 'wac-item wac-item--active' : 'wac-item'}>
            <IonAvatar slot="start" className="wac-avatar">{initial(c.customerName)}</IonAvatar>
            <IonLabel>
              <div className="wac-item-top">
                <h3>{c.customerName || 'Cliente sin nombre'}</h3>
                <IonNote>{when(c.lastAtUtc)}</IonNote>
              </div>
              <p className="wac-item-phone">{fmtPhone10(c.phone10)} · {fmtInt(c.turns)} mensajes</p>
              <p className="wac-item-preview">{c.lastMessage || '—'}</p>
              <div className="wac-item-badges">
                {c.bookings > 0 && <IonBadge color="success">Reservó{c.bookings > 1 ? ` ×${c.bookings}` : ''}</IonBadge>}
                {c.proposed > 0 && c.bookings === 0 && <IonBadge color="warning">Propuesta sin reservar</IonBadge>}
                {c.handedOff > 0 && <IonBadge color="tertiary">Pasó a una persona</IonBadge>}
                {c.failures > 0 && <IonBadge color="danger">{c.failures} sin responder</IonBadge>}
              </div>
            </IonLabel>
          </IonItem>
        ))}
      </IonList>
    );
  }

  return (
    <div className="wac-pane wac-pane--list">
      <IonSearchbar value={vm.search} onIonInput={e => vm.setSearch(e.detail.value ?? '')}
        placeholder="Buscar nombre, teléfono o mensaje" debounce={0} className="wac-search" />
      {body}
    </div>
  );
};

export default ConversationList;

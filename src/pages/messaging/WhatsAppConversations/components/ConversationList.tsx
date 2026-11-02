import React from 'react';
import { IonChip, IonList, IonSearchbar } from '@ionic/react';
import { chatbubblesOutline, checkmarkDoneCircleOutline, searchOutline } from 'ionicons/icons';
import EmptyState from '../../../../components/ui/EmptyState';
import PageLoading from '../../../../components/ui/PageLoading';
import WhatsAppChatListItem from '../../../../components/messaging/WhatsAppChatListItem';
import { fmtInt } from '../../../../utils/format';
import type { InboxFilter } from '../WhatsAppConversationsConstants';
import { WhatsAppConversationsVM } from '../WhatsAppConversationsLogic';

interface Props { vm: WhatsAppConversationsVM }

const FILTERS: { value: InboxFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'needsReply', label: 'Sin responder' },
  { value: 'unread', label: 'No leídos' },
  { value: 'handedOff', label: 'Pidieron persona' },
];

const EMPTY_TEXT: Record<InboxFilter, string> = {
  all: 'Ningún cliente escribió en el periodo.',
  needsReply: 'Todo atendido: no hay chats esperando respuesta.',
  unread: 'No tienes mensajes sin leer.',
  handedOff: 'Nadie pidió hablar con una persona en el periodo.',
};

const ConversationList: React.FC<Props> = ({ vm }) => {
  const { visible, conversations, listFirstLoad, listError, selected, appliedSearch, filter, counts } = vm;

  let body: React.ReactNode;
  if (listFirstLoad) {
    body = <PageLoading text="Cargando conversaciones…" />;
  } else if (listError && conversations.length === 0) {
    body = <EmptyState icon={chatbubblesOutline} text="No se pudieron cargar las conversaciones." />;
  } else if (visible.length === 0) {
    body = appliedSearch
      ? <EmptyState icon={searchOutline} text={`Nada con "${appliedSearch}" en el periodo.`} />
      : <EmptyState icon={filter === 'all' ? chatbubblesOutline : checkmarkDoneCircleOutline} text={EMPTY_TEXT[filter]} />;
  } else {
    body = (
      <IonList lines="full" className="wac-list">
        {visible.map(c => (
          <WhatsAppChatListItem key={c.phone10} conv={c} unread={vm.isUnread(c)}
            active={selected?.phone10 === c.phone10} onOpen={vm.openConversation} />
        ))}
      </IonList>
    );
  }

  return (
    <div className="wac-pane wac-pane--list">
      <IonSearchbar value={vm.search} onIonInput={e => vm.setSearch(e.detail.value ?? '')}
        placeholder="Buscar nombre, teléfono o mensaje" debounce={0} className="wac-search" />
      <div className="wac-filters">
        {FILTERS.map(f => (
          <IonChip key={f.value} outline={filter !== f.value} onClick={() => vm.setFilter(f.value)}
            className={filter === f.value ? 'wac-filter wac-filter--active' : 'wac-filter'}>
            {f.label}{f.value !== 'all' && counts[f.value] > 0 ? ` ${fmtInt(counts[f.value])}` : ''}
          </IonChip>
        ))}
      </div>
      {body}
    </div>
  );
};

export default ConversationList;

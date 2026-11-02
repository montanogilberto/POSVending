import React from 'react';
import {
  IonBadge, IonButton, IonIcon, IonItem, IonLabel, IonList, IonSearchbar, IonSpinner, IonToast,
} from '@ionic/react';
import { chevronDownOutline, chevronUpOutline, logoWhatsapp, openOutline } from 'ionicons/icons';
import WhatsAppChatListItem from './WhatsAppChatListItem';
import DockChatWindow from './DockChatWindow';
import { useWhatsAppDock } from './WhatsAppDockLogic';
import './WhatsAppChat.css';
import './WhatsAppDock.css';

/**
 * LinkedIn-style messaging on every staff screen: a "Mensajes" bar bottom-right
 * with the unread count, the chat list above it, and chat windows docked to its
 * left — reply to WhatsApp customers without leaving the POS screen.
 * Phones: a floating button that opens the full Conversaciones page instead.
 */
const WhatsAppDock: React.FC = () => {
  const vm = useWhatsAppDock();
  if (vm.hidden) return null;
  const badge = vm.unreadCount > 0 ? vm.unreadCount : null;

  return (
    <>
      {/* Phone: floating button to the full inbox. */}
      <div className="wad-fab">
        <IonButton routerLink={vm.inboxRoute} className="wad-fab-btn" aria-label="Mensajes de WhatsApp">
          <IonIcon icon={logoWhatsapp} slot="icon-only" />
        </IonButton>
        {badge && <IonBadge color="danger" className="wad-fab-badge">{badge}</IonBadge>}
      </div>

      {/* Desktop / tablet: the dock. */}
      <div className="wad-dock">
        <section className={`wad-list${vm.listOpen ? '' : ' wad-list--closed'}`} aria-label="Mensajes de WhatsApp">
          <IonItem button detail={false} lines="none" className="wad-list-head"
            onClick={() => vm.setListOpen(!vm.listOpen)}>
            <IonIcon icon={logoWhatsapp} slot="start" className="wad-list-logo" />
            <IonLabel>
              <h3>Mensajes</h3>
              {vm.needsReplyCount > 0 && <p>{vm.needsReplyCount} sin responder</p>}
            </IonLabel>
            {badge && <IonBadge color="danger" slot="end">{badge}</IonBadge>}
            <IonIcon slot="end" icon={vm.listOpen ? chevronDownOutline : chevronUpOutline} />
          </IonItem>

          {vm.listOpen && (
            <div className="wad-list-body">
              <IonSearchbar value={vm.search} onIonInput={e => vm.setSearch(e.detail.value ?? '')}
                placeholder="Buscar chat" debounce={0} className="wad-search" />
              {vm.firstLoad ? (
                <div className="wad-loading"><IonSpinner name="crescent" /><p>Cargando chats…</p></div>
              ) : vm.error && vm.conversations.length === 0 ? (
                <div className="wad-loading">
                  <p>No se pudieron cargar los chats.</p>
                  <IonButton size="small" onClick={vm.reload}>Reintentar</IonButton>
                </div>
              ) : vm.visible.length === 0 ? (
                <p className="wad-empty">{vm.search ? 'Sin resultados.' : 'Sin chats en los últimos 7 días.'}</p>
              ) : (
                <IonList lines="full" className="wad-chat-list">
                  {vm.visible.map(c => (
                    <WhatsAppChatListItem key={c.phone10} conv={c} unread={vm.isUnread(c)} compact
                      active={vm.windows.some(w => w.conv.phone10 === c.phone10)} onOpen={vm.openChat} />
                  ))}
                </IonList>
              )}
              <IonButton fill="clear" size="small" expand="block" routerLink={vm.inboxRoute} className="wad-all">
                <IonIcon icon={openOutline} slot="start" /> Ver todo en Conversaciones
              </IonButton>
            </div>
          )}
        </section>

        {vm.windows.map(w => <DockChatWindow key={w.conv.phone10} vm={vm} win={w} />)}
      </div>
      <IonToast {...vm.toastProps} />
    </>
  );
};

export default WhatsAppDock;

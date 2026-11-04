import React from 'react';
import { IonAvatar, IonButton, IonIcon, IonItem, IonLabel, IonSpinner } from '@ionic/react';
import { chevronDownOutline, chevronUpOutline, closeOutline, resizeOutline } from 'ionicons/icons';
import WhatsAppTimeline from './WhatsAppTimeline';
import WhatsAppReplyBox from './WhatsAppReplyBox';
import { useWhatsAppThread } from '../../hooks/useWhatsAppThread';
import { fmtPhone10 } from '../../utils/whatsappChat';
import type { DockWindow, WhatsAppDockVM } from './WhatsAppDockLogic';

interface Props { vm: WhatsAppDockVM; win: DockWindow }

/** Two arrows pointing in: the opposite of resizeOutline (Ionicons' contract has four). */
const shrinkIcon = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' class='ionicon' viewBox='0 0 512 512'><path fill='none' stroke='currentColor' stroke-linecap='round' stroke-linejoin='round' stroke-width='32' d='M304 416V304h112M314.2 314.23L432 432M208 96v112H96M197.8 197.77L80 80'/></svg>";

/** One docked chat window (LinkedIn-style): header toggles minimize; timeline + reply when open. */
const DockChatWindow: React.FC<Props> = ({ vm, win }) => {
  const { conv, minimized, expanded } = win;
  const chat = useWhatsAppThread({
    conv, startDate: vm.range.start, endDate: vm.range.end, active: !minimized,
    showToast: vm.showToast, onSent: vm.reload,
  });
  const name = chat.thread?.customerName || conv.customerName || fmtPhone10(conv.phone10);

  return (
    <section className={`wad-window${minimized ? ' wad-window--min' : expanded ? ' wad-window--big' : ''}`} aria-label={`Chat con ${name}`}>
      <div className="wad-head">
        <IonItem button detail={false} lines="none" className="wad-head-item"
          onClick={() => vm.toggleMinimized(conv.phone10)}>
          <IonAvatar slot="start" className="wac-avatar wad-head-avatar">{(name[0] ?? '#').toUpperCase()}</IonAvatar>
          <IonLabel>
            <h3>{name}</h3>
            <p>{fmtPhone10(conv.phone10)}</p>
          </IonLabel>
          <IonIcon slot="end" icon={minimized ? chevronUpOutline : chevronDownOutline} />
        </IonItem>
        {!minimized && (
          <IonButton fill="clear" size="small" className="wad-head-btn"
            aria-label={expanded ? 'Reducir chat' : 'Agrandar chat'} title={expanded ? 'Reducir' : 'Agrandar'}
            onClick={() => vm.toggleExpanded(conv.phone10)}>
            <IonIcon icon={expanded ? shrinkIcon : resizeOutline} slot="icon-only" />
          </IonButton>
        )}
        <IonButton fill="clear" size="small" className="wad-head-btn" aria-label="Cerrar chat"
          onClick={() => vm.closeChat(conv.phone10)}>
          <IonIcon icon={closeOutline} slot="icon-only" />
        </IonButton>
      </div>
      {!minimized && (
        <div className="wad-window-body">
          {chat.threadLoading && !chat.thread ? (
            <div className="wad-loading"><IonSpinner name="crescent" /><p>Cargando conversación…</p></div>
          ) : chat.threadError || !chat.thread ? (
            <div className="wad-loading">
              <p>No se pudo cargar la conversación.</p>
              <IonButton size="small" onClick={chat.retry}>Reintentar</IonButton>
            </div>
          ) : (
            <>
              <WhatsAppTimeline thread={chat.thread} />
              <WhatsAppReplyBox chat={chat} compact />
            </>
          )}
        </div>
      )}
    </section>
  );
};

export default DockChatWindow;

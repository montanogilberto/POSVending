import React from 'react';
import { IonButton, IonContent, IonIcon, IonPage, IonSpinner, IonToast } from '@ionic/react';
import { refreshOutline } from 'ionicons/icons';
import Header from '../../../components/layout/Header';
import AlertPopover from '../../../components/popovers/AlertPopover';
import MailPopover from '../../../components/popovers/MailPopover';
import PeriodSegment from '../../../components/ui/PeriodSegment';
import { usePopovers } from '../../../hooks/usePopovers';
import { useWhatsAppConversations } from './WhatsAppConversationsLogic';
import ConversationList from './components/ConversationList';
import ThreadView from './components/ThreadView';

const WhatsAppConversationsView: React.FC = () => {
  const vm = useWhatsAppConversations();
  const pops = usePopovers();
  const busy = vm.listLoading || vm.chat.threadLoading;

  return (
    <IonPage>
      <Header
        {...pops.headerProps}
        screenTitle="Conversaciones WhatsApp"
        showBackButton={true}
        backButtonText="Agente"
        backButtonHref="/whatsapp-agent"
      />
      <AlertPopover {...pops.alertPopoverProps} />
      <MailPopover {...pops.mailPopoverProps} />
      <IonContent fullscreen className="wac-page">
        <div className="wac-container">
          <div className="wac-toolbar">
            <PeriodSegment idPrefix="wa-conv" value={vm.period} onChange={vm.setPeriod}
              custom={vm.customRange} onCustomChange={vm.setCustomRange} />
            <IonButton fill="clear" size="small" onClick={vm.reload} disabled={busy} aria-label="Actualizar">
              {busy ? <IonSpinner name="dots" /> : <IonIcon icon={refreshOutline} slot="icon-only" />}
            </IonButton>
          </div>
          <div className={`wac-split${vm.selected ? ' wac-split--open' : ''}`}>
            <ConversationList vm={vm} />
            <ThreadView vm={vm} />
          </div>
        </div>
        <IonToast {...vm.toastProps} />
      </IonContent>
    </IonPage>
  );
};

export default WhatsAppConversationsView;

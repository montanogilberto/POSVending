import React from 'react';
import { IonBadge, IonButton, IonContent, IonItem, IonLabel, IonList, IonPage, IonToast } from '@ionic/react';
import { alertCircleOutline, sparklesOutline } from 'ionicons/icons';
import Header from '../../../components/layout/Header';
import AlertPopover from '../../../components/popovers/AlertPopover';
import MailPopover from '../../../components/popovers/MailPopover';
import EmptyState from '../../../components/ui/EmptyState';
import PageLoading from '../../../components/ui/PageLoading';
import { usePopovers } from '../../../hooks/usePopovers';
import { useAgentCompanySetting } from './AgentCompanySettingLogic';
import AgentSettingsModal from './components/AgentSettingsModal';

const AgentCompanySettingView: React.FC = () => {
  const vm = useAgentCompanySetting();
  const pops = usePopovers();

  let body: React.ReactNode;
  if (vm.loading) {
    body = <PageLoading text="Cargando ajustes de agentes…" />;
  } else if (vm.loadError) {
    body = (
      <EmptyState icon={alertCircleOutline} text="No se pudieron cargar los ajustes."
        action={<IonButton fill="outline" onClick={vm.load}>Reintentar</IonButton>} />
    );
  } else if (vm.items.length === 0) {
    body = <EmptyState icon={sparklesOutline} text="No hay agentes activos en el catálogo." />;
  } else {
    body = (
      <>
        <p className="acs-intro">
          {vm.configuredCount} de {vm.items.length} agentes tienen ajustes para tu empresa. Sin ajustes, el agente usa
          su comportamiento predeterminado.
        </p>
        <IonList inset className="acs-list">
          {vm.items.map(item => (
            <IonItem key={item.agent.agentId} button detail onClick={() => vm.open(item)}>
              <IonLabel className="ion-text-wrap">
                <h2>{item.agent.name}</h2>
                <p>{item.setting?.displayName ? `Se presenta como “${item.setting.displayName}”` : item.agent.description}</p>
              </IonLabel>
              {item.setting && <IonBadge slot="end" color="primary">Con ajustes</IonBadge>}
            </IonItem>
          ))}
        </IonList>
      </>
    );
  }

  return (
    <IonPage>
      <Header {...pops.headerProps} screenTitle="Ajustes de agentes" showBackButton
        backButtonText="Agentes" backButtonHref="/ai-agents" />
      <AlertPopover {...pops.alertPopoverProps} />
      <MailPopover {...pops.mailPopoverProps} />
      <IonContent fullscreen className="acs-page">
        <div className="acs-container">{body}</div>
        <AgentSettingsModal vm={vm} />
        <IonToast {...vm.toastProps} />
      </IonContent>
    </IonPage>
  );
};

export default AgentCompanySettingView;

import React from 'react';
import {
  IonButton, IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle, IonContent, IonIcon, IonPage,
  IonSpinner, IonToast,
} from '@ionic/react';
import { alertCircleOutline, arrowBackOutline, arrowForwardOutline, checkmarkOutline } from 'ionicons/icons';
import Header from '../../../components/layout/Header';
import AlertPopover from '../../../components/popovers/AlertPopover';
import MailPopover from '../../../components/popovers/MailPopover';
import EmptyState from '../../../components/ui/EmptyState';
import { usePopovers } from '../../../hooks/usePopovers';
import { STEPS } from './WhatsAppSetupConstants';
import { useWhatsAppSetup, type WhatsAppSetupVM } from './WhatsAppSetupLogic';
import SetupStepper from './components/SetupStepper';
import InfoFieldsStep from './components/InfoFieldsStep';
import HoursStep from './components/HoursStep';
import ServicesStep from './components/ServicesStep';
import PromotionsStep from './components/PromotionsStep';
import FaqsStep from './components/FaqsStep';

const StepBody: React.FC<{ vm: WhatsAppSetupVM }> = ({ vm }) => {
  switch (vm.step.id) {
    case 'business': return <InfoFieldsStep vm={vm} kind="business" />;
    case 'policies': return <InfoFieldsStep vm={vm} kind="policies" />;
    case 'hours': return <HoursStep vm={vm} />;
    case 'services': return <ServicesStep vm={vm} />;
    case 'promotions': return <PromotionsStep vm={vm} />;
    case 'faqs': return <FaqsStep vm={vm} />;
  }
};

const WhatsAppSetupView: React.FC = () => {
  const vm = useWhatsAppSetup();
  const pops = usePopovers();
  // List steps save item by item; only the form steps save on "Guardar y continuar".
  const formStep = vm.step.id === 'business' || vm.step.id === 'policies' || vm.step.id === 'hours';

  let body: React.ReactNode;
  if (vm.loading) {
    body = (
      <div className="was-loading">
        <IonSpinner name="dots" />
        <p className="was-muted">Cargando los datos del negocio…</p>
      </div>
    );
  } else if (vm.loadError) {
    body = (
      <>
        <EmptyState icon={alertCircleOutline} text="No se pudieron cargar los datos del negocio." />
        <div className="was-retry"><IonButton fill="outline" onClick={vm.load}>Reintentar</IonButton></div>
      </>
    );
  } else {
    body = (
      <>
        <SetupStepper vm={vm} />
        <IonCard className="was-card">
          <IonCardHeader>
            <IonCardSubtitle>Paso {vm.stepIndex + 1} de {STEPS.length}</IonCardSubtitle>
            <IonCardTitle>{vm.step.label}</IonCardTitle>
            <p className="was-muted">{vm.step.hint}</p>
          </IonCardHeader>
          <IonCardContent>
            <StepBody vm={vm} />
          </IonCardContent>
        </IonCard>
        <div className="was-footer">
          <IonButton fill="clear" onClick={vm.back} disabled={vm.stepIndex === 0 || vm.savingStep}>
            <IonIcon icon={arrowBackOutline} slot="start" /> Anterior
          </IonButton>
          <IonButton onClick={vm.next} disabled={vm.savingStep}>
            {vm.savingStep ? <IonSpinner name="dots" /> : (
              <>
                {vm.isLast ? 'Terminar' : formStep ? 'Guardar y continuar' : 'Continuar'}
                <IonIcon icon={vm.isLast ? checkmarkOutline : arrowForwardOutline} slot="end" />
              </>
            )}
          </IonButton>
        </div>
      </>
    );
  }

  return (
    <IonPage>
      <Header
        {...pops.headerProps}
        screenTitle="Configurar agente"
        showBackButton={true}
        backButtonText="Agente"
        backButtonHref="/whatsapp-agent"
      />
      <AlertPopover {...pops.alertPopoverProps} />
      <MailPopover {...pops.mailPopoverProps} />
      <IonContent fullscreen className="was-page">
        <div className="was-container">{body}</div>
        <IonToast {...vm.toastProps} />
      </IonContent>
    </IonPage>
  );
};

export default WhatsAppSetupView;

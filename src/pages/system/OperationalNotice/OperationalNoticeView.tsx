import React from 'react';
import {
  IonAccordion, IonAccordionGroup, IonAlert, IonButton, IonContent, IonFab, IonFabButton, IonIcon, IonItem,
  IonLabel, IonPage, IonSegment, IonSegmentButton, IonToast,
} from '@ionic/react';
import { addOutline, alertCircleOutline, megaphoneOutline } from 'ionicons/icons';
import Header from '../../../components/layout/Header';
import AlertPopover from '../../../components/popovers/AlertPopover';
import MailPopover from '../../../components/popovers/MailPopover';
import EmptyState from '../../../components/ui/EmptyState';
import PageLoading from '../../../components/ui/PageLoading';
import { usePopovers } from '../../../hooks/usePopovers';
import { useOperationalNotice } from './OperationalNoticeLogic';
import EditNoticeModal from './components/EditNoticeModal';
import NoticeCard from './components/NoticeCard';
import NoticeWizardModal from './components/NoticeWizardModal';
import TemplatesAdmin from './components/TemplatesAdmin';

const OperationalNoticeView: React.FC = () => {
  const vm = useOperationalNotice();
  const pops = usePopovers();

  let notices: React.ReactNode;
  if (vm.loading) {
    notices = <PageLoading text="Cargando avisos…" />;
  } else if (vm.loadError) {
    notices = (
      <EmptyState icon={alertCircleOutline} text="No se pudieron cargar los avisos."
        action={<IonButton fill="outline" onClick={vm.load}>Reintentar</IonButton>} />
    );
  } else if (vm.groups.length === 0) {
    notices = (
      <EmptyState icon={megaphoneOutline}
        text="No hay avisos. Los agentes usan tu horario e información habituales."
        action={vm.canEdit ? <IonButton onClick={() => vm.wizard.start()}>Crear aviso</IonButton> : undefined} />
    );
  } else {
    notices = (
      <IonAccordionGroup multiple value={vm.openGroups} className="notice-groups"
        onIonChange={e => { if (e.target === e.currentTarget) vm.setOpenGroups((e.detail.value as string[]) ?? []); }}>
        {vm.groups.map(g => (
          <IonAccordion key={g.key} value={g.key}>
            <IonItem slot="header" lines="none" className="notice-group-header">
              <IonLabel className="notice-group-title">
                {g.label} <span className="notice-group-count">({g.notices.length})</span>
              </IonLabel>
            </IonItem>
            <div slot="content" className="notice-list">
              {g.notices.map(n => <NoticeCard key={n.operationalNoticeId} notice={n} vm={vm} />)}
            </div>
          </IonAccordion>
        ))}
      </IonAccordionGroup>
    );
  }

  return (
    <IonPage>
      <Header {...pops.headerProps} screenTitle="Avisos operativos" />
      <AlertPopover {...pops.alertPopoverProps} />
      <MailPopover {...pops.mailPopoverProps} />
      <IonContent fullscreen className="notice-page">
        <div className="notice-container">
          <div className="notice-hero">
            <div className="notice-hero-icon"><IonIcon icon={megaphoneOutline} /></div>
            <div>
              <h1 className="notice-hero-title">Avisos operativos</h1>
              <p className="notice-hero-subtitle">
                Cierres y cambios temporales que el agente de WhatsApp comunica antes que tu horario normal.
                {!vm.loading && !vm.loadError && ` ${vm.currentCount === 1 ? '1 aviso vigente hoy' : `${vm.currentCount} avisos vigentes hoy`}.`}
              </p>
            </div>
          </div>

          {vm.isPlatformAdmin && (
            <IonSegment value={vm.segment} className="notice-segment"
              onIonChange={e => vm.setSegment(e.detail.value as typeof vm.segment)}>
              <IonSegmentButton value="avisos"><IonLabel>Avisos de {vm.companyName || 'mi empresa'}</IonLabel></IonSegmentButton>
              <IonSegmentButton value="plantillas"><IonLabel>Plantillas</IonLabel></IonSegmentButton>
            </IonSegment>
          )}

          {vm.segment === 'plantillas' && vm.isPlatformAdmin ? <TemplatesAdmin vm={vm} /> : notices}
        </div>

        {vm.canEdit && vm.segment === 'avisos' && (
          <IonFab vertical="bottom" horizontal="end" slot="fixed">
            <IonFabButton onClick={() => vm.wizard.start()} aria-label="Nuevo aviso">
              <IonIcon icon={addOutline} />
            </IonFabButton>
          </IonFab>
        )}

        <NoticeWizardModal vm={vm} />
        <EditNoticeModal vm={vm} />
        <IonAlert
          isOpen={!!vm.finalizing}
          onDidDismiss={() => vm.setFinalizing(null)}
          header="Finalizar aviso"
          message={`"${vm.finalizing?.title ?? ''}" deja de aplicar ahora y los agentes vuelven a tu horario normal.`}
          buttons={[
            { text: 'Cancelar', role: 'cancel' },
            { text: 'Finalizar', role: 'destructive', handler: () => { if (vm.finalizing) vm.finalize(vm.finalizing); } },
          ]}
        />
        <IonAlert
          isOpen={vm.offerResumption}
          onDidDismiss={() => vm.setOfferResumption(false)}
          header="¿Avisar que ya reabriste?"
          message="Puedes publicar un aviso de reanudación para que el agente lo comente a quien pregunte."
          buttons={[
            { text: 'Ahora no', role: 'cancel' },
            { text: 'Publicar reanudación', handler: vm.publishResumption },
          ]}
        />
        <IonToast {...vm.toastProps} />
      </IonContent>
    </IonPage>
  );
};

export default OperationalNoticeView;

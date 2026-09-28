/**
 * JuridicalDashboardView — presentation only (MVVM). Everything comes from useJuridicalDashboard().
 */
import React from 'react';
import {
  IonPage, IonContent, IonCard, IonCardContent, IonItem, IonLabel, IonList, IonIcon,
  IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonSpinner,
} from '@ionic/react';
import {
  briefcaseOutline, documentTextOutline, folderOpenOutline, close, refreshOutline, lockClosedOutline,
} from 'ionicons/icons';
import Header from '../../../components/layout/Header';
import AlertPopover from '../../../components/popovers/AlertPopover';
import MailPopover from '../../../components/popovers/MailPopover';
import { usePopovers } from '../../../hooks/usePopovers';
import EmptyState from '../../../components/ui/EmptyState';
import FollowUpList from '../../../components/ui/FollowUpList';
import { LEGAL_TEMPLATES, useJuridicalDashboard } from './JuridicalDashboardLogic';

const JuridicalDashboardView: React.FC = () => {
  const vm = useJuridicalDashboard();
  const pops = usePopovers();

  return (
    <IonPage>
      <Header {...pops.headerProps} screenTitle="Panel jurídico" />
      <AlertPopover {...pops.alertPopoverProps} />
      <MailPopover {...pops.mailPopoverProps} />

      <IonContent className="jd-content">
        {!vm.isMember ? (
          <EmptyState icon={lockClosedOutline} text="No tienes el perfil jurídico activo en esta empresa." />
        ) : (
          <div className="jd-body">
            <IonCard className="jd-hero">
              <IonCardContent>
                <IonIcon icon={briefcaseOutline} className="jd-hero-icon" />
                <div>
                  <p className="jd-hero-kicker">SmartLoans · Jurídico</p>
                  <h2 className="jd-hero-name">{vm.username || 'Asesor jurídico'}</h2>
                  <p className="jd-hero-stat">
                    {vm.pendingCount} {vm.pendingCount === 1 ? 'asignación pendiente' : 'asignaciones pendientes'}
                  </p>
                </div>
              </IonCardContent>
            </IonCard>

            <div className="jd-section-head">
              <h3 className="jd-section-title">Casos y seguimiento</h3>
              <IonButton fill="clear" size="small" disabled={vm.loading} onClick={() => vm.load()} aria-label="Actualizar">
                {vm.loading ? <IonSpinner name="dots" /> : <IonIcon icon={refreshOutline} slot="icon-only" />}
              </IonButton>
            </div>
            {vm.items.length === 0 ? (
              <EmptyState
                icon={folderOpenOutline}
                text={vm.loading ? 'Cargando…' : 'Aún no tienes casos asignados. El equipo registra aquí cada asignación.'}
                className="jd-empty"
              />
            ) : (
              <FollowUpList items={vm.items} />
            )}

            <h3 className="jd-section-title">Plantillas legales</h3>
            <IonList lines="full" className="jd-templates">
              {LEGAL_TEMPLATES.map(t => (
                <IonItem key={t.id} button detail onClick={() => vm.setOpenTemplate(t)}>
                  <IonIcon icon={documentTextOutline} slot="start" />
                  <IonLabel>{t.title}</IonLabel>
                </IonItem>
              ))}
            </IonList>
          </div>
        )}
      </IonContent>

      <IonModal isOpen={!!vm.openTemplate} onDidDismiss={() => vm.setOpenTemplate(null)}>
        <IonHeader>
          <IonToolbar>
            <IonTitle>{vm.openTemplate?.title}</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => vm.setOpenTemplate(null)} aria-label="Cerrar">
                <IonIcon icon={close} />
              </IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <p className="jd-template-text">{vm.openTemplate?.text}</p>
        </IonContent>
      </IonModal>
    </IonPage>
  );
};

export default JuridicalDashboardView;

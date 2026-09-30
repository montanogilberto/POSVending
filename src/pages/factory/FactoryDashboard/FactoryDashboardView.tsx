/**
 * FactoryDashboardView — presentation only (MVVM). Everything comes from useFactoryDashboard().
 */
import React from 'react';
import {
  IonPage, IonContent, IonCard, IonCardContent, IonIcon, IonButton, IonSpinner, IonInput, IonTextarea, IonToast,
} from '@ionic/react';
import { sparklesOutline, refreshOutline, fileTrayOutline, lockClosedOutline } from 'ionicons/icons';
import Header from '../../../components/layout/Header';
import AlertPopover from '../../../components/popovers/AlertPopover';
import MailPopover from '../../../components/popovers/MailPopover';
import { usePopovers } from '../../../hooks/usePopovers';
import EmptyState from '../../../components/ui/EmptyState';
import FollowUpList from '../../../components/ui/FollowUpList';
import { useFactoryDashboard } from './FactoryDashboardLogic';

const FactoryDashboardView: React.FC = () => {
  const vm = useFactoryDashboard();
  const pops = usePopovers();

  return (
    <IonPage>
      <Header {...pops.headerProps} screenTitle="Factory AI" />
      <AlertPopover {...pops.alertPopoverProps} />
      <MailPopover {...pops.mailPopoverProps} />

      <IonContent className="fd-content">
        <IonToast {...vm.toastProps} />
        {!vm.isMember ? (
          <EmptyState icon={lockClosedOutline} text="No tienes Factory AI Software activo en esta empresa." />
        ) : (
          <div className="fd-body">
            <IonCard className="fd-hero">
              <IonCardContent>
                <IonIcon icon={sparklesOutline} className="fd-hero-icon" />
                <div>
                  <p className="fd-hero-kicker">Factory AI Software</p>
                  <h2 className="fd-hero-name">{vm.username || 'Tu espacio'}</h2>
                  <p className="fd-hero-stat">
                    {vm.pendingCount} {vm.pendingCount === 1 ? 'solicitud en revisión' : 'solicitudes en revisión'}
                  </p>
                </div>
              </IonCardContent>
            </IonCard>

            <IonCard className="fd-form">
              <IonCardContent>
                <h3 className="fd-section-title">Nueva solicitud</h3>
                <IonInput
                  fill="outline"
                  label="¿Qué necesitas?"
                  labelPlacement="floating"
                  placeholder="Ej. App de reservas para mi negocio"
                  maxlength={80}
                  value={vm.title}
                  onIonInput={e => vm.setTitle(e.detail.value ?? '')}
                  className="fd-input"
                />
                <IonTextarea
                  fill="outline"
                  label="Descríbelo"
                  labelPlacement="floating"
                  placeholder="Quién lo usará, qué debe hacer y para cuándo lo necesitas"
                  autoGrow
                  rows={4}
                  maxlength={1000}
                  value={vm.description}
                  onIonInput={e => vm.setDescription(e.detail.value ?? '')}
                  className="fd-input"
                />
                <IonButton expand="block" disabled={!vm.canSend} onClick={vm.sendRequest}>
                  {vm.sending ? <IonSpinner name="dots" /> : 'Enviar solicitud'}
                </IonButton>
              </IonCardContent>
            </IonCard>

            <div className="fd-section-head">
              <h3 className="fd-section-title">Mis solicitudes</h3>
              <IonButton fill="clear" size="small" disabled={vm.loading} onClick={() => vm.load()} aria-label="Actualizar">
                {vm.loading ? <IonSpinner name="dots" /> : <IonIcon icon={refreshOutline} slot="icon-only" />}
              </IonButton>
            </div>
            {vm.requests.length === 0 ? (
              <EmptyState
                icon={fileTrayOutline}
                text={vm.loading ? 'Cargando…' : 'Todavía no has enviado solicitudes.'}
              />
            ) : (
              <FollowUpList items={vm.requests} />
            )}
          </div>
        )}
      </IonContent>
    </IonPage>
  );
};

export default FactoryDashboardView;

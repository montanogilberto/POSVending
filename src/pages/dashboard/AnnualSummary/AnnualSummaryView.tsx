import React from 'react';
import { IonButton, IonContent, IonIcon, IonPage, IonToast } from '@ionic/react';
import { chevronBackOutline, chevronForwardOutline, cloudOfflineOutline } from 'ionicons/icons';
import Header from '../../../components/layout/Header';
import AlertPopover from '../../../components/popovers/AlertPopover';
import MailPopover from '../../../components/popovers/MailPopover';
import EmptyState from '../../../components/ui/EmptyState';
import PageLoading from '../../../components/ui/PageLoading';
import { usePopovers } from '../../../hooks/usePopovers';
import { useAnnualSummary } from './AnnualSummaryLogic';
import AnnualChart from './components/AnnualChart';
import AnnualTable from './components/AnnualTable';

/** Income, expenses and profit of one year, month by month. */
const AnnualSummaryView: React.FC = () => {
  const vm = useAnnualSummary();
  const pops = usePopovers();

  return (
    <IonPage>
      <Header {...pops.headerProps} screenTitle="Resumen anual" showBackButton={true} backButtonHref="/dashboard" />

      <IonContent fullscreen={true} className="dashboard-content">
        <div className="dashboard-container">
          <div className="annual-year">
            <IonButton fill="clear" size="small" aria-label="Año anterior" disabled={vm.loading || vm.isFirstYear} onClick={vm.prevYear}>
              <IonIcon icon={chevronBackOutline} slot="icon-only" />
            </IonButton>
            <span>{vm.year}</span>
            <IonButton fill="clear" size="small" aria-label="Año siguiente" disabled={vm.loading || vm.isCurrentYear} onClick={vm.nextYear}>
              <IonIcon icon={chevronForwardOutline} slot="icon-only" />
            </IonButton>
          </div>

          {vm.loading && <PageLoading text="Cargando resumen del año…" />}

          {vm.failed && (
            <EmptyState
              icon={cloudOfflineOutline}
              text="No se pudo cargar el resumen del año."
              action={<IonButton fill="outline" size="small" onClick={vm.refresh}>Reintentar</IonButton>}
            />
          )}

          {vm.months && vm.totals && (
            <>
              <AnnualChart months={vm.months} />
              <AnnualTable months={vm.months} totals={vm.totals} />
            </>
          )}
        </div>

        <AlertPopover {...pops.alertPopoverProps} />
        <MailPopover {...pops.mailPopoverProps} />
        <IonToast {...vm.toastProps} />
      </IonContent>
    </IonPage>
  );
};

export default AnnualSummaryView;

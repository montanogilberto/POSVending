import React from 'react';
import { IonButton, IonContent, IonPage, IonToast } from '@ionic/react';
import { cloudOfflineOutline } from 'ionicons/icons';
import Header from '../../../components/layout/Header';
import AlertPopover from '../../../components/popovers/AlertPopover';
import MailPopover from '../../../components/popovers/MailPopover';
import EmptyState from '../../../components/ui/EmptyState';
import MonthPicker from '../../../components/ui/MonthPicker';
import PageLoading from '../../../components/ui/PageLoading';
import { usePopovers } from '../../../hooks/usePopovers';
import PaymentBreakdown from '../components/PaymentBreakdown';
import ProfitBreakdown from '../components/ProfitBreakdown';
import SummaryGrid from '../components/SummaryGrid';
import { useMonthlySummary } from './MonthlySummaryLogic';

/**
 * RESUMEN card as on Dashboard.tsx plus COBROS (income) and PAGOS (expenses) by
 * payment method, for the month chosen in the picker.
 */
const MonthlySummaryView: React.FC = () => {
  const vm = useMonthlySummary();
  const pops = usePopovers();

  return (
    <IonPage>
      <Header
        {...pops.headerProps}
        screenTitle="Resumen mensual"
        showBackButton={true}
        backButtonHref="/dashboard"
      />

      <IonContent fullscreen={true} className="dashboard-content">
        <div className="dashboard-container">
          <MonthPicker value={vm.period} onChange={vm.setPeriod} disabled={vm.loading} />

          {vm.loading && <PageLoading text="Cargando resumen del mes…" />}

          {vm.failed && (
            <EmptyState
              icon={cloudOfflineOutline}
              text="No se pudo cargar el resumen del mes."
              action={<IonButton fill="outline" size="small" onClick={vm.refresh}>Reintentar</IonButton>}
            />
          )}

          {vm.summary && vm.profit && (
            <>
              <SummaryGrid
                title="RESUMEN DEL MES"
                ingresos={vm.summary.ingresos}
                comisiones={vm.summary.comisiones}
                egresos={vm.summary.egresos}
                operaciones={vm.summary.operaciones}
                month={vm.monthKey}
              />
              <ProfitBreakdown profit={vm.profit} loading={vm.profitLoading} ledgerFailed={vm.adjustmentsFailed} />
              <PaymentBreakdown breakdown={vm.summary.cobros} />
              <PaymentBreakdown title="PAGOS" breakdown={vm.summary.pagos} emptyText="No hay egresos este mes." />
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

export default MonthlySummaryView;

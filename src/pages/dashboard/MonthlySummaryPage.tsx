import React from 'react';
import { IonContent, IonPage } from '@ionic/react';
import './Dashboard.css';

import Header from '../../components/layout/Header';
import AlertPopover from '../../components/popovers/AlertPopover';
import MailPopover from '../../components/popovers/MailPopover';

import { useDashboard } from './hooks/useDashboard';
import { usePopovers } from '../../hooks/usePopovers';
import { useViewEnterLoad } from '../../hooks/useViewEnterLoad';
import { useUser } from '../../contexts/UserContext';
import SummaryGrid from './components/SummaryGrid';
import PaymentBreakdown from './components/PaymentBreakdown';

/**
 * RESUMEN card as on Dashboard.tsx plus COBROS (income) and PAGOS (expenses) by
 * payment method (only here), scoped to the current month
 * instead of today — Dashboard stays daily-only on purpose (§6: staff need
 * "how's today going", not last week buried under it). This page is where
 * "how's this month going" lives instead of mixing both scopes into one card.
 */
const MonthlySummaryPage: React.FC = () => {
  const {
    paymentBreakdown,
    expenseBreakdown,
    calculateMonthlyTotal,
    calculateMonthlyCommissions,
    calculateMonthlySalesCount,
    calculateExpensesMonthlyTotal,
    currentMonthYear,
    refreshDashboardData,
  } = useDashboard();

  const pops = usePopovers();

  const { companyId } = useUser();
  // Direct load (reload / deep link) too, not only when reached from /dashboard.
  useViewEnterLoad(refreshDashboardData, !!companyId);

  return (
    <IonPage>
      <Header
        {...pops.headerProps}
        screenTitle="Resumen mensual"
        showBackButton
        backButtonHref="/dashboard"
      />
      <AlertPopover {...pops.alertPopoverProps} />
      <MailPopover {...pops.mailPopoverProps} />

      <IonContent fullscreen className="dashboard-content">
        <div className="dashboard-container">
          <p className="secondary-text monthly-summary-period">{currentMonthYear}</p>

          <SummaryGrid
            title="RESUMEN DEL MES"
            ingresos={calculateMonthlyTotal()}
            comisiones={calculateMonthlyCommissions()}
            egresos={calculateExpensesMonthlyTotal()}
            operaciones={calculateMonthlySalesCount()}
          />

          <PaymentBreakdown breakdown={paymentBreakdown} />

          <PaymentBreakdown title="PAGOS" breakdown={expenseBreakdown} emptyText="No hay egresos este mes." />
        </div>
      </IonContent>
    </IonPage>
  );
};

export default MonthlySummaryPage;

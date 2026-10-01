import React from 'react';
import { IonContent, IonPage, useIonViewWillEnter } from '@ionic/react';
import './Dashboard.css';

import Header from '../../components/layout/Header';
import AlertPopover from '../../components/popovers/AlertPopover';
import MailPopover from '../../components/popovers/MailPopover';

import { useDashboard } from './hooks/useDashboard';
import { usePopovers } from '../../hooks/usePopovers';
import SummaryGrid from './components/SummaryGrid';
import PaymentBreakdown from './components/PaymentBreakdown';

/**
 * RESUMEN card as on Dashboard.tsx plus the COBROS breakdown (only here), scoped to the current month
 * instead of today — Dashboard stays daily-only on purpose (§6: staff need
 * "how's today going", not last week buried under it). This page is where
 * "how's this month going" lives instead of mixing both scopes into one card.
 */
const MonthlySummaryPage: React.FC = () => {
  const {
    paymentBreakdown,
    calculateMonthlyTotal,
    calculateMonthlyCommissions,
    calculateMonthlySalesCount,
    calculateExpensesMonthlyTotal,
    currentMonthYear,
    refreshDashboardData,
  } = useDashboard();

  const pops = usePopovers();

  useIonViewWillEnter(() => {
    refreshDashboardData();
  });

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
            ventas={calculateMonthlyTotal()}
            comisiones={calculateMonthlyCommissions()}
            egresos={calculateExpensesMonthlyTotal()}
            operaciones={calculateMonthlySalesCount()}
          />

          <PaymentBreakdown breakdown={paymentBreakdown} />
        </div>
      </IonContent>
    </IonPage>
  );
};

export default MonthlySummaryPage;

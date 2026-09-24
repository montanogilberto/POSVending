import React, { useEffect } from 'react';
import {
  IonContent,
  IonToast,
  IonPage,
  useIonViewWillEnter,
} from '@ionic/react';
import './Dashboard.css';

import Header from '../../components/layout/Header';
import AlertPopover from '../../components/popovers/AlertPopover';
import LogoutAlert from '../../components/alerts/LogoutAlert';
import MailPopover from '../../components/popovers/MailPopover';

import { useDashboard } from './hooks/useDashboard';
import { usePopovers } from '../../hooks/usePopovers';
import MetricsGrid from './components/MetricsGrid';
import SummaryGrid from './components/SummaryGrid';
import PaymentBreakdown from './components/PaymentBreakdown';
import CartSummary from './components/CartSummary';
import RecentActivity from './components/RecentActivity';
import ReservationsWidget from './components/ReservationsWidget';
import { onDataChanged } from '../../utils/refreshBus';

const Dashboard: React.FC = () => {
  const {
    location,
    history,
    allIncome,
    showToast,
    setShowToast,
    toastMessage,
    cart,
    setCart,
    showCart,
    setShowCart,
    showLogoutAlert,
    setShowLogoutAlert,
    paymentBreakdown,
    handleStartSeller,
    handleConfirmSale,
    calculateDailySales,
    calculateDailySalesCount,
    calculateExpensesDailyTotal,
    percentageChange,
    handleLogoutConfirm,
    handleShowReceipt,
    loadingReceiptId,
    getTitleFromPath,
    refreshDashboardData,
  } = useDashboard();

  const pops = usePopovers();

  useIonViewWillEnter(() => {
    refreshDashboardData();
  });

  // Refresco global: cualquier transacción/acción (o push recibido) recarga
  // el dashboard aunque ya esté en pantalla.
  useEffect(() => {
    return onDataChanged(() => refreshDashboardData());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleManualRefresh = () => {
    refreshDashboardData();
    setShowToast(false);
    setTimeout(() => {
      setShowToast(true);
    }, 50);
  };

  return (
    <IonPage>
      <Header {...pops.headerProps} screenTitle={getTitleFromPath()} />

      <IonContent fullscreen={true} className="dashboard-content">
        <div className="dashboard-container">

          {/* ✅ Hero: Ventas Hoy */}
          <MetricsGrid
            calculateDailySales={calculateDailySales}
            calculateDailySalesCount={calculateDailySalesCount}
            percentageChange={percentageChange}
            handleStartSeller={handleStartSeller}
            onRefresh={handleManualRefresh}
          />

          {/* ✅ Resumen: Ventas / Egresos / Neto / Operaciones (hoy) */}
          <SummaryGrid
            ventas={calculateDailySales()}
            egresos={calculateExpensesDailyTotal()}
            operaciones={calculateDailySalesCount()}
          />

          {/* ✅ Cobros: desglose por método de pago (mes actual) */}
          <PaymentBreakdown breakdown={paymentBreakdown} />

          {/* ✅ Cart Summary */}
          {showCart && cart.length > 0 && (
            <CartSummary
              cart={cart}
              onConfirmSale={handleConfirmSale}
              setCart={setCart}
              setShowCart={setShowCart}
            />
          )}

          {/* ✅ Reservaciones del día */}
          <ReservationsWidget />

          {/* ✅ Recent Activity */}
          {allIncome?.length > 0 && (
            <RecentActivity
              allIncome={allIncome}
              onShowReceipt={handleShowReceipt}
              loadingReceiptId={loadingReceiptId}
            />
          )}

        </div>

        {/* ✅ Toast */}
        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message={toastMessage || 'Dashboard actualizado'}
          duration={2000}
          color={toastMessage.includes('Error') ? 'danger' : 'success'}
        />

        {/* ✅ Popovers */}
        <AlertPopover {...pops.alertPopoverProps} />
        <MailPopover {...pops.mailPopoverProps} />

        {/* ✅ Logout Alert */}
        <LogoutAlert
          isOpen={showLogoutAlert}
          onDidDismiss={() => setShowLogoutAlert(false)}
          handleLogoutConfirm={handleLogoutConfirm}
        />

      </IonContent>
    </IonPage>
  );
};

export default Dashboard;

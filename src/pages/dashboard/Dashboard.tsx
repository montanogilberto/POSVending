import React, { useEffect } from 'react';
import {
  IonContent,
  IonToast,
  IonPage,
  IonButton,
  IonIcon,
  useIonViewWillEnter,
} from '@ionic/react';
import './Dashboard.css';
import { refreshOutline } from 'ionicons/icons';

import Header from '../../components/layout/Header';
import AlertPopover from '../../components/popovers/AlertPopover';
import LogoutAlert from '../../components/alerts/LogoutAlert';
import MailPopover from '../../components/popovers/MailPopover';
import LaundryChart from '../../components/finance/LaundryChart';

import { useDashboard } from './hooks/useDashboard';
import { usePopovers } from '../../hooks/usePopovers';
import MetricsGrid from './components/MetricsGrid';
import CartSummary from './components/CartSummary';
import RecentActivity from './components/RecentActivity';
import ExpensesSummaryCard from './components/ExpensesSummaryCard';
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
    pieData,
    handleStartSeller,
    handleConfirmSale,
    calculateTotal,
    calculateDailySales,
    calculateMonthlyTotal,
    calculateExpensesMonthlyTotal,
    currentMonthYear,
    currentUser,
    percentageChange,
    handleLogoutConfirm,
    handleShowReceipt,
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

      <IonContent fullscreen={true} style={{ '--background': '#F9FAFB' }} className="dashboard-content">
        <div className="dashboard-container">
          <div className="dashboard-tools-row">
            <button className="dashboard-refresh-button" onClick={handleManualRefresh}>
              <IonIcon icon={refreshOutline} />
              <span>Actualizar</span>
            </button>
          </div>

          {/* ✅ Metrics Grid ALWAYS visible */}
          <MetricsGrid
            calculateDailySales={calculateDailySales}
            calculateMonthlyTotal={calculateMonthlyTotal}
            calculateTotal={calculateTotal}
            currentMonthYear={currentMonthYear}
            currentUser={currentUser}
            percentageChange={percentageChange}
            handleStartSeller={handleStartSeller}
          />

          {/* ✅ Chart Section (SAFE RENDERING) */}
          <div style={{ marginTop: '20px' }}>
            {allIncome?.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                Cargando datos...
              </div>
            ) : pieData ? (
              <LaundryChart pieData={pieData} />
            ) : (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                No hay datos para el mes actual
              </div>
            )}
          </div>

          {/* ✅ Egresos del Mes */}
          <ExpensesSummaryCard
            monthlyTotal={calculateExpensesMonthlyTotal()}
            currentMonthYear={currentMonthYear}
          />

          {/* ✅ Cart Summary */}
          {showCart && cart.length > 0 && (
            <CartSummary
              cart={cart}
              onConfirmSale={handleConfirmSale}
              setCart={setCart}
              setShowCart={setShowCart}
            />
          )}

          {/* ✅ Recent Activity */}
          {allIncome?.length > 0 && (
            <RecentActivity
              allIncome={allIncome}
              onShowReceipt={handleShowReceipt}
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

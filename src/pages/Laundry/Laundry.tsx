import React, { useEffect } from 'react';
import {
  IonContent,
  IonToast,
  IonPage,
} from '@ionic/react';
import './Laundry.css';

import Header from '../../components/Header';
import AlertPopover from '../../components/PopOver/AlertPopover';
import LogoutAlert from '../../components/Alerts/LogoutAlert';
import MailPopover from '../../components/PopOver/MailPopover';
import LaundryChart from '../../components/LaundryChart';

import { useLaundryDashboard } from './hooks/useLaundryDashboard';
import MetricsGrid from './components/MetricsGrid';
import CartSummary from './components/CartSummary';
import RecentActivity from './components/RecentActivity';

const Laundry: React.FC = () => {
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
    currentMonthYear,
    currentUser,
    percentageChange,
    popoverState,
    presentAlertPopover,
    dismissAlertPopover,
    presentMailPopover,
    dismissMailPopover,
    handleLogoutConfirm,
    handleShowReceipt,
    getTitleFromPath,
  } = useLaundryDashboard();

  useEffect(() => {
    console.log("🧺 Laundry component MOUNTED");
  }, []);

  useEffect(() => {
    console.log("🧺 Laundry data update:", {
      allIncomeLength: allIncome?.length || 0,
      pieData: !!pieData,
      showCart,
    });
  }, [allIncome?.length, pieData, showCart]);

  return (
    <IonPage>
      <Header
        presentAlertPopover={presentAlertPopover}
        presentMailPopover={presentMailPopover}
        screenTitle={getTitleFromPath()}
      />

      <IonContent fullscreen className="dashboard-content">
        <div className="dashboard-container">

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
          message={toastMessage}
          duration={2000}
          color={toastMessage.includes('Error') ? 'danger' : 'success'}
        />

        {/* ✅ Popovers */}
        {popoverState.showAlertPopover && popoverState.event && (
          <AlertPopover
            isOpen={popoverState.showAlertPopover}
            event={popoverState.event}
            onDidDismiss={dismissAlertPopover}
          />
        )}

        {popoverState.showMailPopover && popoverState.event && (
          <MailPopover
            isOpen={popoverState.showMailPopover}
            event={popoverState.event}
            onDidDismiss={dismissMailPopover}
          />
        )}

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

export default Laundry;
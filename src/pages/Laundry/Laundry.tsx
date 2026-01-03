import React from 'react';
import {
  IonContent,
  IonToast,
  IonPage,
  IonButton,
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
import { ReceiptService } from '../../services/ReceiptService';

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

  // Navigate to ReceiptPage instead of showing modal
  const handleViewReceipt = (receiptData: any) => {
    history.push({
      pathname: '/receipt',
      state: { ticketData: receiptData }
    });
  };

  return (
    <IonPage>
      <Header
        presentAlertPopover={presentAlertPopover}
        presentMailPopover={presentMailPopover}
        screenTitle={getTitleFromPath(location.pathname)}
      />
      <IonContent fullscreen className="dashboard-content">
        <div className="dashboard-container">

          {/* Metrics Grid */}
          <MetricsGrid
            calculateDailySales={calculateDailySales}
            calculateMonthlyTotal={calculateMonthlyTotal}
            calculateTotal={calculateTotal}
            currentMonthYear={currentMonthYear}
            currentUser={currentUser}
            percentageChange={percentageChange}
            handleStartSeller={handleStartSeller}
          />

          {/* Laundry Chart */}
          <LaundryChart pieData={pieData} />

          {/* Carrito Summary if showCart */}
          {showCart && cart.length > 0 && (
            <CartSummary
              cart={cart}
              onConfirmSale={handleConfirmSale}
              setCart={setCart}
              setShowCart={setShowCart}
            />
          )}

          {/* Actividad Reciente */}
          <RecentActivity
            allIncome={allIncome}
            onShowReceipt={handleShowReceipt}
          />
        </div>

        {/* Toast */}
        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message={toastMessage}
          duration={2000}
          color={toastMessage.includes('Error') ? 'danger' : 'success'}
        />

<AlertPopover
          isOpen={popoverState.showAlertPopover}
          event={popoverState.event}
          onDidDismiss={dismissAlertPopover}
        />
        <MailPopover
          isOpen={popoverState.showMailPopover}
          event={popoverState.event}
          onDidDismiss={dismissMailPopover}
        />
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

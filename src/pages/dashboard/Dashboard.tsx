import React, { useEffect } from 'react';
import {
  IonContent,
  IonToast,
  IonPage,
  IonButton,
  IonIcon,
} from '@ionic/react';
import { chevronForwardOutline } from 'ionicons/icons';
import './Dashboard.css';

import Header from '../../components/layout/Header';
import AlertPopover from '../../components/popovers/AlertPopover';
import LogoutAlert from '../../components/alerts/LogoutAlert';
import MailPopover from '../../components/popovers/MailPopover';

import { useDashboard } from './hooks/useDashboard';
import { usePopovers } from '../../hooks/usePopovers';
import { useViewEnterLoad } from '../../hooks/useViewEnterLoad';
import { useUser } from '../../contexts/UserContext';
import MetricsGrid from './components/MetricsGrid';
import SummaryGrid from './components/SummaryGrid';
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
    handleStartSeller,
    handleConfirmSale,
    calculateDailySales,
    calculateDailySalesCount,
    calculateDailyCommissions,
    calculateExpensesDailyTotal,
    percentageChange,
    handleLogoutConfirm,
    handleShowReceipt,
    loadingReceiptId,
    getTitleFromPath,
    refreshDashboardData,
  } = useDashboard();

  const pops = usePopovers();

  const { companyId } = useUser();
  // First entry (also on a direct reload) + every re-entry, fetched once each.
  useViewEnterLoad(refreshDashboardData, !!companyId);

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

          {/* ✅ Resumen: Ingresos / Egresos / Neto (después de comisión terminal) / Operaciones (hoy) */}
          <SummaryGrid
            ingresos={calculateDailySales()}
            comisiones={calculateDailyCommissions()}
            egresos={calculateExpensesDailyTotal()}
            operaciones={calculateDailySalesCount()}
          />

          <IonButton
            fill="clear"
            size="small"
            className="monthly-summary-link"
            onClick={() => history.push('/monthly-summary')}
          >
            Ver resumen mensual
            <IonIcon icon={chevronForwardOutline} slot="end" />
          </IonButton>

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

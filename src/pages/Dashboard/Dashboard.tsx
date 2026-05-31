import React, { useEffect } from 'react';
import {
  IonContent,
  IonToast,
  IonPage,
} from '@ionic/react';
import './Dashboard.css';

import Header from '../../components/Header';
import AlertPopover from '../../components/PopOver/AlertPopover';
import LogoutAlert from '../../components/Alerts/LogoutAlert';
import MailPopover from '../../components/PopOver/MailPopover';
import LaundryChart from '../../components/LaundryChart';

import { useDashboard } from './hooks/useDashboard';

const Dashboard: React.FC = () => {
  const {
    allIncome,
    showToast,
    setShowToast,
    toastMessage,
    pieData,
    popoverState,
    presentAlertPopover,
    dismissAlertPopover,
    presentMailPopover,
    dismissMailPopover,
    handleLogoutConfirm,
    getTitleFromPath,
  } = useDashboard();

  useEffect(() => {
    console.log("🧺 Dashboard component MOUNTED");
  }, []);

  useEffect(() => {
    console.log("🧺 Dashboard data update:", {
      allIncomeLength: allIncome?.length || 0,
      pieData: !!pieData,
    });
  }, [allIncome?.length, pieData]);

  return (
    <IonPage>
      <Header
        presentAlertPopover={presentAlertPopover}
        presentMailPopover={presentMailPopover}
        screenTitle={getTitleFromPath()}
      />

      <IonContent fullscreen={true} style={{ '--background': '#F9FAFB' }} className="dashboard-content">
        <div className="dashboard-container">
          {/* ✅ Chart Section */}
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
        </div>

        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message={toastMessage}
          duration={2000}
          color={toastMessage.includes('Error') ? 'danger' : 'success'}
        />

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

        <LogoutAlert
          isOpen={false}
          onDidDismiss={() => {}}
          handleLogoutConfirm={handleLogoutConfirm}
        />
      </IonContent>
    </IonPage>
  );
};

export default Dashboard;

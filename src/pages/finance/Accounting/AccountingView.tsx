import React from 'react';
import { IonPage, IonContent, IonToast, IonLoading, IonSegment, IonSegmentButton, IonLabel } from '@ionic/react';
import Header from '../../../components/layout/Header';
import { usePopovers } from '../../../hooks/usePopovers';
import { useAccounting } from './AccountingLogic';
import { AccountingTab } from './AccountingTypes';
import ChartOfAccountsTab from './components/ChartOfAccountsTab';
import JournalEntriesTab from './components/JournalEntriesTab';
import LedgerTab from './components/LedgerTab';
import TrialBalanceTab from './components/TrialBalanceTab';

const AccountingView: React.FC = () => {
  const vm = useAccounting();
  const pops = usePopovers();

  return (
    <IonPage>
      <Header screenTitle="Contabilidad" showBackButton={true} backButtonHref="/dashboard" {...pops.headerProps} />
      <IonContent fullscreen className="accounting-content">
        <IonSegment
          value={vm.activeTab}
          onIonChange={(e) => vm.setActiveTab(e.detail.value as AccountingTab)}
          className="accounting-segment"
        >
          <IonSegmentButton value="accounts"><IonLabel>Cuentas</IonLabel></IonSegmentButton>
          <IonSegmentButton value="journal"><IonLabel>Diario</IonLabel></IonSegmentButton>
          <IonSegmentButton value="ledger"><IonLabel>Mayor</IonLabel></IonSegmentButton>
          <IonSegmentButton value="trialBalance"><IonLabel>Balanza</IonLabel></IonSegmentButton>
        </IonSegment>

        <div className="accounting-container">
          {vm.activeTab === 'accounts' && <ChartOfAccountsTab vm={vm} />}
          {vm.activeTab === 'journal' && <JournalEntriesTab vm={vm} />}
          {vm.activeTab === 'ledger' && <LedgerTab vm={vm} />}
          {vm.activeTab === 'trialBalance' && <TrialBalanceTab vm={vm} />}
        </div>

        <IonToast {...vm.toastProps} />
        <IonLoading isOpen={vm.loading} message="Cargando..." />
      </IonContent>
    </IonPage>
  );
};

export default AccountingView;

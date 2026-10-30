import React from 'react';
import { IonButton, IonCard, IonCardContent, IonIcon, IonSpinner, IonText } from '@ionic/react';
import { cashOutline } from 'ionicons/icons';
import { fmtMXN } from '../../../../utils/format';
import { ClientDashboardPOSVM } from '../ClientDashboardPOSLogic';

/** Saldo prepago (lo que cobra la lavadora) + abono en efectivo en caja. */
const PosWalletCard: React.FC<{ vm: ClientDashboardPOSVM }> = ({ vm }) => (
  <IonCard className="cpos-card">
    <IonCardContent className="cpos-card-content cpos-wallet">
      <div className="cpos-wallet-info">
        <h2 className="cpos-section-title">Saldo lavandería</h2>
        {vm.walletError ? (
          <IonText color="danger" className="cpos-wallet-error">
            {vm.walletError}{' '}
            <IonButton fill="clear" size="small" onClick={vm.loadWallet}>Reintentar</IonButton>
          </IonText>
        ) : vm.walletBalance === null ? (
          <IonSpinner name="dots" />
        ) : (
          <strong className="cpos-wallet-amount">{fmtMXN(vm.walletBalance)}</strong>
        )}
      </div>
      <IonButton color="success" onClick={vm.openCashTopUp} disabled={vm.cashSaving} className="cpos-action">
        {vm.cashSaving ? <IonSpinner name="dots" /> : <><IonIcon icon={cashOutline} slot="start" /> Abonar efectivo</>}
      </IonButton>
    </IonCardContent>
  </IonCard>
);

export default PosWalletCard;

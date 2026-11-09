import React from 'react';
import { IonButton, IonCard, IonCardContent, IonChip, IonIcon, IonSpinner } from '@ionic/react';
import { addOutline, walletOutline } from 'ionicons/icons';
import StripePaySheet from '../../../../components/payments/StripePaySheet';
import { fmtMXN } from '../../../../utils/format';
import { ClientDashboardPOSVM } from '../ClientDashboardPOSLogic';
import PosTerminalSheet from './PosTerminalSheet';
import PosTransferSheet from './PosTransferSheet';

/** Saldo prepago (lo que cobra la máquina) + abono con efectivo, terminal, tarjeta o transferencia. */
const PosWalletCard: React.FC<{ vm: ClientDashboardPOSVM }> = ({ vm }) => (
  <>
  <IonCard className="cpos-card cpos-wallet-card">
    <IonCardContent className="cpos-wallet">
      <div className="cpos-wallet-main">
        <span className="cpos-wallet-icon"><IonIcon icon={walletOutline} aria-hidden="true" /></span>
        <div className="cpos-wallet-info">
          <span className="cpos-wallet-label">{vm.walletTitle}</span>
          {vm.walletError ? (
            <span className="cpos-wallet-error">
              {vm.walletError}{' '}
              <IonButton fill="clear" size="small" color="light" onClick={vm.loadWallet}>Reintentar</IonButton>
            </span>
          ) : vm.walletBalance === null ? (
            <IonSpinner name="dots" color="light" />
          ) : (
            <strong className="cpos-wallet-amount">{fmtMXN(vm.walletBalance)}</strong>
          )}
        </div>
        <IonButton color="light" onClick={vm.openTopUp} disabled={vm.topUpBusy} className="cpos-wallet-topup">
          {vm.topUpBusy ? <IonSpinner name="dots" /> : <><IonIcon icon={addOutline} slot="start" /> Abonar</>}
        </IonButton>
      </div>
      {vm.pendingEvidence.map((e) => (
        <IonChip key={e.transferEvidenceId} className="cpos-wallet-pending" onClick={() => vm.reviewEvidence(e)}>
          Comprobante por revisar · {fmtMXN(e.amountMXN ?? 0)}
        </IonChip>
      ))}
    </IonCardContent>
  </IonCard>
  <StripePaySheet
    clientSecret={vm.cardPayment?.clientSecret ?? null}
    stripeAccount={vm.cardPayment?.stripeAccount}
    summaryLabel="Recarga de saldo"
    summaryValue={fmtMXN(vm.cardPayment?.amount ?? 0)}
    payLabel={`Cobrar ${fmtMXN(vm.cardPayment?.amount ?? 0)}`}
    onDone={vm.onCardPaid}
    onDismiss={vm.dismissCardPayment}
  />
  <PosTransferSheet vm={vm} />
  <PosTerminalSheet vm={vm} />
  </>
);

export default PosWalletCard;

import React from 'react';
import { IonButton, IonCard, IonCardContent, IonChip, IonIcon, IonSpinner, IonText } from '@ionic/react';
import { cashOutline } from 'ionicons/icons';
import StripePaySheet from '../../../../components/payments/StripePaySheet';
import { fmtMXN } from '../../../../utils/format';
import { ClientDashboardPOSVM } from '../ClientDashboardPOSLogic';
import PosTransferSheet from './PosTransferSheet';

/** Saldo prepago (lo que cobra la máquina) + abono con efectivo, tarjeta o transferencia. */
const PosWalletCard: React.FC<{ vm: ClientDashboardPOSVM }> = ({ vm }) => (
  <>
  <IonCard className="cpos-card">
    <IonCardContent className="cpos-card-content cpos-wallet">
      <div className="cpos-wallet-info">
        <h2 className="cpos-section-title">{vm.walletTitle}</h2>
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
      {vm.pendingEvidence.map((e) => (
        <IonChip key={e.transferEvidenceId} color="warning" onClick={() => vm.reviewEvidence(e)}>
          Comprobante por revisar · {fmtMXN(e.amountMXN ?? 0)}
        </IonChip>
      ))}
      <div className="cpos-wallet-actions">
        <IonButton color="success" onClick={vm.openTopUp} disabled={vm.topUpBusy} className="cpos-action">
          {vm.topUpBusy ? <IonSpinner name="dots" /> : <><IonIcon icon={cashOutline} slot="start" /> Abonar</>}
        </IonButton>
      </div>
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
  </>
);

export default PosWalletCard;

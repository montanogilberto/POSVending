import React from 'react';
import { IonButton, IonContent, IonPage, IonSpinner, IonText, IonToast } from '@ionic/react';
import Header from '../../../components/layout/Header';
import TransferAccountCard from '../../../components/payments/TransferAccountCard';
import StripePaySheet from '../../../components/payments/StripePaySheet';
import { usePopovers } from '../../../hooks/usePopovers';
import { fmtMXN } from '../../../utils/format';
import { useMyQr } from './MyQrLogic';
import BalanceCard from './components/BalanceCard';
import TopUpAmountSheet from './components/TopUpAmountSheet';

/**
 * Self-service client's own QR, shown at the register or a laundry machine.
 * Encodes the signed `GMO1.<companyId>.<clientId>.<firma>` value from the
 * backend (/laundryDevices/clientQr) — the ESP32 washers only accept that
 * format, and src/utils/clientQr.ts parses it too.
 * Scanning it at the register sets CartPage's selectedClient (reward points);
 * at a machine it charges the balance shown here.
 */
const MyQrView: React.FC = () => {
  const vm = useMyQr();
  const pops = usePopovers();

  return (
    <IonPage>
      <Header screenTitle="Mi Código QR" {...pops.headerProps} />
      <IonContent className="ion-padding my-qr-content">
        <div className="my-qr-card">
          {vm.qrError ? (
            <div className="my-qr-loading my-qr-error">
              <IonText color="danger"><p>{vm.qrError}</p></IonText>
              <IonButton fill="outline" size="small" onClick={vm.reloadQr}>Reintentar</IonButton>
            </div>
          ) : vm.qrDataUrl ? (
            <img src={vm.qrDataUrl} alt="Tu código QR" className="my-qr-image" />
          ) : (
            <div className="my-qr-loading my-qr-loading--busy"><IonSpinner name="crescent" /><span>Generando código QR…</span></div>
          )}
          <p className="my-qr-name">{vm.username || 'Cliente'}</p>
          <p className="my-qr-hint">Muestra este código en caja o escanéalo en la lavadora.</p>
        </div>

        <BalanceCard vm={vm} />
        {vm.transferAccount && (
          <div className="my-qr-transfer">
            <h2>Recarga por transferencia</h2>
            <TransferAccountCard account={vm.transferAccount} />
            <p>Después manda tu comprobante por WhatsApp o muéstralo en caja.</p>
          </div>
        )}
        <TopUpAmountSheet vm={vm} />
        <StripePaySheet
          clientSecret={vm.clientSecret}
          stripeAccount={vm.stripeAccount}
          summaryLabel="Recarga de saldo"
          summaryValue={fmtMXN(vm.amount)}
          payLabel={`Pagar ${fmtMXN(vm.amount)}`}
          onDone={vm.onPaid}
          onDismiss={vm.dismissPayment}
        />
        <IonToast {...vm.toastProps} />
      </IonContent>
    </IonPage>
  );
};

export default MyQrView;

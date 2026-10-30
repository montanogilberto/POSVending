import React from 'react';
import { IonButton, IonIcon, IonSpinner, IonText } from '@ionic/react';
import { addCircleOutline } from 'ionicons/icons';
import { fmtMXN } from '../../../../utils/format';
import type { MyQrVM } from '../MyQrLogic';

/** Saldo prepago que cobra la lavadora al escanear el QR. */
const BalanceCard: React.FC<{ vm: MyQrVM }> = ({ vm }) => (
  <div className="my-qr-balance">
    <div className="my-qr-balance-info">
      <span className="my-qr-balance-label">Tu saldo</span>
      {vm.balanceError ? (
        <IonText color="danger" className="my-qr-balance-error">
          {vm.balanceError}{' '}
          <IonButton fill="clear" size="small" onClick={vm.loadBalance}>Reintentar</IonButton>
        </IonText>
      ) : vm.balance === null ? (
        <IonSpinner name="dots" />
      ) : (
        <strong className="my-qr-balance-amount">{fmtMXN(vm.balance)}</strong>
      )}
    </div>
    <IonButton className="my-qr-topup-btn" onClick={vm.openTopUp}>
      <IonIcon icon={addCircleOutline} slot="start" />
      Recargar
    </IonButton>
  </div>
);

export default BalanceCard;

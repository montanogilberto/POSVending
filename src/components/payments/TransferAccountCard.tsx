import React from 'react';
import { IonButton, IonNote } from '@ionic/react';
import { TransferAccount } from '../../api/laundryWalletApi';
import './TransferAccountCard.css';

/** Datos para transferir a la compañía. Sólo llega aquí una CLABE ya confirmada. */
const TransferAccountCard: React.FC<{ account: TransferAccount | null }> = ({ account }) => {
  if (!account) return <IonNote>La compañía aún no tiene una cuenta para transferencias.</IonNote>;
  return (
    <table className="transfer-account">
      <tbody>
        <tr><th scope="row">Titular</th><td>{account.holderName}</td></tr>
        <tr>
          <th scope="row">CLABE</th>
          <td>
            {account.clabe}
            <IonButton size="small" fill="clear" onClick={() => navigator.clipboard?.writeText(account.clabe)}>
              Copiar
            </IonButton>
          </td>
        </tr>
        {account.bankName && <tr><th scope="row">Banco</th><td>{account.bankName}</td></tr>}
        {account.terminalName && <tr><th scope="row">Terminal</th><td>{account.terminalName}</td></tr>}
      </tbody>
    </table>
  );
};

export default TransferAccountCard;

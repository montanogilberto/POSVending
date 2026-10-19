import React from 'react';
import { IonList, IonItem, IonLabel, IonSelect, IonSelectOption, IonNote, IonButton } from '@ionic/react';
import { fmtMXN } from '../../../../utils/format';
import { AccountingVM } from '../AccountingLogic';

interface Props {
  vm: AccountingVM;
}

const LedgerTab: React.FC<Props> = ({ vm }) => {
  return (
    <>
      <div className="accounting-toolbar">
        <h2>Libro Mayor</h2>
      </div>

      <IonList inset>
        <IonItem>
          <IonLabel>Cuenta</IonLabel>
          <IonSelect
            value={vm.ledgerAccountId}
            placeholder="Todas las cuentas"
            onIonChange={(e) => { vm.setLedgerAccountId(e.detail.value); }}
          >
            <IonSelectOption value="">Todas las cuentas</IonSelectOption>
            {vm.accounts.map((a) => (
              <IonSelectOption key={a.accountId} value={a.accountId}>{a.code} · {a.name}</IonSelectOption>
            ))}
          </IonSelect>
        </IonItem>
      </IonList>
      <IonButton size="small" fill="outline" onClick={vm.refreshLedger} className="accounting-refresh-btn">
        Actualizar
      </IonButton>

      <IonList inset>
        {vm.ledgerMovements.map((m) => (
          <IonItem key={`${m.entryId}-${m.accountId}`}>
            <IonLabel>
              <h3><IonNote className="accounting-code">{m.accountCode}</IonNote> {m.accountName}</h3>
              <p>#{m.entryNumber} · {m.entryDate} · {m.description}</p>
            </IonLabel>
            <IonLabel slot="end" className="ion-text-end">
              {m.debit > 0 && <p>Debe {fmtMXN(m.debit)}</p>}
              {m.credit > 0 && <p>Haber {fmtMXN(m.credit)}</p>}
              <p><strong>Saldo {fmtMXN(m.runningBalance)}</strong></p>
            </IonLabel>
          </IonItem>
        ))}
        {vm.ledgerMovements.length === 0 && !vm.loading && (
          <IonItem><IonLabel color="medium">Sin movimientos para este filtro.</IonLabel></IonItem>
        )}
      </IonList>
    </>
  );
};

export default LedgerTab;

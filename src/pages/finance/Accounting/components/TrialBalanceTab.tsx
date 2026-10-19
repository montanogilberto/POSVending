import React from 'react';
import { IonList, IonItem, IonLabel, IonNote, IonBadge, IonButton } from '@ionic/react';
import StatusBadge from '../../../../components/ui/StatusBadge';
import { ACCOUNT_TYPE } from '../../../../components/ui/statusMaps';
import { fmtMXN } from '../../../../utils/format';
import { AccountingVM } from '../AccountingLogic';

interface Props {
  vm: AccountingVM;
}

const TrialBalanceTab: React.FC<Props> = ({ vm }) => {
  const tb = vm.trialBalance;

  return (
    <>
      <div className="accounting-toolbar">
        <h2>Balanza de Comprobación</h2>
        <IonButton size="small" fill="outline" onClick={vm.refreshTrialBalance}>Actualizar</IonButton>
      </div>

      {tb && (
        <div className="accounting-totals-row">
          <IonBadge color={tb.balanced ? 'success' : 'danger'}>
            {tb.balanced ? 'Balanceada' : 'Descuadrada'}
          </IonBadge>
          <strong> Debe: {fmtMXN(tb.totalDebit)} &nbsp;·&nbsp; Haber: {fmtMXN(tb.totalCredit)}</strong>
        </div>
      )}

      <IonList inset>
        {(tb?.accounts ?? []).map((a) => (
          <IonItem key={a.accountId}>
            <IonLabel>
              <h3><IonNote className="accounting-code">{a.accountCode}</IonNote> {a.accountName}</h3>
              <p><StatusBadge status={a.accountType} map={ACCOUNT_TYPE} /></p>
            </IonLabel>
            <IonLabel slot="end" className="ion-text-end">
              <p>Debe {fmtMXN(a.debitTotal)}</p>
              <p>Haber {fmtMXN(a.creditTotal)}</p>
            </IonLabel>
          </IonItem>
        ))}
        {tb && tb.accounts.length === 0 && (
          <IonItem><IonLabel color="medium">Sin movimientos contabilizados todavía.</IonLabel></IonItem>
        )}
      </IonList>
    </>
  );
};

export default TrialBalanceTab;

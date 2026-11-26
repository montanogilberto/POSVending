import React from 'react';
import { IonList, IonItem, IonLabel, IonNote, IonBadge, IonButton, IonSegment, IonSegmentButton, IonSpinner } from '@ionic/react';
import { cloudOfflineOutline } from 'ionicons/icons';
import EmptyState from '../../../../components/ui/EmptyState';
import MonthPicker from '../../../../components/ui/MonthPicker';
import PageLoading from '../../../../components/ui/PageLoading';
import StatusBadge from '../../../../components/ui/StatusBadge';
import { ACCOUNT_TYPE } from '../../../../components/ui/statusMaps';
import { fmtMXN } from '../../../../utils/format';
import { AccountingVM } from '../AccountingLogic';
import BooksComparison from './BooksComparison';
import { TrialBalanceMode } from '../TrialBalanceLogic';

interface Props {
  vm: AccountingVM;
}

const TrialBalanceTab: React.FC<Props> = ({ vm }) => {
  const { data: tb, comparison, loading, load, period, setPeriod, mode, setMode, cutoffLabel } = vm.trialBalance;

  return (
    <>
      <div className="accounting-toolbar">
        <h2>Balanza de Comprobación</h2>
        <IonButton size="small" fill="outline" disabled={loading} onClick={load}>
          {loading ? <IonSpinner name="dots" /> : 'Actualizar'}
        </IonButton>
      </div>

      <MonthPicker value={period} onChange={setPeriod} disabled={loading} />
      <IonSegment scrollable value={mode} onIonChange={(e) => setMode(e.detail.value as TrialBalanceMode)}>
        <IonSegmentButton value="month"><IonLabel>Movimientos del mes</IonLabel></IonSegmentButton>
        <IonSegmentButton value="cumulative"><IonLabel>Acumulado al {cutoffLabel}</IonLabel></IonSegmentButton>
        <IonSegmentButton value="compare"><IonLabel>Comparativo</IonLabel></IonSegmentButton>
      </IonSegment>

      {!tb && !comparison && loading && <PageLoading text="Cargando balanza…" />}
      {!tb && !comparison && !loading && (
        <EmptyState
          icon={cloudOfflineOutline}
          text="No se pudo cargar la balanza."
          action={<IonButton fill="outline" size="small" onClick={load}>Reintentar</IonButton>}
        />
      )}

      {comparison && <BooksComparison comparison={comparison} />}

      {tb && (
        <>
          <div className="accounting-totals-row">
            <IonBadge color={tb.balanced ? 'success' : 'danger'}>
              {tb.balanced ? 'Balanceada' : 'Descuadrada'}
            </IonBadge>
            <strong> Debe: {fmtMXN(tb.totalDebit)} &nbsp;·&nbsp; Haber: {fmtMXN(tb.totalCredit)}</strong>
          </div>

          <IonList inset>
            {tb.accounts.map((a) => (
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
            {tb.accounts.length === 0 && (
              <IonItem>
                <IonLabel color="medium">
                  {mode === 'month' ? 'Sin movimientos contabilizados en este mes.' : 'Sin movimientos contabilizados todavía.'}
                </IonLabel>
              </IonItem>
            )}
          </IonList>
        </>
      )}
    </>
  );
};

export default TrialBalanceTab;

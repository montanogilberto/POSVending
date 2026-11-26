import React from 'react';
import { IonCard, IonCardContent, IonSpinner } from '@ionic/react';
import { fmtMXN } from '../../../utils/format';
import type { MonthlyProfit } from '../../../utils/monthlyProfit';

interface RowProps {
  label: string;
  /** Signed: negative = cost. */
  amount: number;
  strong?: boolean;
}

const Row: React.FC<RowProps> = ({ label, amount, strong }) => (
  <div className={`profit-row${strong ? ' profit-row-strong' : ''}`}>
    <span>{label}</span>
    <span className={amount < 0 ? 'profit-negative' : undefined}>
      {amount < 0 ? '−' : ''}{fmtMXN(Math.abs(amount))}
    </span>
  </div>
);

interface ProfitBreakdownProps {
  profit: MonthlyProfit;
  loading: boolean;
  /** The accounting ledger could not be read: manual entries are missing. */
  ledgerFailed: boolean;
}

const ProfitBreakdown: React.FC<ProfitBreakdownProps> = ({ profit, loading, ledgerFailed }) => (
  <IonCard className="dashboard-summary-card">
    <IonCardContent className="summary-card-content">
      <div className="summary-card-title">UTILIDAD DEL MES</div>
      {loading ? (
        <div className="profit-loading"><IonSpinner name="dots" /> Calculando utilidad…</div>
      ) : (
        <>
          {profit.discounts > 0 && (
            <>
              <Row label="Ventas antes de descuentos" amount={profit.grossSales} />
              <Row label="Descuentos y promociones" amount={-profit.discounts} />
            </>
          )}
          <Row label="Ventas netas" amount={profit.netSales} strong />
          <Row label="Comisiones de terminal" amount={-profit.commissions} />
          <Row label="Insumos e inventario" amount={-profit.expenses.inventory} />
          <Row label="Nómina" amount={-profit.expenses.payroll} />
          <Row label="Servicios y gastos generales" amount={-profit.expenses.general} />
          {profit.adjustments.map((a) => (
            <Row key={a.accountId} label={`${a.name} (asiento manual)`} amount={a.amount} />
          ))}
          <div className="profit-total">
            <span>{profit.profit < 0 ? 'Pérdida' : 'Utilidad neta'}</span>
            <span className={profit.profit < 0 ? 'profit-negative' : 'profit-positive'}>
              {profit.profit < 0 ? '−' : ''}{fmtMXN(Math.abs(profit.profit))}
            </span>
          </div>
          {profit.marginPct !== null && (
            <p className="profit-note">Margen: {profit.marginPct}% de las ventas netas</p>
          )}
          {ledgerFailed && (
            <p className="profit-note profit-negative">
              No se pudieron leer los asientos manuales; la utilidad no los incluye.
            </p>
          )}
        </>
      )}
    </IonCardContent>
  </IonCard>
);

export default ProfitBreakdown;

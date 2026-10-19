import React from 'react';
import { IonCard, IonCardContent, IonIcon } from '@ionic/react';
import { cashOutline, cardOutline, swapHorizontalOutline } from 'ionicons/icons';
import { fmtMXN } from '../../../utils/format';

type PaymentMethod = 'Efectivo' | 'Transferencia' | 'Tarjeta';

interface BreakdownEntry {
  method: PaymentMethod;
  amount: number;
  commission: number; // card-terminal commission on `amount` (0 for cash/transfer)
  percent: number;
  color: string;
}

interface PaymentBreakdownProps {
  breakdown: BreakdownEntry[];
  /** 'COBROS' (income, default) or 'PAGOS' (expenses). */
  title?: string;
  emptyText?: string;
}

const METHOD_ICONS: Record<PaymentMethod, string> = {
  Efectivo: cashOutline,
  Tarjeta: cardOutline,
  Transferencia: swapHorizontalOutline,
};

const PaymentBreakdown: React.FC<PaymentBreakdownProps> = ({
  breakdown,
  title = 'COBROS',
  emptyText = 'No hay datos de pagos para este mes.',
}) => {
  if (!breakdown.length) {
    return (
      <IonCard className="dashboard-summary-card">
        <IonCardContent className="summary-card-content">
          <div className="summary-card-title">{title}</div>
          <p className="secondary-text">{emptyText}</p>
        </IonCardContent>
      </IonCard>
    );
  }

  return (
    <IonCard className="dashboard-summary-card">
      <IonCardContent className="summary-card-content">
        <div className="summary-card-title">{title}</div>
        <div className="cobros-list">
          {breakdown.map((entry) => (
            <div
              key={entry.method}
              className="cobros-row"
              style={{ '--cobros-color': entry.color, '--cobros-percent': `${entry.percent}%` } as React.CSSProperties}
            >
              <IonIcon icon={METHOD_ICONS[entry.method]} className="cobros-row-icon" />
              <span className="cobros-row-label">{entry.method}</span>
              <div className="cobros-row-bar-track">
                <div className="cobros-row-bar-fill" />
              </div>
              <span className="cobros-row-amount">{fmtMXN(entry.amount)}</span>
              <span className="cobros-row-percent">
                {entry.amount > 0 ? `${Math.round(entry.percent)}%` : '—'}
              </span>
              {entry.commission > 0 && (
                <div className="cobros-row-commission">
                  <span>Comisión terminal −{fmtMXN(entry.commission)}</span>
                  <span className="cobros-row-net">Neto {fmtMXN(entry.amount - entry.commission)}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </IonCardContent>
    </IonCard>
  );
};

export default PaymentBreakdown;

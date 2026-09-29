import React from 'react';
import { IonButton, IonIcon, IonItem, IonLabel, IonList, IonSpinner } from '@ionic/react';
import { receiptOutline, trashOutline } from 'ionicons/icons';
import { toHermosilloDate, fmtMXN } from '../../utils/format';
import './IncomeMovementList.css';

export interface IncomeMovement {
  incomeId: number;
  total: number;
  paymentMethod: string;
  paymentDate: string;
}

interface IncomeMovementListProps {
  incomes: IncomeMovement[];
  /** Tapping a row opens its ticket. */
  onOpenTicket: (incomeId: number) => void;
  /** incomeId whose ticket (or delete) is in flight — that row shows a spinner. */
  busyId: number | null;
  /** Optional per-row delete (/ingresos). */
  onDelete?: (incomeId: number) => void;
}

const dayLabel = (paymentDate: string) => {
  const raw = toHermosilloDate(paymentDate).toLocaleDateString('es-MX', {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC',
  });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
};

/**
 * Income movements grouped by day — the /dashboard "Actividad Reciente" and
 * /movements design (day header, round receipt badge, amount + time/method,
 * ticket icon). Shared by /movements and /ingresos.
 */
const IncomeMovementList: React.FC<IncomeMovementListProps> = ({ incomes, onOpenTicket, busyId, onDelete }) => {
  const groups = incomes.reduce((acc, income) => {
    const key = dayLabel(income.paymentDate);
    (acc[key] ??= []).push(income);
    return acc;
  }, {} as Record<string, IncomeMovement[]>);

  return (
    <div className="imv">
      {Object.entries(groups).map(([date, rows]) => (
        <div key={date}>
          <IonItem lines="none" className="imv-day">
            <IonLabel>
              <h2>{date}</h2>
              <p>{rows.length} movimiento{rows.length !== 1 ? 's' : ''}</p>
            </IonLabel>
          </IonItem>
          <IonList lines="none" className="imv-list">
            {rows.map(income => {
              const time = toHermosilloDate(income.paymentDate)
                .toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
              const busy = busyId === income.incomeId;
              return (
                <IonItem
                  key={income.incomeId}
                  button
                  detail={false}
                  disabled={busyId !== null && !busy}
                  className="imv-row"
                  onClick={() => onOpenTicket(income.incomeId)}
                >
                  <div slot="start" className="imv-badge">
                    <IonIcon icon={receiptOutline} />
                  </div>
                  <IonLabel>
                    <div className="imv-amount">Ingreso — {fmtMXN(Number(income.total) || 0)}</div>
                    <div className="imv-meta">{time} — {income.paymentMethod} · Ticket #{income.incomeId}</div>
                  </IonLabel>
                  {onDelete && (
                    <IonButton
                      slot="end"
                      fill="clear"
                      color="danger"
                      className="imv-delete"
                      aria-label={`Eliminar ingreso ${income.incomeId}`}
                      disabled={busy}
                      onClick={e => { e.stopPropagation(); onDelete(income.incomeId); }}
                    >
                      <IonIcon icon={trashOutline} slot="icon-only" />
                    </IonButton>
                  )}
                  <div slot="end" className="imv-ticket">
                    {busy ? <IonSpinner name="dots" /> : <IonIcon icon={receiptOutline} />}
                  </div>
                </IonItem>
              );
            })}
          </IonList>
        </div>
      ))}
    </div>
  );
};

export default IncomeMovementList;

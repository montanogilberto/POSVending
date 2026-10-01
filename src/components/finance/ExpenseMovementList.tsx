import React from 'react';
import { IonIcon, IonItem, IonLabel, IonList } from '@ionic/react';
import { peopleOutline, cubeOutline, receiptOutline, eyeOutline } from 'ionicons/icons';
import { toHermosilloDate, fmtMXN } from '../../utils/format';
import { EXPENSE_TYPE } from '../ui/statusMaps';
import './IncomeMovementList.css';
import './ExpenseMovementList.css';

export interface ExpenseMovement {
  expenseId: number;
  total: number;
  paymentMethod: string;
  paymentDate: string;
  expenseType?: string;
  /** Who was paid: employee (payroll) or supplier. */
  supplierName: string;
}

/** Badge icon per expense type — the type is what tells rows apart. */
const TYPE_ICON: Record<string, string> = {
  payroll: peopleOutline,
  inventory: cubeOutline,
  general: receiptOutline,
};

const dayLabel = (paymentDate: string) => {
  const raw = toHermosilloDate(paymentDate).toLocaleDateString('es-MX', {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC',
  });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
};

interface ExpenseMovementListProps<T extends ExpenseMovement> {
  expenses: T[];
  /** Tapping a row opens its detail. */
  onOpen: (expense: T) => void;
}

/**
 * Expenses grouped by day — same design as IncomeMovementList (/dashboard
 * "Actividad Reciente", /movements), so Ingresos and Egresos read alike.
 * Shared by the /egresos overview and /egresos/detalle.
 */
function ExpenseMovementList<T extends ExpenseMovement>({ expenses, onOpen }: ExpenseMovementListProps<T>) {
  const groups = expenses.reduce((acc, expense) => {
    const key = dayLabel(expense.paymentDate);
    (acc[key] ??= []).push(expense);
    return acc;
  }, {} as Record<string, T[]>);

  return (
    <div className="imv">
      {Object.entries(groups).map(([date, rows]) => (
        <div key={date}>
          <IonItem lines="none" className="imv-day">
            <IonLabel>
              <h2>{date}</h2>
              <p>{rows.length} egreso{rows.length !== 1 ? 's' : ''}</p>
            </IonLabel>
          </IonItem>
          <IonList lines="none" className="imv-list">
            {rows.map(expense => {
              const type = expense.expenseType ?? 'inventory';
              const typeLabel = EXPENSE_TYPE[type]?.label ?? 'Egreso';
              return (
                <IonItem
                  key={expense.expenseId}
                  button
                  detail={false}
                  className="imv-row"
                  onClick={() => onOpen(expense)}
                >
                  <div slot="start" className={`imv-badge emv-badge type-${type}`}>
                    <IonIcon icon={TYPE_ICON[type] ?? receiptOutline} />
                  </div>
                  <IonLabel>
                    <div className="imv-amount">{typeLabel} — {fmtMXN(Number(expense.total) || 0)}</div>
                    <div className="imv-meta emv-meta">{expense.supplierName} · {expense.paymentMethod}</div>
                  </IonLabel>
                  <div slot="end" className="imv-ticket">
                    <IonIcon icon={eyeOutline} />
                  </div>
                </IonItem>
              );
            })}
          </IonList>
        </div>
      ))}
    </div>
  );
}

export default ExpenseMovementList;

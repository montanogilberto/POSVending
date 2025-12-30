import React from 'react';
import {
  IonCard,
  IonCardHeader,
  IonCardSubtitle,
  IonCardContent,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
} from '@ionic/react';
import { Expense } from '../api/expensesApi';

interface ExpensesListProps {
  filteredExpenses: Expense[];
  displayedExpenses: Expense[];
  loadMoreExpenses: (event: CustomEvent<void>) => void;
  onExpenseClick?: (expenseId: number) => void;
}

const ExpensesList: React.FC<ExpensesListProps> = ({
  filteredExpenses,
  displayedExpenses,
  loadMoreExpenses,
  onExpenseClick,
}) => {
  return (
    <IonCard className="dashboard-card">
      <IonCardHeader>
        <IonCardSubtitle>Egresos ({filteredExpenses.length})</IonCardSubtitle>
      </IonCardHeader>
      <IonCardContent>
        {filteredExpenses.length === 0 ? (
          <div className="timeline-item secondary-text">
            ❌ No se encontraron egresos con los filtros aplicados.
          </div>
        ) : (
          <>
            <div className="timeline">
              {displayedExpenses.map((expense, i) => {
                const now = new Date(expense.paymentDate);
                // Parse date as UTC since database stores in UTC, then convert to Hermosillo timezone (UTC-7)
                const utcDate = new Date(expense.paymentDate + (expense.paymentDate.includes('Z') ? '' : 'Z'));
                const hermosilloDate = new Date(utcDate.getTime() - (7 * 60 * 60 * 1000));
                const time = hermosilloDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                const date = hermosilloDate.toLocaleDateString('es-ES');
                const status = 'Egreso';
                const icon = '💸';
                const color = 'danger';
                return (
                  <div 
                    key={i} 
                    className={`timeline-item ${color}`} 
                    onClick={() => onExpenseClick && onExpenseClick(expense.expenseId)}
                  >
                    <span className="timeline-icon">{icon}</span>
                    <div className="timeline-content">
                      <span>{status} — ${expense.total.toFixed(2)} ({expense.paymentMethod}, {date} {time})</span>
                      <br />
                      <small className="secondary-text">
                        Egreso ID: {expense.expenseId} • Empresa: {expense.companyId}
                      </small>
                    </div>
                    <span className="timeline-dot" style={{ backgroundColor: '#DC3545' }}></span>
                  </div>
                );
              })}
            </div>
            {displayedExpenses.length < filteredExpenses.length && (
              <IonInfiniteScroll onIonInfinite={loadMoreExpenses}>
                <IonInfiniteScrollContent loadingText="Cargando más egresos..."></IonInfiniteScrollContent>
              </IonInfiniteScroll>
            )}
          </>
        )}
      </IonCardContent>
    </IonCard>
  );
};

export default ExpensesList;

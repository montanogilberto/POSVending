import React from 'react';
import {
  IonCard,
  IonCardHeader,
  IonCardSubtitle,
  IonCardContent,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
} from '@ionic/react';

interface Income {
  incomeId: number;
  orderId: number;
  total: number;
  paymentMethod: string;
  paymentDate: string;
  userId: number;
  clientId: number;
  companyId: number;
}

interface IncomesListProps {
  filteredIncome: Income[];
  displayedIncome: Income[];
  loadMoreIncomes: (event: CustomEvent<void>) => void;
  handleShowReceipt: (incomeId: number) => void;
}

const IncomesList: React.FC<IncomesListProps> = ({
  filteredIncome,
  displayedIncome,
  loadMoreIncomes,
  handleShowReceipt,
}) => {
  return (
    <IonCard className="dashboard-card">
      <IonCardHeader>
        <IonCardSubtitle>Ingresos ({filteredIncome.length})</IonCardSubtitle>
      </IonCardHeader>
      <IonCardContent>
        {filteredIncome.length === 0 ? (
          <div className="timeline-item secondary-text">
            ❌ No se encontraron ingresos con los filtros aplicados.
          </div>
        ) : (
          <>
            <div className="timeline">
              {displayedIncome.map((income, i) => {
                const now = new Date(income.paymentDate);
                const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const date = now.toLocaleDateString('es-ES');
                const status = 'Ingreso';
                const icon = '💰';
                const color = 'success';
                return (
                  <div key={i} className={`timeline-item ${color}`} onClick={() => handleShowReceipt(income.incomeId)}>
                    <span className="timeline-icon">{icon}</span>
                    <div className="timeline-content">
                      <span>{status} — ${income.total.toFixed(2)} ({income.paymentMethod}, {date} {time})</span>
                    </div>
                    <span className="timeline-dot" style={{ backgroundColor: '#007BFF' }}></span>
                  </div>
                );
              })}
            </div>
            {displayedIncome.length < filteredIncome.length && (
              <IonInfiniteScroll onIonInfinite={loadMoreIncomes}>
                <IonInfiniteScrollContent loadingText="Cargando más ingresos..."></IonInfiniteScrollContent>
              </IonInfiniteScroll>
            )}
          </>
        )}
      </IonCardContent>
    </IonCard>
  );
};

export default IncomesList;

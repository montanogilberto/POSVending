import React from 'react';
import {
  IonCard,
  IonCardHeader,
  IonCardSubtitle,
  IonCardContent,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonButton,
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
  onIncomeAction?: (incomeId: number, action: number) => void;
}


const IncomesList: React.FC<IncomesListProps> = ({
  filteredIncome,
  displayedIncome,
  loadMoreIncomes,
  handleShowReceipt,
  onIncomeAction,
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
                // Parse date as UTC since database stores in UTC, then convert to Hermosillo timezone (UTC-7)
                const utcDate = new Date(income.paymentDate + (income.paymentDate.includes('Z') ? '' : 'Z'));
                const hermosilloDate = new Date(utcDate.getTime() - (7 * 60 * 60 * 1000));
                const time = hermosilloDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                const date = hermosilloDate.toLocaleDateString('es-ES');
                const status = 'Ingreso';
                const icon = '💰';
                const color = 'success';
                return (
                  <div key={i} className={`timeline-item ${color}`} onClick={() => handleShowReceipt(income.incomeId)}>
                    <span className="timeline-icon">{icon}</span>
                    <div className="timeline-content">
                      <span>{status} — ${income.total.toFixed(2)} ({income.paymentMethod}, {date} {time})</span>
                      <div className="secondary-text" style={{ marginTop: 4 }}>
                        Ingreso ID: {income.incomeId}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'flex-end' }}>
                      <IonButton
                        size="small"
                        fill="outline"
                        color="danger"
                        onClick={(e) => {
                          e.stopPropagation();
                          onIncomeAction?.(income.incomeId, 2); // action 2 = delete (per backend)
                        }}
                      >
                        Eliminar
                      </IonButton>
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

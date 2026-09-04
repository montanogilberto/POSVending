import React from 'react';
import { IonCard, IonCardContent, IonIcon, IonButton, IonText } from '@ionic/react';
import { cashOutline, trendingUpOutline } from 'ionicons/icons';
import { ExpensesVM } from '../ExpensesLogic';

interface Props {
  vm: ExpensesVM;
}

const ExpensesSummaryCard: React.FC<Props> = ({ vm }) => (
  <IonCard className="expenses-summary-card">
    <IonCardContent className="expenses-summary-content">
      <div className="expenses-summary-main">
        <IonText className="expenses-summary-title">
          <h1>Total de Egresos</h1>
        </IonText>
        <IonText className="expenses-summary-subtitle">
          <span>{vm.currentMonthYear} • Todos los usuarios</span>
        </IonText>
        <div className="expenses-summary-amount-row">
          <div className="expenses-summary-icon">
            <IonIcon icon={cashOutline} />
          </div>
          <IonText className="expenses-summary-amount">
            <h2>{vm.monthlyTotalFormatted}</h2>
          </IonText>
        </div>
      </div>

      <IonButton
        fill="outline"
        className="expenses-trends-button"
        disabled={!vm.trendsData}
        onClick={() => vm.setShowTrendsModal(true)}
      >
        <IonIcon slot="start" icon={trendingUpOutline} />
        Ver tendencias
      </IonButton>
    </IonCardContent>
  </IonCard>
);

export default ExpensesSummaryCard;

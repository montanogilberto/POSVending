import React from 'react';
import { IonCard, IonCardContent, IonIcon, IonButton, IonText } from '@ionic/react';
import { cashOutline, trendingUpOutline, receiptOutline } from 'ionicons/icons';
import ExpensesPeriodPicker from './ExpensesPeriodPicker';
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
        <ExpensesPeriodPicker vm={vm} suffix="Todos los usuarios" />
        <div className="expenses-summary-amount-row">
          <div className="expenses-summary-icon">
            <IonIcon icon={cashOutline} />
          </div>
          <IonText className="expenses-summary-amount">
            <h2>{vm.monthlyTotalFormatted}</h2>
          </IonText>
        </div>
        <div className="expenses-summary-count-row">
          <IonIcon icon={receiptOutline} />
          <span>{vm.monthlyCount} {vm.monthlyCount !== 1 ? 'operaciones' : 'operación'}</span>
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

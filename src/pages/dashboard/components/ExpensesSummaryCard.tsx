import React from 'react';
import { IonCard, IonCardContent, IonIcon, IonText } from '@ionic/react';
import { trendingDownOutline, calendarOutline } from 'ionicons/icons';
import { formatCurrencyWithSymbol } from '../../../utils/formatters';

interface ExpensesSummaryCardProps {
  monthlyTotal: number;
  currentMonthYear: string;
}

const ExpensesSummaryCard: React.FC<ExpensesSummaryCardProps> = ({
  monthlyTotal,
  currentMonthYear,
}) => {
  return (
    <IonCard className="dashboard-expense-card">
      <IonCardContent className="expense-card-content">
        <div className="expense-card-icon">
          <IonIcon icon={trendingDownOutline} />
        </div>

        <div className="expense-card-info">
          <IonText className="expense-card-label">
            <span>Egresos del Mes</span>
          </IonText>
          <IonText className="expense-card-amount">
            <h2>{formatCurrencyWithSymbol(monthlyTotal)}</h2>
          </IonText>
          <div className="expense-card-meta">
            <IonIcon icon={calendarOutline} />
            <span>{currentMonthYear}</span>
          </div>
        </div>
      </IonCardContent>
    </IonCard>
  );
};

export default ExpensesSummaryCard;

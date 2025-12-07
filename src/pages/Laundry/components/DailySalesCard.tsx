import React from 'react';
import {
  IonCard,
  IonCardHeader,
  IonCardSubtitle,
  IonCardContent,
  IonButton,
} from '@ionic/react';

interface DailySalesCardProps {
  dailySales: number;
  monthlySales: number;
}

const DailySalesCard: React.FC<DailySalesCardProps> = ({ dailySales, monthlySales }) => {
  return (
    <IonCard className="dashboard-daily-sales-card">
      <IonCardHeader>
        <div className="daily-sales-header">
          <IonCardSubtitle className="daily-sales-title">Ventas del Día</IonCardSubtitle>
          <span className="daily-sales-date">{new Date().toLocaleDateString('es-ES')}</span>
        </div>
      </IonCardHeader>
      <IonCardContent>
        <div className="daily-sales-amount">${dailySales.toFixed(2)}</div>
        <IonButton expand="full" className="start-sale-button">
          Iniciar Venta
        </IonButton>
      </IonCardContent>
    </IonCard>
  );
};

export default DailySalesCard;

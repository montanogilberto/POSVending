import React from 'react';
import {
  IonCard,
  IonCardHeader,
  IonCardSubtitle,
  IonCardContent,
  IonIcon,
} from '@ionic/react';
import { Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import {
  cashOutline,
  swapHorizontalOutline,
  cardOutline,
} from 'ionicons/icons';

ChartJS.register(ArcElement, Tooltip, Legend);

interface LaundryChartProps {
  pieData: any;
}

const LaundryChart: React.FC<LaundryChartProps> = ({ pieData }) => {
  if (!pieData) return null;

  const values: number[] = pieData.datasets[0].data;
  const total = values.reduce((sum: number, value: number) => sum + value, 0);

  // Si TOTAL = 0, mostramos mensaje
  if (total === 0) {
    return (
      <IonCard className="dashboard-card">
        <IonCardHeader>
          <IonCardSubtitle>Distribución de Pagos</IonCardSubtitle>
        </IonCardHeader>
        <IonCardContent>
          <p>No hay datos de pagos para este mes.</p>
        </IonCardContent>
      </IonCard>
    );
  }

  const legendItems = [
    { label: 'Efectivo', icon: cashOutline },
    { label: 'Transferencia', icon: swapHorizontalOutline },
    { label: 'Tarjeta', icon: cardOutline },
  ];

  const percentages = values.map((value: number) =>
    ((value / total) * 100).toFixed(0)
  );

  return (
    <IonCard className="dashboard-card">
      <IonCardHeader>
        <IonCardSubtitle>Distribución de Pagos</IonCardSubtitle>
      </IonCardHeader>
      <IonCardContent>
        <div className="chart-container">
          <Pie
            data={pieData}
            options={{
              plugins: { legend: { display: false } },
              maintainAspectRatio: false,
            }}
          />
          <div className="chart-labels">
            {pieData.labels.map((label: string, index: number) => {
              const percentage = percentages[index];
              const amount = values[index];
              const amountFormatted = amount.toLocaleString('es-MX', {
                style: 'currency',
                currency: 'MXN',
              });

              return (
                <div key={index} className="chart-label">
                  {label.toLowerCase()} — {percentage}% · {amountFormatted}
                </div>
              );
            })}
          </div>
        </div>

        <div className="chart-legend">
          {legendItems.map((item, index) => (
            <div key={index} className="legend-item">
              <IonIcon icon={item.icon} />
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </IonCardContent>
    </IonCard>
  );
};

export default LaundryChart;

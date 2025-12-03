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
import { cashOutline, swapHorizontalOutline, cardOutline } from 'ionicons/icons';

ChartJS.register(ArcElement, Tooltip, Legend);

interface LaundryChartProps {
  pieData: any;
}

const LaundryChart: React.FC<LaundryChartProps> = ({ pieData }) => {
  if (!pieData) return null;

  const total = pieData.datasets[0].data.reduce((sum: number, value: number) => sum + value, 0);
  const legendItems = [
    { label: 'Efectivo', color: '#FF1493', icon: cashOutline },
    { label: 'Transferencia', color: '#FF69B4', icon: swapHorizontalOutline },
    { label: 'Tarjeta', color: '#FFB6C1', icon: cardOutline },
  ];

  const percentages = pieData.datasets[0].data.map((value: number) => ((value / total) * 100).toFixed(0));

  return (
    <IonCard className="dashboard-card">
      <IonCardHeader>
        <IonCardSubtitle>Distribución de Pagos</IonCardSubtitle>
      </IonCardHeader>
      <IonCardContent>
        <div className="chart-container">
          <Pie data={pieData} />
          <div className="chart-labels">
            {pieData.labels.map((label: string, index: number) => {
              const percentage = percentages[index];
              const amount = pieData.datasets[0].data[index].toFixed(2);
              return (
                <div key={index} className="chart-label">
                  {label} — {percentage}% · ${amount}
                </div>
              );
            })}
          </div>
        </div>
        <div className="chart-legend">
          {legendItems.map((item, index) => (
            <div key={index} className="legend-item">
              <IonIcon icon={item.icon} style={{ color: item.color }} />
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </IonCardContent>
    </IonCard>
  );
};

export default LaundryChart;

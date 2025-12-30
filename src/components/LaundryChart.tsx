import React from 'react';
import {
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonGrid,
  IonRow,
  IonCol,
  IonList,
  IonItem,
  IonIcon,
  IonLabel,
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
import { formatCurrencyWithSymbol } from '../utils/formatters';

ChartJS.register(ArcElement, Tooltip, Legend);

interface PieDataset {
  data: number[];
  backgroundColor?: string[];
}

interface PieData {
  labels: string[];
  datasets: PieDataset[];
}

interface LaundryChartProps {
  pieData: PieData | null;
}

const LaundryChart: React.FC<LaundryChartProps> = ({ pieData }) => {
  if (!pieData) return null;

  const values: number[] = pieData.datasets[0]?.data ?? [];
  const colors: string[] = (pieData.datasets[0]?.backgroundColor as string[]) || [];

  const total = values.reduce((sum: number, value: number) => sum + value, 0);

  // Si TOTAL = 0, mostramos mensaje
  if (total === 0) {
    return (
      <IonCard className="dashboard-card">
        <IonCardHeader>
          <IonCardTitle>Distribución de Pagos</IonCardTitle>
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
        <IonCardTitle>Distribución de Pagos</IonCardTitle>
      </IonCardHeader>
      <IonCardContent>
        <IonGrid>
          <IonRow>
            {/* Gráfica Pie */}
            <IonCol size="12" size-md="7">
              <div className="chart-container">
                <div className="chart-pie">
                  <Pie
                    data={pieData}
                    options={{
                      plugins: { legend: { display: false } },
                      maintainAspectRatio: false,
                    }}
                  />
                </div>
              </div>
            </IonCol>

            {/* Leyenda con iconos + montos + porcentaje */}
            <IonCol size="12" size-md="5">
              <IonList className="chart-legend-list">
                {legendItems.map((item, index) => {
                  const value = values[index] ?? 0;
                  const percentage = percentages[index] ?? '0';
                  const color = colors[index] || '#999'; // color de respaldo

                  return (
                    <IonItem key={item.label} lines="none">
                      <IonIcon
                        slot="start"
                        icon={item.icon}
                        style={{ color, fontSize: '22px' }}
                      />
                      <IonLabel>
                        <h3>{item.label}</h3>
                        <p>
                          {formatCurrencyWithSymbol(value)} • {percentage}%
                        </p>
                      </IonLabel>
                    </IonItem>
                  );
                })}
              </IonList>
            </IonCol>
          </IonRow>
        </IonGrid>
      </IonCardContent>
    </IonCard>
  );
};

export default LaundryChart;

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
  // 🔒 Step 1: Validate pieData
  if (!pieData) return null;

  // 🔒 Step 2: Safely get dataset
  const dataset = pieData.datasets?.[0];

  // 🔒 Step 3: Validate dataset structure
  if (!dataset || !dataset.data || dataset.data.length === 0) {
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

  const values: number[] = dataset.data;
  const colors: string[] = dataset.backgroundColor || [];

  // 🔒 Step 4: Calculate total safely
  const total = values.reduce((sum, value) => sum + (Number(value) || 0), 0);

  // 🔒 Step 5: Prevent division by zero / invalid chart
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

  // 🔒 Step 6: Safe percentage calculation
  const percentages = values.map((value: number) =>
    total > 0 ? ((value / total) * 100).toFixed(0) : '0'
  );

  return (
    <IonCard className="dashboard-card">
      <IonCardHeader>
        <IonCardTitle>Distribución de Pagos</IonCardTitle>
      </IonCardHeader>
      <IonCardContent>
        <IonGrid>
          <IonRow>
            {/* 📊 Pie Chart */}
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

            {/* 📋 Legend */}
            <IonCol size="12" size-md="5">
              <IonList className="chart-legend-list">
                {legendItems.map((item, index) => {
                  const value = values[index] ?? 0;
                  const percentage = percentages[index] ?? '0';
                  const color = colors[index] || '#999';

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
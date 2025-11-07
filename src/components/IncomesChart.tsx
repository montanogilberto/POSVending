import React from 'react';
import {
  IonCard,
  IonCardHeader,
  IonCardSubtitle,
  IonCardContent,
} from '@ionic/react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface IncomesChartProps {
  chartData: any;
}

const IncomesChart: React.FC<IncomesChartProps> = ({ chartData }) => {
  if (!chartData) return null;

  return (
    <IonCard className="dashboard-card">
      <IonCardHeader>
        <IonCardSubtitle>Gráfico de Ingresos Diarios</IonCardSubtitle>
      </IonCardHeader>
      <IonCardContent>
        <Line data={chartData} />
      </IonCardContent>
    </IonCard>
  );
};

export default IncomesChart;

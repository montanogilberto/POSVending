import React, { useMemo } from 'react';
import { IonCard, IonCardContent } from '@ionic/react';
import { Chart } from 'react-chartjs-2';
import {
  Chart as ChartJS, BarController, BarElement, CategoryScale, ChartData, ChartOptions, Legend,
  LinearScale, LineController, LineElement, PointElement, Tooltip,
} from 'chart.js';
import { fmtMXN } from '../../../../utils/format';
import { periodLabel, periodShortLabel } from '../../../../utils/monthPeriod';
import type { AnnualMonth } from '../annualSummaryTotals';

ChartJS.register(BarController, BarElement, LineController, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend);

// Checked for color blindness together; the app's green/red pair is not distinguishable.
const INCOME_COLOR = '#0D9488';
const EXPENSES_COLOR = '#DC2626';
const PROFIT_COLOR = '#2563EB';
const INK = '#374151';
const SURFACE = '#FFFFFF';

const AnnualChart: React.FC<{ months: AnnualMonth[] }> = ({ months }) => {
  const data = useMemo<ChartData<'bar' | 'line', number[], string>>(() => ({
    labels: months.map((m) => periodShortLabel(m.period)),
    datasets: [
      {
        type: 'line', label: 'Utilidad', data: months.map((m) => m.profit),
        borderColor: PROFIT_COLOR, backgroundColor: PROFIT_COLOR, borderWidth: 2,
        pointRadius: 4, pointHoverRadius: 6, pointBorderColor: SURFACE, pointBorderWidth: 2, order: 0,
      },
      {
        type: 'bar', label: 'Ingresos', data: months.map((m) => m.income), backgroundColor: INCOME_COLOR,
        borderColor: SURFACE, borderWidth: { left: 1, right: 1, top: 0, bottom: 0 }, borderRadius: 4, maxBarThickness: 24, order: 1,
      },
      {
        type: 'bar', label: 'Egresos', data: months.map((m) => m.expenses), backgroundColor: EXPENSES_COLOR,
        borderColor: SURFACE, borderWidth: { left: 1, right: 1, top: 0, bottom: 0 }, borderRadius: 4, maxBarThickness: 24, order: 2,
      },
    ],
  }), [months]);

  const options = useMemo<ChartOptions<'bar' | 'line'>>(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { position: 'top', align: 'start', labels: { color: INK, usePointStyle: true } },
      tooltip: {
        callbacks: {
          title: ([item]) => (item ? periodLabel(months[item.dataIndex].period) : ''),
          label: (item) => `${item.dataset.label}: ${fmtMXN(Number(item.raw))}`,
        },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: INK } },
      y: {
        beginAtZero: true,
        grid: { color: '#F3F4F6' },
        border: { display: false },
        ticks: { color: INK, callback: (v) => `$${Number(v).toLocaleString('es-MX')}` },
      },
    },
  }), [months]);

  return (
    <IonCard className="dashboard-summary-card">
      <IonCardContent className="summary-card-content">
        <div className="summary-card-title">INGRESOS, EGRESOS Y UTILIDAD POR MES</div>
        <div className="annual-chart">
          <Chart type="bar" data={data} options={options} aria-label="Ingresos, egresos y utilidad por mes" />
        </div>
      </IonCardContent>
    </IonCard>
  );
};

export default AnnualChart;

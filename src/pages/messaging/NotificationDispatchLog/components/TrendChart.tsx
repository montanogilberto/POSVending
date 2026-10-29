import React from 'react';
import { IonCard, IonCardContent, IonSegment, IonSegmentButton } from '@ionic/react';
import { Bar } from 'react-chartjs-2';
import { BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, Tooltip, TooltipItem } from 'chart.js';
import { fmtInt } from '../../../../utils/format';
import { GRANULARITY_LABELS } from '../NotificationDispatchLogConstants';
import type { TrendGranularity } from '../NotificationDispatchLogTypes';
import type { NotificationDispatchLogVM } from '../NotificationDispatchLogLogic';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

// The series are delivery states, so they wear the reserved status colors (dataviz
// palette: good / warning / critical), with a legend so color never stands alone.
const DELIVERED = '#0ca30c';
const AWAITING = '#fab219';
const FAILED = '#d03b3b';

/** Resumen · messages per hour/day/week, stacked by final state (bar height = total). */
const TrendChart: React.FC<{ vm: NotificationDispatchLogVM }> = ({ vm }) => {
  const { trend } = vm;
  const bar = { borderRadius: 4, borderSkipped: 'start' as const, maxBarThickness: 22, borderColor: '#fcfcfb', borderWidth: { top: 2 } };
  const data = {
    labels: trend.map(p => p.label),
    datasets: [
      { label: 'Entregados', data: trend.map(p => p.delivered), backgroundColor: DELIVERED, ...bar },
      { label: 'Pendientes', data: trend.map(p => p.awaiting), backgroundColor: AWAITING, ...bar },
      { label: 'Fallidos', data: trend.map(p => p.failed), backgroundColor: FAILED, ...bar },
    ],
  };
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend: { position: 'top' as const, align: 'start' as const, labels: { boxWidth: 12, color: '#374151' } },
      tooltip: {
        callbacks: {
          label: (c: TooltipItem<'bar'>) => `${c.dataset.label}: ${fmtInt(c.parsed.y ?? 0)}`,
          footer: (items: TooltipItem<'bar'>[]) => `Total: ${fmtInt(trend[items[0]?.dataIndex ?? 0]?.total ?? 0)}`,
        },
      },
    },
    scales: {
      x: { stacked: true, grid: { display: false }, ticks: { color: '#6b7280', maxRotation: 0, autoSkip: true } },
      y: { stacked: true, beginAtZero: true, grid: { color: '#eef0f3' }, ticks: { color: '#6b7280', precision: 0 } },
    },
  };
  const total = trend.reduce((n, p) => n + p.total, 0);

  return (
    <IonCard className="ndl-trend">
      <IonCardContent>
        <div className="ndl-trend-head">
          <h3 className="ndl-section-title">Actividad de notificaciones</h3>
          <IonSegment className="ndl-trend-granularity" value={vm.granularity}
            onIonChange={e => e.detail.value && vm.setGranularity(e.detail.value as TrendGranularity)}>
            {Object.entries(GRANULARITY_LABELS).map(([k, label]) => (
              <IonSegmentButton key={k} value={k}>{label}</IonSegmentButton>
            ))}
          </IonSegment>
        </div>
        {total === 0
          ? <p className="ndl-trend-empty">Sin mensajes en este periodo.</p>
          : (
            <div className="ndl-trend-canvas" role="img"
              aria-label={`Mensajes por ${GRANULARITY_LABELS[vm.granularity].toLowerCase()}: ${fmtInt(total)} en total`}>
              <Bar data={data} options={options} />
            </div>
          )}
      </IonCardContent>
    </IonCard>
  );
};

export default TrendChart;

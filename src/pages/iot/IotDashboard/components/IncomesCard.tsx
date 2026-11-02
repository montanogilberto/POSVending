import React from 'react';
import {
  IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonItem, IonLabel, IonList, IonNote,
} from '@ionic/react';
import { cashOutline } from 'ionicons/icons';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, TooltipItem } from 'chart.js';
import EmptyState from '../../../../components/ui/EmptyState';
import StatusBadge from '../../../../components/ui/StatusBadge';
import { LAUNDRY_USE_STATUS } from '../../../../components/ui/statusMaps';
import { fmtInt, fmtMXN, hermosilloTime, mxDate, percent } from '../../../../utils/format';
import { INCOME_COLOR, INCOME_DAYS } from '../IotDashboardConstants';
import { IotDashboardVM } from '../IotDashboardLogic';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

interface Props { vm: IotDashboardVM }

/** Ingresos de las máquinas (usos cobrados del monedero): por día, por máquina y últimos cobros. */
const IncomesCard: React.FC<Props> = ({ vm }) => {
  const { daily, byDevice, recentUses, kpis, incomesTruncated } = vm;

  const chartData = {
    labels: daily.map(d => d.day.slice(8) + '/' + d.day.slice(5, 7)),
    datasets: [{
      label: 'Ingresos',
      data: daily.map(d => d.total),
      backgroundColor: INCOME_COLOR,
      borderRadius: 4,
      borderSkipped: 'start' as const,
      maxBarThickness: 22,
    }],
  };
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (c: TooltipItem<'bar'>) =>
        `${fmtMXN(c.parsed.y ?? 0)} · ${fmtInt(daily[c.dataIndex]?.uses ?? 0)} usos` } },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#6b7280', maxRotation: 0, autoSkip: true } },
      y: { beginAtZero: true, grid: { color: '#eef0f3' },
        ticks: { color: '#6b7280', callback: (v: string | number) => fmtMXN(Number(v)) } },
    },
  };

  return (
    <IonCard className="iot-card">
      <IonCardHeader>
        <IonCardTitle>Ingresos · últimos {INCOME_DAYS} días</IonCardTitle>
      </IonCardHeader>
      <IonCardContent>
        {kpis.usesPeriod === 0 ? (
          <EmptyState icon={cashOutline} text={`Sin usos cobrados en los últimos ${INCOME_DAYS} días.`} />
        ) : (
          <>
            <div className="iot-chart">
              <Bar data={chartData} options={chartOptions} aria-label="Ingresos por día" />
            </div>
            {incomesTruncated && (
              <p className="iot-hint">Se muestran los últimos 500 usos; los días más antiguos pueden estar incompletos.</p>
            )}

            <h4 className="iot-subtitle">Por máquina</h4>
            <IonList lines="full">
              {byDevice.map(d => (
                <IonItem key={d.deviceId}>
                  <IonLabel>
                    <h3>{d.name}</h3>
                    <p>{fmtInt(d.uses)} usos · {percent(d.total, kpis.incomePeriod)}% del total</p>
                  </IonLabel>
                  <IonNote slot="end" className="iot-amount">{fmtMXN(d.total)}</IonNote>
                </IonItem>
              ))}
            </IonList>
          </>
        )}

        {recentUses.length > 0 && (
          <>
            <h4 className="iot-subtitle">Últimos usos</h4>
            <IonList lines="full">
              {recentUses.map(u => (
                <IonItem key={u.useId}>
                  <IonLabel>
                    <h3>{u.deviceName} · {u.choiceName ?? 'Ciclo'}</h3>
                    <p>Cliente #{u.clientId} · {mxDate(u.created_At)} {hermosilloTime(u.created_At)}</p>
                  </IonLabel>
                  <div slot="end" className="iot-device-end">
                    <span className="iot-amount">{fmtMXN(Number(u.amountMXN || 0))}</span>
                    <StatusBadge status={u.status} map={LAUNDRY_USE_STATUS} />
                  </div>
                </IonItem>
              ))}
            </IonList>
          </>
        )}
      </IonCardContent>
    </IonCard>
  );
};

export default IncomesCard;

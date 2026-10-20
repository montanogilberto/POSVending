import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  IonButton, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonCol, IonContent, IonGrid, IonIcon,
  IonPage, IonRow, IonSpinner, useIonViewWillEnter,
} from '@ionic/react';
import {
  alertCircleOutline, calendarOutline, cashOutline, chatbubblesOutline, informationCircleOutline,
  logoWhatsapp, peopleOutline, personOutline, refreshOutline, timerOutline,
} from 'ionicons/icons';
import { Bar } from 'react-chartjs-2';
import { BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, Tooltip } from 'chart.js';
import Header from '../../components/layout/Header';
import AlertPopover from '../../components/popovers/AlertPopover';
import MailPopover from '../../components/popovers/MailPopover';
import EmptyState from '../../components/ui/EmptyState';
import PeriodSegment from '../../components/ui/PeriodSegment';
import { useUser } from '../../contexts/UserContext';
import { usePopovers } from '../../hooks/usePopovers';
import { fmtInt as fmt, fmtMXN, percent } from '../../utils/format';
import { hermosilloDayKey, monthToDate, type CustomRange, type PeriodFilter } from '../../utils/period';
import { whatsappAgentApi, type WhatsAppAgentDashboard } from '../../api/whatsappAgentApi';
import './WhatsAppAgentPage.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

// Same two-series colors as RewardsOverview (validated palette).
const MESSAGES = '#2563eb';
const BOOKINGS = '#d97706';

/** Inclusive Hermosillo days for a period of the shared PeriodSegment. */
function periodRange(period: PeriodFilter, custom: CustomRange): { start: string; end: string } {
  const today = hermosilloDayKey(new Date().toISOString());
  if (period === 'custom') {
    const [start, end] = custom.from <= custom.to ? [custom.from, custom.to] : [custom.to, custom.from];
    return { start, end };
  }
  if (period === 'today') return { start: today, end: today };
  if (period === 'month') return { start: `${today.slice(0, 8)}01`, end: today };
  const d = new Date(`${today}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 6);
  return { start: d.toISOString().slice(0, 10), end: today };
}

/** 'YYYY-MM-DD' → '20/10/2026'. */
const dayLabel = (day: string) => day.split('-').reverse().join('/');
const seconds = (ms: number | null) => (ms == null ? '—' : `${(ms / 1000).toFixed(1)} s`);

/** /whatsapp-agent — what the WhatsApp agent did and what came after (POST /whatsapp/agentDashboard). */
const WhatsAppAgentPage: React.FC = () => {
  const { companyId } = useUser();
  const pops = usePopovers();
  const [period, setPeriod] = useState<PeriodFilter>('month');
  const [customRange, setCustomRange] = useState<CustomRange>(monthToDate());
  const [data, setData] = useState<WhatsAppAgentDashboard | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!companyId) return;
    const range = periodRange(period, customRange);
    setLoading(true);
    setError(null);
    try {
      setData(await whatsappAgentApi.getDashboard(companyId, range.start, range.end));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [companyId, period, customRange]);

  useIonViewWillEnter(() => { load(); });
  // A new period reloads; the first render is covered by useIonViewWillEnter.
  const periodLoaded = useRef(false);
  useEffect(() => {
    if (!periodLoaded.current) { periodLoaded.current = true; return; }
    load();
  }, [load]);

  const periodBar = (
    <div className="wa-agent-toolbar">
      <PeriodSegment idPrefix="wa-agent" value={period} onChange={setPeriod}
        custom={customRange} onCustomChange={setCustomRange} />
      <IonButton fill="clear" size="small" onClick={load} aria-label="Actualizar">
        <IonIcon icon={refreshOutline} slot="icon-only" />
      </IonButton>
    </div>
  );

  let body: React.ReactNode;
  if (loading && !data) {
    body = <div className="wa-agent-loading"><IonSpinner name="dots" /></div>;
  } else if (error || !data) {
    body = <EmptyState icon={alertCircleOutline} text="No se pudo cargar el resumen del agente de WhatsApp." />;
  } else {
    body = <Dashboard d={data} />;
  }

  return (
    <IonPage>
      <Header
        {...pops.headerProps}
        screenTitle="Agente WhatsApp"
        showBackButton={true}
        backButtonText="Menú"
        backButtonHref="/dashboard"
      />
      <AlertPopover {...pops.alertPopoverProps} />
      <MailPopover {...pops.mailPopoverProps} />
      <IonContent fullscreen className="wa-agent-page">
        <div className="wa-agent-container">
          {periodBar}
          {body}
        </div>
      </IonContent>
    </IonPage>
  );
};

const Dashboard: React.FC<{ d: WhatsAppAgentDashboard }> = ({ d }) => {
  const k = d.kpis;
  const since = d.dataSince.agentCalls;

  // Recording started with the 2026-10-20 backend update: say so instead of
  // showing zeros as if nobody had written.
  const sinceNote = !since
    ? 'Todavía no hay conversaciones registradas. El registro empezó con la actualización del 20/10/2026.'
    : since > d.period.startDate
      ? `Hay datos desde el ${dayLabel(since)}; los días anteriores del periodo no se pueden medir.`
      : null;

  const kpis = [
    { icon: peopleOutline, label: 'Clientes que escribieron', value: fmt(k.customers) },
    { icon: chatbubblesOutline, label: 'Mensajes respondidos', value: fmt(k.messagesAnswered),
      note: k.failedCalls > 0 ? `${fmt(k.failedCalls)} sin responder (${k.failureRatePct ?? 0}%)` : 'Sin fallas' },
    { icon: timerOutline, label: 'Tiempo de respuesta', value: seconds(k.avgLatencyMs),
      note: k.p95LatencyMs != null ? `95% en menos de ${seconds(k.p95LatencyMs)}` : undefined },
    { icon: personOutline, label: 'Pasados a una persona', value: fmt(k.handoffs),
      note: k.customers > 0 ? `${percent(k.handoffs, k.customers)}% de los clientes` : undefined },
    { icon: calendarOutline, label: 'Reservaciones por WhatsApp', value: fmt(k.bookings),
      note: k.bookingsCancelled > 0 ? `${fmt(k.bookingsCancelled)} canceladas` : `${fmt(k.proposals)} propuestas` },
    { icon: cashOutline, label: 'Compraron después', value: fmt(k.customersWhoBought),
      note: `${fmtMXN(k.salesAfterChat)} en ventas · ${k.attributionDays} días tras su primer mensaje` },
  ];

  const f = d.funnel;
  const steps = [
    { label: 'Escribieron', value: f.customers },
    { label: 'Recibieron propuesta de cita', value: f.gotProposal },
    { label: 'Reservaron', value: f.booked },
    { label: 'Compraron después', value: f.bought },
  ];

  const chartData = {
    labels: d.daily.map(r => r.date.slice(5).split('-').reverse().join('/')),
    datasets: [
      { label: 'Mensajes', data: d.daily.map(r => r.messages), backgroundColor: MESSAGES,
        borderRadius: 4, borderSkipped: 'start' as const, maxBarThickness: 18 },
      { label: 'Reservaciones', data: d.daily.map(r => r.bookings), backgroundColor: BOOKINGS,
        borderRadius: 4, borderSkipped: 'start' as const, maxBarThickness: 18 },
    ],
  };
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: { legend: { position: 'top' as const, align: 'start' as const, labels: { boxWidth: 12, color: '#374151' } } },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#6b7280', maxRotation: 0, autoSkip: true } },
      y: { beginAtZero: true, grid: { color: '#eef0f3' }, ticks: { color: '#6b7280', precision: 0 } },
    },
  };

  return (
    <>
      <p className="wa-agent-muted">{dayLabel(d.period.startDate)} – {dayLabel(d.period.endDate)}</p>
      {sinceNote && (
        <IonCard className="wa-agent-card wa-agent-note">
          <IonCardContent><IonIcon icon={informationCircleOutline} aria-hidden="true" /> {sinceNote}</IonCardContent>
        </IonCard>
      )}

      <IonGrid className="wa-agent-kpi-grid">
        <IonRow>
          {kpis.map(t => (
            <IonCol size="6" sizeMd="4" key={t.label}>
              <IonCard className="wa-agent-kpi-card">
                <IonCardContent>
                  <IonIcon icon={t.icon} className="wa-agent-kpi-icon" aria-hidden="true" />
                  <p className="wa-agent-muted">{t.label}</p>
                  <h2 className="wa-agent-kpi-value">{t.value}</h2>
                  {t.note && <p className="wa-agent-muted">{t.note}</p>}
                </IonCardContent>
              </IonCard>
            </IonCol>
          ))}
        </IonRow>
      </IonGrid>

      <IonCard className="wa-agent-card">
        <IonCardHeader><IonCardTitle>De la conversación a la venta</IonCardTitle></IonCardHeader>
        <IonCardContent>
          {f.customers === 0 ? (
            <EmptyState icon={logoWhatsapp} text="Ningún cliente escribió en el periodo." />
          ) : (
            <>
              {steps.map(s => (
                <div className="wa-agent-funnel-row" key={s.label}>
                  <span className="wa-agent-funnel-label">{s.label}</span>
                  <div className="wa-agent-funnel-track">
                    <div className="wa-agent-funnel-bar" style={{ width: `${Math.max(percent(s.value, f.customers), 2)}%` }} />
                  </div>
                  <span className="wa-agent-funnel-value">{fmt(s.value)} · {percent(s.value, f.customers)}%</span>
                </div>
              ))}
              <p className="wa-agent-muted">
                "Compraron después" cuenta ventas dentro de {k.attributionDays} días tras su primer mensaje:
                ocurrieron después de la conversación, no necesariamente por ella.
              </p>
            </>
          )}
        </IonCardContent>
      </IonCard>

      <IonCard className="wa-agent-card">
        <IonCardHeader><IonCardTitle>Actividad por día</IonCardTitle></IonCardHeader>
        <IonCardContent>
          {d.daily.length === 0 ? (
            <EmptyState icon={chatbubblesOutline} text="Sin actividad en el periodo." />
          ) : (
            <div className="wa-agent-chart">
              <Bar data={chartData} options={chartOptions} aria-label="Mensajes y reservaciones por día" />
            </div>
          )}
        </IonCardContent>
      </IonCard>
    </>
  );
};

export default WhatsAppAgentPage;

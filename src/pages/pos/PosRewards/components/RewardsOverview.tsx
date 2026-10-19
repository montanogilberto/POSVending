import React from 'react';
import {
  IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonGrid, IonRow, IonCol, IonIcon,
  IonList, IonItem, IonLabel, IonNote, IonBadge, IonButton,
} from '@ionic/react';
import {
  starOutline, giftOutline, walletOutline, peopleOutline, personOutline, trophyOutline,
  pricetagOutline, cashOutline, refreshOutline, warningOutline, ribbonOutline,
} from 'ionicons/icons';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend, TooltipItem } from 'chart.js';
import EmptyState from '../../../../components/ui/EmptyState';
import PeriodSegment from '../../../../components/ui/PeriodSegment';
import { fmtInt as fmt, mxDate as toDate } from '../../../../utils/format';
import { PosRewardsVM } from '../PosRewardsLogic';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

// Two series, fixed order, validated (dataviz validate_palette.js, light: all checks pass).
const EARNED = '#2563eb';
const REDEEMED = '#d97706';

const money = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(n) || 0);

interface Props {
  vm: PosRewardsVM;
}

/** Puntos POS › Resumen: everything about rewards for the chosen period
 *  (POST /posRewards/dashboard). */
const RewardsOverview: React.FC<Props> = ({ vm }) => {
  const { dashboard: d, period, setPeriod, customRange, setCustomRange, reload } = vm;

  const periodBar = (
    <div className="pr-card-header-row" style={{ padding: '0 8px' }}>
      <PeriodSegment idPrefix="pos-rewards" value={period} onChange={setPeriod}
        custom={customRange} onCustomChange={setCustomRange} />
      <IonButton fill="clear" size="small" onClick={reload} aria-label="Actualizar">
        <IonIcon icon={refreshOutline} slot="icon-only" />
      </IonButton>
    </div>
  );

  if (!d) {
    return (
      <>
        {periodBar}
        <EmptyState icon={trophyOutline} text="No se pudo cargar el resumen de recompensas." />
      </>
    );
  }

  const k = d.kpis;
  const kpis = [
    { icon: starOutline,     label: 'Puntos ganados',     value: fmt(k.pointsEarned) },
    { icon: giftOutline,     label: 'Puntos canjeados',   value: fmt(k.pointsRedeemed) },
    { icon: walletOutline,   label: 'Saldo por canjear',
      value: k.outstandingValueMxn != null ? money(k.outstandingValueMxn) : `${fmt(k.outstandingPoints)} pts`,
      note: k.earnPct != null ? `${fmt(k.outstandingPoints)} pts · 1 pt = $1` : undefined },
    { icon: peopleOutline,   label: 'Clientes con saldo', value: fmt(k.clientsWithBalance) },
    { icon: personOutline,   label: 'Clientes que ganaron', value: fmt(k.activeClients) },
    { icon: trophyOutline,   label: 'Recompensas canjeadas', value: fmt(k.redemptions) },
    { icon: pricetagOutline, label: 'Usos de cupón',      value: fmt(k.couponUses) },
    { icon: cashOutline,     label: 'Descuento otorgado', value: money(k.discountGiven),
      note: `${fmt(k.sales)} ventas en el periodo` },
  ];

  const chartData = {
    labels: d.daily.map(r => r.date.slice(5).replace('-', '/')),
    datasets: [
      { label: 'Ganados', data: d.daily.map(r => r.earned), backgroundColor: EARNED,
        borderRadius: 4, borderSkipped: 'start' as const, maxBarThickness: 18 },
      { label: 'Canjeados', data: d.daily.map(r => r.redeemed), backgroundColor: REDEEMED,
        borderRadius: 4, borderSkipped: 'start' as const, maxBarThickness: 18 },
    ],
  };
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend: { position: 'top' as const, align: 'start' as const, labels: { boxWidth: 12, color: '#374151' } },
      tooltip: { callbacks: { label: (c: TooltipItem<'bar'>) =>
        `${c.dataset.label}: ${fmt(c.parsed.y ?? 0)} pts` } },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#6b7280', maxRotation: 0, autoSkip: true } },
      y: { beginAtZero: true, grid: { color: '#eef0f3' }, ticks: { color: '#6b7280' } },
    },
  };

  const sl = d.smartLoans;
  const doubleEarning = !!sl && (sl.purchaseRuleActive || sl.pointsEarned > 0);

  return (
    <>
      {periodBar}
      <p className="pr-kpi-label" style={{ padding: '0 16px' }}>
        {toDate(d.period.startDate)} – {toDate(d.period.endDate)}
      </p>

      {doubleEarning && (
        <IonCard className="pr-card" color="warning">
          <IonCardContent>
            <IonIcon icon={warningOutline} /> <strong>Las ventas también suman puntos SmartLoans</strong> (Recompensas,
            /rewards): {fmt(sl!.pointsEarned)} pts a {fmt(sl!.clients)} clientes en el periodo
            {sl!.purchaseRuleActive ? ' — la regla "purchase" está activa.' : '.'} Son un saldo aparte que no se
            muestra en el ticket ni se canjea aquí.
          </IonCardContent>
        </IonCard>
      )}

      <IonGrid className="pr-kpi-grid">
        <IonRow>
          {kpis.map(t => (
            <IonCol size="6" sizeMd="3" key={t.label}>
              <IonCard className="pr-kpi-card">
                <IonCardContent>
                  <IonIcon icon={t.icon} style={{ color: '#6b7280', fontSize: '1.4rem' }} aria-hidden="true" />
                  <p className="pr-kpi-label">{t.label}</p>
                  <h2 className="pr-kpi-value">{t.value}</h2>
                  {t.note && <p className="pr-kpi-label">{t.note}</p>}
                </IonCardContent>
              </IonCard>
            </IonCol>
          ))}
        </IonRow>
      </IonGrid>

      <IonCard className="pr-card">
        <IonCardHeader><IonCardTitle>Puntos por día</IonCardTitle></IonCardHeader>
        <IonCardContent>
          {d.daily.length === 0 ? (
            <EmptyState icon={starOutline} text="Sin movimientos de puntos en el periodo." />
          ) : (
            <div style={{ height: 220 }}>
              <Bar data={chartData} options={chartOptions} aria-label="Puntos ganados y canjeados por día" />
            </div>
          )}
        </IonCardContent>
      </IonCard>

      <IonCard className="pr-card">
        <IonCardHeader><IonCardTitle>Tarjetas de sellos</IonCardTitle></IonCardHeader>
        <IonCardContent>
          {d.stampCards.length === 0 ? (
            <EmptyState icon={ribbonOutline} text="Sin tarjetas de sellos activas." />
          ) : d.stampCards.map(card => (
            <div key={card.catalogItemId} style={{ marginBottom: 16 }}>
              <h3 style={{ margin: '0 0 4px' }}>{card.name}</h3>
              <p className="pr-kpi-label">
                {fmt(card.requiredUnits)} compras = 1 gratis · <strong>{fmt(card.ready)}</strong> listos para canjear ·{' '}
                <strong>{fmt(card.oneAway)}</strong> a 1 compra · {fmt(card.inProgress)} en progreso
              </p>
              {card.closest.length > 0 && (
                <IonList lines="none">
                  {card.closest.map(c => (
                    <IonItem key={c.clientId} className="pr-leaderboard-item">
                      <IonLabel>{c.name || `Cliente #${c.clientId}`}</IonLabel>
                      <IonBadge slot="end" color={c.unitsAvailable >= c.requiredUnits ? 'success' : 'medium'}>
                        {c.unitsAvailable >= c.requiredUnits ? 'Gratis listo' : `${fmt(c.unitsAvailable)} de ${fmt(c.requiredUnits)}`}
                      </IonBadge>
                    </IonItem>
                  ))}
                </IonList>
              )}
            </div>
          ))}
        </IonCardContent>
      </IonCard>

      <IonCard className="pr-card">
        <IonCardHeader><IonCardTitle>Recompensas canjeadas</IonCardTitle></IonCardHeader>
        <IonCardContent>
          {d.rewards.length === 0 ? (
            <EmptyState icon={giftOutline} text="Sin recompensas en el catálogo." />
          ) : (
            <IonList lines="none">
              {d.rewards.map(r => (
                <IonItem key={r.catalogItemId} className="pr-catalog-item">
                  <IonLabel>
                    <h3>{r.name}{!r.isActive && ' (inactiva)'}</h3>
                    <p>
                      {r.rewardType === 'free_product' ? 'Tarjeta de sellos' : `${fmt(r.requiredPoints)} pts`}
                      {r.pointsSpent > 0 && ` · ${fmt(r.pointsSpent)} pts gastados`}
                      {r.cancelled > 0 && ` · ${fmt(r.cancelled)} cancelados`}
                    </p>
                  </IonLabel>
                  <IonBadge slot="end" className="pr-balance-badge">{fmt(r.redemptions)}</IonBadge>
                </IonItem>
              ))}
            </IonList>
          )}
        </IonCardContent>
      </IonCard>

      <IonCard className="pr-card">
        <IonCardHeader><IonCardTitle>Cupones</IonCardTitle></IonCardHeader>
        <IonCardContent>
          {d.coupons.length === 0 ? (
            <EmptyState icon={pricetagOutline} text="Sin cupones." />
          ) : (
            <IonList lines="none">
              {d.coupons.map(c => (
                <IonItem key={c.catalogItemId} className="pr-catalog-item">
                  <IonLabel>
                    <h3>{c.code} · {c.name}{!c.isActive && ' (inactivo)'}</h3>
                    <p>{fmt(c.uses)} usos · {money(c.discountTotal)} de descuento en esas ventas
                      {c.firstPurchaseOnly && ' · solo primera compra'}</p>
                  </IonLabel>
                </IonItem>
              ))}
            </IonList>
          )}
        </IonCardContent>
      </IonCard>

      <IonCard className="pr-card">
        <IonCardHeader><IonCardTitle>Clientes con más puntos</IonCardTitle></IonCardHeader>
        <IonCardContent>
          {d.topCustomers.length === 0 ? (
            <EmptyState icon={trophyOutline} text="Sin puntos POS registrados aún." />
          ) : (
            <IonList lines="none">
              {d.topCustomers.map((c, i) => (
                <IonItem key={c.clientId} className="pr-leaderboard-item">
                  <span className="pr-rank" slot="start">{i + 1}</span>
                  <IonLabel>
                    <h3>{c.name || `Cliente #${c.clientId}`}</h3>
                    <p>Ganados: {fmt(c.lifetimeEarned)} · Canjeados: {fmt(c.lifetimeRedeemed)}</p>
                    <IonNote>{c.lastActivity ? `Última actividad: ${toDate(c.lastActivity)}` : 'Sin actividad'}</IonNote>
                  </IonLabel>
                  <IonBadge slot="end" className="pr-balance-badge">{fmt(c.balance)} pts</IonBadge>
                </IonItem>
              ))}
            </IonList>
          )}
        </IonCardContent>
      </IonCard>
    </>
  );
};

export default RewardsOverview;

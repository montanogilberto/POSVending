/**
 * Manufacturing Hub — Laundry Machine Cost Tracking
 *
 * Tabs:
 *   dashboard   — machines status + queue + today KPIs (WorkflowOrchestrator)
 *   orders      — production order history + real costs
 *   profitability — margin analysis + price suggestions (ProfitabilityOptimizer)
 *   maintenance — machine wear + maintenance logs (MaintenancePredictor)
 *   settings    — utility rates (CostEngine)
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonSegment, IonSegmentButton, IonLabel, IonIcon,
  IonRefresher, IonRefresherContent, IonToast, IonLoading,
  IonButton, IonCard, IonCardContent, IonCardHeader, IonCardTitle,
  IonBadge, IonModal, IonInput, IonSelect, IonSelectOption, IonItem,
} from '@ionic/react';
import {
  cogOutline, barChartOutline, constructOutline, cashOutline,
  flashOutline, waterOutline, timeOutline, checkmarkCircle,
  alertCircleOutline, warningOutline, addOutline, refreshOutline,
  trendingUpOutline, trendingDownOutline, ellipseOutline,
} from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { useUser } from '../../components/UserContext';
import './ManufacturingPage.css';

const API = 'https://smartloansbackend.azurewebsites.net';

const fmt = (n: number) =>
  n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

const pct = (n: number) => `${n.toFixed(1)}%`;

// ── Types ─────────────────────────────────────────────────────────────────────

interface Machine {
  machineId: number;
  name: string;
  machineType: 'washer' | 'dryer' | 'combo';
  capacityKg: number;
  kwhPerCycle: number;
  litersPerCycle: number;
  cycleMinutes: number;
  purchaseCost: number;
  lifetimeCycles: number;
  currentCycleCount: number;
  maintenanceEvery: number;
  wearScore: number;
  status: 'available' | 'in_use' | 'maintenance' | 'retired';
  location?: string;
}

interface ProductionOrder {
  orderId: number;
  machineId: number;
  machineName: string;
  clientId?: number;
  cycleType: string;
  weightKg: number;
  status: 'queued' | 'running' | 'done' | 'cancelled';
  estimatedMinutes: number;
  actualMinutes?: number;
  realCostTotal?: number;
  ticketPrice?: number;
  margin?: number;
  marginPct?: number;
  startedAt?: string;
  completedAt?: string;
  elapsedMinutes?: number;
  remainingMinutes?: number;
}

interface TodayKpis {
  totalOrders: number;
  totalRevenue: number;
  totalRealCost: number;
  totalMargin: number;
  avgMarginPct: number;
  lossOrders: number;
}

interface ServiceStat {
  cycleType: string;
  orderCount: number;
  avgRealCost: number;
  avgTicketPrice: number;
  avgMarginPct: number;
  totalRevenue: number;
  totalMargin: number;
  status: 'loss' | 'thin' | 'ok' | 'good';
}

interface PriceSuggestion {
  cycleType: string;
  currentAvgPrice: number;
  suggestedPrice: number;
  delta: number;
  reason: string;
}

interface UtilityRates {
  electricityPerKwh: number;
  waterPerLiter: number;
  detergentPerGram: number;
  laborPerHour: number;
  overheadPct: number;
  targetMarginPct: number;
}

type Tab = 'dashboard' | 'orders' | 'profitability' | 'maintenance' | 'settings';

// ── Status helpers ─────────────────────────────────────────────────────────────

const machineStatusColor = (s: string) => ({
  available:   '#10b981',
  in_use:      '#2563eb',
  maintenance: '#f59e0b',
  retired:     '#9ca3af',
}[s] ?? '#9ca3af');

const machineStatusLabel = (s: string) => ({
  available:   'Disponible',
  in_use:      'En uso',
  maintenance: 'Mantenimiento',
  retired:     'Retirada',
}[s] ?? s);

const wearColor = (score: number) =>
  score >= 95 ? '#ef4444' : score >= 85 ? '#f59e0b' : score >= 60 ? '#eab308' : '#10b981';

const marginStatusColor = (s: string) => ({
  loss: '#ef4444', thin: '#f59e0b', ok: '#3b82f6', good: '#10b981',
}[s] ?? '#9ca3af');

// ── Component ──────────────────────────────────────────────────────────────────

const ManufacturingPage: React.FC = () => {
  const { companyId, userId } = useUser();
  const history = useHistory();

  const [tab, setTab] = useState<Tab>('dashboard');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Dashboard
  const [machines, setMachines] = useState<Machine[]>([]);
  const [queue, setQueue] = useState<ProductionOrder[]>([]);
  const [todayKpis, setTodayKpis] = useState<TodayKpis | null>(null);

  // Orders
  const [orders, setOrders] = useState<ProductionOrder[]>([]);

  // Profitability
  const [byServiceType, setByServiceType] = useState<ServiceStat[]>([]);
  const [suggestions, setSuggestions] = useState<PriceSuggestion[]>([]);
  const [profitSummary, setProfitSummary] = useState<Partial<TodayKpis> & { periodDays?: number }>({});

  // Maintenance
  const [maintenanceAlerts, setMaintenanceAlerts] = useState<any[]>([]);
  const [maintLogs, setMaintLogs] = useState<any[]>([]);

  // Settings
  const [rates, setRates] = useState<UtilityRates>({
    electricityPerKwh: 3.20, waterPerLiter: 0.015, detergentPerGram: 0.08,
    laborPerHour: 80, overheadPct: 15, targetMarginPct: 40,
  });

  // New order modal
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [newOrder, setNewOrder] = useState({
    machineId: '', cycleType: 'normal', weightKg: '5', detergentGrams: '80',
    ticketPrice: '', notes: '',
  });

  // New machine modal
  const [showMachineModal, setShowMachineModal] = useState(false);
  const [newMachine, setNewMachine] = useState({
    name: '', machineType: 'washer', capacityKg: '7', kwhPerCycle: '0.5',
    litersPerCycle: '50', cycleMinutes: '45', purchaseCost: '15000',
    lifetimeCycles: '5000', maintenanceEvery: '200', location: '',
  });

  // ── API helpers ──────────────────────────────────────────────────────────────

  const post = async (path: string, body: object) => {
    const r = await fetch(`${API}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return r.json();
  };

  // ── Load data per tab ────────────────────────────────────────────────────────

  const loadDashboard = useCallback(async () => {
    if (!companyId) return;
    const data = await post('/manufacturing/dashboard', { companyId });
    setMachines(data.machines ?? []);
    setQueue(data.queue ?? []);
    setTodayKpis(data.todayKpis ?? null);
  }, [companyId]);

  const loadOrders = useCallback(async () => {
    if (!companyId) return;
    const data = await post('/manufacturing/queue/history', { companyId, periodDays: 30 });
    setOrders(data.orders ?? []);
  }, [companyId]);

  const loadProfitability = useCallback(async () => {
    if (!companyId) return;
    const data = await post('/manufacturing/profitability/analyze', { companyId, periodDays: 30 });
    setByServiceType(data.byServiceType ?? []);
    setSuggestions(data.suggestions ?? []);
    setProfitSummary(data);
  }, [companyId]);

  const loadMaintenance = useCallback(async () => {
    if (!companyId) return;
    const [analysis, logs] = await Promise.all([
      post('/manufacturing/maintenance/analyze-all', { companyId }),
      post('/manufacturing/maintenance/history', { logs: [{ action: 'list', companyId }] }),
    ]);
    setMaintenanceAlerts(analysis.alerts ?? []);
    setMaintLogs(logs.logs ?? []);
  }, [companyId]);

  const loadRates = useCallback(async () => {
    if (!companyId) return;
    const data = await post('/manufacturing/cost-engine/rates', { companyId });
    if (!data.error) setRates(data);
  }, [companyId]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === 'dashboard')     await loadDashboard();
      if (tab === 'orders')        await loadOrders();
      if (tab === 'profitability') await loadProfitability();
      if (tab === 'maintenance')   await loadMaintenance();
      if (tab === 'settings')      await loadRates();
    } catch { }
    setLoading(false);
  }, [tab, loadDashboard, loadOrders, loadProfitability, loadMaintenance, loadRates]);

  useEffect(() => { load(); }, [load]);

  // ── Actions ──────────────────────────────────────────────────────────────────

  const createOrder = async () => {
    if (!newOrder.machineId || !newOrder.ticketPrice) {
      setToast('Selecciona máquina y precio'); return;
    }
    const data = await post('/manufacturing/queue/create', {
      companyId, assignedBy: userId,
      machineId:      Number(newOrder.machineId),
      cycleType:      newOrder.cycleType,
      weightKg:       Number(newOrder.weightKg),
      detergentGrams: Number(newOrder.detergentGrams),
      ticketPrice:    Number(newOrder.ticketPrice),
      notes:          newOrder.notes,
    });
    if (data.error) { setToast(data.error); return; }
    setShowOrderModal(false);
    setToast('Orden creada');
    loadDashboard();
  };

  const startOrder = async (orderId: number) => {
    await post('/manufacturing/queue/start', { orderId });
    setToast('Ciclo iniciado');
    loadDashboard();
  };

  const completeOrder = async (o: ProductionOrder) => {
    await post('/manufacturing/queue/complete', {
      orderId:        o.orderId,
      machineId:      o.machineId,
      companyId,
      detergentGrams: 80,
      actualMinutes:  o.elapsedMinutes,
      ticketPrice:    o.ticketPrice ?? 0,
    });
    // notify client
    await post('/manufacturing/alerts/cycle-done', {
      companyId, orderId: o.orderId, clientId: o.clientId,
      machineName: o.machineName, cycleType: o.cycleType,
      ticketPrice: o.ticketPrice ?? 0,
    });
    setToast('Ciclo completado');
    loadDashboard();
  };

  const saveMachine = async () => {
    const data = await post('/manufacturing/machines', { companyId, ...newMachine,
      capacityKg:    Number(newMachine.capacityKg),
      kwhPerCycle:   Number(newMachine.kwhPerCycle),
      litersPerCycle: Number(newMachine.litersPerCycle),
      cycleMinutes:  Number(newMachine.cycleMinutes),
      purchaseCost:  Number(newMachine.purchaseCost),
      lifetimeCycles: Number(newMachine.lifetimeCycles),
      maintenanceEvery: Number(newMachine.maintenanceEvery),
    });
    if (data.error) { setToast(data.error); return; }
    setShowMachineModal(false);
    setToast('Máquina registrada');
    loadDashboard();
  };

  const saveRates = async () => {
    const data = await post('/manufacturing/cost-engine/rates/save', { companyId, ...rates });
    if (data.error) setToast(data.error);
    else setToast('Tarifas guardadas');
  };

  const triggerMaintenance = async (machineId: number) => {
    await post('/manufacturing/machines/update', { machineId, status: 'maintenance' });
    await post('/manufacturing/alerts/maintenance', {
      companyId, managerId: userId, machineId,
      machineName: machines.find(m => m.machineId === machineId)?.name ?? '',
      wearScore: machines.find(m => m.machineId === machineId)?.wearScore ?? 0,
      recommendation: 'Mantenimiento programado por operador',
    });
    setToast('Máquina en mantenimiento — alerta enviada');
    loadDashboard();
  };

  // ── Renders ──────────────────────────────────────────────────────────────────

  const renderDashboard = () => (
    <div className="mfg-section">
      {/* KPI row */}
      {todayKpis && (
        <div className="mfg-kpi-row">
          <div className="mfg-kpi">
            <span className="mfg-kpi-val">{todayKpis.totalOrders}</span>
            <span className="mfg-kpi-label">Órdenes hoy</span>
          </div>
          <div className="mfg-kpi">
            <span className="mfg-kpi-val">{fmt(todayKpis.totalRevenue)}</span>
            <span className="mfg-kpi-label">Ingresos</span>
          </div>
          <div className="mfg-kpi">
            <span className="mfg-kpi-val">{fmt(todayKpis.totalRealCost)}</span>
            <span className="mfg-kpi-label">Costo real</span>
          </div>
          <div className="mfg-kpi">
            <span className="mfg-kpi-val" style={{ color: todayKpis.totalMargin >= 0 ? '#10b981' : '#ef4444' }}>
              {pct(todayKpis.avgMarginPct)}
            </span>
            <span className="mfg-kpi-label">Margen</span>
          </div>
        </div>
      )}

      {/* Machines */}
      <div className="mfg-subtitle">
        <span>Máquinas</span>
        <IonButton size="small" fill="clear" onClick={() => setShowMachineModal(true)}>
          <IonIcon icon={addOutline} /> Nueva
        </IonButton>
      </div>
      <div className="mfg-machines-grid">
        {machines.map(m => (
          <IonCard key={m.machineId} className="mfg-machine-card">
            <IonCardContent>
              <div className="mfg-machine-header">
                <span className="mfg-machine-name">{m.name}</span>
                <IonBadge style={{ background: machineStatusColor(m.status) }}>
                  {machineStatusLabel(m.status)}
                </IonBadge>
              </div>
              <div className="mfg-machine-stats">
                <span><IonIcon icon={flashOutline} /> {m.kwhPerCycle} kWh</span>
                <span><IonIcon icon={waterOutline} /> {m.litersPerCycle} L</span>
                <span><IonIcon icon={timeOutline} /> {m.cycleMinutes} min</span>
              </div>
              <div className="mfg-wear-bar">
                <div className="mfg-wear-track">
                  <div className="mfg-wear-fill" style={{
                    width: `${m.wearScore}%`,
                    background: wearColor(m.wearScore),
                  }} />
                </div>
                <span style={{ color: wearColor(m.wearScore) }}>{m.wearScore}%</span>
              </div>
              <div className="mfg-machine-footer">
                <span className="mfg-cycle-count">{m.currentCycleCount} ciclos</span>
                {m.status === 'available' && (
                  <IonButton size="small" fill="outline" onClick={() => {
                    setNewOrder(o => ({ ...o, machineId: String(m.machineId) }));
                    setShowOrderModal(true);
                  }}>
                    Asignar
                  </IonButton>
                )}
                {m.wearScore >= 85 && m.status === 'available' && (
                  <IonButton size="small" color="warning" fill="outline"
                    onClick={() => triggerMaintenance(m.machineId)}>
                    Mantenimiento
                  </IonButton>
                )}
              </div>
            </IonCardContent>
          </IonCard>
        ))}
        {machines.length === 0 && (
          <p className="mfg-empty">No hay máquinas registradas. Agrega la primera.</p>
        )}
      </div>

      {/* Active queue */}
      {queue.length > 0 && (
        <>
          <p className="mfg-subtitle">Cola activa</p>
          {queue.map(o => (
            <IonCard key={o.orderId} className="mfg-queue-card">
              <IonCardContent>
                <div className="mfg-queue-row">
                  <div>
                    <strong>{o.machineName}</strong>
                    <span className="mfg-queue-type"> · {o.cycleType}</span>
                  </div>
                  <IonBadge color={o.status === 'running' ? 'primary' : 'medium'}>
                    {o.status === 'running'
                      ? `${o.remainingMinutes ?? o.estimatedMinutes} min restantes`
                      : 'En cola'}
                  </IonBadge>
                </div>
                <div className="mfg-queue-actions">
                  {o.status === 'queued' && (
                    <IonButton size="small" onClick={() => startOrder(o.orderId)}>
                      Iniciar ciclo
                    </IonButton>
                  )}
                  {o.status === 'running' && (
                    <IonButton size="small" color="success" onClick={() => completeOrder(o)}>
                      Completar
                    </IonButton>
                  )}
                </div>
              </IonCardContent>
            </IonCard>
          ))}
        </>
      )}
    </div>
  );

  const renderOrders = () => (
    <div className="mfg-section">
      <p className="mfg-subtitle">Historial de órdenes — últimos 30 días</p>
      {orders.map(o => (
        <IonCard key={o.orderId} className="mfg-order-card">
          <IonCardContent>
            <div className="mfg-order-header">
              <span><strong>{o.machineName}</strong> · {o.cycleType}</span>
              <IonBadge color={o.status === 'done' ? 'success' : 'medium'}>{o.status}</IonBadge>
            </div>
            {o.realCostTotal != null && (
              <div className="mfg-cost-row">
                <div>
                  <span className="mfg-cost-label">Precio</span>
                  <span className="mfg-cost-val">{fmt(o.ticketPrice ?? 0)}</span>
                </div>
                <div>
                  <span className="mfg-cost-label">Costo real</span>
                  <span className="mfg-cost-val">{fmt(o.realCostTotal)}</span>
                </div>
                <div>
                  <span className="mfg-cost-label">Margen</span>
                  <span className="mfg-cost-val"
                    style={{ color: (o.marginPct ?? 0) >= 0 ? '#10b981' : '#ef4444' }}>
                    {pct(o.marginPct ?? 0)}
                  </span>
                </div>
              </div>
            )}
          </IonCardContent>
        </IonCard>
      ))}
      {orders.length === 0 && <p className="mfg-empty">Sin órdenes completadas en este período.</p>}
    </div>
  );

  const renderProfitability = () => (
    <div className="mfg-section">
      {/* Summary */}
      <IonCard className="mfg-profit-summary">
        <IonCardContent>
          <div className="mfg-kpi-row">
            <div className="mfg-kpi">
              <span className="mfg-kpi-val">{fmt(profitSummary.totalRevenue ?? 0)}</span>
              <span className="mfg-kpi-label">Ingresos 30d</span>
            </div>
            <div className="mfg-kpi">
              <span className="mfg-kpi-val">{fmt(profitSummary.totalRealCost ?? 0)}</span>
              <span className="mfg-kpi-label">Costo real</span>
            </div>
            <div className="mfg-kpi">
              <span className="mfg-kpi-val" style={{ color: (profitSummary.avgMarginPct ?? 0) >= 20 ? '#10b981' : '#ef4444' }}>
                {pct(profitSummary.avgMarginPct ?? 0)}
              </span>
              <span className="mfg-kpi-label">Margen prom.</span>
            </div>
          </div>
          {(profitSummary.lossOrders ?? 0) > 0 && (
            <div className="mfg-loss-alert">
              <IonIcon icon={warningOutline} color="danger" />
              {profitSummary.lossOrders} órdenes con pérdida en los últimos 30 días
            </div>
          )}
        </IonCardContent>
      </IonCard>

      {/* By service type */}
      <p className="mfg-subtitle">Por tipo de servicio</p>
      {byServiceType.map(s => (
        <IonCard key={s.cycleType} className="mfg-service-card">
          <IonCardContent>
            <div className="mfg-service-header">
              <span className="mfg-service-name">{s.cycleType}</span>
              <IonBadge style={{ background: marginStatusColor(s.status), color: '#fff' }}>
                {s.status === 'loss' ? 'Pérdida' : s.status === 'thin' ? 'Margen bajo'
                  : s.status === 'good' ? 'Bueno' : 'Regular'}
              </IonBadge>
            </div>
            <div className="mfg-cost-row">
              <div><span className="mfg-cost-label">Órdenes</span><span className="mfg-cost-val">{s.orderCount}</span></div>
              <div><span className="mfg-cost-label">Costo prom.</span><span className="mfg-cost-val">{fmt(s.avgRealCost)}</span></div>
              <div><span className="mfg-cost-label">Precio prom.</span><span className="mfg-cost-val">{fmt(s.avgTicketPrice)}</span></div>
              <div>
                <span className="mfg-cost-label">Margen</span>
                <span className="mfg-cost-val" style={{ color: marginStatusColor(s.status) }}>
                  {pct(s.avgMarginPct)}
                </span>
              </div>
            </div>
          </IonCardContent>
        </IonCard>
      ))}

      {/* Price suggestions */}
      {suggestions.length > 0 && (
        <>
          <p className="mfg-subtitle">💡 Sugerencias de precio</p>
          {suggestions.map(s => (
            <IonCard key={s.cycleType} className="mfg-suggestion-card">
              <IonCardContent>
                <div className="mfg-suggestion-row">
                  <div>
                    <strong>{s.cycleType}</strong>
                    <p className="mfg-suggestion-reason">{s.reason}</p>
                  </div>
                  <div className="mfg-suggestion-prices">
                    <span className="mfg-old-price">{fmt(s.currentAvgPrice)}</span>
                    <IonIcon icon={trendingUpOutline} color="success" />
                    <span className="mfg-new-price">{fmt(s.suggestedPrice)}</span>
                  </div>
                </div>
              </IonCardContent>
            </IonCard>
          ))}
        </>
      )}
    </div>
  );

  const renderMaintenance = () => (
    <div className="mfg-section">
      {maintenanceAlerts.length > 0 && (
        <>
          <p className="mfg-subtitle" style={{ color: '#ef4444' }}>⚠️ Alertas activas</p>
          {maintenanceAlerts.map((a: any) => (
            <IonCard key={a.machineId} className="mfg-alert-card">
              <IonCardContent>
                <div className="mfg-alert-row">
                  <div>
                    <strong>{a.machineName}</strong>
                    <p style={{ color: wearColor(a.wearScore), margin: 0 }}>
                      Desgaste: {a.wearScore}% · {a.remainingCycles} ciclos restantes
                    </p>
                    <p style={{ margin: 0, fontSize: '0.85rem' }}>{a.recommendation}</p>
                  </div>
                  <IonButton size="small" color="warning"
                    onClick={() => triggerMaintenance(a.machineId)}>
                    Atender
                  </IonButton>
                </div>
              </IonCardContent>
            </IonCard>
          ))}
        </>
      )}
      {maintenanceAlerts.length === 0 && (
        <IonCard>
          <IonCardContent>
            <p style={{ color: '#10b981', textAlign: 'center', margin: 0 }}>
              <IonIcon icon={checkmarkCircle} /> Todas las máquinas en buen estado
            </p>
          </IonCardContent>
        </IonCard>
      )}
      <p className="mfg-subtitle">Historial de mantenimiento</p>
      {maintLogs.map((l: any) => (
        <IonCard key={l.logId} className="mfg-log-card">
          <IonCardContent>
            <div className="mfg-log-row">
              <span><strong>{l.machineName}</strong> · {l.logType}</span>
              <span style={{ color: '#6b7280', fontSize: '0.8rem' }}>
                {l.completedAt ? new Date(l.completedAt).toLocaleDateString('es-MX') : '—'}
              </span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '0.85rem' }}>{l.description}</p>
            {l.costMXN > 0 && <p style={{ margin: 0, fontSize: '0.8rem', color: '#6b7280' }}>Costo: {fmt(l.costMXN)}</p>}
          </IonCardContent>
        </IonCard>
      ))}
    </div>
  );

  const renderSettings = () => (
    <div className="mfg-section">
      <IonCard>
        <IonCardHeader><IonCardTitle>Tarifas de Utilidades</IonCardTitle></IonCardHeader>
        <IonCardContent>
          <p className="mfg-rates-note">Estas tarifas son usadas por el CostEngine para calcular el costo real de cada ciclo.</p>
          {([
            { label: 'Electricidad (MXN/kWh)', key: 'electricityPerKwh' },
            { label: 'Agua (MXN/L)', key: 'waterPerLiter' },
            { label: 'Detergente (MXN/g)', key: 'detergentPerGram' },
            { label: 'Mano de obra (MXN/hora)', key: 'laborPerHour' },
            { label: 'Overhead (%)', key: 'overheadPct' },
            { label: 'Margen objetivo (%)', key: 'targetMarginPct' },
          ] as { label: string; key: keyof UtilityRates }[]).map(f => (
            <IonItem key={f.key} lines="inset">
              <IonLabel position="stacked">{f.label}</IonLabel>
              <IonInput
                type="number"
                value={rates[f.key]}
                onIonChange={e => setRates(r => ({ ...r, [f.key]: Number(e.detail.value) }))}
              />
            </IonItem>
          ))}
          <IonButton expand="block" className="ion-margin-top" onClick={saveRates}>
            Guardar tarifas
          </IonButton>
        </IonCardContent>
      </IonCard>
    </div>
  );

  // ── Main render ───────────────────────────────────────────────────────────────

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Manufactura</IonTitle>
          <IonButton slot="end" fill="clear" onClick={load}>
            <IonIcon icon={refreshOutline} />
          </IonButton>
        </IonToolbar>
        <IonToolbar>
          <IonSegment value={tab} onIonChange={e => setTab(e.detail.value as Tab)}>
            <IonSegmentButton value="dashboard">
              <IonIcon icon={cogOutline} /><IonLabel>Panel</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="orders">
              <IonIcon icon={timeOutline} /><IonLabel>Órdenes</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="profitability">
              <IonIcon icon={barChartOutline} /><IonLabel>Rentabilidad</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="maintenance">
              <IonIcon icon={constructOutline} /><IonLabel>Mantenimiento</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="settings">
              <IonIcon icon={cashOutline} /><IonLabel>Tarifas</IonLabel>
            </IonSegmentButton>
          </IonSegment>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <IonRefresher slot="fixed" onIonRefresh={async e => { await load(); e.detail.complete(); }}>
          <IonRefresherContent />
        </IonRefresher>

        <IonLoading isOpen={loading} message="Cargando..." />

        {tab === 'dashboard'     && renderDashboard()}
        {tab === 'orders'        && renderOrders()}
        {tab === 'profitability' && renderProfitability()}
        {tab === 'maintenance'   && renderMaintenance()}
        {tab === 'settings'      && renderSettings()}

        {/* New Order Modal */}
        <IonModal isOpen={showOrderModal} onDidDismiss={() => setShowOrderModal(false)}
          breakpoints={[0, 0.8]} initialBreakpoint={0.8}>
          <IonHeader><IonToolbar>
            <IonTitle>Nueva Orden</IonTitle>
            <IonButton slot="end" fill="clear" onClick={() => setShowOrderModal(false)}>Cerrar</IonButton>
          </IonToolbar></IonHeader>
          <IonContent className="ion-padding">
            <IonItem>
              <IonLabel position="stacked">Máquina</IonLabel>
              <IonSelect value={newOrder.machineId}
                onIonChange={e => setNewOrder(o => ({ ...o, machineId: e.detail.value }))}>
                {machines.filter(m => m.status === 'available').map(m => (
                  <IonSelectOption key={m.machineId} value={String(m.machineId)}>{m.name}</IonSelectOption>
                ))}
              </IonSelect>
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Tipo de ciclo</IonLabel>
              <IonSelect value={newOrder.cycleType}
                onIonChange={e => setNewOrder(o => ({ ...o, cycleType: e.detail.value }))}>
                {['delicate', 'normal', 'heavy', 'sanitize'].map(t => (
                  <IonSelectOption key={t} value={t}>{t}</IonSelectOption>
                ))}
              </IonSelect>
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Peso (kg)</IonLabel>
              <IonInput type="number" value={newOrder.weightKg}
                onIonChange={e => setNewOrder(o => ({ ...o, weightKg: e.detail.value! }))} />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Detergente (g)</IonLabel>
              <IonInput type="number" value={newOrder.detergentGrams}
                onIonChange={e => setNewOrder(o => ({ ...o, detergentGrams: e.detail.value! }))} />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Precio cobrado (MXN)</IonLabel>
              <IonInput type="number" value={newOrder.ticketPrice}
                onIonChange={e => setNewOrder(o => ({ ...o, ticketPrice: e.detail.value! }))} />
            </IonItem>
            <IonButton expand="block" className="ion-margin-top" onClick={createOrder}>
              Crear Orden
            </IonButton>
          </IonContent>
        </IonModal>

        {/* New Machine Modal */}
        <IonModal isOpen={showMachineModal} onDidDismiss={() => setShowMachineModal(false)}
          breakpoints={[0, 0.9]} initialBreakpoint={0.9}>
          <IonHeader><IonToolbar>
            <IonTitle>Nueva Máquina</IonTitle>
            <IonButton slot="end" fill="clear" onClick={() => setShowMachineModal(false)}>Cerrar</IonButton>
          </IonToolbar></IonHeader>
          <IonContent className="ion-padding">
            {([
              { label: 'Nombre', key: 'name', type: 'text' },
              { label: 'Capacidad (kg)', key: 'capacityKg', type: 'number' },
              { label: 'Consumo eléctrico (kWh/ciclo)', key: 'kwhPerCycle', type: 'number' },
              { label: 'Consumo agua (L/ciclo)', key: 'litersPerCycle', type: 'number' },
              { label: 'Duración ciclo (min)', key: 'cycleMinutes', type: 'number' },
              { label: 'Costo de compra (MXN)', key: 'purchaseCost', type: 'number' },
              { label: 'Vida útil (ciclos)', key: 'lifetimeCycles', type: 'number' },
              { label: 'Mantenimiento cada (ciclos)', key: 'maintenanceEvery', type: 'number' },
              { label: 'Ubicación', key: 'location', type: 'text' },
            ] as { label: string; key: keyof typeof newMachine; type: string }[]).map(f => (
              <IonItem key={f.key}>
                <IonLabel position="stacked">{f.label}</IonLabel>
                <IonInput type={f.type as any} value={newMachine[f.key]}
                  onIonChange={e => setNewMachine(m => ({ ...m, [f.key]: e.detail.value! }))} />
              </IonItem>
            ))}
            <IonItem>
              <IonLabel position="stacked">Tipo</IonLabel>
              <IonSelect value={newMachine.machineType}
                onIonChange={e => setNewMachine(m => ({ ...m, machineType: e.detail.value }))}>
                <IonSelectOption value="washer">Lavadora</IonSelectOption>
                <IonSelectOption value="dryer">Secadora</IonSelectOption>
                <IonSelectOption value="combo">Combo</IonSelectOption>
              </IonSelect>
            </IonItem>
            <IonButton expand="block" className="ion-margin-top" onClick={saveMachine}>
              Registrar Máquina
            </IonButton>
          </IonContent>
        </IonModal>

        <IonToast isOpen={!!toast} message={toast ?? ''} duration={2500}
          onDidDismiss={() => setToast(null)} position="top" />
      </IonContent>
    </IonPage>
  );
};

export default ManufacturingPage;

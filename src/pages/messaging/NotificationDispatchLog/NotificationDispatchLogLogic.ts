import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useIonRouter, useIonViewWillEnter } from '@ionic/react';
import { useUser } from '../../../contexts/UserContext';
import { useMediaQuery } from '../../../hooks/useMediaQuery';
import { useToast } from '../../../hooks/useToast';
import { monthToDate } from '../../../utils/period';
import { onDataChanged } from '../../../utils/refreshBus';
import {
  fetchNotificationUsage, getAllNotificationDispatches, NotificationSourceType, NotificationUsage,
} from '../../../api/notificationDispatchApi';
import { getAllClients } from '../../../api/clientsApi';
import {
  actionItems, channelComparison, channelHealth, clientHistory, computeKpis, defaultGranularity, failureBreakdown,
  hermosilloMonthKey, inDateRange, inMonth, isShownOnScreen, keyMetrics, matchesDelivery, matchesFocus, matchesSearch, paginate, providerHealth, sortRows, toRow, trendSeries, whatsappQuota,
} from './NotificationStats';
import { clientProfileRoute, PAGE_SIZE } from './NotificationDispatchLogConstants';
import type {
  CenterSection, ChannelFilter, CustomRange, DateFilter, DeliveryFilter, DetailTab, DispatchRow, FocusFilter, SortKey,
  TrendGranularity,
} from './NotificationDispatchLogTypes';

/** Desktop shows the detail as a side drawer next to the dashboard; below this it is a modal. */
const DRAWER_QUERY = '(min-width: 992px)';

export const useNotificationDispatchLog = () => {
  const { companyId } = useUser();
  const router = useIonRouter();
  const isDesktop = useMediaQuery(DRAWER_QUERY);
  const { showToast, toastProps } = useToast({ defaultColor: 'danger' });
  const historyRef = useRef<HTMLElement>(null);

  const [rows, setRows] = useState<DispatchRow[]>([]);
  const [usage, setUsage] = useState<NotificationUsage | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selected, setSelected] = useState<DispatchRow | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>('info');
  const [dateFilter, setDateFilter] = useState<DateFilter>('month');
  const [customRange, setCustomRange] = useState<CustomRange>(monthToDate);
  const [sourceFilter, setSourceFilter] = useState<NotificationSourceType | 'all'>('all');
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>('all');
  const [deliveryFilter, setDeliveryFilter] = useState<DeliveryFilter>('all');
  const [focus, setFocus] = useState<FocusFilter>('none');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('newest');
  const [page, setPage] = useState(1);
  const [section, setSection] = useState<CenterSection>('overview');
  /** null = follow the period (defaultGranularity); set once the user picks Hora/Día/Semana. */
  const [granularityPick, setGranularity] = useState<TrendGranularity | null>(null);

  const load = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      // Rows are this company's only (tenant isolation). Names and provider settings are
      // nice-to-have: their failure must not hide the messages.
      const [data, clients, providerUsage] = await Promise.all([
        getAllNotificationDispatches(companyId),
        getAllClients().catch(() => []),
        fetchNotificationUsage(),
      ]);
      const names = new Map(clients.map(c => [c.clientId, `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim()]));
      setRows(data.filter(isShownOnScreen).map(d => toRow(d, d.recipientType === 'client' ? names.get(d.recipientId) ?? '' : '')));
      setUsage(providerUsage);
      setLastUpdated(new Date());
    } catch (err) {
      showToast((err as Error).message || 'No se pudo cargar el historial de notificaciones');
    } finally {
      setLoading(false);
      setLoadedOnce(true);
    }
  }, [companyId, showToast]);

  useIonViewWillEnter(() => { load(); });

  useEffect(() => onDataChanged((reason) => {
    if (reason === 'notification_dispatched') load();
  }), [load]);

  // A refreshed row replaces the open one so the drawer never shows stale state.
  useEffect(() => {
    setSelected(prev => (prev ? rows.find(r => r.notificationDispatchId === prev.notificationDispatchId) ?? null : prev));
  }, [rows]);

  useEffect(() => { setPage(1); }, [sourceFilter, channelFilter, deliveryFilter, focus, dateFilter, customRange, search, sortKey]);

  // A–C (KPIs, channel health, action center) follow the period only; canal/fuente/estado,
  // focus and search narrow the history list below.
  const periodRows = useMemo(() => rows.filter(r => inDateRange(r, dateFilter, new Date(), customRange)),
    [rows, dateFilter, customRange]);

  const kpis = useMemo(() => computeKpis(periodRows), [periodRows]);
  const metrics = useMemo(() => keyMetrics(periodRows), [periodRows]);
  const health = useMemo(() => channelHealth(periodRows), [periodRows]);
  const actions = useMemo(() => actionItems(periodRows), [periodRows]);
  const failures = useMemo(() => failureBreakdown(periodRows), [periodRows]);
  const channels = useMemo(() => channelComparison(periodRows), [periodRows]);

  // A new period goes back to the bucket size that fits it.
  useEffect(() => { setGranularity(null); }, [dateFilter, customRange]);
  const granularity = granularityPick ?? defaultGranularity(dateFilter, periodRows);
  const trend = useMemo(() => trendSeries(periodRows, granularity), [periodRows, granularity]);
  const twilioReachable = usage ? usage.twilio.ok : null;
  const providers = useMemo(() => providerHealth(rows, twilioReachable), [rows, twilioReachable]);

  // The free WhatsApp allowance is monthly, whatever period is on screen.
  const monthKey = hermosilloMonthKey(new Date().toISOString());
  const monthMeta = useMemo(() => channelHealth(inMonth(rows, monthKey)).metaWhatsapp, [rows, monthKey]);
  // Meta bills what went out: delivered + still awaiting, never the failed ones.
  const quota = useMemo(
    () => whatsappQuota(monthMeta.delivered + monthMeta.awaiting, usage?.whatsappLimit ?? null),
    [monthMeta, usage]);
  /** Settings the screen knows are missing; null usage = the backend could not be asked. */
  const configWarnings = useMemo(() => {
    if (!usage) return [] as string[];
    const list: string[] = [];
    if (usage.whatsappProvider === 'none') list.push('WhatsApp (Meta) no está configurado en el servidor: los avisos salen por SMS.');
    if (usage.whatsappLimit === null) list.push('Falta configurar el cupo gratis de WhatsApp (WHATSAPP_FREE_MONTHLY_LIMIT).');
    return list;
  }, [usage]);

  const filtered = useMemo(() => {
    const now = new Date();
    return sortRows(periodRows.filter(r =>
      (sourceFilter === 'all' || r.sourceType === sourceFilter)
      && (channelFilter === 'all' || r.selectedChannel === channelFilter)
      && matchesDelivery(r, deliveryFilter)
      && matchesFocus(r, focus, now)
      && matchesSearch(r, search)), sortKey);
  }, [periodRows, sourceFilter, channelFilter, deliveryFilter, focus, search, sortKey]);
  const pageData = useMemo(() => paginate(filtered, page, PAGE_SIZE), [filtered, page]);

  const history = useMemo(() => (selected ? clientHistory(rows, selected) : []), [rows, selected]);

  const scrollToHistory = () => historyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  /** Every KPI / health / action click lands here: reset the list filters, apply one, show the list. */
  const showInList = (next: { delivery?: DeliveryFilter; focus?: FocusFilter; channel?: ChannelFilter }) => {
    setSourceFilter('all');
    setSearch('');
    setChannelFilter(next.channel ?? 'all');
    setDeliveryFilter(next.delivery ?? 'all');
    setFocus(next.focus ?? 'none');
    setSection('history');
    // The history tab mounts on this render; scroll once it is there.
    requestAnimationFrame(scrollToHistory);
  };

  const openDetail = (row: DispatchRow) => {
    if (row.notificationDispatchId !== selected?.notificationDispatchId) setDetailTab('info');
    setSelected(row);
  };
  const closeDetail = () => setSelected(null);

  const openClientProfile = () => {
    if (selected?.recipientType !== 'client') return;
    const id = selected.recipientId;
    setSelected(null);
    router.push(clientProfileRoute(id));
  };

  const copyText = async (text: string | number | undefined, what: string) => {
    if (text === undefined || text === '') return;
    try {
      await navigator.clipboard.writeText(String(text));
      showToast(`${what} copiado`, 'success');
    } catch {
      showToast(`No se pudo copiar ${what.toLowerCase()}`);
    }
  };

  return {
    loading, lastUpdated,
    // Until the first load ends the KPIs would read 0 — show a loader instead. Later
    // refreshes keep the numbers on screen while they update.
    initialLoading: !loadedOnce && !!companyId,
    refresh: load, toastProps, total: rows.length, isDesktop, historyRef,
    kpis, metrics, health, actions, providers, quota, usage, configWarnings,
    section, setSection, granularity, setGranularity, trend, channels, failures,
    filtered, pageData, setPage, sortKey, setSortKey, showInList,
    selected, openDetail, closeDetail, detailTab, setDetailTab, history, openClientProfile, copyText,
    search, setSearch, focus, setFocus,
    sourceFilter, setSourceFilter, channelFilter, setChannelFilter, deliveryFilter, setDeliveryFilter,
    dateFilter, setDateFilter, customRange, setCustomRange,
  };
};

export type NotificationDispatchLogVM = ReturnType<typeof useNotificationDispatchLog>;

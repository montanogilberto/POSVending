import { useCallback, useEffect, useMemo, useState } from 'react';
import { useIonViewWillEnter } from '@ionic/react';
import { useUser } from '../../../contexts/UserContext';
import { useToast } from '../../../hooks/useToast';
import { onDataChanged } from '../../../utils/refreshBus';
import {
  fetchNotificationUsage, getAllNotificationDispatches, NotificationSourceType, NotificationUsage,
} from '../../../api/notificationDispatchApi';
import { getAllClients } from '../../../api/clientsApi';
import { computeKpis, hermosilloMonthKey, inDateRange, inMonth, matchesSearch, toRow, whatsappQuota } from './NotificationStats';
import type { ChannelFilter, DateFilter, DeliveryFilter, DispatchRow } from './NotificationDispatchLogTypes';

export const useNotificationDispatchLog = () => {
  const { companyId } = useUser();
  const { showToast, toastProps } = useToast({ defaultColor: 'danger' });

  const [rows, setRows] = useState<DispatchRow[]>([]);
  const [usage, setUsage] = useState<NotificationUsage | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selected, setSelected] = useState<DispatchRow | null>(null);
  const [sourceFilter, setSourceFilter] = useState<NotificationSourceType | 'all'>('all');
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>('all');
  const [deliveryFilter, setDeliveryFilter] = useState<DeliveryFilter>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      // Names and provider usage are nice-to-have: their failure must not hide the messages.
      const [data, clients, providerUsage] = await Promise.all([
        getAllNotificationDispatches(companyId),
        getAllClients().catch(() => []),
        fetchNotificationUsage(),
      ]);
      const names = new Map(clients.map(c => [c.clientId, `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim()]));
      setRows(data
        .map(d => toRow(d, d.recipientType === 'client' ? names.get(d.recipientId) ?? '' : ''))
        .sort((a, b) => b.notificationDispatchId - a.notificationDispatchId));
      setUsage(providerUsage);
      setLastUpdated(new Date());
    } catch (err) {
      showToast((err as Error).message || 'No se pudo cargar el historial de notificaciones');
    } finally {
      setLoading(false);
    }
  }, [companyId, showToast]);

  useIonViewWillEnter(() => { load(); });

  useEffect(() => onDataChanged((reason) => {
    if (reason === 'notification_dispatched') load();
  }), [load]);

  const monthKey = hermosilloMonthKey(new Date().toISOString());
  const monthRows = useMemo(() => inMonth(rows, monthKey), [rows, monthKey]);
  const kpis = useMemo(() => computeKpis(monthRows), [monthRows]);
  const ourWhatsapp = useMemo(() => whatsappQuota(monthRows), [monthRows]);

  const filtered = useMemo(() => rows.filter(r =>
    (sourceFilter === 'all' || r.sourceType === sourceFilter)
    && (channelFilter === 'all' || r.selectedChannel === channelFilter)
    && (deliveryFilter === 'all' || r.delivery === deliveryFilter)
    && inDateRange(r, dateFilter)
    && matchesSearch(r, search)), [rows, sourceFilter, channelFilter, deliveryFilter, dateFilter, search]);

  return {
    loading, lastUpdated, filtered, kpis, usage, ourWhatsapp, total: rows.length, refresh: load, toastProps,
    selected, openDetail: setSelected, closeDetail: () => setSelected(null),
    search, setSearch,
    sourceFilter, setSourceFilter, channelFilter, setChannelFilter,
    deliveryFilter, setDeliveryFilter, dateFilter, setDateFilter,
  };
};

export type NotificationDispatchLogVM = ReturnType<typeof useNotificationDispatchLog>;

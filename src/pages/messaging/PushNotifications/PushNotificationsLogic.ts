import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useIonViewWillEnter } from '@ionic/react';
import { useUser } from '../../../contexts/UserContext';
import { useMediaQuery } from '../../../hooks/useMediaQuery';
import { useToast } from '../../../hooks/useToast';
import { notifyDataChanged, onDataChanged } from '../../../utils/refreshBus';
import { paginate } from '../../../utils/paging';
import { inPeriod, monthToDate } from '../../../utils/period';
import {
  createPushNotification, deletePushNotification, getAllPushNotifications, PushNotification, updatePushNotification,
} from '../../../api/pushNotificationsApi';
import {
  describeSendResult, draftToPayload, groupByDay, matchesPushSearch, matchesRead, pushKpis, recipientHistory, rowToDraft,
  sortPush, topMessages, unsentRoleCount, validateDraft,
} from './PushNotificationsStats';
import { EMPTY_DRAFT, PAGE_SIZE, PHONE_BATCH, TOP_MESSAGES } from './PushNotificationsConstants';
import type {
  ComposeDraft, ComposeErrors, CustomRange, PeriodFilter, PushDetailTab, PushSortKey, ReadFilter,
} from './PushNotificationsTypes';

/** Desktop shows the detail as a side drawer next to the dashboard; below this it is a modal. */
const DRAWER_QUERY = '(min-width: 992px)';
/** Below this the history is a native grouped list (swipe actions, infinite scroll), not a table. */
const PHONE_QUERY = '(max-width: 767px)';
const REFRESH_REASON = 'push_notification_changed';

export const usePushNotifications = () => {
  const { companyId } = useUser();
  const isDesktop = useMediaQuery(DRAWER_QUERY);
  const isPhone = useMediaQuery(PHONE_QUERY);
  const { showToast, toastProps } = useToast({ defaultColor: 'danger' });
  const historyRef = useRef<HTMLElement>(null);

  const [rows, setRows] = useState<PushNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [period, setPeriod] = useState<PeriodFilter>('month');
  const [customRange, setCustomRange] = useState<CustomRange>(monthToDate);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [readFilter, setReadFilter] = useState<ReadFilter>('all');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<PushSortKey>('newest');
  const [page, setPage] = useState(1);
  const [phoneVisible, setPhoneVisible] = useState(PHONE_BATCH);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  const [selected, setSelected] = useState<PushNotification | null>(null);
  const [detailTab, setDetailTab] = useState<PushDetailTab>('info');
  /** Row awaiting the delete confirmation (from the drawer or a swipe), apart from `selected`. */
  const [deleteTarget, setDeleteTarget] = useState<PushNotification | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Compose: new push, resend (a copy → sends again) or edit (record only, no push).
  const [composeOpen, setComposeOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<ComposeDraft>(EMPTY_DRAFT);
  const [errors, setErrors] = useState<ComposeErrors>({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      setRows(await getAllPushNotifications(companyId));
      setLastUpdated(new Date());
    } catch (err) {
      showToast((err as Error).message || 'No se pudieron cargar las notificaciones');
    } finally {
      setLoading(false);
    }
  }, [companyId, showToast]);

  useIonViewWillEnter(() => { load(); });
  useEffect(() => onDataChanged(() => { load(); }), [load]);

  // A refreshed row replaces the open one so the drawer never shows stale state.
  useEffect(() => {
    setSelected(prev => (prev ? rows.find(r => r.pushNotificationId === prev.pushNotificationId) ?? null : prev));
  }, [rows]);

  useEffect(() => {
    setPage(1);
    setPhoneVisible(PHONE_BATCH);
  }, [period, customRange, typeFilter, priorityFilter, readFilter, search, sortKey]);

  const periodRows = useMemo(() => rows.filter(r => inPeriod(r.created_At, period, new Date(), customRange)),
    [rows, period, customRange]);
  const kpis = useMemo(() => pushKpis(periodRows), [periodRows]);
  const groups = useMemo(() => topMessages(periodRows, TOP_MESSAGES), [periodRows]);
  const unsentRole = useMemo(() => unsentRoleCount(periodRows), [periodRows]);

  const filtered = useMemo(() => sortPush(periodRows.filter(r =>
    (typeFilter === 'all' || r.notificationType === typeFilter)
    && (priorityFilter === 'all' || r.priority === priorityFilter)
    && matchesRead(r, readFilter)
    && matchesPushSearch(r, search)), sortKey), [periodRows, typeFilter, priorityFilter, readFilter, search, sortKey]);
  const pageData = useMemo(() => paginate(filtered, page, PAGE_SIZE), [filtered, page]);
  const dayGroups = useMemo(() => groupByDay(filtered.slice(0, phoneVisible)), [filtered, phoneVisible]);
  const canLoadMore = phoneVisible < filtered.length;
  const loadMore = (ev: CustomEvent<void>) => {
    setPhoneVisible(v => v + PHONE_BATCH);
    (ev.target as HTMLIonInfiniteScrollElement).complete();
  };
  /** Badge on the phone filter button: Tipo / Prioridad / Orden that differ from the default. */
  const activeFilters = [typeFilter !== 'all', priorityFilter !== 'all', sortKey !== 'newest'].filter(Boolean).length;
  const resetFilters = () => {
    setTypeFilter('all');
    setPriorityFilter('all');
    setSortKey('newest');
  };
  const history = useMemo(() => (selected ? recipientHistory(rows, selected) : []), [rows, selected]);

  /** KPI / top-message clicks: reset the list filters, apply one, show the list. */
  const showInList = (next: { read?: ReadFilter; search?: string }) => {
    setTypeFilter('all');
    setPriorityFilter('all');
    setReadFilter(next.read ?? 'all');
    setSearch(next.search ?? '');
    historyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const openDetail = (row: PushNotification) => {
    if (row.pushNotificationId !== selected?.pushNotificationId) setDetailTab('info');
    setSelected(row);
  };
  const closeDetail = () => setSelected(null);

  const openCompose = (from?: ComposeDraft, editId: number | null = null) => {
    setDraft(from ?? EMPTY_DRAFT);
    setEditingId(editId);
    setErrors({});
    setComposeOpen(true);
  };
  const openNew = () => openCompose();
  const openResend = () => selected && openCompose(rowToDraft(selected));
  /** Swipe actions on the phone list act on their own row. */
  const resendRow = (row: PushNotification) => openCompose(rowToDraft(row));
  const askDelete = (row: PushNotification) => setDeleteTarget(row);
  const openEdit = () => selected && openCompose(rowToDraft(selected), selected.pushNotificationId);
  const closeCompose = () => { if (!saving) setComposeOpen(false); };
  const updateDraft = (patch: Partial<ComposeDraft>) => setDraft(d => ({ ...d, ...patch }));

  const save = async () => {
    const found = validateDraft(draft);
    setErrors(found);
    if (Object.keys(found).length || !companyId) return;
    setSaving(true);
    try {
      const payload = draftToPayload(draft, companyId);
      if (editingId) {
        // action 2 only rewrites the stored record: the recipient's phone keeps the old text.
        await updatePushNotification(editingId, payload);
        showToast('Registro actualizado. No se volvió a enviar.', 'success');
      } else {
        const outcome = describeSendResult(await createPushNotification(payload));
        showToast(outcome.text, outcome.color);
      }
      setComposeOpen(false);
      notifyDataChanged(REFRESH_REASON);
    } catch (err) {
      showToast((err as Error).message || 'No se pudo guardar la notificación');
    } finally {
      setSaving(false);
    }
  };

  const removeTarget = async () => {
    const target = deleteTarget;
    if (!target || !companyId) return;
    setDeleting(true);
    try {
      await deletePushNotification(target.pushNotificationId, companyId);
      if (selected?.pushNotificationId === target.pushNotificationId) setSelected(null);
      showToast('Notificación eliminada.', 'success');
      notifyDataChanged(REFRESH_REASON);
    } catch (err) {
      showToast((err as Error).message || 'No se pudo eliminar la notificación');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
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
    loading, lastUpdated, refresh: load, toastProps, total: rows.length, isDesktop, isPhone, historyRef,
    period, setPeriod, customRange, setCustomRange,
    kpis, groups, unsentRole, showInList,
    filtered, pageData, setPage, sortKey, setSortKey, search, setSearch,
    dayGroups, canLoadMore, loadMore, filterSheetOpen, setFilterSheetOpen, activeFilters, resetFilters,
    typeFilter, setTypeFilter, priorityFilter, setPriorityFilter, readFilter, setReadFilter,
    selected, openDetail, closeDetail, detailTab, setDetailTab, history, copyText,
    deleteTarget, setDeleteTarget, askDelete, deleting, removeTarget, resendRow,
    composeOpen, editingId, draft, errors, saving, openNew, openResend, openEdit, closeCompose, updateDraft, save,
  };
};

export type PushNotificationsVM = ReturnType<typeof usePushNotifications>;

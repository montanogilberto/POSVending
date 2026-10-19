import { useCallback, useEffect, useRef, useState } from 'react';
import { useIonViewWillEnter } from '@ionic/react';
import { matchPath, useHistory, useLocation } from 'react-router-dom';
import { useUser } from '../../../contexts/UserContext';
import { canAccess } from '../../../config/rolePermissions';
import {
  fetchMyNotifications, markNotificationsRead, InboxNotification,
} from '../../../api/myNotificationsApi';
import { resolveNotificationRoute } from '../../../utils/routes';
import { onDataChanged } from '../../../utils/refreshBus';
import {
  DATA_LABELS, DEFAULT_ROUTE_LABEL, DETAIL_PATH, HIDDEN_DATA_KEYS,
  HIDDEN_DATA_PREFIXES, ROUTE_LABELS, SOURCE_TYPE_LABELS,
} from './NotificationDetailConstants';
import type {
  DetailRow, NotificationDetailInfo, NotificationTapState,
} from './NotificationDetailTypes';

const toId = (v: unknown): number | undefined => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

/** Lo que se puede mostrar solo con el payload del push (sin backend). */
function infoFromTap(tap: NotificationTapState | undefined, idFromPath?: number): NotificationDetailInfo {
  const data = tap?.data ?? {};
  // FCM agrega google.sent_time (ms) — mejor fecha que el momento del toque.
  const sentMs = Number(data['google.sent_time']);
  return {
    pushNotificationId: idFromPath ?? toId(data.pushNotificationId),
    title: tap?.title || data.title || 'Notificación',
    message: tap?.body || data.body || '',
    receivedAt: Number.isFinite(sentMs) && sentMs > 0 ? new Date(sentMs).toISOString() : tap?.tappedAt,
    navigationRoute: data.navigationRoute || undefined,
    data,
    fromInbox: false,
  };
}

/**
 * Busca el push tocado en la bandeja persistida. Hoy el backend no manda
 * pushNotificationId en `data`, así que sin id se empata por título+mensaje
 * (la bandeja viene de más nueva a más vieja); sin título (arranque en frío en
 * Android), por la ruta entre las no leídas.
 */
function findInboxMatch(items: InboxNotification[], info: NotificationDetailInfo, hasText: boolean) {
  if (info.pushNotificationId) return items.find(n => n.pushNotificationId === info.pushNotificationId);
  if (hasText) return items.find(n => n.title === info.title && (!info.message || n.message === info.message));
  return items.find(n => !n.isRead && (n.navigationRoute ?? '') === (info.navigationRoute ?? ''));
}

function relatedLabel(route: string): string {
  return ROUTE_LABELS.find(([prefix]) => route.startsWith(prefix))?.[1] ?? DEFAULT_ROUTE_LABEL;
}

export function useNotificationDetail() {
  const history = useHistory();
  const location = useLocation<NotificationTapState | undefined>();
  const { userId, roleCode, clientId } = useUser();

  const [info, setInfo] = useState<NotificationDetailInfo | null>(null);
  const [loading, setLoading] = useState(false);

  // Ionic mantiene la página montada: useLocation refleja la ruta GLOBAL, que
  // puede ser otra pantalla. Se guarda el último toque visto en esta ruta.
  const tapRef = useRef<{ key?: string; tap?: NotificationTapState; id?: number }>({});
  const inFlight = useRef(false);

  const captureTap = useCallback(() => {
    const m = matchPath<{ pushNotificationId?: string }>(location.pathname, { path: `${DETAIL_PATH}/:pushNotificationId?`, exact: true });
    if (!m) return false;
    const isNew = tapRef.current.key !== location.key;
    tapRef.current = { key: location.key, tap: location.state, id: toId(m.params.pushNotificationId) };
    return isNew;
  }, [location]);

  const load = useCallback(async () => {
    if (inFlight.current) return;
    const { tap, id } = tapRef.current;
    const base = infoFromTap(tap, id);
    setInfo(base);
    if (!userId) return;
    inFlight.current = true;
    setLoading(true);
    try {
      const { notifications } = await fetchMyNotifications(userId);
      const hit = findInboxMatch(notifications, base, !!(tap?.title || tap?.body));
      console.log('[NotificationDetail] load ←', JSON.stringify({ id: base.pushNotificationId, matched: hit?.pushNotificationId ?? null }));
      if (hit) {
        setInfo({
          ...base,
          pushNotificationId: hit.pushNotificationId,
          title: hit.title || base.title,
          message: hit.message || base.message,
          notificationType: hit.notificationType,
          priority: hit.priority,
          receivedAt: hit.receivedAt || base.receivedAt,
          navigationRoute: hit.navigationRoute || base.navigationRoute,
          fromInbox: true,
        });
        if (!hit.isRead) markNotificationsRead(userId, hit.pushNotificationId).catch(() => {});
      }
    } catch (e) {
      console.log('[NotificationDetail] load ❌', String(e));
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }, [userId]);

  // Un toque nuevo mientras la página ya está montada (misma ruta, otro state).
  useEffect(() => {
    if (captureTap()) load();
  }, [captureTap, load]);

  useIonViewWillEnter(() => { captureTap(); load(); }, [captureTap, load]);
  useEffect(() => onDataChanged(() => { if (tapRef.current.key) load(); }), [load]);

  const relatedRoute = resolveNotificationRoute(info?.navigationRoute, canAccess(roleCode, 'clients'), clientId);

  const detailRows: DetailRow[] = Object.entries(info?.data ?? {})
    .filter(([k, v]) => v !== '' && !HIDDEN_DATA_KEYS.has(k) && !HIDDEN_DATA_PREFIXES.some(p => k.startsWith(p)))
    .map(([k, v]) => ({
      key: k,
      label: DATA_LABELS[k] ?? k,
      value: k === 'sourceType' ? (SOURCE_TYPE_LABELS[v.toLowerCase()] ?? v) : v,
    }));

  const openRelated = () => {
    console.log('[NotificationDetail] open related →', relatedRoute);
    if (relatedRoute) history.push(relatedRoute);
  };

  return {
    info,
    loading,
    detailRows,
    relatedRoute,
    relatedLabel: relatedRoute ? relatedLabel(relatedRoute) : '',
    openRelated,
    openInbox: () => history.push('/notifications'),
    refresh: load,
  };
}

export type NotificationDetailVM = ReturnType<typeof useNotificationDetail>;

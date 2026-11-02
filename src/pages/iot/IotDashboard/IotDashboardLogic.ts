import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useIonViewDidLeave, useIonViewWillEnter } from '@ionic/react';
import { useUser } from '../../../contexts/UserContext';
import { useToast } from '../../../hooks/useToast';
import { onDataChanged } from '../../../utils/refreshBus';
import { toHermosilloDate } from '../../../utils/format';
import {
  fetchLaundryDevices, fetchLaundryDeviceUses, MAX_DEVICE_USES,
  LaundryDevice, LaundryDeviceUse,
} from '../../../api/laundryDevicesApi';
import { INCOME_DAYS, POLL_MS, REJECT_REASON_LABEL } from './IotDashboardConstants';
import type {
  DailyIncome, DeviceIncome, DeviceRow, DeviceState, ErrorLogEntry, IotKpis,
} from './IotDashboardTypes';

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

/** YYYY-MM-DD of the Hermosillo day a UTC timestamp falls in. */
const hmoDay = (utc: string) => toHermosilloDate(utc).toISOString().slice(0, 10);

const utcMs = (s: string) => new Date(s.includes('Z') || s.includes('+') ? s : `${s}Z`).getTime();

const deviceState = (d: LaundryDevice, countingDown: boolean): DeviceState => {
  if (!d.isActive) return 'inactive';
  if (!d.isOnline) return 'offline';
  if ((d.lastStatus ?? '').toLowerCase() === 'error') return 'error';
  if (countingDown || (d.lastStatus ?? '').toLowerCase() === 'running') return 'running';
  return 'idle';
};

/** Tablero IOT: máquinas ESP32 en uso, KPIs, bitácora de errores e ingresos. */
export const useIotDashboard = () => {
  const { companyId } = useUser();
  const { showToast, toastProps } = useToast({ defaultColor: 'danger' });

  const [devices, setDevices] = useState<LaundryDevice[]>([]);
  const [uses, setUses] = useState<LaundryDeviceUse[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const inFlight = useRef<AbortController | null>(null);
  const pollId = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    if (!companyId) return;
    inFlight.current?.abort();
    const controller = new AbortController();
    inFlight.current = controller;
    setLoading(true);
    try {
      const [devs, us] = await Promise.all([
        fetchLaundryDevices(companyId, controller.signal),
        fetchLaundryDeviceUses(companyId, MAX_DEVICE_USES, controller.signal),
      ]);
      if (controller.signal.aborted) return;
      setDevices(devs);
      setUses(us);
      setLoadFailed(false);
      setUpdatedAt(new Date());
      setNow(Date.now());
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return;
      console.log('[IotDashboard] load failed:', err);
      setLoadFailed(true);
      showToast('No se pudo cargar el tablero de máquinas.');
    } finally {
      if (inFlight.current === controller) {
        setLoading(false);
        setLoadedOnce(true);
      }
    }
  }, [companyId, showToast]);

  const stopPolling = () => {
    if (pollId.current) clearInterval(pollId.current);
    pollId.current = null;
  };

  useIonViewWillEnter(() => {
    load();
    stopPolling();
    pollId.current = setInterval(load, POLL_MS);
  }, [load]);

  useIonViewDidLeave(() => {
    stopPolling();
    inFlight.current?.abort();
  });

  useEffect(() => onDataChanged(() => { load(); }), [load]);
  useEffect(() => () => { stopPolling(); inFlight.current?.abort(); }, []);

  const todayKey = hmoDay(new Date(now).toISOString());

  const rows: DeviceRow[] = useMemo(() => {
    return devices.map(device => {
      const mine = uses.filter(u => u.deviceId === device.deviceId);
      const lastUse = mine[0] ?? null;
      const lastAuthorized = mine.find(u => u.status === 'authorized') ?? null;
      let minutesLeft: number | null = null;
      if (lastAuthorized) {
        const start = utcMs(lastAuthorized.settled_At ?? lastAuthorized.created_At);
        const left = Math.ceil((start + device.cycleMinutes * MINUTE - now) / MINUTE);
        if (left > 0) minutesLeft = left;
      }
      const today = mine.filter(u => u.status === 'authorized' && hmoDay(u.created_At) === todayKey);
      return {
        device,
        state: deviceState(device, minutesLeft != null),
        minutesLeft,
        lastUse,
        incomeToday: today.reduce((s, u) => s + Number(u.amountMXN || 0), 0),
        usesToday: today.length,
      };
    });
  }, [devices, uses, now, todayKey]);

  const periodStartMs = now - (INCOME_DAYS - 1) * DAY;
  const periodKeys = useMemo(() => {
    const keys: string[] = [];
    for (let i = INCOME_DAYS - 1; i >= 0; i--) keys.push(hmoDay(new Date(now - i * DAY).toISOString()));
    return keys;
  }, [now]);

  const authorized = useMemo(() => uses.filter(u => u.status === 'authorized'), [uses]);

  const daily: DailyIncome[] = useMemo(() => {
    const byDay = new Map(periodKeys.map(k => [k, { day: k, total: 0, uses: 0 }]));
    authorized.forEach(u => {
      const row = byDay.get(hmoDay(u.created_At));
      if (row) { row.total += Number(u.amountMXN || 0); row.uses += 1; }
    });
    return Array.from(byDay.values());
  }, [authorized, periodKeys]);

  const byDevice: DeviceIncome[] = useMemo(() => {
    const inPeriod = new Set(periodKeys);
    const map = new Map<number, DeviceIncome>();
    authorized.forEach(u => {
      if (!inPeriod.has(hmoDay(u.created_At))) return;
      const row = map.get(u.deviceId) ?? { deviceId: u.deviceId, name: u.deviceName, total: 0, uses: 0 };
      row.total += Number(u.amountMXN || 0);
      row.uses += 1;
      map.set(u.deviceId, row);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [authorized, periodKeys]);

  const recentUses = useMemo(() => uses.slice(0, 20), [uses]);

  const errorLog: ErrorLogEntry[] = useMemo(() => {
    const entries: ErrorLogEntry[] = [];
    rows.forEach(({ device, state }) => {
      if (state === 'offline') {
        entries.push({
          key: `off-${device.deviceId}`, kind: 'offline', deviceName: device.name,
          atUtc: device.lastSeenAtUtc,
          detail: device.lastSeenAtUtc ? 'Sin heartbeat en más de 3 min' : 'Nunca se ha conectado',
        });
      } else if (state === 'error') {
        entries.push({
          key: `err-${device.deviceId}`, kind: 'device_error', deviceName: device.name,
          atUtc: device.lastSeenAtUtc, detail: 'La máquina reportó estado de error',
        });
      }
    });
    uses.filter(u => u.status === 'rejected').slice(0, 50).forEach(u => {
      entries.push({
        key: `rej-${u.useId}`, kind: 'rejected', deviceName: u.deviceName,
        atUtc: u.created_At,
        detail: `${REJECT_REASON_LABEL[u.reason ?? ''] ?? u.reason ?? 'Cobro rechazado'}`
          + ` · ${u.choiceName ?? 'ciclo'} · cliente #${u.clientId}`,
      });
    });
    return entries.sort((a, b) => (b.atUtc ? utcMs(b.atUtc) : Infinity) - (a.atUtc ? utcMs(a.atUtc) : Infinity));
  }, [rows, uses]);

  const kpis: IotKpis = useMemo(() => {
    const active = rows.filter(r => r.device.isActive);
    const todayRejected = uses.filter(u => u.status === 'rejected' && hmoDay(u.created_At) === todayKey);
    const incomeToday = rows.reduce((s, r) => s + r.incomeToday, 0);
    const usesToday = rows.reduce((s, r) => s + r.usesToday, 0);
    return {
      online: active.filter(r => r.device.isOnline).length,
      activeDevices: active.length,
      inUse: rows.filter(r => r.state === 'running').length,
      withErrors: rows.filter(r => r.state === 'error' || r.state === 'offline').length,
      incomeToday,
      usesToday,
      avgTicketToday: usesToday ? incomeToday / usesToday : 0,
      rejectedToday: todayRejected.length,
      incomePeriod: daily.reduce((s, d) => s + d.total, 0),
      usesPeriod: daily.reduce((s, d) => s + d.uses, 0),
    };
  }, [rows, uses, daily, todayKey]);

  /** The list is capped: when it is full and older than the window start, old days are incomplete. */
  const incomesTruncated = uses.length >= MAX_DEVICE_USES
    && utcMs(uses[uses.length - 1].created_At) > periodStartMs;

  return {
    companyId,
    loading,
    firstLoad: loading && !loadedOnce,
    loadFailed,
    updatedAt,
    reload: load,
    toastProps,
    rows,
    kpis,
    daily,
    byDevice,
    recentUses,
    errorLog,
    incomesTruncated,
  };
};

export type IotDashboardVM = ReturnType<typeof useIotDashboard>;

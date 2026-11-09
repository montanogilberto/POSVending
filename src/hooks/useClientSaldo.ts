import { useCallback, useEffect, useRef, useState } from 'react';
import { useIonViewWillEnter } from '@ionic/react';
import { getLaundryBalance } from '../api/laundryWalletApi';
import { onDataChanged } from '../utils/refreshBus';

/** The POS "mostrador" placeholder: it has no saldo of its own. */
const WALK_IN_CLIENT_ID = 1;

/**
 * Saldo prepago de un cliente (walletTransactions — el que cobran las máquinas y
 * se recarga con "Abonar"). Sólo lectura: pagar con saldo en el POS es RFC-011.
 * null = sin cliente, cargando o sin dato; nunca muestra $0 antes de saberlo.
 */
export const useClientSaldo = (companyId: number, clientId: number | null | undefined) => {
  const [saldo, setSaldo] = useState<number | null>(null);
  const [saldoLoading, setSaldoLoading] = useState(false);
  const [saldoError, setSaldoError] = useState(false);
  // Only the newest request may write state (switching clients quickly).
  const seq = useRef(0);
  const active = !!companyId && !!clientId && clientId !== WALK_IN_CLIENT_ID;

  const load = useCallback(async (silent = false) => {
    const mine = ++seq.current;
    if (!active) {
      setSaldo(null);
      setSaldoLoading(false);
      setSaldoError(false);
      return;
    }
    if (!silent) {
      setSaldoLoading(true);
      setSaldoError(false);
    }
    try {
      const value = await getLaundryBalance(companyId, clientId as number);
      if (mine === seq.current) setSaldo(value);
    } catch (err) {
      console.log('[useClientSaldo] balance failed:', String(err));
      if (mine === seq.current && !silent) setSaldoError(true);
    } finally {
      if (mine === seq.current && !silent) setSaldoLoading(false);
    }
  }, [active, companyId, clientId]);

  useEffect(() => { setSaldo(null); load(); }, [load]);
  useIonViewWillEnter(() => { load(true); });
  useEffect(() => onDataChanged(() => { load(true); }), [load]);

  return { saldo, saldoLoading, saldoError, saldoAvailable: active };
};

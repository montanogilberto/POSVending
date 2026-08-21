/**
 * useBlackjack — ViewModel de la mesa de blackjack (MVVM).
 *
 * Aqui NO se reparte ni se decide nada: el servidor tiene la baraja y resuelve
 * la mano. Este hook solo abre la ronda, manda la intencion del jugador
 * ("pido", "me planto", "doblo") y pinta lo que responde el backend.
 */
import { useCallback, useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useIonViewWillEnter } from '@ionic/react';
import { useUser } from '../../../contexts/UserContext';
import { useToast } from '../../../hooks/useToast';
import { notifyDataChanged, onDataChanged } from '../../../utils/refreshBus';
import {
  getArcadeGames, getArcadeWallet, openRound, playAction, findOpenRound, ArcadeError,
} from '../../../api/arcadeApi';
import type {
  ArcadeGame, ArcadeWallet, BlackjackState, RoundResult,
} from '../../../api/arcadeApi';

const GAME_KEY = 'blackjack' as const;

export function useBlackjack() {
  const history = useHistory();
  const { clientId, companyId } = useUser();
  const { showToast, toastProps } = useToast();

  const [game, setGame] = useState<ArcadeGame | null>(null);
  const [wallet, setWallet] = useState<ArcadeWallet | null>(null);
  const [loading, setLoading] = useState(true);

  const [bet, setBet] = useState(50);
  const [roundId, setRoundId] = useState<number | null>(null);
  const [state, setState] = useState<BlackjackState | null>(null);
  const [result, setResult] = useState<RoundResult | null>(null);

  /** Que accion esta en vuelo, para deshabilitar solo ese boton (CLAUDE.md §4.3). */
  const [pending, setPending] = useState<'deal' | 'hit' | 'stand' | 'double' | null>(null);

  const [fairOpen, setFairOpen] = useState(false);
  const [fair, setFair] = useState<{ serverSeedHash?: string; serverSeed?: string; clientSeed?: string; nonce?: number }>({});

  const load = useCallback(async () => {
    if (!clientId || !companyId) { setLoading(false); return; }
    try {
      const [catalog, purse] = await Promise.all([
        getArcadeGames(companyId),
        getArcadeWallet(companyId, clientId),
      ]);
      const found = catalog.find(g => g.gameKey === GAME_KEY) ?? null;
      setGame(found);
      setWallet(purse);
      // Arrancar en la apuesta minima evita el rechazo del backend cuando el
      // valor por defecto queda fuera del rango del catalogo.
      if (found) setBet(b => Math.min(Math.max(b, found.minBet), found.maxBet));

      // Si la app se fue a segundo plano a media mano, la ronda sigue abierta
      // y el backend rechaza repartir otra. La mano se retoma tal cual estaba:
      // el estado autoritativo nunca estuvo aqui, siempre estuvo en el servidor.
      const stale = await findOpenRound<BlackjackState>(companyId, clientId, GAME_KEY);
      if (stale?.state) {
        setRoundId(stale.roundId);
        setState(stale.state);
        setBet(stale.betAmount);
        setFair({
          serverSeedHash: stale.serverSeedHash, serverSeed: stale.serverSeed,
          clientSeed: stale.clientSeed, nonce: stale.nonce,
        });
      }
    } catch (err) {
      console.log('[Blackjack] no se pudo cargar', err);
      showToast('No se pudo cargar la mesa', 'danger');
    }
    setLoading(false);
  }, [clientId, companyId, showToast]);

  useIonViewWillEnter(() => { void load(); });
  useEffect(() => onDataChanged(() => { void load(); }), [load]);

  const failWith = (err: unknown, fallback: string) => {
    const message = err instanceof ArcadeError ? err.message : fallback;
    showToast(message, 'danger');
  };

  const deal = async () => {
    if (!clientId || !companyId || pending) return;
    setPending('deal');
    setResult(null);
    try {
      const res = await openRound<BlackjackState>(companyId, clientId, GAME_KEY, bet);
      setRoundId(res.roundId);
      setState(res.state);
      setFair({
        serverSeedHash: res.serverSeedHash, serverSeed: res.serverSeed,
        clientSeed: res.clientSeed, nonce: res.nonce,
      });
      setWallet(w => (w ? { ...w, coinBalance: res.coinBalance } : w));

      // Un natural cierra la mano en el mismo viaje: no hay turno que jugar.
      if (res.roundStatus === 'settled' && res.result) {
        setResult(res.result);
        setRoundId(null);
        notifyDataChanged('arcade-round');
        await load();
      }
    } catch (err) {
      failWith(err, 'No se pudo repartir');
    }
    setPending(null);
  };

  const act = async (action: 'hit' | 'stand' | 'double') => {
    if (!roundId || !clientId || pending) return;
    setPending(action);
    try {
      const res = await playAction<BlackjackState>(roundId, clientId, action);
      setState(res.state);
      if (res.roundStatus === 'settled') {
        setResult(res.result ?? null);
        setRoundId(null);
        setFair(f => ({ ...f, serverSeed: res.serverSeed, serverSeedHash: res.serverSeedHash ?? f.serverSeedHash }));
        if (res.coinBalance !== undefined) {
          setWallet(w => (w ? { ...w, coinBalance: res.coinBalance! } : w));
        }
        notifyDataChanged('arcade-round');
        await load();
      }
    } catch (err) {
      failWith(err, 'No se pudo jugar esa acción');
    }
    setPending(null);
  };

  const playAgain = () => {
    setResult(null);
    setState(null);
    void deal();
  };

  const closeResult = () => {
    setResult(null);
    setState(null);
  };

  const coinBalance = wallet?.coinBalance ?? 0;
  const inHand = roundId !== null && !!state;

  return {
    history, loading, game, wallet, coinBalance,
    bet, setBet, state, result, inHand, pending,
    deal, act, playAgain, closeResult,
    fair, fairOpen, setFairOpen,
    toastProps,
  };
}

export type BlackjackVM = ReturnType<typeof useBlackjack>;

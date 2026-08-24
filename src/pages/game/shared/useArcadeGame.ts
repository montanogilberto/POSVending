/**
 * useArcadeGame — ViewModel compartido de los juegos del arcade (MVVM).
 *
 * Los diez juegos hacen lo mismo alrededor del tablero: cargar el catalogo y
 * el monedero, abrir la ronda con la apuesta, mandar acciones, liquidar y
 * revelar la semilla. Solo cambia lo que se PINTA. Este hook concentra esa
 * parte comun; blackjack y el topo conservan hooks propios porque tienen
 * reglas de mesa y un bucle de animacion que no comparte nadie.
 *
 * Aqui NO se decide ningun resultado: el servidor tiene el estado autoritativo
 * y este hook solo declara intenciones y pinta lo que responde.
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
  ArcadeGame, ArcadeWallet, GameKey, RoundResult,
} from '../../../api/arcadeApi';
import { gameLog, gameNow, gameMs } from './gameLog';

export function useArcadeGame<S>(gameKey: GameKey) {
  const history = useHistory();
  const { clientId, companyId } = useUser();
  const { showToast, toastProps } = useToast();

  const [game, setGame] = useState<ArcadeGame | null>(null);
  const [wallet, setWallet] = useState<ArcadeWallet | null>(null);
  const [loading, setLoading] = useState(true);

  const [bet, setBet] = useState(50);
  const [roundId, setRoundId] = useState<number | null>(null);
  const [state, setState] = useState<S | null>(null);
  const [result, setResult] = useState<RoundResult | null>(null);
  /** Accion en vuelo, para deshabilitar solo ese boton (CLAUDE.md §4.3). */
  const [pending, setPending] = useState<string | null>(null);

  const [fairOpen, setFairOpen] = useState(false);
  const [fair, setFair] = useState<{
    serverSeedHash?: string; serverSeed?: string; clientSeed?: string; nonce?: number;
  }>({});

  const load = useCallback(async () => {
    if (!clientId || !companyId) { setLoading(false); return; }
    try {
      const [catalog, purse] = await Promise.all([
        getArcadeGames(companyId),
        getArcadeWallet(companyId, clientId),
      ]);
      const found = catalog.find(g => g.gameKey === gameKey) ?? null;
      setGame(found);
      setWallet(purse);
      if (found) setBet(b => Math.min(Math.max(b, found.minBet), found.maxBet));

      // Si la app se fue a segundo plano a media ronda, el backend rechaza
      // abrir otra (round_in_progress). Se retoma en vez de dejar al jugador
      // encerrado fuera del juego.
      gameLog(gameKey, 'load', {
        rtp: found?.rtp, minBet: found?.minBet, maxBet: found?.maxBet,
        coinBalance: purse?.coinBalance,
      });

      const stale = await findOpenRound<S>(companyId, clientId, gameKey);
      if (stale?.state) {
        gameLog(gameKey, 'resume', { roundId: stale.roundId, betAmount: stale.betAmount });
        setRoundId(stale.roundId);
        setState(stale.state);
        setBet(stale.betAmount);
        setFair({
          serverSeedHash: stale.serverSeedHash, serverSeed: stale.serverSeed,
          clientSeed: stale.clientSeed, nonce: stale.nonce,
        });
      } else {
        gameLog(gameKey, 'resume:none');
      }
    } catch (err) {
      gameLog(gameKey, 'load:error', err);
      showToast('No se pudo cargar el juego', 'danger');
    }
    setLoading(false);
  }, [clientId, companyId, gameKey, showToast]);

  useIonViewWillEnter(() => { void load(); });
  useEffect(() => onDataChanged(() => { void load(); }), [load]);

  const fail = (err: unknown, fallback: string) =>
    showToast(err instanceof ArcadeError ? err.message : fallback, 'danger');

  /** Abre la ronda. `options` son las decisiones previas al resultado. */
  const start = async (options?: Record<string, unknown>) => {
    if (!clientId || !companyId || pending) return;
    setPending('bet');
    setResult(null);
    const t0 = gameNow();
    gameLog(gameKey, 'bet', { bet, options });
    try {
      const res = await openRound<S>(companyId, clientId, gameKey, bet, options);
      setFair({
        serverSeedHash: res.serverSeedHash, serverSeed: res.serverSeed,
        clientSeed: res.clientSeed, nonce: res.nonce,
      });
      setWallet(w => (w ? { ...w, coinBalance: res.coinBalance } : w));
      setState(res.state);

      // Los juegos de un tiro se liquidan en la misma respuesta.
      if (res.roundStatus === 'settled') {
        gameLog(gameKey, 'bet:settled', {
          roundId: res.roundId, ms: gameMs(t0),
          outcome: res.result?.outcome, multiplier: res.result?.multiplier,
          net: res.result?.netAmount, coinBalance: res.coinBalance,
        });
        setResult(res.result ?? null);
        setRoundId(null);
        notifyDataChanged('arcade-round');
        await load();
      } else {
        gameLog(gameKey, 'bet:open', {
          roundId: res.roundId, ms: gameMs(t0),
          coinBalance: res.coinBalance, state: res.state,
        });
        setRoundId(res.roundId);
      }
    } catch (err) {
      gameLog(gameKey, 'bet:error', err);
      fail(err, 'No se pudo abrir la ronda');
    }
    setPending(null);
  };

  const act = async (action: string, payload?: unknown) => {
    if (!roundId || !clientId || pending) return;
    setPending(action);
    const t0 = gameNow();
    gameLog(gameKey, 'action', { roundId, action, payload });
    try {
      const res = await playAction<S>(roundId, clientId, action, payload);
      setState(res.state);
      if (res.roundStatus === 'settled') {
        gameLog(gameKey, 'action:settled', {
          roundId, action, ms: gameMs(t0),
          outcome: res.result?.outcome, multiplier: res.result?.multiplier,
          net: res.result?.netAmount, coinBalance: res.coinBalance,
        });
        setResult(res.result ?? null);
        setRoundId(null);
        setFair(f => ({ ...f, serverSeed: res.serverSeed, serverSeedHash: res.serverSeedHash ?? f.serverSeedHash }));
        if (res.coinBalance !== undefined) {
          setWallet(w => (w ? { ...w, coinBalance: res.coinBalance! } : w));
        }
        notifyDataChanged('arcade-round');
        await load();
      } else {
        gameLog(gameKey, 'action:open', { roundId, action, ms: gameMs(t0), state: res.state });
      }
    } catch (err) {
      gameLog(gameKey, 'action:error', err);
      fail(err, 'No se pudo jugar esa acción');
    }
    setPending(null);
  };

  const reset = () => { setResult(null); setState(null); };

  return {
    history, loading, game, wallet,
    coinBalance: wallet?.coinBalance ?? 0,
    bet, setBet, state, result, pending,
    inRound: roundId !== null,
    start, act, reset,
    fair, fairOpen, setFairOpen,
    toastProps,
  };
}

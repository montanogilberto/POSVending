/**
 * useMole — ViewModel de "Atrapa al Topo" (MVVM).
 *
 * El calendario de topos lo genera el SERVIDOR a partir de la semilla y llega
 * en la respuesta de la apuesta; aqui solo se reproduce contra el reloj y se
 * registran los golpes. Al terminar se mandan los golpes y el servidor los
 * valida uno por uno contra ese mismo calendario: un golpe a un topo que no
 * existio, repetido, o con un tiempo de reaccion imposible, no cuenta. Por eso
 * el marcador que se pinta aqui es provisional hasta que el backend responde.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useIonViewWillEnter, useIonViewWillLeave } from '@ionic/react';
import { useUser } from '../../../contexts/UserContext';
import { useToast } from '../../../hooks/useToast';
import { notifyDataChanged, onDataChanged } from '../../../utils/refreshBus';
import {
  getArcadeGames, getArcadeWallet, openRound, playAction, findOpenRound, ArcadeError,
} from '../../../api/arcadeApi';
import type {
  ArcadeGame, ArcadeWallet, MoleState, RoundResult,
} from '../../../api/arcadeApi';

const GAME_KEY = 'mole' as const;

interface Hit { i: number; reactionMs: number }

export function useMole() {
  const history = useHistory();
  const { clientId, companyId } = useUser();
  const { showToast, toastProps } = useToast();

  const [game, setGame] = useState<ArcadeGame | null>(null);
  const [wallet, setWallet] = useState<ArcadeWallet | null>(null);
  const [loading, setLoading] = useState(true);

  const [bet, setBet] = useState(50);
  const [roundId, setRoundId] = useState<number | null>(null);
  const [schedule, setSchedule] = useState<MoleState | null>(null);
  const [result, setResult] = useState<RoundResult | null>(null);
  const [starting, setStarting] = useState(false);
  const [settling, setSettling] = useState(false);

  /** Topos visibles ahora mismo, por indice de hoyo. */
  const [upHoles, setUpHoles] = useState<Record<number, number>>({});
  const [elapsed, setElapsed] = useState(0);
  const [localScore, setLocalScore] = useState(0);

  const [fairOpen, setFairOpen] = useState(false);
  const [fair, setFair] = useState<{ serverSeedHash?: string; serverSeed?: string; clientSeed?: string; nonce?: number }>({});

  // Refs y no estado: el bucle de animacion corre a 60 fps y no debe provocar
  // un render por golpe registrado ni leer valores rancios del cierre.
  const rafRef = useRef<number | null>(null);
  const startedAtRef = useRef(0);
  const hitsRef = useRef<Hit[]>([]);
  const hitIndexRef = useRef<Set<number>>(new Set());

  const stopLoop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

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
      if (found) setBet(b => Math.min(Math.max(b, found.minBet), found.maxBet));

      // Una ronda de reflejos no se puede retomar: la ventana de 20 s ya paso.
      // Se cierra con los golpes que haya (ninguno) para que el jugador no
      // quede encerrado fuera del juego por round_in_progress.
      const stale = await findOpenRound<MoleState>(companyId, clientId, GAME_KEY);
      if (stale) {
        try {
          await playAction<MoleState>(stale.roundId, clientId, 'finish', { hits: [] });
          showToast('Se cerró una ronda que dejaste a medias', 'warning');
          const refreshed = await getArcadeWallet(companyId, clientId);
          setWallet(refreshed);
        } catch {
          // too_early: la ronda sigue viva y aun no cumple sus 20 s. Se cierra
          // sola en la siguiente entrada; no hay nada que hacer todavia.
          showToast('Tienes una ronda sin terminar; inténtalo en un momento', 'warning');
        }
      }
    } catch (err) {
      console.log('[Mole] no se pudo cargar', err);
      showToast('No se pudo cargar el juego', 'danger');
    }
    setLoading(false);
  }, [clientId, companyId, showToast]);

  useIonViewWillEnter(() => { void load(); });
  useEffect(() => onDataChanged(() => { void load(); }), [load]);

  // Salir a media ronda deja la apuesta debitada y la ronda abierta; load() la
  // cierra en la siguiente entrada (arriba). Aqui solo se apaga el bucle, que
  // de otro modo seguiria corriendo sobre una pagina que Ionic deja montada.
  useIonViewWillLeave(() => stopLoop());
  useEffect(() => stopLoop, [stopLoop]);

  const finish = useCallback(async (currentRoundId: number) => {
    stopLoop();
    setSettling(true);
    try {
      const res = await playAction<MoleState>(currentRoundId, clientId, 'finish', {
        hits: hitsRef.current,
      });
      setResult(res.result ?? null);
      setRoundId(null);
      setUpHoles({});
      setFair(f => ({ ...f, serverSeed: res.serverSeed, serverSeedHash: res.serverSeedHash ?? f.serverSeedHash }));
      if (res.coinBalance !== undefined) {
        setWallet(w => (w ? { ...w, coinBalance: res.coinBalance! } : w));
      }
      notifyDataChanged('arcade-round');
      await load();
    } catch (err) {
      const message = err instanceof ArcadeError ? err.message : 'No se pudo cerrar la ronda';
      showToast(message, 'danger');
    }
    setSettling(false);
  }, [clientId, load, showToast, stopLoop]);

  const runLoop = useCallback((state: MoleState, currentRoundId: number) => {
    startedAtRef.current = performance.now();

    const tick = () => {
      const now = performance.now() - startedAtRef.current;
      setElapsed(now);

      // Un topo esta fuera durante [atMs, atMs + upMs). El mapa va por hoyo
      // porque el jugador toca un hoyo, no un indice de topo.
      const visible: Record<number, number> = {};
      for (const spawn of state.spawns) {
        if (now >= spawn.atMs && now < spawn.atMs + spawn.upMs && !hitIndexRef.current.has(spawn.i)) {
          visible[spawn.hole] = spawn.i;
        }
      }
      setUpHoles(visible);

      if (now >= state.roundMs) {
        void finish(currentRoundId);
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
  }, [finish]);

  const start = async () => {
    if (!clientId || !companyId || starting) return;
    setStarting(true);
    setResult(null);
    hitsRef.current = [];
    hitIndexRef.current = new Set();
    setLocalScore(0);
    setElapsed(0);
    try {
      const res = await openRound<MoleState>(companyId, clientId, GAME_KEY, bet);
      setRoundId(res.roundId);
      setSchedule(res.state);
      setFair({
        serverSeedHash: res.serverSeedHash, serverSeed: res.serverSeed,
        clientSeed: res.clientSeed, nonce: res.nonce,
      });
      setWallet(w => (w ? { ...w, coinBalance: res.coinBalance } : w));
      runLoop(res.state, res.roundId);
    } catch (err) {
      const message = err instanceof ArcadeError ? err.message : 'No se pudo iniciar la ronda';
      showToast(message, 'danger');
    }
    setStarting(false);
  };

  /** Golpe a un hoyo. Solo cuenta si hay topo fuera ahi en este instante. */
  const whack = (hole: number) => {
    const spawnIndex = upHoles[hole];
    if (spawnIndex === undefined || !schedule) return;
    if (hitIndexRef.current.has(spawnIndex)) return;

    const spawn = schedule.spawns.find(s => s.i === spawnIndex);
    if (!spawn) return;

    const now = performance.now() - startedAtRef.current;
    hitIndexRef.current.add(spawnIndex);
    hitsRef.current.push({ i: spawnIndex, reactionMs: Math.round(now - spawn.atMs) });
    setLocalScore(s => s + 1);
    setUpHoles(prev => {
      const next = { ...prev };
      delete next[hole];
      return next;
    });
  };

  const playAgain = () => {
    setResult(null);
    void start();
  };

  const coinBalance = wallet?.coinBalance ?? 0;
  const playing = roundId !== null;
  const totalSpawns = schedule?.totalSpawns ?? 0;
  const remainingMs = schedule ? Math.max(0, schedule.roundMs - elapsed) : 0;

  return {
    history, loading, game, wallet, coinBalance,
    bet, setBet, schedule, result, playing, starting, settling,
    upHoles, localScore, totalSpawns, remainingMs,
    start, whack, playAgain, closeResult: () => setResult(null),
    fair, fairOpen, setFairOpen,
    toastProps,
  };
}

export type MoleVM = ReturnType<typeof useMole>;

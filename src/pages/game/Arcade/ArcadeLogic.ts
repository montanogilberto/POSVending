/**
 * useArcade — ViewModel del dashboard del arcade (MVVM).
 * Todo el estado y las llamadas viven aqui; ArcadeView solo pinta.
 */
import { useCallback, useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useIonViewWillEnter } from '@ionic/react';
import { useUser } from '../../../contexts/UserContext';
import { useToast } from '../../../hooks/useToast';
import { onDataChanged, notifyDataChanged } from '../../../utils/refreshBus';
import {
  getArcadeGames, getArcadeWallet, getArcadeRounds, claimDailyBonus, getLiveWins,
  ArcadeError,
} from '../../../api/arcadeApi';
import type { LiveWin } from '../../../api/arcadeApi';
import type { ArcadeGame, ArcadeWallet, ArcadeRound, ArcadeTile, GameCategory } from './ArcadeTypes';
import { GAME_ROUTES, CATEGORY_ORDER } from './ArcadeConstants';

interface CategoryGroup {
  category: GameCategory;
  tiles: ArcadeTile[];
  /** Cuantos de esta categoria se pueden abrir hoy. */
  playable: number;
}

export function useArcade() {
  const history = useHistory();
  const { clientId, companyId } = useUser();
  const { showToast, toastProps } = useToast();

  const [games, setGames] = useState<ArcadeGame[]>([]);
  const [wallet, setWallet] = useState<ArcadeWallet | null>(null);
  const [rounds, setRounds] = useState<ArcadeRound[]>([]);
  const [liveWins, setLiveWins] = useState<LiveWin[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);

  const load = useCallback(async () => {
    if (!clientId || !companyId) {
      setLoading(false);
      return;
    }
    try {
      const [catalog, purse, recent, wins] = await Promise.all([
        getArcadeGames(companyId),
        getArcadeWallet(companyId, clientId),
        getArcadeRounds(companyId, clientId, 20),
        getLiveWins(companyId, 20),
      ]);
      setGames(catalog);
      setWallet(purse);
      setRounds(recent);
      setLiveWins(wins);
    } catch (err) {
      console.log('[Arcade] no se pudo cargar', err);
      showToast('No se pudo cargar el arcade', 'danger');
    }
    setLoading(false);
  }, [clientId, companyId, showToast]);

  // Ionic deja las paginas montadas: sin esto, el saldo se queda como estaba
  // cuando el jugador vuelve de una partida (CLAUDE.md §6).
  useIonViewWillEnter(() => { void load(); });
  useEffect(() => onDataChanged(() => { void load(); }), [load]);

  const claimBonus = async () => {
    if (!clientId || !companyId) return;
    setClaiming(true);
    try {
      const res = await claimDailyBonus(companyId, clientId);
      if (res.granted) {
        showToast(`+${res.amount} fichas de bono diario`);
        notifyDataChanged('arcade-bonus');
        await load();
      } else {
        showToast('Ya cobraste tu bono; vuelve mañana', 'warning');
      }
    } catch (err) {
      const message = err instanceof ArcadeError ? err.message : 'No se pudo cobrar el bono';
      showToast(message, 'danger');
    }
    setClaiming(false);
  };

  /**
   * Un tile es jugable solo si el catalogo lo habilita Y existe la pantalla.
   * La doble condicion evita mandar al jugador a una ruta que no existe si
   * alguien marca comingSoon = '0' en la base antes de que salga el juego.
   */
  const tiles: ArcadeTile[] = games.map(game => {
    const route = GAME_ROUTES[game.gameKey] ?? '';
    return { ...game, route, playable: game.comingSoon === '0' && !!route };
  });

  const openGame = (tile: ArcadeTile) => {
    if (!tile.playable) {
      showToast(`${tile.name} está en camino`, 'medium');
      return;
    }
    history.push(tile.route);
  };

  const coinBalance = wallet?.coinBalance ?? 0;
  const netLifetime = (wallet?.lifetimeWon ?? 0) - (wallet?.lifetimeWagered ?? 0);
  const playableCount = tiles.filter(t => t.playable).length;

  /**
   * Categorias agrupadas para la vista. Se separan las que tienen algo jugable
   * de las que estan todas bloqueadas porque cada grupo se pinta distinto: las
   * abiertas en filas anchas y las bloqueadas en rejilla compacta. Agrupar aqui
   * y no en el JSX mantiene la View sin logica (MVVM).
   */
  const byCategory: CategoryGroup[] = CATEGORY_ORDER
    .map(category => {
      const group = tiles.filter(t => t.category === category);
      return { category, tiles: group, playable: group.filter(t => t.playable).length };
    })
    .filter(g => g.tiles.length > 0);

  const openCategories = byCategory.filter(g => g.playable > 0);
  const lockedCategories = byCategory.filter(g => g.playable === 0);

  /** Todo lo jugable, para la fila "Originales" — los diez son propios. */
  const originals = tiles.filter(t => t.playable);

  /**
   * "Seguir jugando": los juegos que ESTE jugador toco mas recientemente,
   * derivados de su historial. No hace falta endpoint nuevo — las rondas ya
   * vienen ordenadas por fecha.
   */
  const recentlyPlayed: ArcadeTile[] = [];
  for (const round of rounds) {
    if (recentlyPlayed.some(t => t.gameKey === round.gameKey)) continue;
    const tile = tiles.find(t => t.gameKey === round.gameKey && t.playable);
    if (tile) recentlyPlayed.push(tile);
    if (recentlyPlayed.length >= 6) break;
  }

  return {
    history, loading, claiming,
    games, tiles, wallet, rounds, liveWins,
    originals, recentlyPlayed,
    coinBalance, netLifetime, playableCount,
    openCategories, lockedCategories,
    claimBonus, openGame, reload: load,
    toastProps,
  };
}

export type ArcadeVM = ReturnType<typeof useArcade>;

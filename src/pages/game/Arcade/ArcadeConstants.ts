import type { GameCategory, GameKey } from '../../../api/arcadeApi';

/**
 * Rutas de los juegos ya implementados. El catalogo de la base manda sobre QUE
 * se muestra y cual esta bloqueado (comingSoon); este mapa solo dice ADONDE
 * lleva el tile. Un juego sin entrada aqui se pinta bloqueado aunque la base
 * lo marque disponible — asi un seed adelantado no manda al jugador a un 404.
 */
export const GAME_ROUTES: Partial<Record<GameKey, string>> = {
  blackjack:   '/arcade/blackjack',
  mole:        '/arcade/mole',
  coinflip:    '/arcade/volado',
  dice:        '/arcade/dados',
  wheel:       '/arcade/ruleta',
  scratch:     '/arcade/raspadito',
  higherlower: '/arcade/mayor-menor',
  mines:       '/arcade/minas',
  penalty:     '/arcade/penales',
  bowling:     '/arcade/boliche',
};

export const CATEGORY_LABELS: Record<GameCategory, string> = {
  cards:  'Cartas',
  reflex: 'Reflejos',
  sports: 'Deportes',
  luck:   'Azar',
};

export const CATEGORY_ORDER: GameCategory[] = ['cards', 'reflex', 'sports', 'luck'];

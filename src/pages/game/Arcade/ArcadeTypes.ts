import type { ArcadeGame, ArcadeWallet, ArcadeRound, GameCategory } from '../../../api/arcadeApi';

export type { ArcadeGame, ArcadeWallet, ArcadeRound, GameCategory };

/** Un juego ya resuelto para pintar el tile: catalogo + si se puede entrar. */
export interface ArcadeTile extends ArcadeGame {
  playable: boolean;
  /** Ruta del juego; vacia cuando todavia no existe pantalla. */
  route: string;
}

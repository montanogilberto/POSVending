/**
 * gameLog — rastreo unificado de los diez juegos del arcade.
 *
 * Un solo formato, con prefijo por juego, para poder filtrar en la consola:
 *
 *   [arcade:mines]      -> solo minas
 *   [arcade:            -> todos los juegos
 *   :error              -> solo fallos
 *
 * Se apaga solo en builds de produccion (`IS_DEV_BUILD`, misma convencion que
 * el resto del repo). Dejarlo encendido en produccion llenaria la consola del
 * usuario y publicaria el estado de su ronda a quien abra devtools.
 *
 * NO registrar la semilla del servidor mientras la ronda siga abierta: es
 * justo lo que el juego limpio promete no revelar antes de tiempo.
 */
import { IS_DEV_BUILD } from '../../../utils/appEnv';

export type GameEvent =
  | 'load' | 'load:error'
  | 'resume' | 'resume:none'
  | 'bet' | 'bet:open' | 'bet:settled' | 'bet:error'
  | 'action' | 'action:open' | 'action:settled' | 'action:error';

/** Marca de tiempo para medir cuanto tarda cada llamada. */
export const gameNow = (): number =>
  (typeof performance !== 'undefined' ? performance.now() : Date.now());

export function gameLog(gameKey: string, event: GameEvent, data?: unknown): void {
  if (!IS_DEV_BUILD) return;
  const tag = `[arcade:${gameKey}] ${event}`;
  if (data === undefined) console.log(tag);
  else if (event.endsWith(':error')) console.warn(tag, data);
  else console.log(tag, data);
}

/** Redondea a milisegundos enteros para que el log se lea. */
export const gameMs = (start: number): number => Math.round(gameNow() - start);

import { useEffect, useState } from 'react';

/**
 * Devuelve `value` con retraso. El servidor liquida la ronda en una sola
 * respuesta, asi que sin esto el modal de resultado taparia la animacion de la
 * escena (la moneda, la ruleta...) en el mismo instante en que empieza.
 *
 * Solo retrasa lo que se MUESTRA: el resultado ya viene decidido del servidor.
 * `null`/`undefined` se propagan sin espera para que "jugar otra vez" limpie
 * la escena de inmediato.
 */
export function useReveal<T>(value: T | null | undefined, delayMs: number): T | null {
  const [shown, setShown] = useState<T | null>(delayMs > 0 ? null : (value ?? null));

  useEffect(() => {
    if (value === null || value === undefined) {
      setShown(null);
      return undefined;
    }
    if (delayMs <= 0) {
      setShown(value);
      return undefined;
    }
    const timer = window.setTimeout(() => setShown(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);

  return shown;
}

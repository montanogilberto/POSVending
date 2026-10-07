import React from 'react';

export type BowlingOutcome = 'strike' | 'miss' | null;

interface BowlingLaneProps {
  /** Resultado del ultimo tiro segun el servidor; null = pinos parados, sin tiro. */
  outcome: BowlingOutcome;
  /** Cambia en cada tiro para reiniciar la animacion. */
  rollKey: string;
}

/** Triangulo de 10 pinos: fila (de atras al frente) y posicion dentro de la fila. */
const PINS: Array<{ x: number; y: number }> = [
  { x: 50, y: 12 },
  { x: 42, y: 24 }, { x: 58, y: 24 },
  { x: 34, y: 36 }, { x: 50, y: 36 }, { x: 66, y: 36 },
  { x: 26, y: 48 }, { x: 42, y: 48 }, { x: 58, y: 48 }, { x: 74, y: 48 },
];

/** Pinos que se quedan de pie cuando NO es chuza (decorativo, no cambia el resultado). */
const LEFT_STANDING = new Set([3, 6, 9]);

/**
 * Pista de boliche: vista cenital con canaletas, pinos en triangulo y una bola
 * que rueda hasta ellos. Chuza = caen los diez en cascada; fallo = quedan
 * algunos de pie. Lo que cuenta lo decidio el servidor.
 */
const BowlingLane: React.FC<BowlingLaneProps> = ({ outcome, rollKey }) => (
  <div className="scn-lane">
    <svg viewBox="0 0 100 150" role="presentation" aria-hidden="true">
      <rect width="100" height="150" fill="#2b2f4a" />
      <rect x="12" width="76" height="150" fill="#d9a85f" />
      {[0, 1, 2, 3, 4, 5, 6].map(i => (
        <rect key={i} x={12 + i * 12.67} width="6" height="150" fill="#c4914a" opacity="0.55" />
      ))}
      <rect x="2" width="10" height="150" fill="#1f2237" />
      <rect x="88" width="10" height="150" fill="#1f2237" />
      {/* Flechas de punteria */}
      {[0, 1, 2, 3, 4].map(i => (
        <polygon key={i} points={`${34 + i * 8},108 ${38 + i * 8},100 ${42 + i * 8},108`} fill="#8a5a1d" opacity="0.6" />
      ))}
    </svg>

    <div key={`pins-${rollKey}`} className="scn-lane__pins">
      {PINS.map((pin, i) => {
        const falls = outcome === 'strike' || (outcome === 'miss' && !LEFT_STANDING.has(i));
        return (
          <span
            key={i}
            className={`scn-pin scn-pin--p${i}${falls ? ' scn-pin--fall' : ''}`}
          />
        );
      })}
    </div>

    <div key={`ball-${rollKey}`} className={`scn-lane__ball${outcome ? ' scn-lane__ball--roll' : ''}`}>
      <svg viewBox="0 0 40 40" role="presentation" aria-hidden="true">
        <circle cx="20" cy="20" r="18" fill="#1d4ed8" />
        <circle cx="14" cy="13" r="5" fill="#fff" opacity="0.28" />
        <circle cx="18" cy="22" r="2.2" fill="#0b1b4d" />
        <circle cx="24" cy="19" r="2.2" fill="#0b1b4d" />
        <circle cx="23" cy="26" r="2.2" fill="#0b1b4d" />
      </svg>
    </div>
  </div>
);

export default BowlingLane;

import React from 'react';

export type CoinFace = 'aguila' | 'sol';
export type CoinPhase = 'idle' | 'flipping' | 'landed';

interface CoinProps {
  phase: CoinPhase;
  /** Cara que el SERVIDOR dijo que cayo; solo se usa cuando phase === 'landed'. */
  face: CoinFace | null;
}

const RIDGES = Array.from({ length: 36 }, (_, i) => i * 10);

/** Cara dorada de la moneda: aguila en una, sol en la otra. */
const CoinArt: React.FC<{ kind: CoinFace }> = ({ kind }) => (
  <svg viewBox="0 0 100 100" role="presentation" aria-hidden="true">
    <defs>
      <radialGradient id={`coin-${kind}`} cx="35%" cy="30%" r="80%">
        <stop offset="0%" stopColor="#fff3b0" />
        <stop offset="55%" stopColor="#f5b82e" />
        <stop offset="100%" stopColor="#b9770e" />
      </radialGradient>
    </defs>
    <circle cx="50" cy="50" r="48" fill={`url(#coin-${kind})`} />
    {RIDGES.map(a => (
      <line key={a} x1="50" y1="3" x2="50" y2="8" stroke="#a8670b" strokeWidth="1.6"
        transform={`rotate(${a} 50 50)`} />
    ))}
    <circle cx="50" cy="50" r="38" fill="none" stroke="#a8670b" strokeWidth="2" />
    {kind === 'sol' ? (
      <g fill="#8a5207">
        {Array.from({ length: 12 }, (_, i) => (
          <path key={i} d="M50 18 L54 32 L46 32 Z" transform={`rotate(${i * 30} 50 50)`} />
        ))}
        <circle cx="50" cy="50" r="13" />
        <circle cx="46" cy="47" r="2.4" fill="#f5b82e" />
        <circle cx="54" cy="47" r="2.4" fill="#f5b82e" />
        <path d="M44 55 Q50 60 56 55" fill="none" stroke="#f5b82e" strokeWidth="2" strokeLinecap="round" />
      </g>
    ) : (
      <g fill="#8a5207">
        {/* Aguila con las alas abiertas */}
        <path d="M50 30 L56 40 L74 30 L68 52 L58 56 L50 70 L42 56 L32 52 L26 30 L44 40 Z" />
        <circle cx="50" cy="33" r="6" />
        <path d="M50 35 L57 38 L50 41 Z" fill="#f5b82e" />
        <circle cx="48" cy="32" r="1.4" fill="#f5b82e" />
      </g>
    )}
  </svg>
);

/**
 * Moneda 3D de CSS: el volado se VE girar. Mientras el servidor responde
 * ('flipping') da vueltas sin parar; al llegar la cara se hace un lanzamiento
 * completo que termina exactamente en la cara que cayo. La animacion solo
 * presenta lo que ya decidio el servidor.
 */
const Coin: React.FC<CoinProps> = ({ phase, face }) => {
  const landed = phase === 'landed' && face ? ` scn-coin--land-${face}` : '';
  const toss = phase === 'landed' && face ? ' scn-coin-toss--land' : '';
  return (
    <div className="scn-coin-stage">
      <div className={`scn-coin-toss scn-coin-toss--${phase}${toss}`}>
        <div className={`scn-coin scn-coin--${phase}${landed}`}>
          <div className="scn-coin__face scn-coin__face--front"><CoinArt kind="aguila" /></div>
          <div className="scn-coin__face scn-coin__face--back"><CoinArt kind="sol" /></div>
        </div>
      </div>
      <div className={`scn-coin-shadow scn-coin-shadow--${phase}`} />
    </div>
  );
};

export default Coin;

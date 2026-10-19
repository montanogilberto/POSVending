import React from 'react';
import type { GameKey } from '../../../api/arcadeApi';

/**
 * Ilustraciones de los tiles — una por juego, dibujadas a mano en SVG.
 *
 * SON PROPIAS a proposito. El referente visual usaba arte de Pragmatic Play,
 * Hacksaw, Nolimit y Avatarux: eso es de sus duenos y no se copia. Ademas,
 * SVG en linea no pide red, escala sin pixelarse y viaja dentro del bundle,
 * que es lo que necesita una app empaquetada con Capacitor.
 *
 * Cada escena mide 160x120 (la proporcion del tile) y trae su propio fondo
 * degradado, asi que el tile no tiene que pintar nada debajo.
 */

export interface ArtProps { className?: string }

/** Marco comun: viewBox, fondo redondeado y degradado propio de cada juego. */
const Scene: React.FC<{
  id: string; from: string; to: string; className?: string; children: React.ReactNode;
}> = ({ id, from, to, className, children }) => (
  <svg className={className} viewBox="0 0 160 120" role="presentation" aria-hidden="true"
    preserveAspectRatio="xMidYMid slice">
    <defs>
      <linearGradient id={`bg-${id}`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor={from} />
        <stop offset="100%" stopColor={to} />
      </linearGradient>
    </defs>
    <rect width="160" height="120" fill={`url(#bg-${id})`} />
    {children}
  </svg>
);

/** Carta de baraja reutilizable: se usa en blackjack y en mayor/menor. */
const Card: React.FC<{
  x: number; y: number; rot: number; rank: string; suit: string; red?: boolean;
}> = ({ x, y, rot, rank, suit, red }) => (
  <g transform={`translate(${x} ${y}) rotate(${rot})`}>
    <rect width="42" height="58" rx="6" fill="#fff" />
    <text x="7" y="18" fontSize="15" fontWeight="700"
      fill={red ? '#e11d48' : '#1f2333'} fontFamily="system-ui, sans-serif">{rank}</text>
    <text x="21" y="46" fontSize="20" textAnchor="middle"
      fill={red ? '#e11d48' : '#1f2333'} fontFamily="system-ui, sans-serif">{suit}</text>
  </g>
);

export const BlackjackArt: React.FC<ArtProps> = ({ className }) => (
  <Scene id="bj" from="#6d4aff" to="#3b1f9e" className={className}>
    <Card x={38} y={34} rot={-14} rank="K" suit="♥" red />
    <Card x={78} y={30} rot={9} rank="A" suit="♠" />
    <circle cx="132" cy="26" r="14" fill="#ffd971" opacity="0.9" />
    <text x="132" y="32" fontSize="14" fontWeight="800" textAnchor="middle"
      fill="#8a5a00" fontFamily="system-ui, sans-serif">21</text>
  </Scene>
);

export const MoleArt: React.FC<ArtProps> = ({ className }) => (
  <Scene id="ml" from="#22c55e" to="#116b33" className={className}>
    {/* Monticulo */}
    <ellipse cx="80" cy="112" rx="56" ry="20" fill="#8a5a2b" />
    <ellipse cx="80" cy="106" rx="40" ry="13" fill="#5d3a18" />
    {/* Topo asomando */}
    <g>
      <circle cx="80" cy="76" r="27" fill="#8d7566" />
      <circle cx="63" cy="52" r="9" fill="#8d7566" />
      <circle cx="97" cy="52" r="9" fill="#8d7566" />
      <ellipse cx="80" cy="88" rx="13" ry="10" fill="#e8b4b8" />
      <ellipse cx="80" cy="83" rx="4.5" ry="3.5" fill="#5b3a3d" />
      <circle cx="70" cy="68" r="3.2" fill="#2b2320" />
      <circle cx="90" cy="68" r="3.2" fill="#2b2320" />
    </g>
    {/* Mazo */}
    <g transform="translate(120 30) rotate(20)">
      <rect x="-6" y="0" width="12" height="30" rx="3" fill="#c98b3a" />
      <rect x="-16" y="-14" width="32" height="18" rx="5" fill="#e2e5ee" />
    </g>
  </Scene>
);

export const BowlingArt: React.FC<ArtProps> = ({ className }) => (
  <Scene id="bw" from="#8b5cf6" to="#4c1d95" className={className}>
    <ellipse cx="80" cy="106" rx="60" ry="14" fill="#ffffff" opacity="0.14" />
    {[56, 80, 104].map((x, i) => (
      <g key={x} transform={`translate(${x} ${34 + (i === 1 ? -6 : 0)})`}>
        <ellipse cx="0" cy="34" rx="11" ry="13" fill="#fff" />
        <rect x="-5" y="6" width="10" height="24" rx="5" fill="#fff" />
        <circle cx="0" cy="6" r="7" fill="#fff" />
        <rect x="-5" y="14" width="10" height="5" fill="#e11d48" />
      </g>
    ))}
    <circle cx="38" cy="86" r="20" fill="#1b1035" />
    <circle cx="32" cy="79" r="3" fill="#8b5cf6" />
    <circle cx="42" cy="77" r="3" fill="#8b5cf6" />
    <circle cx="37" cy="88" r="3" fill="#8b5cf6" />
  </Scene>
);

export const DiceArt: React.FC<ArtProps> = ({ className }) => {
  const pip = (cx: number, cy: number) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="3.6" fill="#2563eb" />;
  return (
    <Scene id="dc" from="#3b82f6" to="#1e3a8a" className={className}>
      <g transform="translate(30 40) rotate(-12)">
        <rect width="52" height="52" rx="11" fill="#fff" />
        {[pip(14, 14), pip(38, 14), pip(26, 26), pip(14, 38), pip(38, 38)]}
      </g>
      <g transform="translate(84 30) rotate(14)">
        <rect width="46" height="46" rx="10" fill="#e8eefc" />
        {[pip(13, 13), pip(33, 33), pip(23, 23)]}
      </g>
    </Scene>
  );
};

export const CoinflipArt: React.FC<ArtProps> = ({ className }) => (
  <Scene id="cf" from="#16a34a" to="#065f30" className={className}>
    <ellipse cx="80" cy="104" rx="34" ry="8" fill="#000" opacity="0.22" />
    <g transform="translate(80 58)">
      <circle r="34" fill="#e09a1f" />
      <circle r="29" fill="#ffd971" />
      <path d="M0 -19l5.6 11.4 12.6 1.8-9.1 8.9 2.1 12.5L0 8.7l-11.2 5.9 2.1-12.5-9.1-8.9 12.6-1.8z" fill="#e09a1f" />
    </g>
    <circle cx="30" cy="34" r="12" fill="#ffd971" opacity="0.55" />
    <circle cx="132" cy="86" r="9" fill="#ffd971" opacity="0.4" />
  </Scene>
);

export const HigherLowerArt: React.FC<ArtProps> = ({ className }) => (
  <Scene id="hl" from="#2563eb" to="#0f2d6b" className={className}>
    <Card x={30} y={32} rot={-10} rank="7" suit="♦" red />
    <Card x={84} y={32} rot={8} rank="J" suit="♣" />
    {/* Flechas: la decision del juego es arriba o abajo */}
    <path d="M148 34l9 12h-18z" fill="#4ade80" />
    <path d="M148 92l-9-12h18z" fill="#f87171" />
    <rect x="146" y="46" width="4" height="34" rx="2" fill="#ffffff" opacity="0.35" />
  </Scene>
);

export const MinesArt: React.FC<ArtProps> = ({ className }) => (
  <Scene id="mn" from="#f59e0b" to="#9a3412" className={className}>
    {/* Cuadricula 3x3 */}
    {[0, 1, 2].map(r => [0, 1, 2].map(c => (
      <rect key={`${r}-${c}`} x={38 + c * 30} y={22 + r * 30} width="24" height="24" rx="6"
        fill="#ffffff" opacity={r === 1 && c === 1 ? 0.95 : 0.28} />
    )))}
    {/* Gema descubierta */}
    <path d="M80 44l8 8-8 10-8-10z" fill="#22d3ee" />
    {/* Bomba */}
    <g transform="translate(120 88)">
      <circle r="16" fill="#1f2333" />
      <rect x="-3" y="-22" width="6" height="9" rx="2" fill="#1f2333" />
      <path d="M2 -22c6-5 12-2 12 4" stroke="#f59e0b" strokeWidth="3" fill="none" strokeLinecap="round" />
      <circle cx="-6" cy="-6" r="4" fill="#ffffff" opacity="0.35" />
    </g>
  </Scene>
);

export const WheelArt: React.FC<ArtProps> = ({ className }) => {
  // Ocho gajos alternos; la rueda real tiene 50 casillas, esto es el simbolo.
  const colors = ['#ef4444', '#1f2333', '#f59e0b', '#1f2333', '#22c55e', '#1f2333', '#3b82f6', '#1f2333'];
  const slice = (i: number) => {
    const a0 = (i * Math.PI) / 4;
    const a1 = ((i + 1) * Math.PI) / 4;
    const r = 38;
    return `M0 0 L${(r * Math.cos(a0)).toFixed(2)} ${(r * Math.sin(a0)).toFixed(2)} A${r} ${r} 0 0 1 ${(r * Math.cos(a1)).toFixed(2)} ${(r * Math.sin(a1)).toFixed(2)} Z`;
  };
  return (
    <Scene id="wh" from="#f59e0b" to="#b45309" className={className}>
      <g transform="translate(80 62)">
        <circle r="42" fill="#fff" />
        {colors.map((c, i) => <path key={i} d={slice(i)} fill={c} />)}
        <circle r="9" fill="#fff" />
        <circle r="4" fill="#1f2333" />
      </g>
      <path d="M80 12l8 14H72z" fill="#fff" />
    </Scene>
  );
};

export const ScratchArt: React.FC<ArtProps> = ({ className }) => (
  <Scene id="sc" from="#ec4899" to="#831843" className={className}>
    <g transform="translate(80 60) rotate(-6)">
      <rect x="-52" y="-34" width="104" height="68" rx="10" fill="#fff" />
      {/* Tres estrellas iguales = premio */}
      {[-32, 0, 32].map(dx => (
        <g key={dx} transform={`translate(${dx} 2)`}>
          <rect x="-13" y="-15" width="26" height="30" rx="6" fill="#fde68a" />
          <path d="M0 -9l3 6.2 6.8 1-5 4.8 1.2 6.8L0 6.6l-6 3.2 1.2-6.8-5-4.8 6.8-1z" fill="#d97706" />
        </g>
      ))}
      {/* Pelicula plateada a medio raspar */}
      <path d="M-52 -34h52v68h-52z" fill="#b9bec9" opacity="0.85" />
      <path d="M-44 -18c14 6 26 2 38 10" stroke="#989dab" strokeWidth="5" fill="none" strokeLinecap="round" />
    </g>
  </Scene>
);

export const PenaltyArt: React.FC<ArtProps> = ({ className }) => (
  <Scene id="pk" from="#ef4444" to="#7f1d1d" className={className}>
    {/* Porteria */}
    <rect x="24" y="24" width="112" height="60" rx="4" fill="none" stroke="#fff" strokeWidth="5" />
    {[40, 56, 72, 88, 104, 120].map(x => (
      <line key={x} x1={x} y1="26" x2={x} y2="82" stroke="#fff" strokeWidth="1.4" opacity="0.5" />
    ))}
    {[38, 52, 66, 80].map(y => (
      <line key={y} x1="26" y1={y} x2="134" y2={y} stroke="#fff" strokeWidth="1.4" opacity="0.5" />
    ))}
    {/* Portero */}
    <g transform="translate(52 54)">
      <circle cy="-10" r="7" fill="#fde68a" />
      <rect x="-9" y="-2" width="18" height="22" rx="6" fill="#22c55e" />
      <rect x="-20" y="-1" width="12" height="6" rx="3" fill="#fde68a" transform="rotate(-25)" />
    </g>
    {/* Balon */}
    <g transform="translate(112 92)">
      <circle r="14" fill="#fff" />
      <path d="M0 -8l6 4.5-2.3 7.2h-7.4L-6 -3.5z" fill="#1f2333" />
    </g>
  </Scene>
);

/** Ilustracion por juego. Un juego sin entrada cae a la de blackjack. */
export const GAME_ART: Record<GameKey, React.FC<ArtProps>> = {
  blackjack: BlackjackArt,
  mole: MoleArt,
  bowling: BowlingArt,
  dice: DiceArt,
  coinflip: CoinflipArt,
  higherlower: HigherLowerArt,
  mines: MinesArt,
  wheel: WheelArt,
  scratch: ScratchArt,
  penalty: PenaltyArt,
};

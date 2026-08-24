import React from 'react';

interface CoinProps { cx: number; cy: number; rx: number; ry: number; t: number }

/**
 * Una ficha: canto (rectangulo + elipse inferior) y luego la cara encima.
 * El orden importa — la cara se dibuja al final para tapar el canto.
 */
const Coin: React.FC<CoinProps> = ({ cx, cy, rx, ry, t }) => (
  <>
    <ellipse cx={cx} cy={cy + t} rx={rx} ry={ry} fill="url(#arcEdge)" />
    <rect x={cx - rx} y={cy} width={rx * 2} height={t} fill="url(#arcEdge)" />
    <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="url(#arcFace)" />
    <ellipse cx={cx} cy={cy} rx={rx - 3.5} ry={ry - 2.5} fill="none" stroke="#f6bd3e" strokeWidth="1.4" />
  </>
);

const Star: React.FC<{ cx: number; cy: number; s: number }> = ({ cx, cy, s }) => (
  <path
    d={`M${cx} ${cy - s}l${s * 0.3} ${s * 0.62} ${s * 0.68} ${s * 0.1}-${s * 0.49} ${s * 0.48} ${s * 0.12} ${s * 0.67}-${s * 0.61}-${s * 0.32}-${s * 0.61} ${s * 0.32} ${s * 0.12}-${s * 0.67}-${s * 0.49}-${s * 0.48} ${s * 0.68}-${s * 0.1}z`}
    fill="#e9982a"
  />
);

/**
 * Pila de fichas del hero. SVG en linea y no imagen: no suma una peticion de
 * red, escala sin pixelarse y viaja dentro del bundle — que es lo que necesita
 * una app empaquetada con Capacitor.
 */
const CoinStack: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 132 104" role="presentation" aria-hidden="true">
    <defs>
      <linearGradient id="arcFace" x1="0" y1="0" x2="0.35" y2="1">
        <stop offset="0%" stopColor="#ffe08a" />
        <stop offset="100%" stopColor="#f4b32f" />
      </linearGradient>
      <linearGradient id="arcEdge" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#e09a1f" />
        <stop offset="100%" stopColor="#bd7710" />
      </linearGradient>
    </defs>

    {/* Sombra de apoyo, para que la pila no flote sobre el degradado */}
    <ellipse cx="66" cy="95" rx="52" ry="8" fill="rgba(60,30,120,0.22)" />

    {/* Pila de atras, de abajo hacia arriba */}
    <Coin cx={82} cy={62} rx={30} ry={11} t={9} />
    <Coin cx={82} cy={49} rx={30} ry={11} t={9} />
    <Coin cx={82} cy={36} rx={30} ry={11} t={9} />
    <Star cx={82} cy={36} s={11} />

    {/* Ficha del frente, mas baja y a la izquierda */}
    <Coin cx={36} cy={72} rx={26} ry={10} t={8} />
    <Star cx={36} cy={72} s={9.5} />
  </svg>
);

export default CoinStack;

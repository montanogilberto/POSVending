import React from 'react';

interface PrizeWheelProps {
  /** Multiplicadores de cada casilla, en el orden del servidor. */
  segments: number[];
  /** Casilla donde cayo (decidida por el servidor); null mientras no hay giro. */
  index: number | null;
}

const R = 100;
const TURNS = 5;

/** Color por premio: gris = nada, ambar = menos de 1x, azul/verde/violeta/oro = sube. */
function colorFor(mult: number): string {
  if (mult <= 0) return '#cfd3de';
  if (mult < 1) return '#f4b740';
  if (mult < 2) return '#4f8cff';
  if (mult < 5) return '#22c55e';
  if (mult < 20) return '#8b5cf6';
  return '#f5c518';
}

const polar = (deg: number, r: number) => {
  const rad = (deg * Math.PI) / 180;
  return [r * Math.sin(rad), -r * Math.cos(rad)];
};

/**
 * Ruleta SVG. Las casillas salen del estado del servidor (nunca se inventan
 * aqui) y el giro termina con el centro de la casilla ganadora bajo el
 * puntero. El angulo final es una variable CSS para que la animacion de giro
 * sea un @keyframes con destino dinamico.
 */
const PrizeWheel: React.FC<PrizeWheelProps> = ({ segments, index }) => {
  const n = segments.length || 1;
  const step = 360 / n;
  const finalRot = index === null ? 0 : 360 * TURNS - (index + 0.5) * step;

  return (
    <div className="scn-wheel">
      <div className="scn-wheel__pointer" />
      <svg
        key={index === null ? 'idle' : `spin-${index}`}
        className={`scn-wheel__disc${index !== null ? ' scn-wheel__disc--spin' : ''}`}
        viewBox="-110 -110 220 220"
        role="presentation"
        aria-hidden="true"
        style={{ '--wh-rot': `${finalRot}deg` } as React.CSSProperties}
      >
        <circle r="108" fill="#2b2f4a" />
        {segments.map((mult, i) => {
          const a0 = i * step;
          const a1 = (i + 1) * step;
          const [x0, y0] = polar(a0, R);
          const [x1, y1] = polar(a1, R);
          return (
            <path
              key={i}
              d={`M0 0 L${x0.toFixed(2)} ${y0.toFixed(2)} A${R} ${R} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)} Z`}
              fill={colorFor(mult)}
              stroke="#fff"
              strokeWidth="0.6"
            />
          );
        })}
        <circle r="22" fill="#fff" />
        <circle r="17" fill="#2b2f4a" />
      </svg>
    </div>
  );
};

export default PrizeWheel;

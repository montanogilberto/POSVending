import React from 'react';
import type { GameKey } from '../../../../api/arcadeApi';

export interface GlyphProps { className?: string }

/**
 * Iconos propios para juegos que ionicons no cubre.
 *
 * Van como componentes SVG en linea y NO como data URI: IonIcon descarga las
 * URIs con fetch y `data:image/svg+xml;utf8,...` no es una URI valida (el
 * parametro correcto seria `charset=utf-8`), asi que fallaba en silencio y el
 * hueco quedaba vacio. En linea tambien evita el saneado de ionicons.
 *
 * Miden 1em para escalar con el font-size del contenedor, igual que un IonIcon,
 * y pintan con `currentColor` para heredar el acento del tile.
 */

/**
 * Cara de topo. Un topo NO es un escarabajo: `bugOutline` dibujaba un insecto y
 * el juego se llama "Atrapa al Topo".
 *
 * Es una CARA y no un topo asomando del hoyo: el dibujo con linea de suelo
 * dejaba el trazo en una franja estrecha del viewBox y a 23 px se leia como una
 * loma, no como un animal. La cara llena la caja, asi que el hocico grande, los
 * ojos chicos y los bigotes siguen distinguiendose en el tile compacto.
 */
export const MoleGlyph: React.FC<GlyphProps> = ({ className }) => (
  <svg className={className} width="1em" height="1em" viewBox="0 0 512 512"
    role="presentation" aria-hidden="true">
    <g fill="none" stroke="currentColor" strokeWidth="28"
      strokeLinecap="round" strokeLinejoin="round">
      {/* Orejas, detras de la cabeza */}
      <circle cx="140" cy="150" r="44" />
      <circle cx="372" cy="150" r="44" />
      {/* Cabeza */}
      <circle cx="256" cy="264" r="150" />
      {/* Hocico: el rasgo que mas identifica al topo */}
      <ellipse cx="256" cy="330" rx="62" ry="48" />
      {/* Bigotes */}
      <path d="M194 316 118 292" />
      <path d="M194 348 122 366" />
      <path d="M318 316 394 292" />
      <path d="M318 348 390 366" />
    </g>
    {/* Ojos y punta de la nariz, macizos para que no se cierren a tamano chico */}
    <circle cx="196" cy="212" r="17" fill="currentColor" />
    <circle cx="316" cy="212" r="17" fill="currentColor" />
    <ellipse cx="256" cy="312" rx="20" ry="15" fill="currentColor" />
  </svg>
);

/** Glifos propios por juego; ganan sobre el iconName del catalogo. */
export const CUSTOM_GAME_GLYPHS: Partial<Record<GameKey, React.FC<GlyphProps>>> = {
  mole: MoleGlyph,
};

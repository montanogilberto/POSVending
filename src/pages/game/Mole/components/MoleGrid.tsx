import React from 'react';
import { MoleGlyph } from '../../Arcade/components/gameIcons';

interface MoleGridProps {
  holes: number;
  /** hoyo -> indice del topo que esta fuera ahi. */
  upHoles: Record<number, number>;
  onWhack: (hole: number) => void;
  disabled: boolean;
}

/**
 * Cuadricula de hoyos. Cada hoyo es un boton real (CLAUDE.md §4.1: nada de
 * divs clicables) y el topo se muestra por clase, no por estilo en linea.
 */
const MoleGrid: React.FC<MoleGridProps> = ({ holes, upHoles, onWhack, disabled }) => (
  <div className="mole-grid">
    {Array.from({ length: holes }, (_, hole) => {
      const up = upHoles[hole] !== undefined;
      return (
        <button
          key={hole}
          type="button"
          className={`mole-hole${up ? ' mole-hole--up' : ''}`}
          disabled={disabled}
          onClick={() => onWhack(hole)}
          aria-label={up ? 'Topo fuera' : 'Hoyo vacío'}
        >
          <span className="mole-hole__dirt" />
          <MoleGlyph className="mole-hole__mole" />
        </button>
      );
    })}
  </div>
);

export default MoleGrid;

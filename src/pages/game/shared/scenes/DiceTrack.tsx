import React from 'react';

interface DiceTrackProps {
  target: number;
  direction: 'under' | 'over';
  /** Numero que dijo el servidor; null mientras no hay tiro revelado. */
  roll: number | null;
  rolling: boolean;
}

const TICKS = [0, 25, 50, 75, 100];

/** Pips de un dado 3x3 para decorar el dado que rueda. */
const PIPS = [[22, 22], [78, 22], [50, 50], [22, 78], [78, 78]];

/**
 * Pista 0-100: la zona ganadora va en verde y un dado rueda hasta el numero
 * que salio. Hace visible que tan grande es la ventana — algo que el numero
 * suelto no transmite.
 */
const DiceTrack: React.FC<DiceTrackProps> = ({ target, direction, roll, rolling }) => {
  const winFrom = direction === 'under' ? 0 : target;
  const winTo = direction === 'under' ? target : 100;
  const landed = roll !== null;
  const won = landed && roll >= winFrom && roll <= winTo && roll !== target;
  const pos = landed ? roll : 50;

  return (
    <div className="scn-dice">
      <div
        className={`scn-dice__die${rolling ? ' scn-dice__die--rolling' : ''}${landed ? ' scn-dice__die--landed' : ''}${landed ? (won ? ' scn-dice__die--win' : ' scn-dice__die--lose') : ''}`}
        // Posicion dinamica del dado: variable CSS, no estilo suelto (CLAUDE.md §4.2).
        style={{ '--dt-pos': `${pos}%` } as React.CSSProperties}
      >
        <svg viewBox="0 0 100 100" role="presentation" aria-hidden="true">
          <rect x="4" y="4" width="92" height="92" rx="20" className="scn-dice__body" />
          {!landed && PIPS.map(([cx, cy]) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="8" className="scn-dice__pip" />)}
        </svg>
        {landed && <span className="scn-dice__num">{roll}</span>}
      </div>

      <div className="scn-dice__track">
        <div
          className="scn-dice__zone"
          style={{ '--dt-from': `${winFrom}%`, '--dt-to': `${100 - winTo}%` } as React.CSSProperties}
        />
        <div className="scn-dice__target" style={{ '--dt-pos': `${target}%` } as React.CSSProperties}>
          <span>{target}</span>
        </div>
      </div>

      <div className="scn-dice__ticks">
        {TICKS.map(t => <span key={t}>{t}</span>)}
      </div>
    </div>
  );
};

export default DiceTrack;

/**
 * Ruleta — 50 casillas cuyos multiplicadores suman 48.00, o sea RTP 0.96
 * exacto. Las casillas se muestran tal cual: no hay pesos ocultos, cada una
 * sale con la misma probabilidad.
 */
import React from 'react';
import BetSelector from '../../../components/ui/BetSelector';
import GameShell from '../shared/GameShell';
import { useArcadeGame } from '../shared/useArcadeGame';
import type { WheelState } from '../../../api/arcadeApi';

/** Cuenta cuantas casillas hay de cada premio, para explicar las odds. */
function tally(segments: number[]): Array<[number, number]> {
  const map = new Map<number, number>();
  for (const s of segments) map.set(s, (map.get(s) ?? 0) + 1);
  return [...map.entries()].sort((a, b) => b[0] - a[0]);
}

const WheelView: React.FC = () => {
  const vm = useArcadeGame<WheelState>('wheel');
  const segments = vm.state?.segments ?? [];
  const index = vm.state?.index ?? null;
  const landed = index !== null && segments.length ? segments[index] : null;

  return (
    <GameShell vm={vm} title="Ruleta de Premios"
      onPlayAgain={() => { vm.reset(); void vm.start(); }}
      resultDetail={landed !== null && <>Cayó en x{landed.toFixed(2)}</>}>
      <div className="ag-board">
        <div className={`wh-prize${landed ? ' wh-prize--win' : ''}`}>
          {landed === null ? '—' : landed === 0 ? 'Nada' : `x${landed}`}
        </div>
        <p className="ag-hint">
          {landed === null ? 'Gira la ruleta.' : landed === 0 ? 'Esta vez no cayó premio.' : '¡Premio!'}
        </p>
      </div>

      {segments.length > 0 && (
        <div className="wh-odds">
          {tally(segments).map(([mult, count]) => (
            <span key={mult} className="wh-odds__row">
              <strong>{mult === 0 ? 'Nada' : `x${mult}`}</strong>
              <span>{count} de {segments.length}</span>
            </span>
          ))}
        </div>
      )}

      {vm.game && (
        <BetSelector bet={vm.bet} onChange={vm.setBet}
          minBet={vm.game.minBet} maxBet={vm.game.maxBet}
          coinBalance={vm.coinBalance} busy={vm.pending === 'bet'}
          actionLabel="Girar" onAction={() => vm.start()} />
      )}
    </GameShell>
  );
};

export default WheelView;

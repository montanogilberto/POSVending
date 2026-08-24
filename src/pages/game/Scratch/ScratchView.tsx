/**
 * Raspadito — el premio se sortea con una tabla de pesos ANTES de acomodar las
 * casillas. Al reves (casillas al azar y ver que sale) el RTP dependeria de
 * coincidencias y no se podria fijar.
 */
import React from 'react';
import BetSelector from '../../../components/ui/BetSelector';
import GameShell from '../shared/GameShell';
import { useArcadeGame } from '../shared/useArcadeGame';
import type { ScratchState } from '../../../api/arcadeApi';

const ScratchView: React.FC = () => {
  const vm = useArcadeGame<ScratchState>('scratch');
  const cells = vm.state?.cells ?? null;
  const won = (vm.result?.multiplier ?? 0) > 0;

  /** Marca las tres iguales que forman el premio. */
  const winning = React.useMemo(() => {
    if (!cells || !won) return new Set<number>();
    const counts = new Map<string, number[]>();
    cells.forEach((c, i) => counts.set(c, [...(counts.get(c) ?? []), i]));
    for (const [, idx] of counts) if (idx.length >= 3) return new Set(idx.slice(0, 3));
    return new Set<number>();
  }, [cells, won]);

  return (
    <GameShell vm={vm} title="Raspadito"
      onPlayAgain={() => { vm.reset(); void vm.start(); }}
      resultDetail={cells && (won ? <>Tres iguales</> : <>Sin tres iguales</>)}>
      <div className="ag-board">
        <div className="sc-grid">
          {Array.from({ length: 9 }, (_, i) => (
            <div key={i} className={`sc-cell${cells ? ' sc-cell--open' : ''}${winning.has(i) ? ' sc-cell--win' : ''}`}>
              {cells ? cells[i] : ''}
            </div>
          ))}
        </div>
        <p className="ag-hint">
          {cells ? (won ? '¡Tres iguales!' : 'Esta vez no salió.') : 'Compra una carta y raspa.'}
        </p>
      </div>

      {vm.game && (
        <BetSelector bet={vm.bet} onChange={vm.setBet}
          minBet={vm.game.minBet} maxBet={vm.game.maxBet}
          coinBalance={vm.coinBalance} busy={vm.pending === 'bet'}
          actionLabel="Raspar" onAction={() => vm.start()} />
      )}
    </GameShell>
  );
};

export default ScratchView;

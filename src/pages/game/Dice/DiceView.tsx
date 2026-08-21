/**
 * Dados — tiro uniforme 0-99. El jugador elige umbral y direccion; el pago
 * sale de la probabilidad REAL de esa apuesta, asi que apostar "casi seguro"
 * paga poco y "casi imposible" paga mucho con el mismo margen de la casa.
 */
import React, { useState } from 'react';
import { IonRange, IonSegment, IonSegmentButton, IonLabel } from '@ionic/react';
import BetSelector from '../../../components/ui/BetSelector';
import GameShell from '../shared/GameShell';
import { useArcadeGame } from '../shared/useArcadeGame';
import type { DiceState } from '../../../api/arcadeApi';

const RTP = 0.97;
const MIN_T = 4;
const MAX_T = 96;

const DiceView: React.FC = () => {
  const vm = useArcadeGame<DiceState>('dice');
  const [target, setTarget] = useState(50);
  const [direction, setDirection] = useState<'under' | 'over'>('under');

  // Anticipo local; la cuenta que vale es la del backend.
  const chance = direction === 'under' ? target / 100 : (99 - target) / 100;
  const payout = chance > 0 ? RTP / chance : 0;
  const roll = vm.state?.roll ?? null;

  return (
    <GameShell vm={vm} title="Dados"
      onPlayAgain={() => { vm.reset(); void vm.start({ target, direction }); }}
      resultDetail={roll !== null && <>Salió {roll} · apostaste {direction === 'under' ? 'menor' : 'mayor'} que {target}</>}>
      <div className="ag-board">
        <div className={`dice-roll${roll !== null ? ' dice-roll--done' : ''}`}>
          {roll !== null ? roll : '??'}
        </div>
        <p className="ag-hint">
          {chance > 0
            ? `${(chance * 100).toFixed(0)}% de probabilidad · paga ${payout.toFixed(2)}x`
            : 'Esa apuesta no puede ganar'}
        </p>
      </div>

      <div className="dice-controls">
        <IonSegment value={direction} disabled={!!vm.pending}
          onIonChange={e => setDirection(e.detail.value as 'under' | 'over')}>
          <IonSegmentButton value="under"><IonLabel>Menor que</IonLabel></IonSegmentButton>
          <IonSegmentButton value="over"><IonLabel>Mayor que</IonLabel></IonSegmentButton>
        </IonSegment>

        <div className="dice-target">{target}</div>

        <IonRange min={MIN_T} max={MAX_T} step={1} value={target} disabled={!!vm.pending}
          onIonInput={e => setTarget(e.detail.value as number)} aria-label="Número objetivo" />
      </div>

      {vm.game && (
        <BetSelector bet={vm.bet} onChange={vm.setBet}
          minBet={vm.game.minBet} maxBet={vm.game.maxBet}
          coinBalance={vm.coinBalance} busy={vm.pending === 'bet'}
          disabled={chance <= 0}
          actionLabel="Tirar" onAction={() => vm.start({ target, direction })} />
      )}
    </GameShell>
  );
};

export default DiceView;

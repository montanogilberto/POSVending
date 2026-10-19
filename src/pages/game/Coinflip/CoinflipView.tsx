/**
 * Volado — moneda JUSTA (50/50) que paga 1.96x. La ventaja de la casa esta en
 * el pago, no en la moneda: sesgar el sorteo seria mentir sobre algo que el
 * jugador puede recalcular con la semilla.
 */
import React, { useState } from 'react';
import { IonButton, IonSpinner, IonChip, IonLabel } from '@ionic/react';
import BetSelector from '../../../components/ui/BetSelector';
import GameShell from '../shared/GameShell';
import { useArcadeGame } from '../shared/useArcadeGame';
import type { CoinflipState } from '../../../api/arcadeApi';

const SIDES = [
  { key: 'aguila', label: 'Águila', face: '🦅' },
  { key: 'sol', label: 'Sol', face: '☀️' },
];

const CoinflipView: React.FC = () => {
  const vm = useArcadeGame<CoinflipState>('coinflip');
  const [pick, setPick] = useState('aguila');
  const shown = vm.state?.result ?? null;

  return (
    <GameShell vm={vm} title="Volado" onPlayAgain={() => { vm.reset(); void vm.start({ pick }); }}
      resultDetail={shown && <>Cayó {SIDES.find(s => s.key === shown)?.label}</>}>
      <div className="ag-board">
        <div className="cf-coin">{shown ? SIDES.find(s => s.key === shown)?.face : '🪙'}</div>
        <p className="ag-hint">
          {shown
            ? `Cayó ${SIDES.find(s => s.key === shown)?.label}`
            : 'Elige un lado. Moneda justa 50/50, paga 1.96x.'}
        </p>
      </div>

      <div className="cf-picks">
        {SIDES.map(side => (
          <IonChip key={side.key} outline={pick !== side.key}
            color={pick === side.key ? 'primary' : 'medium'}
            disabled={!!vm.pending} onClick={() => setPick(side.key)}>
            <IonLabel>{side.face} {side.label}</IonLabel>
          </IonChip>
        ))}
      </div>

      {vm.game && (
        <BetSelector bet={vm.bet} onChange={vm.setBet}
          minBet={vm.game.minBet} maxBet={vm.game.maxBet}
          coinBalance={vm.coinBalance} busy={vm.pending === 'bet'}
          actionLabel="Lanzar" onAction={() => vm.start({ pick })} />
      )}
    </GameShell>
  );
};

export default CoinflipView;

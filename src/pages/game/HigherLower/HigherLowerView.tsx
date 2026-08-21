/**
 * Mayor o Menor — baraja de 52 SIN reposicion: el pago de cada paso se
 * recalcula con las cartas que QUEDAN. Con probabilidades fijas el juego seria
 * explotable contando cartas.
 */
import React from 'react';
import { IonButton, IonSpinner, IonBadge } from '@ionic/react';
import BetSelector from '../../../components/ui/BetSelector';
import GameShell from '../shared/GameShell';
import CashOutBar from '../shared/CashOutBar';
import { useArcadeGame } from '../shared/useArcadeGame';
import type { HigherLowerState } from '../../../api/arcadeApi';

const RANKS: Record<number, string> = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };
const label = (r: number) => RANKS[r] ?? String(r);

const HigherLowerView: React.FC = () => {
  const vm = useArcadeGame<HigherLowerState>('higherlower');
  const st = vm.state;

  return (
    <GameShell vm={vm} title="Mayor o Menor"
      resultDetail={st && <>Racha de {st.streak}</>}>
      <div className="ag-board">
        <div className="hl-card">{st ? label(st.current) : '?'}</div>
        {st && (
          <>
            <IonBadge color="medium">Racha {st.streak} · x{st.multiplier.toFixed(2)}</IonBadge>
            <p className="ag-hint">
              Quedan {st.cardsLeft} cartas. El empate pierde.
            </p>
          </>
        )}
        {!st && <p className="ag-hint">Adivina si la siguiente carta es mayor o menor.</p>}
      </div>

      {vm.inRound && st ? (
        <>
          <div className="ag-actions">
            <IonButton disabled={!!vm.pending || st.higherPays <= 0}
              onClick={() => vm.act('higher')}>
              {vm.pending === 'higher' ? <IonSpinner name="dots" /> : `Mayor · x${st.higherPays.toFixed(2)}`}
            </IonButton>
            <IonButton disabled={!!vm.pending || st.lowerPays <= 0}
              onClick={() => vm.act('lower')}>
              {vm.pending === 'lower' ? <IonSpinner name="dots" /> : `Menor · x${st.lowerPays.toFixed(2)}`}
            </IonButton>
          </div>
          <CashOutBar multiplier={st.multiplier} bet={vm.bet} canCashOut={st.canCashOut}
            busy={!!vm.pending} cashingOut={vm.pending === 'cashout'}
            onCashOut={() => vm.act('cashout')} />
        </>
      ) : vm.game && (
        <BetSelector bet={vm.bet} onChange={vm.setBet}
          minBet={vm.game.minBet} maxBet={vm.game.maxBet}
          coinBalance={vm.coinBalance} busy={vm.pending === 'bet'}
          actionLabel="Repartir" onAction={() => vm.start()} />
      )}
    </GameShell>
  );
};

export default HigherLowerView;

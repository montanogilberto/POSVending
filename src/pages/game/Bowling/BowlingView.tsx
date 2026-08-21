/**
 * Boliche — racha de chuzas con retiro. Cada tiro tiene 62% de chuza y el
 * acumulado paga el justo por el RTP: retirarse en cualquier momento devuelve
 * exactamente el 95% anunciado.
 */
import React from 'react';
import { IonButton, IonSpinner, IonBadge } from '@ionic/react';
import BetSelector from '../../../components/ui/BetSelector';
import GameShell from '../shared/GameShell';
import CashOutBar from '../shared/CashOutBar';
import { useArcadeGame } from '../shared/useArcadeGame';
import type { StreakState } from '../../../api/arcadeApi';

const BowlingView: React.FC = () => {
  const vm = useArcadeGame<StreakState>('bowling');
  const st = vm.state;
  const last = st?.last;

  return (
    <GameShell vm={vm} title="Boliche" resultDetail={st && <>Racha de {st.streak} chuzas</>}>
      <div className="ag-board">
        <div className="bw-lane">
          <div className="bw-pins">
            {Array.from({ length: 10 }, (_, i) => (
              <span key={i} className={`bw-pin${last && last.strike === false ? ' bw-pin--down' : ''}`} />
            ))}
          </div>
          <div className="bw-ball">🎳</div>
        </div>
        {st ? (
          <>
            <IonBadge color="medium">Chuzas {st.streak} · x{st.multiplier.toFixed(2)}</IonBadge>
            <p className="ag-hint">
              {last ? (last.strike ? '¡Chuza!' : 'Se quedaron pinos en pie.') : 'Lanza la bola.'}
            </p>
          </>
        ) : (
          <p className="ag-hint">Encadena chuzas. Cada tiro entra el 62% de las veces.</p>
        )}
      </div>

      {vm.inRound && st ? (
        <>
          <div className="ag-actions ag-actions--single">
            <IonButton disabled={!!vm.pending} onClick={() => vm.act('roll')}>
              {vm.pending === 'roll' ? <IonSpinner name="dots" /> : 'Lanzar'}
            </IonButton>
          </div>
          <CashOutBar multiplier={st.multiplier} nextMultiplier={st.nextMultiplier}
            bet={vm.bet} canCashOut={st.canCashOut} busy={!!vm.pending}
            cashingOut={vm.pending === 'cashout'} onCashOut={() => vm.act('cashout')} />
        </>
      ) : vm.game && (
        <BetSelector bet={vm.bet} onChange={vm.setBet}
          minBet={vm.game.minBet} maxBet={vm.game.maxBet}
          coinBalance={vm.coinBalance} busy={vm.pending === 'bet'}
          actionLabel="Empezar" onAction={() => vm.start()} />
      )}
    </GameShell>
  );
};

export default BowlingView;

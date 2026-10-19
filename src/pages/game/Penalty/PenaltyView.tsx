/**
 * Penales — duelo real: el tirador elige esquina y el portero elige lado; solo
 * ataja si coinciden. Con el portero uniforme la probabilidad de gol es
 * 1 - 1/5 = 80%, la misma que anuncia el motor, y la eleccion del jugador SI
 * decide la jugada (no es agencia de mentira).
 */
import React, { useState } from 'react';
import { IonButton, IonSpinner, IonBadge } from '@ionic/react';
import BetSelector from '../../../components/ui/BetSelector';
import GameShell from '../shared/GameShell';
import CashOutBar from '../shared/CashOutBar';
import { useArcadeGame } from '../shared/useArcadeGame';
import type { StreakState } from '../../../api/arcadeApi';

const ZONES = ['Izq. alta', 'Izq. baja', 'Centro', 'Der. baja', 'Der. alta'];

const PenaltyView: React.FC = () => {
  const vm = useArcadeGame<StreakState>('penalty');
  const [zone, setZone] = useState(0);
  const st = vm.state;
  const last = st?.last;

  return (
    <GameShell vm={vm} title="Penales" resultDetail={st && <>Racha de {st.streak} goles</>}>
      <div className="ag-board">
        <div className="pk-goal">
          {ZONES.map((z, i) => (
            <button key={z} type="button"
              className={`pk-zone${zone === i ? ' pk-zone--picked' : ''}`
                + (last?.keeper === i ? ' pk-zone--keeper' : '')}
              disabled={!!vm.pending}
              onClick={() => setZone(i)}
              aria-label={z}
            >
              {last?.keeper === i ? '🧤' : zone === i ? '⚽' : ''}
            </button>
          ))}
        </div>
        {st ? (
          <>
            <IonBadge color="medium">Goles {st.streak} · x{st.multiplier.toFixed(2)}</IonBadge>
            <p className="ag-hint">
              {last ? (last.scored ? '¡Gol!' : 'El portero la atajó.') : 'Elige tu esquina.'}
            </p>
          </>
        ) : (
          <p className="ag-hint">Elige esquina. El portero cubre una de cinco: 80% de gol.</p>
        )}
      </div>

      {vm.inRound && st ? (
        <>
          <div className="ag-actions ag-actions--single">
            <IonButton disabled={!!vm.pending} onClick={() => vm.act('kick', { zone })}>
              {vm.pending === 'kick' ? <IonSpinner name="dots" /> : 'Cobrar el penal'}
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

export default PenaltyView;

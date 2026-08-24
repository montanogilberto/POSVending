/**
 * Mayor o Menor — baraja de 52 SIN reposicion: el pago de cada paso se
 * recalcula con las cartas que QUEDAN. Con probabilidades fijas el juego seria
 * explotable contando cartas.
 *
 * Las probabilidades que se muestran vienen del SERVIDOR (`higherChance` /
 * `lowerChance`). No se aproximan aqui: un porcentaje que contradiga al backend
 * seria peor que no mostrar ninguno.
 */
import React from 'react';
import { IonButton, IonSpinner, IonIcon } from '@ionic/react';
import { arrowUpOutline, arrowDownOutline } from 'ionicons/icons';
import BetSelector from '../../../components/ui/BetSelector';
import GameShell from '../shared/GameShell';
import CashOutBar from '../shared/CashOutBar';
import { fmtNum } from '../../../utils/format';
import { useArcadeGame } from '../shared/useArcadeGame';
import type { HigherLowerState } from '../../../api/arcadeApi';

const RANKS: Record<number, string> = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };
const label = (r: number) => RANKS[r] ?? String(r);
const pct = (p: number) => `${Math.round(p * 100)}%`;

const HigherLowerView: React.FC = () => {
  const vm = useArcadeGame<HigherLowerState>('higherlower');
  const st = vm.state;
  const busy = !!vm.pending;

  return (
    <GameShell vm={vm} title="Mayor o Menor"
      resultDetail={st && <>Racha de {st.streak}</>}>

      {/* La racha como escalera: hace visible que cada acierto compone. */}
      {vm.inRound && st && st.streak > 0 && (
        <div className="hl-streak">
          {Array.from({ length: Math.min(st.streak, 8) }, (_, i) => (
            <span key={i} className="hl-streak__pip" />
          ))}
          <span className="hl-streak__value">x{fmtNum(st.multiplier)}</span>
        </div>
      )}

      <div className="ag-board">
        <div className="hl-table">
          {/* Carta anterior, para leer de un vistazo que acaba de pasar. */}
          {st?.last && (
            <div className="hl-card hl-card--past">{label(st.last.from)}</div>
          )}
          <div className="hl-card hl-card--current">{st ? label(st.current) : '?'}</div>
        </div>

        {st ? (
          <p className="ag-hint">
            Quedan {st.cardsLeft} cartas · empate pierde ({pct(st.tieChance)})
          </p>
        ) : (
          <p className="ag-hint">Adivina si la siguiente carta es mayor o menor.</p>
        )}
      </div>

      {vm.inRound && st ? (
        <>
          {/* Cada boton dice su probabilidad REAL y adonde llegaria el
              acumulado. Esa es la decision: mas probable paga menos. */}
          <div className="hl-choices">
            <button
              type="button"
              className="hl-choice hl-choice--up"
              disabled={busy || st.higherPays <= 0}
              onClick={e => { e.currentTarget.blur(); vm.act('higher'); }}
            >
              {vm.pending === 'higher' ? <IonSpinner name="dots" /> : (
                <>
                  <IonIcon icon={arrowUpOutline} />
                  <span className="hl-choice__name">Mayor</span>
                  <span className="hl-choice__chance">{pct(st.higherChance)}</span>
                  <span className="hl-choice__pays">x{fmtNum(st.higherPays)}</span>
                </>
              )}
            </button>

            <button
              type="button"
              className="hl-choice hl-choice--down"
              disabled={busy || st.lowerPays <= 0}
              onClick={e => { e.currentTarget.blur(); vm.act('lower'); }}
            >
              {vm.pending === 'lower' ? <IonSpinner name="dots" /> : (
                <>
                  <IonIcon icon={arrowDownOutline} />
                  <span className="hl-choice__name">Menor</span>
                  <span className="hl-choice__chance">{pct(st.lowerChance)}</span>
                  <span className="hl-choice__pays">x{fmtNum(st.lowerPays)}</span>
                </>
              )}
            </button>
          </div>

          <CashOutBar multiplier={st.multiplier} bet={vm.bet} canCashOut={st.canCashOut}
            busy={busy} cashingOut={vm.pending === 'cashout'}
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

/**
 * Minas — las minas quedan fijadas AL ABRIR la ronda, no al tocar cada
 * casilla: si se sortearan sobre la marcha el servidor podria decidir a
 * posteriori donde poner la que mata.
 *
 * Aqui NO se calcula ningun multiplicador. La escalera se arma con
 * `multiplier` y `nextMultiplier` que manda el servidor; replicar la
 * combinatoria en React seria una segunda fuente de verdad que tarde o
 * temprano contradice a la primera.
 */
import React, { useState } from 'react';
import { IonIcon, IonButton, IonSpinner } from '@ionic/react';
import { diamondOutline, skullOutline, trendingUpOutline } from 'ionicons/icons';
import BetSelector from '../../../components/ui/BetSelector';
import GameShell from '../shared/GameShell';
import CashOutBar from '../shared/CashOutBar';
import { fmtNum } from '../../../utils/format';
import { useArcadeGame } from '../shared/useArcadeGame';
import type { MinesState } from '../../../api/arcadeApi';

/**
 * Presets sobre la MISMA opcion `mines` que el backend ya acepta (1-24). Son
 * etiquetas, no modos nuevos: inventar un modo que el motor no conoce seria
 * prometer algo que el servidor no puede cumplir.
 */
const PRESETS = [
  { mines: 3,  label: 'Principiante', hint: 'Avanza lento y seguro' },
  { mines: 7,  label: 'Equilibrado',  hint: 'El punto medio' },
  { mines: 15, label: 'Extremo',      hint: 'Sube rapidisimo' },
];

const MinesView: React.FC = () => {
  const vm = useArcadeGame<MinesState>('mines');
  const [mines, setMines] = useState(3);
  const st = vm.state;

  const revealed = new Set(st?.revealed ?? []);
  const mineSet = new Set(st?.mineTiles ?? []);
  const safeCount = st?.revealed.length ?? 0;
  const busy = !!vm.pending;

  return (
    <GameShell
      vm={vm}
      title="Minas"
      resultDetail={st && <>{safeCount} casillas destapadas de {25 - st.mines} seguras</>}
    >
      {/* Escalera: lo que vale AHORA y lo que valdria el siguiente acierto.
          Es la tension del juego, asi que va arriba del tablero. */}
      {vm.inRound && st && (
        <div className="mn-ladder">
          <div className="mn-ladder__now">
            <span className="mn-ladder__label">Llevas</span>
            <strong>{fmtNum(st.multiplier)}<small>x</small></strong>
            <span className="mn-ladder__coins">{safeCount} {safeCount === 1 ? 'segura' : 'seguras'}</span>
          </div>
          <IonIcon icon={trendingUpOutline} className="mn-ladder__arrow" />
          <div className="mn-ladder__next">
            <span className="mn-ladder__label">Siguiente</span>
            <strong>{fmtNum(st.nextMultiplier)}<small>x</small></strong>
            <span className="mn-ladder__coins">si aciertas</span>
          </div>
        </div>
      )}

      <div className="ag-board">
        <div className={`mn-grid${vm.inRound ? '' : ' mn-grid--idle'}`}>
          {Array.from({ length: 25 }, (_, i) => {
            const safe = revealed.has(i);
            // Las minas solo existen aqui cuando la ronda ya termino: el
            // estado publico las manda en null mientras se juega.
            const bomb = mineSet.has(i);
            const state = safe ? ' mn-tile--safe' : bomb ? ' mn-tile--mine' : '';
            return (
              <button
                key={i}
                type="button"
                className={`mn-tile${state}`}
                disabled={!vm.inRound || busy || safe || bomb}
                onClick={e => { e.currentTarget.blur(); vm.act('reveal', { tile: i }); }}
                aria-label={`Casilla ${i + 1}`}
              >
                {safe && <IonIcon icon={diamondOutline} />}
                {bomb && <IonIcon icon={skullOutline} />}
              </button>
            );
          })}
        </div>

        {vm.inRound && st && (
          <p className="mn-progress">{st.mines} minas escondidas</p>
        )}
      </div>

      {vm.inRound && st ? (
        <CashOutBar
          multiplier={st.multiplier}
          nextMultiplier={st.nextMultiplier}
          bet={vm.bet}
          canCashOut={st.canCashOut}
          busy={busy}
          cashingOut={vm.pending === 'cashout'}
          onCashOut={() => vm.act('cashout')}
        />
      ) : (
        <>
          <div className="mn-presets">
            {PRESETS.map(p => (
              <button
                key={p.mines}
                type="button"
                className={`mn-preset${mines === p.mines ? ' mn-preset--on' : ''}`}
                disabled={busy}
                onClick={e => { e.currentTarget.blur(); setMines(p.mines); }}
              >
                <span className="mn-preset__mines">{p.mines}</span>
                <span className="mn-preset__label">{p.label}</span>
                <span className="mn-preset__hint">{p.hint}</span>
              </button>
            ))}
          </div>

          {vm.game && (
            <BetSelector
              bet={vm.bet}
              onChange={vm.setBet}
              minBet={vm.game.minBet}
              maxBet={vm.game.maxBet}
              coinBalance={vm.coinBalance}
              busy={vm.pending === 'bet'}
              actionLabel="Empezar"
              onAction={() => vm.start({ mines })}
            />
          )}
        </>
      )}
    </GameShell>
  );
};

export default MinesView;

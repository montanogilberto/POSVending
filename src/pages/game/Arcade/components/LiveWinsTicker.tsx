import React from 'react';
import { IonIcon } from '@ionic/react';
import { radioButtonOnOutline } from 'ionicons/icons';
import { fmtInt } from '../../../../utils/format';
import { GAME_ART } from '../../shared/GameArt';
import type { LiveWin } from '../../../../api/arcadeApi';

/**
 * Ticker de ganancias recientes.
 *
 * ANONIMO: el backend no manda quien gano y aqui no se inventa. Es una app de
 * prestamos — publicar que un cliente identificable esta jugando seria un
 * problema de privacidad que el ticker no necesita tener.
 *
 * En FICHAS, nunca en pesos: mostrar "$" aqui contradiria el aviso de que las
 * fichas no son dinero.
 */
const LiveWinsTicker: React.FC<{ wins: LiveWin[] }> = ({ wins }) => {
  if (wins.length === 0) return null;

  return (
    <section className="arc-live">
      <div className="arc-live__head">
        <IonIcon icon={radioButtonOnOutline} className="arc-live__dot" />
        <span>Ganancias en vivo</span>
      </div>

      <div className="arc-live__rail">
        {wins.map(win => {
          const Art = GAME_ART[win.gameKey] ?? GAME_ART.blackjack;
          return (
            <div key={win.roundId} className="arc-live__card">
              <Art className="arc-live__art" />
              <span className="arc-live__game">{win.gameName}</span>
              <span className="arc-live__amount">
                +{fmtInt(win.payoutAmount - win.betAmount)}
              </span>
              <span className="arc-live__mult">x{Number(win.multiplier).toFixed(2)}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default LiveWinsTicker;

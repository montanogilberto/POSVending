import React from 'react';
import { IonButton, IonSpinner, IonIcon } from '@ionic/react';
import { walletOutline } from 'ionicons/icons';
import { fmtInt } from '../../../utils/format';

interface CashOutBarProps {
  multiplier: number;
  nextMultiplier?: number;
  bet: number;
  canCashOut: boolean;
  busy: boolean;
  cashingOut: boolean;
  onCashOut: () => void;
}

/**
 * Barra de retiro de los juegos de racha (mayor/menor, minas, penales,
 * boliche). Muestra lo que el jugador se lleva AHORA y lo que arriesga por
 * seguir — que es exactamente la decision del juego.
 */
const CashOutBar: React.FC<CashOutBarProps> = ({
  multiplier, nextMultiplier, bet, canCashOut, busy, cashingOut, onCashOut,
}) => (
  <div className="ag-cashout">
    <div className="ag-cashout__now">
      <span className="ag-cashout__label">Te llevas</span>
      <strong>{fmtInt(Math.round(bet * multiplier))}</strong>
      <span className="ag-cashout__mult">x{multiplier.toFixed(2)}</span>
    </div>

    {nextMultiplier !== undefined && nextMultiplier > multiplier && (
      <div className="ag-cashout__next">
        Si aciertas: {fmtInt(Math.round(bet * nextMultiplier))} (x{nextMultiplier.toFixed(2)})
      </div>
    )}

    <IonButton expand="block" fill="outline" color="success"
      disabled={!canCashOut || busy} onClick={onCashOut}>
      {cashingOut ? <IonSpinner name="dots" /> : (
        <>
          <IonIcon icon={walletOutline} slot="start" />
          Retirar
        </>
      )}
    </IonButton>
  </div>
);

export default CashOutBar;

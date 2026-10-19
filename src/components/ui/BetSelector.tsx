import React from 'react';
import { IonChip, IonLabel, IonIcon, IonButton, IonSpinner } from '@ionic/react';
import { addOutline, removeOutline } from 'ionicons/icons';
import { fmtInt } from '../../utils/format';
import './BetSelector.css';

interface BetSelectorProps {
  bet: number;
  onChange: (bet: number) => void;
  minBet: number;
  maxBet: number;
  /** Saldo disponible — acota el maximo real, no solo el del catalogo. */
  coinBalance: number;
  disabled?: boolean;
  busy?: boolean;
  actionLabel: string;
  onAction: () => void;
}

/** Fichas sugeridas; las que no caben en el rango del juego se ocultan. */
const PRESETS = [10, 25, 50, 100, 250, 500];

/**
 * Selector de apuesta compartido por los juegos del arcade: atajos de fichas,
 * ajuste fino y el boton que abre la ronda. El tope efectivo es el menor entre
 * maxBet del catalogo y el saldo, para que el jugador nunca dispare una
 * apuesta que el backend va a rechazar por fichas insuficientes.
 */
const BetSelector: React.FC<BetSelectorProps> = ({
  bet, onChange, minBet, maxBet, coinBalance, disabled, busy, actionLabel, onAction,
}) => {
  const effectiveMax = Math.max(minBet, Math.min(maxBet, coinBalance));
  const clamp = (value: number) => Math.max(minBet, Math.min(effectiveMax, value));
  const presets = PRESETS.filter(p => p >= minBet && p <= maxBet);
  const cannotAfford = coinBalance < minBet;

  return (
    <div className="bet-selector">
      <div className="bet-selector__presets">
        {presets.map(preset => (
          <IonChip
            key={preset}
            outline={bet !== preset}
            color={bet === preset ? 'primary' : 'medium'}
            disabled={disabled || preset > coinBalance}
            onClick={() => onChange(preset)}
          >
            <IonLabel>{fmtInt(preset)}</IonLabel>
          </IonChip>
        ))}
      </div>

      <div className="bet-selector__stepper">
        <IonButton fill="clear" size="small" disabled={disabled || bet <= minBet}
          onClick={() => onChange(clamp(bet - minBet))}>
          <IonIcon icon={removeOutline} slot="icon-only" />
        </IonButton>
        <div className="bet-selector__amount">
          <span className="bet-selector__value">{fmtInt(bet)}</span>
          <span className="bet-selector__unit">fichas</span>
        </div>
        <IonButton fill="clear" size="small" disabled={disabled || bet >= effectiveMax}
          onClick={() => onChange(clamp(bet + minBet))}>
          <IonIcon icon={addOutline} slot="icon-only" />
        </IonButton>
      </div>

      <IonButton expand="block" className="bet-selector__action"
        disabled={disabled || busy || cannotAfford} onClick={onAction}>
        {busy ? <IonSpinner name="dots" /> : actionLabel}
      </IonButton>

      {cannotAfford && (
        <p className="bet-selector__hint">
          No te alcanza para la apuesta minima ({fmtInt(minBet)} fichas). Cobra tu bono diario.
        </p>
      )}
    </div>
  );
};

export default BetSelector;

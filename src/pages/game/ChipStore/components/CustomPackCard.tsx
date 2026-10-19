import React, { useState } from 'react';
import { IonButton, IonSpinner, IonIcon, IonRange } from '@ionic/react';
import { optionsOutline } from 'ionicons/icons';
import { fmtInt, fmtNum } from '../../../../utils/format';
import CoinStack from '../../Arcade/components/CoinStack';
import { customPrice, type ChipPack } from '../../../../api/arcadeStoreApi';

interface CustomPackCardProps {
  pack: ChipPack;
  busy: boolean;
  disabled: boolean;
  onBuy: (pack: ChipPack, chips: number) => void;
}

/**
 * Monto libre: el jugador elige CUANTAS fichas, nunca cuanto paga. El precio
 * que se pinta aqui es solo un anticipo — el cobro real lo calcula el backend
 * con la misma tarifa, para que el navegador no pueda abaratarse la compra.
 */
const CustomPackCard: React.FC<CustomPackCardProps> = ({ pack, busy, disabled, onBuy }) => {
  const min = pack.minChips ?? 500;
  const max = pack.maxChips ?? 50000;
  // Arranca en un valor redondo cerca del medio, no en el minimo.
  const [chips, setChips] = useState(() => Math.min(max, Math.max(min, 2500)));

  // Pasos de 500 fichas: un deslizador ficha por ficha da precios con
  // centavos raros y no aporta nada al jugador.
  const step = 500;

  return (
    <div className="cs-pack cs-pack--custom">
      <span className="cs-pack__badge cs-pack__badge--custom">
        <IonIcon icon={optionsOutline} />
        {pack.name}
      </span>

      <CoinStack className="cs-pack__coins" />

      <div className="cs-pack__amount">{fmtInt(chips)}</div>
      <div className="cs-pack__unit">fichas</div>

      <IonRange
        className="cs-custom__range"
        min={min}
        max={max}
        step={step}
        value={chips}
        disabled={disabled || busy}
        onIonInput={e => setChips(e.detail.value as number)}
        aria-label="Cantidad de fichas"
      />

      <div className="cs-custom__limits">
        <span>{fmtInt(min)}</span>
        <span>{fmtInt(max)}</span>
      </div>

      <IonButton
        className="cs-pack__buy"
        expand="block"
        disabled={disabled || busy}
        onClick={e => { e.currentTarget.blur(); onBuy(pack, chips); }}
      >
        {busy ? <IonSpinner name="dots" /> : `$${fmtNum(customPrice(pack, chips))}`}
      </IonButton>
    </div>
  );
};

export default CustomPackCard;

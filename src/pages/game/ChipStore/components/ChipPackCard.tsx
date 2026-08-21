import React from 'react';
import { IonButton, IonSpinner, IonIcon } from '@ionic/react';
import { sparklesOutline } from 'ionicons/icons';
import { fmtInt } from '../../../../utils/format';
import CoinStack from '../../Arcade/components/CoinStack';
import type { ChipPack } from '../../../../api/arcadeStoreApi';

interface ChipPackCardProps {
  pack: ChipPack;
  /** Precio formateado por la tienda; si falta, cae al del catalogo. */
  storePrice?: string;
  busy: boolean;
  disabled: boolean;
  onBuy: (pack: ChipPack) => void;
}

const ChipPackCard: React.FC<ChipPackCardProps> = ({
  pack, storePrice, busy, disabled, onBuy,
}) => {
  const total = pack.chips + pack.bonusChips;

  return (
    <div className={`cs-pack${pack.badge ? ' cs-pack--featured' : ''}`}>
      {pack.badge && <span className="cs-pack__badge">{pack.badge}</span>}

      <CoinStack className="cs-pack__coins" />

      <div className="cs-pack__amount">{fmtInt(total)}</div>
      <div className="cs-pack__unit">fichas</div>

      {pack.bonusChips > 0 && (
        <span className="cs-pack__bonus">
          <IonIcon icon={sparklesOutline} />
          +{fmtInt(pack.bonusChips)} de regalo
        </span>
      )}

      <IonButton
        className="cs-pack__buy"
        expand="block"
        disabled={disabled || busy}
        onClick={() => onBuy(pack)}
      >
        {busy ? <IonSpinner name="dots" /> : (storePrice ?? `$${fmtInt(pack.priceMXN)}`)}
      </IonButton>
    </div>
  );
};

export default ChipPackCard;

import React from 'react';
import { IonButton, IonIcon, IonSpinner, IonProgressBar } from '@ionic/react';
import { giftOutline, trendingUpOutline, trendingDownOutline, addOutline } from 'ionicons/icons';
import { fmtInt } from '../../../../utils/format';
import type { ArcadeVM } from '../ArcadeLogic';
import CoinStack from './CoinStack';

/**
 * Hero del arcade: saldo de fichas a la izquierda y, separado por una regla,
 * el limite diario de juego responsable con el bono.
 *
 * La barra mide lo que QUEDA del limite, no lo gastado — el numero de al lado
 * dice "restantes", asi que una barra que se llena al gastar contaria la
 * historia al reves.
 */
const CoinWalletHero: React.FC<{ vm: ArcadeVM }> = ({ vm }) => {
  const { wallet, coinBalance, netLifetime } = vm;
  const limit = wallet?.dailyWagerLimit ?? 0;
  const usedToday = wallet?.wageredToday ?? 0;
  const remaining = Math.max(0, limit - usedToday);
  const up = netLifetime >= 0;

  return (
    <div className="arc-hero">
      <div className="arc-hero__body">
        <div className="arc-hero__left">
          <div>
            <span className="arc-hero__label">Tus fichas</span>
            <div className="arc-hero__balance">{fmtInt(coinBalance)}</div>
            <div className="arc-hero__stats">
              <span className={`arc-hero__net${up ? '' : ' arc-hero__net--down'}`}>
                <IonIcon icon={up ? trendingUpOutline : trendingDownOutline} />
                {up ? '+' : ''}{fmtInt(netLifetime)} histórico
              </span>
              <span className="arc-hero__rounds">{fmtInt(wallet?.lifetimeRounds ?? 0)} rondas</span>
            </div>
          </div>
          <CoinStack className="arc-hero__coins" />
        </div>

        {limit > 0 && (
          <div className="arc-hero__right">
            <div>
              <span className="arc-hero__label">Límite diario</span>
              <div className="arc-hero__limit-value">
                {fmtInt(remaining)}<small>de {fmtInt(limit)} restantes</small>
              </div>
            </div>

            {/* IonProgressBar y no un div a medida: el ancho es dinamico y
                pintarlo a mano obligaria a un estilo en linea. El componente
                se tematiza por completo desde el .css (CLAUDE.md §4.2). */}
            <IonProgressBar
              className="arc-hero__bar"
              value={limit > 0 ? remaining / limit : 0}
              aria-label="Límite diario restante"
            />

            <div className="arc-hero__actions">
              <IonButton className="arc-hero__bonus" expand="block"
                disabled={vm.claiming} onClick={vm.claimBonus}>
                {vm.claiming ? <IonSpinner name="dots" /> : (
                  <>
                    <IonIcon icon={giftOutline} slot="start" />
                    Cobrar bono diario
                  </>
                )}
              </IonButton>

              <IonButton className="arc-hero__buy" expand="block" fill="outline"
                onClick={e => { e.currentTarget.blur(); vm.history.push('/arcade/tienda'); }}>
                <IonIcon icon={addOutline} slot="start" />
                Comprar fichas
              </IonButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CoinWalletHero;

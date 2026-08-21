/**
 * BlackjackView — solo presentacion (MVVM).
 * Sin fetch ni reglas de juego: todo viene de useBlackjack(), y las reglas
 * viven en el servidor (modules/arcade.py).
 */
import React from 'react';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton,
  IonIcon, IonToast, IonSpinner, IonBadge, IonChip, IonLabel,
} from '@ionic/react';
import { arrowBackOutline, shieldCheckmarkOutline } from 'ionicons/icons';
import BetSelector from '../../../components/ui/BetSelector';
import ProvablyFairSheet from '../../../components/ui/ProvablyFairSheet';
import RoundResultModal from '../../../components/ui/RoundResultModal';
import { fmtInt } from '../../../utils/format';
import { useBlackjack } from './BlackjackLogic';
import HandRow from './components/HandRow';

const BlackjackView: React.FC = () => {
  const vm = useBlackjack();
  const { state, game } = vm;

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={() => vm.history.goBack()}>
              <IonIcon icon={arrowBackOutline} slot="icon-only" />
            </IonButton>
          </IonButtons>
          <IonTitle>Blackjack 21</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => vm.setFairOpen(true)} title="Juego limpio">
              <IonIcon icon={shieldCheckmarkOutline} slot="icon-only" />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="bj-content">
        <IonToast {...vm.toastProps} />

        {vm.loading ? (
          <div className="bj-loading"><IonSpinner name="dots" /></div>
        ) : (
          <>
            <div className="bj-topbar">
              <IonChip outline color="warning">
                <IonLabel>{fmtInt(vm.coinBalance)} fichas</IonLabel>
              </IonChip>
              {game && (
                <IonBadge color="medium">RTP {(game.rtp * 100).toFixed(2)}%</IonBadge>
              )}
            </div>

            <div className="bj-table">
              {state ? (
                <>
                  <HandRow
                    label="Crupier"
                    cards={state.dealer}
                    total={state.dealerTotal}
                    hidden={state.dealerHidden}
                    busted={!state.dealerHidden && state.dealerTotal > 21}
                  />
                  <div className="bj-table__divider" />
                  <HandRow
                    label="Tú"
                    cards={state.player}
                    total={state.playerTotal}
                    soft={state.playerSoft}
                    busted={state.playerTotal > 21}
                  />
                </>
              ) : (
                <div className="bj-table__idle">
                  <p>Elige tu apuesta y reparte.</p>
                  <span>El crupier se planta en 17. Blackjack paga 3:2.</span>
                </div>
              )}
            </div>

            {vm.inHand ? (
              <div className="bj-actions">
                <IonButton expand="block" disabled={!state?.canHit || !!vm.pending}
                  onClick={() => vm.act('hit')}>
                  {vm.pending === 'hit' ? <IonSpinner name="dots" /> : 'Pedir'}
                </IonButton>
                <IonButton expand="block" fill="outline" disabled={!!vm.pending}
                  onClick={() => vm.act('stand')}>
                  {vm.pending === 'stand' ? <IonSpinner name="dots" /> : 'Plantarse'}
                </IonButton>
                <IonButton expand="block" fill="outline" color="warning"
                  disabled={!state?.canDouble || !!vm.pending || vm.coinBalance < vm.bet}
                  onClick={() => vm.act('double')}>
                  {vm.pending === 'double' ? <IonSpinner name="dots" /> : 'Doblar'}
                </IonButton>
              </div>
            ) : (
              game && (
                <BetSelector
                  bet={vm.bet}
                  onChange={vm.setBet}
                  minBet={game.minBet}
                  maxBet={game.maxBet}
                  coinBalance={vm.coinBalance}
                  busy={vm.pending === 'deal'}
                  actionLabel="Repartir"
                  onAction={vm.deal}
                />
              )
            )}
          </>
        )}

        <RoundResultModal
          result={vm.result}
          coinBalance={vm.coinBalance}
          onPlayAgain={vm.playAgain}
          onDismiss={vm.closeResult}
          detail={state && (
            <>Tú {state.playerTotal} · Crupier {state.dealerTotal}</>
          )}
        />

        <ProvablyFairSheet
          isOpen={vm.fairOpen}
          onDismiss={() => vm.setFairOpen(false)}
          serverSeedHash={vm.fair.serverSeedHash}
          serverSeed={vm.fair.serverSeed}
          clientSeed={vm.fair.clientSeed}
          nonce={vm.fair.nonce}
          rtp={game?.rtp}
        />
      </IonContent>
    </IonPage>
  );
};

export default BlackjackView;

/**
 * MoleView — solo presentacion (MVVM).
 * El marcador que se ve durante la ronda es provisional: el bueno lo calcula
 * el servidor al validar los golpes (useMole lo explica).
 */
import React from 'react';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton,
  IonIcon, IonToast, IonSpinner, IonBadge, IonChip, IonLabel, IonProgressBar,
} from '@ionic/react';
import { arrowBackOutline, shieldCheckmarkOutline } from 'ionicons/icons';
import BetSelector from '../../../components/ui/BetSelector';
import ProvablyFairSheet from '../../../components/ui/ProvablyFairSheet';
import RoundResultModal from '../../../components/ui/RoundResultModal';
import { fmtInt } from '../../../utils/format';
import { useMole } from './MoleLogic';
import MoleGrid from './components/MoleGrid';

const MoleView: React.FC = () => {
  const vm = useMole();
  const { game, schedule } = vm;
  const seconds = Math.ceil(vm.remainingMs / 1000);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={() => vm.history.goBack()}>
              <IonIcon icon={arrowBackOutline} slot="icon-only" />
            </IonButton>
          </IonButtons>
          <IonTitle>Atrapa al Topo</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => vm.setFairOpen(true)} title="Juego limpio">
              <IonIcon icon={shieldCheckmarkOutline} slot="icon-only" />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="mole-content">
        <IonToast {...vm.toastProps} />

        {vm.loading ? (
          <div className="mole-loading"><IonSpinner name="dots" /></div>
        ) : (
          <>
            <div className="mole-topbar">
              <IonChip outline color="warning">
                <IonLabel>{fmtInt(vm.coinBalance)} fichas</IonLabel>
              </IonChip>
              {game && <IonBadge color="medium">RTP {(game.rtp * 100).toFixed(2)}%</IonBadge>}
            </div>

            {vm.playing && schedule ? (
              <div className="mole-hud">
                <div className="mole-hud__row">
                  <span className="mole-hud__score">{vm.localScore} / {vm.totalSpawns}</span>
                  <span className="mole-hud__clock">{seconds}s</span>
                </div>
                <IonProgressBar
                  value={schedule.roundMs > 0 ? 1 - vm.remainingMs / schedule.roundMs : 0}
                  color="warning"
                />
              </div>
            ) : (
              <div className="mole-hud mole-hud--idle">
                <p>20 segundos. 24 topos. Entre más atrapes, mayor el multiplicador.</p>
              </div>
            )}

            <MoleGrid
              holes={schedule?.holes ?? 9}
              upHoles={vm.upHoles}
              onWhack={vm.whack}
              disabled={!vm.playing}
            />

            {vm.settling ? (
              <div className="mole-settling">
                <IonSpinner name="dots" />
                <span>Validando tus golpes…</span>
              </div>
            ) : !vm.playing && game && (
              <BetSelector
                bet={vm.bet}
                onChange={vm.setBet}
                minBet={game.minBet}
                maxBet={game.maxBet}
                coinBalance={vm.coinBalance}
                busy={vm.starting}
                actionLabel="Empezar ronda"
                onAction={vm.start}
              />
            )}
          </>
        )}

        <RoundResultModal
          result={vm.result}
          coinBalance={vm.coinBalance}
          onPlayAgain={vm.playAgain}
          onDismiss={vm.closeResult}
          detail={vm.result?.score !== undefined && (
            <>
              Atrapaste {vm.result.score} de {vm.result.totalSpawns} topos
              {!!vm.result.rejectedHits && ` · ${vm.result.rejectedHits} golpes no válidos`}
            </>
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

export default MoleView;

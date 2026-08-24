import React from 'react';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton,
  IonIcon, IonToast, IonSpinner, IonBadge, IonChip, IonLabel,
} from '@ionic/react';
import { arrowBackOutline, shieldCheckmarkOutline } from 'ionicons/icons';
import ProvablyFairSheet from '../../../components/ui/ProvablyFairSheet';
import RoundResultModal from '../../../components/ui/RoundResultModal';
import { fmtInt } from '../../../utils/format';
import './ArcadeGame.css';

/**
 * Marco comun de los juegos: barra superior, saldo, RTP, resultado y hoja de
 * juego limpio. Los diez juegos lo comparten para que el tablero sea lo unico
 * que cada uno escribe.
 *
 * Se tipa con `any` a proposito en el VM: cada juego lo instancia con su
 * propio estado y el shell no toca nada especifico del tablero.
 */
interface GameShellProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vm: any;
  title: string;
  /** Detalle bajo el importe en el modal de resultado. */
  resultDetail?: React.ReactNode;
  onPlayAgain?: () => void;
  children: React.ReactNode;
}

const GameShell: React.FC<GameShellProps> = ({
  vm, title, resultDetail, onPlayAgain, children,
}) => (
  <IonPage>
    <IonHeader>
      <IonToolbar>
        <IonButtons slot="start">
          <IonButton onClick={() => vm.history.goBack()}>
            <IonIcon icon={arrowBackOutline} slot="icon-only" />
          </IonButton>
        </IonButtons>
        <IonTitle>{title}</IonTitle>
        <IonButtons slot="end">
          <IonButton onClick={() => vm.setFairOpen(true)} title="Juego limpio">
            <IonIcon icon={shieldCheckmarkOutline} slot="icon-only" />
          </IonButton>
        </IonButtons>
      </IonToolbar>
    </IonHeader>

    <IonContent className="ag-content">
      <IonToast {...vm.toastProps} />

      {vm.loading ? (
        <div className="ag-loading"><IonSpinner name="dots" /></div>
      ) : (
        <>
          <div className="ag-topbar">
            <IonChip outline color="warning">
              <IonLabel>{fmtInt(vm.coinBalance)} fichas</IonLabel>
            </IonChip>
            {vm.game && (
              <IonBadge color="medium">RTP {(vm.game.rtp * 100).toFixed(1)}%</IonBadge>
            )}
          </div>
          {children}
        </>
      )}

      <RoundResultModal
        result={vm.result}
        coinBalance={vm.coinBalance}
        onPlayAgain={onPlayAgain ?? vm.reset}
        onDismiss={vm.reset}
        detail={resultDetail}
      />

      <ProvablyFairSheet
        isOpen={vm.fairOpen}
        onDismiss={() => vm.setFairOpen(false)}
        serverSeedHash={vm.fair.serverSeedHash}
        serverSeed={vm.fair.serverSeed}
        clientSeed={vm.fair.clientSeed}
        nonce={vm.fair.nonce}
        rtp={vm.game?.rtp}
      />
    </IonContent>
  </IonPage>
);

export default GameShell;

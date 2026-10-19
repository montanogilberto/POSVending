import React from 'react';
import { IonModal, IonContent, IonButton, IonIcon, IonBadge } from '@ionic/react';
import { trophyOutline, sadOutline, removeCircleOutline, sparklesOutline } from 'ionicons/icons';
import { fmtInt } from '../../utils/format';
import type { RoundResult } from '../../api/arcadeApi';
import './RoundResultModal.css';

interface RoundResultModalProps {
  result: RoundResult | null;
  coinBalance: number;
  onPlayAgain: () => void;
  onDismiss: () => void;
  /** Detalle extra del juego (aciertos, mano final) bajo el importe. */
  detail?: React.ReactNode;
}

const VISUALS = {
  blackjack: { icon: sparklesOutline, title: '¡Blackjack!',  tone: 'win'  as const },
  win:       { icon: trophyOutline,   title: '¡Ganaste!',    tone: 'win'  as const },
  push:      { icon: removeCircleOutline, title: 'Empate',   tone: 'push' as const },
  lose:      { icon: sadOutline,      title: 'Perdiste',     tone: 'lose' as const },
};

/** Resultado de la ronda: cuanto se movio el saldo y por que. */
const RoundResultModal: React.FC<RoundResultModalProps> = ({
  result, coinBalance, onPlayAgain, onDismiss, detail,
}) => {
  const visual = result ? VISUALS[result.outcome] ?? VISUALS.lose : VISUALS.lose;

  return (
    <IonModal isOpen={!!result} onDidDismiss={onDismiss} initialBreakpoint={0.62} breakpoints={[0, 0.62]}>
      <IonContent className={`rrm-content rrm-content--${visual.tone}`}>
        {result && (
          <div className="rrm-body">
            <IonIcon icon={visual.icon} className="rrm-icon" />
            <h2 className="rrm-title">{visual.title}</h2>

            <div className="rrm-amount">
              {result.netAmount >= 0 ? '+' : ''}{fmtInt(result.netAmount)}
              <span className="rrm-amount__unit">fichas</span>
            </div>

            <IonBadge color="medium" className="rrm-multiplier">
              x{result.multiplier.toFixed(2)} sobre {fmtInt(result.betAmount)}
            </IonBadge>

            {detail && <div className="rrm-detail">{detail}</div>}

            <p className="rrm-balance">Saldo: {fmtInt(coinBalance)} fichas</p>

            <IonButton expand="block" className="rrm-again" onClick={onPlayAgain}>
              Jugar otra vez
            </IonButton>
            <IonButton expand="block" fill="clear" color="medium" onClick={onDismiss}>
              Cerrar
            </IonButton>
          </div>
        )}
      </IonContent>
    </IonModal>
  );
};

export default RoundResultModal;

import React from 'react';
import { IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonIcon, IonNote } from '@ionic/react';
import { shieldCheckmarkOutline, closeOutline } from 'ionicons/icons';
import './ProvablyFairSheet.css';

interface ProvablyFairSheetProps {
  isOpen: boolean;
  onDismiss: () => void;
  serverSeedHash?: string;
  /** Solo existe tras liquidar: antes, revelarla entregaria la partida. */
  serverSeed?: string;
  clientSeed?: string;
  nonce?: number;
  rtp?: number;
}

/**
 * Hoja de juego limpio: enseña el compromiso del servidor y, ya liquidada la
 * ronda, la semilla para comprobarlo. Es la unica pantalla que justifica la
 * frase "el resultado no se decidio despues de tu jugada", asi que lista los
 * datos crudos aunque sean feos — sin ellos la promesa no se puede verificar.
 */
const ProvablyFairSheet: React.FC<ProvablyFairSheetProps> = ({
  isOpen, onDismiss, serverSeedHash, serverSeed, clientSeed, nonce, rtp,
}) => (
  <IonModal isOpen={isOpen} onDidDismiss={onDismiss} initialBreakpoint={0.7} breakpoints={[0, 0.7, 1]}>
    <IonHeader>
      <IonToolbar>
        <IonTitle>Juego limpio</IonTitle>
        <IonButtons slot="end">
          <IonButton onClick={onDismiss}>
            <IonIcon icon={closeOutline} slot="icon-only" />
          </IonButton>
        </IonButtons>
      </IonToolbar>
    </IonHeader>
    <IonContent className="pf-content">
      <div className="pf-intro">
        <IonIcon icon={shieldCheckmarkOutline} className="pf-intro__icon" />
        <p>
          Antes de repartir te entregamos el <strong>hash</strong> de nuestra semilla.
          Al terminar te damos la semilla. Si <code>SHA-256</code> de la semilla es
          ese mismo hash, el resultado ya estaba fijado antes de tu jugada.
        </p>
      </div>

      <div className="pf-field">
        <span className="pf-field__label">Hash del servidor (antes de jugar)</span>
        <code className="pf-field__value">{serverSeedHash ?? '—'}</code>
      </div>

      <div className="pf-field">
        <span className="pf-field__label">Semilla del servidor (al liquidar)</span>
        <code className="pf-field__value">
          {serverSeed ?? 'Se revela cuando termine la ronda'}
        </code>
      </div>

      <div className="pf-field">
        <span className="pf-field__label">Tu semilla</span>
        <code className="pf-field__value">{clientSeed ?? '—'}</code>
      </div>

      <div className="pf-field">
        <span className="pf-field__label">Nonce</span>
        <code className="pf-field__value">{nonce ?? '—'}</code>
      </div>

      {rtp !== undefined && (
        <IonNote className="pf-note">
          Retorno teorico al jugador: {(rtp * 100).toFixed(2)}%. La ventaja de la casa
          es {((1 - rtp) * 100).toFixed(2)}%, y a la larga se nota.
        </IonNote>
      )}

      <IonNote className="pf-note pf-note--warn">
        Las fichas del arcade no son dinero y no se canjean.
      </IonNote>
    </IonContent>
  </IonModal>
);

export default ProvablyFairSheet;

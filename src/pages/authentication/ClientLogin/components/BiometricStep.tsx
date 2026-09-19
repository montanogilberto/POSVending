import React from 'react';
import { IonButton, IonIcon } from '@ionic/react';
import { fingerPrintOutline } from 'ionicons/icons';
import { ClientLoginVM } from '../ClientLoginLogic';

const BiometricStep: React.FC<{ vm: ClientLoginVM }> = ({ vm }) => (
  <>
    <h2 className="login-card-title">Activa el bloqueo biométrico</h2>
    <p className="login-subtitle">
      {vm.biometricSupported
        ? 'Usa tu huella digital para entrar más rápido y proteger tu cuenta.'
        : 'Este dispositivo no tiene biométricos disponibles, puedes continuar sin activarlo.'}
    </p>

    <div className="client-login-biometric-icon">
      <IonIcon icon={fingerPrintOutline} />
    </div>

    <IonButton
      expand="block"
      disabled={vm.loading || !vm.biometricSupported}
      onClick={vm.handleEnableBiometric}
      className="login-submit-btn"
    >
      {vm.loading ? 'Activando...' : 'Activar huella digital'}
    </IonButton>
    <IonButton
      type="button"
      expand="block"
      fill="clear"
      disabled={vm.loading}
      onClick={vm.handleSkipBiometric}
    >
      Omitir por ahora
    </IonButton>
  </>
);

export default BiometricStep;

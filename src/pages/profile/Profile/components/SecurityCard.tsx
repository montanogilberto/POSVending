import React from 'react';
import {
  IonBadge, IonCard, IonCardContent, IonIcon, IonToggle,
} from '@ionic/react';
import {
  chevronForwardOutline, fingerPrintOutline, informationCircleOutline, keyOutline, lockClosedOutline,
} from 'ionicons/icons';
import { ProfileVM } from '../ProfileLogic';

/**
 * Seguridad: bloqueo biométrico (real, funcional) + cambiar contraseña.
 * "Cambiar contraseña" muestra la verdad — nunca se ha podido cambiar en esta
 * app, así que "Última actualización: Nunca" es honesto, no un placeholder.
 * El tap informa que está pendiente en vez de fingir una acción real.
 */
const SecurityCard: React.FC<{ vm: ProfileVM }> = ({ vm }) => (
  <IonCard className="profile-card">
    <IonCardContent>
      <div className="profile-section-header">
        <span className="profile-section-icon profile-icon-green">
          <IonIcon icon={lockClosedOutline} />
        </span>
        <div className="profile-section-heading">
          <h3>Métodos de autenticación</h3>
          <p>Administra cómo accedes a tu cuenta</p>
        </div>
      </div>

      <div className="profile-auth-row">
        <span className="profile-row-icon profile-icon-green-soft"><IonIcon icon={fingerPrintOutline} /></span>
        <div className="profile-row-text">
          <strong>Bloqueo biométrico</strong>
          <p>
            {vm.biometricSupported
              ? 'Activa tu huella digital para iniciar sesión.'
              : 'No disponible en este dispositivo.'}
          </p>
          {vm.biometricSupported && !vm.biometricEnabled && (
            <IonBadge className="profile-recommended-badge">Recomendado</IonBadge>
          )}
        </div>
        <IonToggle
          checked={vm.biometricEnabled}
          disabled={!vm.biometricSupported}
          onIonChange={e => vm.handleBiometricToggle(e.detail.checked)}
        />
      </div>

      <div className="profile-auth-row profile-auth-row-button" onClick={vm.handlePasswordTap} role="button" tabIndex={0}>
        <span className="profile-row-icon profile-icon-purple-soft"><IonIcon icon={keyOutline} /></span>
        <div className="profile-row-text">
          <strong>Cambiar contraseña</strong>
          <p>Última actualización: Nunca</p>
        </div>
        <IonIcon icon={chevronForwardOutline} className="profile-auth-chevron" />
      </div>

      <div className="profile-tip">
        <IonIcon icon={informationCircleOutline} />
        <span>Te recomendamos mantener tus métodos de autenticación actualizados para mayor seguridad.</span>
      </div>
    </IonCardContent>
  </IonCard>
);

export default SecurityCard;

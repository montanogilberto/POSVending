import React from 'react';
import { IonAvatar, IonBadge, IonIcon } from '@ionic/react';
import { shieldCheckmarkOutline } from 'ionicons/icons';
import ZoomableImage from '../../../../components/ui/ZoomableImage';
import { ProfileVM } from '../ProfileLogic';

/**
 * Banner de identidad — nombre, rol y estado de seguridad real (bloqueo
 * biométrico encendido = "Cuenta segura"; no es un badge decorativo fijo).
 * Misma foto que el menú lateral/dashboard: tocar → zoom; "Elegir otra" →
 * selector nativo de cámara/galería (@capacitor/camera).
 */
const ProfileHero: React.FC<{ vm: ProfileVM }> = ({ vm }) => (
  <div className="profile-hero">
    <IonAvatar className="profile-hero-avatar">
      <ZoomableImage src={vm.avatarUrl} alt="Foto de perfil" onReplace={vm.handlePickAvatar} />
    </IonAvatar>
    <div className="profile-hero-text">
      <div className="profile-hero-name-row">
        <h2>{vm.username || 'Usuario'}</h2>
        <IonBadge className="profile-hero-role-badge">{(vm.roleName || '').toUpperCase()}</IonBadge>
      </div>
      {vm.biometricEnabled && (
        <span className="profile-hero-secure">
          <IonIcon icon={shieldCheckmarkOutline} /> Cuenta segura
        </span>
      )}
    </div>
  </div>
);

export default ProfileHero;

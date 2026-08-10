import React from 'react';
import { IonButton, IonCard, IonCardContent, IonIcon, IonSpinner } from '@ionic/react';
import {
  checkmarkCircle, chevronForwardOutline, idCardOutline, timeOutline,
} from 'ionicons/icons';
import { ProfileVM } from '../ProfileLogic';

/**
 * Identificación (KYC) — resumen real desde clientFaceRecognitions, con link
 * al expediente completo ya existente (ExpedienteDigitalPage) en vez de
 * duplicar esa vista aquí.
 */
const IdentificationCard: React.FC<{ vm: ProfileVM }> = ({ vm }) => (
  <IonCard className="profile-card">
    <IonCardContent>
      <div className="profile-section-header">
        <span className="profile-section-icon profile-icon-purple">
          <IonIcon icon={idCardOutline} />
        </span>
        <div className="profile-section-heading">
          <h3>Identificación</h3>
          <p>Verificación de identidad (KYC)</p>
        </div>
      </div>

      {vm.loadingDocs ? (
        <div className="profile-loading-row"><IonSpinner name="crescent" /></div>
      ) : !vm.faceRecord ? (
        <div className="profile-empty-block">
          <p>Aún no has completado tu verificación de identidad.</p>
          <IonButton size="small" onClick={() => vm.history.push('/client-face-recognition')}>
            Iniciar verificación
          </IonButton>
        </div>
      ) : (
        <>
          <div className="profile-info-row">
            <span className={`profile-row-icon ${vm.faceRecord.isVerified ? 'profile-icon-green-soft' : 'profile-icon-amber-soft'}`}>
              <IonIcon icon={vm.faceRecord.isVerified ? checkmarkCircle : timeOutline} />
            </span>
            <div className="profile-row-text">
              <span>Estado</span>
              <strong>
                {vm.faceRecord.isVerified
                  ? `Verificada · ${Math.round((vm.faceRecord.confidenceScore ?? 0) * 100)}% confianza`
                  : 'Pendiente de revisión'}
              </strong>
            </div>
          </div>
          <div className="profile-info-row">
            <span className="profile-row-icon profile-icon-purple-soft">
              <IonIcon icon={idCardOutline} />
            </span>
            <div className="profile-row-text">
              <span>Documento</span>
              <strong>{vm.faceRecord.documentType || 'INE'}</strong>
            </div>
          </div>

          <IonButton fill="outline" expand="block" className="profile-link-btn"
            onClick={() => vm.history.push(`/client-expediente/${vm.clientId}`)}>
            Ver mi expediente completo
            <IonIcon icon={chevronForwardOutline} slot="end" />
          </IonButton>
        </>
      )}
    </IonCardContent>
  </IonCard>
);

export default IdentificationCard;

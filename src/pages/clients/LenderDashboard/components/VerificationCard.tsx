import React from 'react';
import {
  IonButton, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonIcon,
  IonItem, IonLabel, IonList, IonNote, IonProgressBar,
} from '@ionic/react';
import {
  addCircleOutline, checkmarkCircleOutline, documentTextOutline, ellipseOutline,
  personCircleOutline, shieldCheckmarkOutline, timeOutline,
} from 'ionicons/icons';
import { LenderDashboardVM } from '../LenderDashboardLogic';

/**
 * Verificación de identidad — loanContracts requires both the borrower AND
 * the lender to have gone through biometric verification + signature before a
 * digital contract is valid. Reuses the same wizard borrowers use
 * (ClientFaceRecognitionPage), scoped to this lender's own clientId.
 */
const VerificationCard: React.FC<{ vm: LenderDashboardVM }> = ({ vm }) => (
  <IonCard className="ld-card">
    <IonCardHeader><IonCardTitle>Verificación de identidad</IonCardTitle></IonCardHeader>
    <IonCardContent>
      {vm.faceRecord?.isVerified && vm.faceRecord?.contractAccepted && vm.faceRecord?.pagareAccepted ? (
        <div className="ldx-identity-ok">
          <span className="ldx-shield">
            <IonIcon icon={shieldCheckmarkOutline} />
          </span>
          <div className="ldx-identity-text">
            <strong>Identidad verificada</strong>
            <p>Nivel 3 de verificación</p>
            <p>Completado</p>
          </div>
          {/* Read-only view of the full expediente (datos + documentos) */}
          <IonButton expand="block" size="small" fill="outline" className="ldx-expediente-btn"
            onClick={() => { console.log('[LenderDashboard] → expediente', vm.lenderClientId); vm.history.push(`/client-expediente/${vm.lenderClientId}`); }}>
            <IonIcon icon={documentTextOutline} slot="start" />
            Ver mi expediente y datos
          </IonButton>
        </div>
      ) : vm.verificationDone > 0 ? (
        <div style={{ padding: '4px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <strong style={{ color: '#374151' }}>
              {vm.verificationInReview ? 'Verificación en revisión' : 'Verificación en proceso'}
            </strong>
            <IonNote>{vm.verificationDone} de {vm.verificationSteps.length}</IonNote>
          </div>
          <IonProgressBar value={vm.verificationDone / vm.verificationSteps.length} style={{ marginBottom: 8 }} />
          <IonList lines="none">
            {vm.verificationSteps.map((s) => (
              <IonItem key={s.label} style={{ '--min-height': '30px', '--padding-start': '0' } as any}>
                <IonIcon
                  slot="start"
                  icon={s.done ? checkmarkCircleOutline : (s as any).review ? timeOutline : ellipseOutline}
                  style={{ fontSize: 20, marginRight: 8, color: s.done ? '#059669' : (s as any).review ? '#d97706' : '#cbd5e1' }}
                />
                <IonLabel style={{ fontSize: 13, color: s.done ? '#374151' : '#6b7280' }}>
                  {s.label}{(s as any).review ? ' — en revisión' : ''}
                </IonLabel>
              </IonItem>
            ))}
          </IonList>
          <IonButton shape="round" expand="block" disabled={vm.wizardStarting} onClick={vm.handleStartVerification} style={{ marginTop: 6 }}>
            <IonIcon icon={addCircleOutline} slot="start" />
            {vm.wizardStarting ? 'Cargando...' : 'Continuar verificación'}
          </IonButton>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          <IonIcon icon={personCircleOutline} style={{ fontSize: 40, color: '#9ca3af' }} />
          <p style={{ margin: '8px 0 4px', color: '#374151' }}>Verificación pendiente.</p>
          <p style={{ margin: '0 0 14px', fontSize: 13, color: '#6b7280' }}>
            Requerida para firmar contratos digitales con tus prestatarios.
          </p>
          <IonButton shape="round" expand="block" disabled={vm.wizardStarting} onClick={vm.handleStartVerification}>
            <IonIcon icon={addCircleOutline} slot="start" />
            {vm.wizardStarting ? 'Cargando...' : 'Verificar identidad'}
          </IonButton>
        </div>
      )}
    </IonCardContent>
  </IonCard>
);

export default VerificationCard;

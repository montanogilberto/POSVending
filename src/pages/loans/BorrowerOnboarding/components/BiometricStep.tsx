import React from 'react';
import { IonButton, IonCard, IonIcon } from '@ionic/react';
import { arrowForwardOutline, fingerPrintOutline } from 'ionicons/icons';
import { BorrowerOnboardingVM } from '../BorrowerOnboardingLogic';
import DoneCard from './DoneCard';
import AlertCard from './AlertCard';

/** Paso 0 — Verificación biométrica (KYC facial + INE). */
const BiometricStep: React.FC<{ vm: BorrowerOnboardingVM }> = ({ vm }) => (
  <IonCard className="bop-panel">
    <div className="bop-section-title">
      <IonIcon icon={fingerPrintOutline} />
      Verificación Biométrica
    </div>
    <p className="bop-desc">
      Tu identidad debe verificarse con reconocimiento facial y documento de identidad oficial antes de poder acceder a préstamos. Este paso es obligatorio por ley para la firma del Pagaré.
    </p>

    {vm.biometricDone ? (
      <DoneCard
        title="Biometría verificada"
        subtitle={`Puntuación de confianza: ${((vm.record?.confidenceScore ?? 0) * 100).toFixed(0)}%`}
      />
    ) : (
      <AlertCard>
        <p>⚠️ Aún no tienes datos biométricos registrados. Completa la verificación facial para continuar.</p>
        <IonButton expand="block" onClick={vm.goToFaceRecognition}>
          Ir a verificación facial
          <IonIcon icon={arrowForwardOutline} slot="end" />
        </IonButton>
      </AlertCard>
    )}

    <IonButton
      expand="block"
      disabled={!vm.biometricDone}
      onClick={() => vm.setStep(1)}
      className="bop-next-btn"
    >
      Continuar → Pagaré
      <IonIcon icon={arrowForwardOutline} slot="end" />
    </IonButton>
  </IonCard>
);

export default BiometricStep;

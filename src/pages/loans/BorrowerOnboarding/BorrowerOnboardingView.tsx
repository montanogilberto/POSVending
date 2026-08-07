/**
 * BorrowerOnboardingView — solo presentación (MVVM).
 * Sin fetch, sin lógica de negocio: todo viene de useBorrowerOnboarding().
 */
import React from 'react';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonButtons,
  IonIcon, IonToast, IonLoading, IonProgressBar, IonBadge,
} from '@ionic/react';
import { arrowBackOutline } from 'ionicons/icons';
import { useBorrowerOnboarding } from './BorrowerOnboardingLogic';
import StepIndicator from './components/StepIndicator';
import BiometricStep from './components/BiometricStep';
import PagareStep from './components/PagareStep';
import ContractStep from './components/ContractStep';

const BorrowerOnboardingView: React.FC = () => {
  const vm = useBorrowerOnboarding();

  const renderStep = () => {
    switch (vm.step) {
      case 0: return <BiometricStep vm={vm} />;
      case 1: return <PagareStep vm={vm} />;
      case 2: return <ContractStep vm={vm} />;
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={() => vm.history.goBack()}>
              <IonIcon icon={arrowBackOutline} slot="icon-only" />
            </IonButton>
          </IonButtons>
          <IonTitle>Perfil de Prestatario</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="bop-content">
        <IonLoading isOpen={vm.loading || vm.saving} message={vm.saving ? 'Guardando...' : 'Cargando...'} />
        <IonToast isOpen={!!vm.toast} message={vm.toast ?? ''} duration={3000}
          onDidDismiss={() => vm.setToast(null)} color="warning" position="top" />

        <IonProgressBar value={(vm.step + (vm.stepDone[vm.step] ? 1 : 0)) / 3} color="primary" className="bop-progress" />

        <StepIndicator step={vm.step} stepDone={vm.stepDone} />

        {renderStep()}

        {/* ── All done summary ── */}
        {vm.allDone && vm.step < 2 && (
          <div className="bop-complete ion-margin ion-text-center">
            <IonBadge color="success" className="bop-complete-badge">
              ✓ Perfil completo — listo para solicitar préstamos
            </IonBadge>
            <br />
            <IonButton className="ion-margin-top" onClick={() => vm.history.replace('/p2p-lending')}>
              Ir a la plataforma SmartLoans
            </IonButton>
          </div>
        )}
      </IonContent>
    </IonPage>
  );
};

export default BorrowerOnboardingView;

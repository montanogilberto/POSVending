/**
 * EnrollmentView — presentation only (MVVM). Everything comes from useEnrollment().
 */
import React from 'react';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonButtons, IonIcon,
  IonCheckbox, IonCard, IonCardContent, IonSpinner, IonToast,
} from '@ionic/react';
import { arrowBackOutline, checkmarkCircle, alertCircleOutline } from 'ionicons/icons';
import EmptyState from '../../../components/ui/EmptyState';
import { useEnrollment } from './EnrollmentLogic';

const EnrollmentView: React.FC = () => {
  const vm = useEnrollment();

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={() => vm.history.goBack()} aria-label="Regresar">
              <IonIcon icon={arrowBackOutline} slot="icon-only" />
            </IonButton>
          </IonButtons>
          <IonTitle>{vm.copy?.title ?? 'Activar producto'}</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="enroll-content">
        <IonToast {...vm.toastProps} />

        {vm.blockedReason || !vm.copy ? (
          <EmptyState icon={alertCircleOutline} text={vm.blockedReason ?? 'Producto no disponible.'} className="enroll-empty" />
        ) : (
          <div className="enroll-body">
            <p className="enroll-intro">{vm.copy.intro}</p>

            {vm.copy.options.map(opt => {
              const isHeld = vm.held.includes(opt.capability);
              return (
                <IonCard key={opt.capability} className={`enroll-option${isHeld ? ' enroll-option-held' : ''}`}>
                  <IonCardContent>
                    {isHeld ? (
                      <div className="enroll-held-row">
                        <div>
                          <p className="enroll-option-name">{opt.label}</p>
                          <p className="enroll-option-desc">Ya lo tienes activo.</p>
                        </div>
                        <IonButton size="small" fill="outline" onClick={() => vm.goToHeld(opt.capability)}>
                          <IonIcon icon={checkmarkCircle} slot="start" />
                          Abrir
                        </IonButton>
                      </div>
                    ) : (
                      <IonCheckbox
                        labelPlacement="end"
                        justify="start"
                        className="enroll-checkbox"
                        checked={vm.selected.includes(opt.capability)}
                        disabled={vm.copy!.options.length === 1}
                        onIonChange={e => vm.toggle(opt.capability, e.detail.checked)}
                      >
                        <span className="enroll-option-name">{opt.label}</span>
                        <span className="enroll-option-desc">{opt.desc}</span>
                        <span className="enroll-option-next">{opt.next}</span>
                      </IonCheckbox>
                    )}
                  </IonCardContent>
                </IonCard>
              );
            })}

            <div className="enroll-terms">
              {vm.copy.terms.map(t => <p key={t} className="enroll-term">{t}</p>)}
              <IonCheckbox
                labelPlacement="end"
                justify="start"
                className="enroll-accept"
                checked={vm.accepted}
                onIonChange={e => vm.setAccepted(e.detail.checked)}
              >
                Acepto
              </IonCheckbox>
            </div>

            <IonButton expand="block" className="enroll-submit" disabled={!vm.canSubmit} onClick={vm.submit}>
              {vm.saving ? <IonSpinner name="dots" /> : 'Activar'}
            </IonButton>
          </div>
        )}
      </IonContent>
    </IonPage>
  );
};

export default EnrollmentView;

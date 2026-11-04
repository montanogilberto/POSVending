import React from 'react';
import { IonButton, IonIcon } from '@ionic/react';
import { checkmarkCircle } from 'ionicons/icons';
import { STEPS } from '../WhatsAppSetupConstants';
import type { WhatsAppSetupVM } from '../WhatsAppSetupLogic';

/** Steps of the wizard; each one can be opened directly (they save on their own). */
const SetupStepper: React.FC<{ vm: WhatsAppSetupVM }> = ({ vm }) => (
  <nav className="was-steps" aria-label="Pasos">
    {STEPS.map((s, i) => (
      <IonButton
        key={s.id}
        fill="clear"
        className={`was-step${i === vm.stepIndex ? ' active' : ''}${vm.stepDone[i] ? ' done' : ''}`}
        onClick={() => vm.goTo(i)}
        disabled={vm.savingStep}
        aria-current={i === vm.stepIndex ? 'step' : undefined}
      >
        <span className="was-step-inner">
          <IonIcon icon={vm.stepDone[i] ? checkmarkCircle : s.icon} aria-hidden="true" />
          <span className="was-step-label">{s.label}</span>
        </span>
      </IonButton>
    ))}
  </nav>
);

export default SetupStepper;

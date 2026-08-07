import React from 'react';
import { IonIcon } from '@ionic/react';
import { checkmarkCircle, ellipseOutline } from 'ionicons/icons';
import { STEPS } from '../BorrowerOnboardingConstants';
import { Step } from '../BorrowerOnboardingTypes';

interface StepIndicatorProps {
  step: Step;
  stepDone: boolean[];
}

/** Indicador de pasos del wizard (Biometría · Pagaré · Contrato). */
const StepIndicator: React.FC<StepIndicatorProps> = ({ step, stepDone }) => (
  <div className="bop-steps">
    {STEPS.map((s, i) => (
      <div key={i} className={`bop-step ${i === step ? 'active' : ''} ${stepDone[i] ? 'done' : ''}`}>
        <div className="bop-step-icon">
          <IonIcon icon={stepDone[i] ? checkmarkCircle : (i === step ? s.icon : ellipseOutline)} />
        </div>
        <span className="bop-step-label">{s.label}</span>
      </div>
    ))}
  </div>
);

export default StepIndicator;

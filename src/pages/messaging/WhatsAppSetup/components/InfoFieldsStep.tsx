import React from 'react';
import { IonInput, IonItem, IonList, IonTextarea } from '@ionic/react';
import { BUSINESS_FIELDS, POLICY_FIELDS } from '../WhatsAppSetupConstants';
import type { WhatsAppSetupVM } from '../WhatsAppSetupLogic';

/** Negocio (short inputs) or Precios y políticas (free text) — the company-wide businessInfo row. */
const InfoFieldsStep: React.FC<{ vm: WhatsAppSetupVM; kind: 'business' | 'policies' }> = ({ vm, kind }) => (
  <IonList lines="none" className="was-form">
    {kind === 'business'
      ? BUSINESS_FIELDS.map(f => (
        <IonItem key={f.key} className="was-field">
          <IonInput
            label={f.label} labelPlacement="stacked" fill="outline" placeholder={f.placeholder}
            type={f.type ?? 'text'} inputmode={f.type === 'tel' ? 'tel' : undefined}
            value={vm.info[f.key]} disabled={vm.savingStep}
            onIonInput={e => vm.setInfoField(f.key, e.detail.value ?? '')}
          />
        </IonItem>
      ))
      : POLICY_FIELDS.map(f => (
        <IonItem key={f.key} className="was-field">
          <IonTextarea
            label={f.label} labelPlacement="stacked" fill="outline" placeholder={f.placeholder}
            autoGrow rows={3} maxlength={f.key === 'servicesInfo' || f.key === 'extraInfo' ? 2000 : 1000}
            counter value={vm.info[f.key]} disabled={vm.savingStep}
            onIonInput={e => vm.setInfoField(f.key, e.detail.value ?? '')}
          />
        </IonItem>
      ))}
  </IonList>
);

export default InfoFieldsStep;

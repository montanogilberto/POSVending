import React from 'react';
import {
  IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonInput, IonModal, IonNote, IonSpinner, IonTextarea,
  IonTitle, IonToolbar,
} from '@ionic/react';
import { closeOutline } from 'ionicons/icons';
import { DISPLAY_NAME_MAX, EXTRA_INSTRUCTIONS_MAX } from '../../../../api/agentCompanySettingApi';
import type { AgentCompanySettingVM } from '../AgentCompanySettingLogic';

const AgentSettingsModal: React.FC<{ vm: AgentCompanySettingVM }> = ({ vm }) => {
  const readOnly = !vm.canEdit;
  return (
    <IonModal isOpen={!!vm.editing} onDidDismiss={vm.close} className="acs-modal">
      <IonHeader>
        <IonToolbar>
          <IonTitle>{vm.editing?.agent.name}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={vm.close} disabled={vm.saving} aria-label="Cerrar">
              <IonIcon icon={closeOutline} slot="icon-only" />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding acs-modal-content">
        <p className="acs-hint">{vm.editing?.agent.description}</p>

        <IonInput fill="outline" label="Cómo se presenta (opcional)" labelPlacement="floating"
          value={vm.displayName} maxlength={DISPLAY_NAME_MAX} counter disabled={readOnly}
          helperText="Vacío = el nombre predeterminado del agente."
          onIonInput={e => vm.setDisplayName(String(e.detail.value ?? ''))} />

        <IonTextarea fill="outline" label="Instrucciones de comportamiento (opcional)" labelPlacement="floating"
          value={vm.extraInstructions} maxlength={EXTRA_INSTRUCTIONS_MAX} counter autoGrow rows={6}
          disabled={readOnly}
          helperText="Tono, temas que evitar, a quién canalizar."
          onIonInput={e => vm.setExtraInstructions(String(e.detail.value ?? ''))} />

        <IonNote className="acs-hint">
          Precios, horarios, dirección y promociones no van aquí: el agente los toma de Agente WhatsApp › Configurar.
        </IonNote>

        {vm.canEdit ? (
          <IonButton expand="block" className="acs-save" onClick={vm.save} disabled={vm.saving || !vm.formValid}>
            {vm.saving ? <IonSpinner name="dots" /> : 'Guardar'}
          </IonButton>
        ) : (
          <IonNote className="acs-hint">Solo un administrador o gerente de la empresa puede cambiar estos ajustes.</IonNote>
        )}
      </IonContent>
    </IonModal>
  );
};

export default AgentSettingsModal;

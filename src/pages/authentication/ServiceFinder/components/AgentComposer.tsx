import React from 'react';
import { IonButton, IonIcon, IonInput, IonSpinner } from '@ionic/react';
import { send } from 'ionicons/icons';
import type { ServiceFinderVM } from '../ServiceFinderLogic';

/** Free-text box: the visitor describes what they want in their own words. */
const AgentComposer: React.FC<{ vm: ServiceFinderVM; placeholder: string }> = ({ vm, placeholder }) => (
  <form
    className="sf-composer"
    onSubmit={e => { e.preventDefault(); vm.sendToAgent(vm.draft); }}
  >
    <IonInput
      className="sf-composer-input"
      value={vm.draft}
      placeholder={placeholder}
      maxlength={500}
      disabled={vm.agentThinking}
      onIonInput={e => vm.setDraft(String(e.detail.value ?? ''))}
      // IonInput doesn't reliably submit its parent form on Enter.
      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); vm.sendToAgent(vm.draft); } }}
      enterkeyhint="send"
      aria-label="Describe qué buscas"
    />
    <IonButton
      type="submit"
      className="sf-composer-send"
      disabled={vm.agentThinking || !vm.draft.trim()}
      aria-label="Enviar"
    >
      {vm.agentThinking ? <IonSpinner name="dots" /> : <IonIcon icon={send} slot="icon-only" />}
    </IonButton>
  </form>
);

export default AgentComposer;

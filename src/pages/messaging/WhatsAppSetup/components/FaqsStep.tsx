import React from 'react';
import { IonInput, IonTextarea } from '@ionic/react';
import { chatbubbleEllipsesOutline } from 'ionicons/icons';
import type { WhatsAppSetupVM } from '../WhatsAppSetupLogic';
import CatalogSection from './CatalogSection';

/** Company-wide FAQs (sp_businessFaqs). The agent answers general questions only from these. */
const FaqsStep: React.FC<{ vm: WhatsAppSetupVM }> = ({ vm }) => {
  const ed = vm.faqEditor;
  const d = ed.editing?.draft;

  return (
    <CatalogSection
      items={vm.faqs}
      idOf={f => f.faqId}
      title={f => f.question}
      detail={f => f.answer}
      editor={ed}
      addLabel="Agregar pregunta"
      emptyIcon={chatbubbleEllipsesOutline}
      emptyText="Sin preguntas frecuentes. Agrega las que más te hacen tus clientes."
      form={d && (
        <div className="was-form-grid">
          <IonInput className="was-form-wide" label="Pregunta" labelPlacement="stacked" fill="outline"
            placeholder="¿Lavan tenis?" maxlength={300} value={d.question} disabled={ed.saving}
            onIonInput={e => ed.setField('question', e.detail.value ?? '')} />
          <IonTextarea className="was-form-wide" label="Respuesta" labelPlacement="stacked" fill="outline"
            placeholder="Sí, $80 el par; quedan listos en 48 horas." autoGrow rows={3} maxlength={1500} counter
            value={d.answer} disabled={ed.saving}
            onIonInput={e => ed.setField('answer', e.detail.value ?? '')} />
        </div>
      )}
    />
  );
};

export default FaqsStep;

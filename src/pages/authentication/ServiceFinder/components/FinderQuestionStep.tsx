import React from 'react';
import { IonCard } from '@ionic/react';
import type { ServiceFinderVM } from '../ServiceFinderLogic';
import AgentComposer from './AgentComposer';

/** One question as a bot bubble; tapping an answer advances (no Next button). */
const FinderQuestionStep: React.FC<{ vm: ServiceFinderVM }> = ({ vm }) => (
  <div className="sf-question">
    <p className="sf-progress">Pregunta {vm.questionIndex + 1} de {vm.totalQuestions}</p>
    <div className="sf-bubble">
      <h2 className="sf-bubble-title">{vm.question.title}</h2>
      <p className="sf-bubble-sub">{vm.question.subtitle}</p>
    </div>
    <div className="sf-options">
      {vm.question.options.map(opt => (
        <IonCard key={opt.id} button className="sf-option" onClick={() => vm.answer(opt)}>
          <span className="sf-option-emoji" aria-hidden="true">{opt.emoji}</span>
          <span className="sf-option-label">{opt.label}</span>
        </IonCard>
      ))}
    </div>
    {vm.questionIndex === 0 && (
      <div className="sf-freetext">
        <p className="sf-freetext-label">O cuéntame con tus palabras</p>
        <AgentComposer vm={vm} placeholder="Ej. tengo una tienda y quiero cobrar con tarjeta" />
      </div>
    )}
  </div>
);

export default FinderQuestionStep;

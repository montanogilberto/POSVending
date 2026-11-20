/**
 * ServiceFinderView — "Asistente GMO": before the signup wizard, a short
 * adaptive questionnaire identifies which service the visitor wants
 * (POS, SmartLoans, FactoryAI, Juegos Online). Presentation only — all
 * state lives in useServiceFinder().
 */
import React from 'react';
import { IonButton, IonIcon, IonRouterLink } from '@ionic/react';
import { chevronBack, sparkles } from 'ionicons/icons';
import { useServiceFinder } from './ServiceFinderLogic';
import { SERVICE_ORDER } from './ServiceFinderConstants';
import type { ServiceId } from './ServiceFinderTypes';
import FinderQuestionStep from './components/FinderQuestionStep';
import AgentChat from './components/AgentChat';
import ServiceCard from './components/ServiceCard';
import './ServiceFinder.css';

interface Props {
  /** The visitor chose a service this wizard registers. */
  onContinueHere: (id: ServiceId) => void;
  /** Skip the finder to resume a pending signup (contact lookup happens in step "Cuenta"). */
  onResume: () => void;
}

const ServiceFinderView: React.FC<Props> = ({ onContinueHere, onResume }) => {
  const vm = useServiceFinder({ onContinueHere });
  const canGoBack = (vm.phase !== 'question' || vm.questionIndex > 0) && !vm.agentThinking;

  return (
    <div className="sf-wrap">
      <div className="sf-head">
        <span className="sf-avatar"><IonIcon icon={sparkles} aria-hidden="true" /></span>
        <div>
          <p className="sf-head-title">Asistente GMO</p>
          <p className="sf-head-sub">Te ayudo a elegir el servicio correcto</p>
        </div>
      </div>

      {vm.phase === 'question' && <FinderQuestionStep vm={vm} />}
      {vm.phase === 'chat' && <AgentChat vm={vm} />}

      {vm.phase === 'result' && vm.recommended && (
        <div className="sf-result">
          <div className="sf-bubble">
            <h2 className="sf-bubble-title">Te recomiendo este servicio</h2>
            {vm.agentReply && <p className="sf-bubble-agent">{vm.agentReply}</p>}
            <p className="sf-bubble-sub">Tócalo para continuar. Si no es lo que buscas, elige otro abajo.</p>
          </div>
          <ServiceCard vm={vm} id={vm.recommended} highlighted />
          <p className="sf-section-label">Otras opciones</p>
          {vm.ranking.filter(id => id !== vm.recommended).map(id => <ServiceCard key={id} vm={vm} id={id} />)}
        </div>
      )}

      {vm.phase === 'catalog' && (
        <div className="sf-result">
          <div className="sf-bubble">
            <h2 className="sf-bubble-title">¿Qué servicio quieres?</h2>
            {vm.agentReply && <p className="sf-bubble-agent">{vm.agentReply}</p>}
            <p className="sf-bubble-sub">Elige uno — puedes agregar más después.</p>
          </div>
          {SERVICE_ORDER.map(id => <ServiceCard key={id} vm={vm} id={id} />)}
        </div>
      )}

      <div className="sf-actions">
        {canGoBack && (
          <IonButton fill="clear" size="small" onClick={vm.back} disabled={!!vm.redirectingTo}>
            <IonIcon slot="start" icon={chevronBack} />
            Atrás
          </IonButton>
        )}
        {(vm.phase === 'question' || vm.phase === 'chat') && (
          <IonButton fill="clear" size="small" onClick={vm.showCatalog} disabled={vm.agentThinking}>Ya sé qué servicio quiero</IonButton>
        )}
        {vm.phase === 'result' && (
          <IonButton fill="clear" size="small" onClick={vm.restart} disabled={!!vm.redirectingTo}>Volver a empezar</IonButton>
        )}
      </div>

      <div className="sf-footer-links">
        <IonButton fill="clear" size="small" onClick={onResume}>Continuar un registro pendiente</IonButton>
        <IonRouterLink routerLink="/login" className="sf-login-link">¿Ya tienes cuenta? Inicia sesión</IonRouterLink>
      </div>
    </div>
  );
};

export default ServiceFinderView;

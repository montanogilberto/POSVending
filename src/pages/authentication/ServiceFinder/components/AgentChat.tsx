import React from 'react';
import { IonChip, IonLabel } from '@ionic/react';
import type { ServiceFinderVM } from '../ServiceFinderLogic';
import AgentComposer from './AgentComposer';

/** The conversation with the service_finder agent: bubbles, typing dots, tappable answers. */
const AgentChat: React.FC<{ vm: ServiceFinderVM }> = ({ vm }) => (
  <div className="sf-chat">
    {vm.chat.map((t, i) => (
      <div key={i} className={`sf-msg sf-msg--${t.role}`}>{t.text}</div>
    ))}
    {vm.agentThinking && (
      <div className="sf-msg sf-msg--assistant sf-typing" aria-label="El asistente está escribiendo">
        <span /><span /><span />
      </div>
    )}
    {!vm.agentThinking && vm.chatOptions.length > 0 && (
      <div className="sf-chat-options">
        {vm.chatOptions.map(o => (
          <IonChip key={o} outline className="sf-chat-option" onClick={() => vm.sendToAgent(o)}>
            <IonLabel>{o}</IonLabel>
          </IonChip>
        ))}
      </div>
    )}
    {!vm.agentThinking && <AgentComposer vm={vm} placeholder="O escribe tu respuesta…" />}
  </div>
);

export default AgentChat;

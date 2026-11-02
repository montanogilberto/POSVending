import React from 'react';
import { IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonProgressBar } from '@ionic/react';
import { helpCircleOutline } from 'ionicons/icons';
import EmptyState from '../../../../components/ui/EmptyState';
import { fmtInt, percent } from '../../../../utils/format';
import type { WhatsAppAgentDashboard } from '../../../../api/whatsappAgentApi';
import { NON_REQUEST_TOPICS, TOPIC_LABEL } from '../WhatsAppAgentConstants';

interface Props { d: WhatsAppAgentDashboard }

/** ¿Qué preguntan? — customer messages per topic, real requests first. */
const TopicsCard: React.FC<Props> = ({ d }) => {
  const requests = d.topics.filter(t => !NON_REQUEST_TOPICS.has(t.topic));
  const other = d.topics.filter(t => NON_REQUEST_TOPICS.has(t.topic));
  const total = requests.reduce((s, t) => s + t.messages, 0);
  const max = Math.max(1, ...requests.map(t => t.messages));

  return (
    <IonCard className="wa-agent-card">
      <IonCardHeader><IonCardTitle>¿Qué preguntan?</IonCardTitle></IonCardHeader>
      <IonCardContent>
        {requests.length === 0 ? (
          <EmptyState icon={helpCircleOutline} text={d.dataSince.topics
            ? 'Sin preguntas clasificadas en el periodo.'
            : 'Los temas se empezaron a registrar con la última actualización del agente; aparecerán con los próximos mensajes.'} />
        ) : (
          <>
            {requests.map(t => (
              <div className="wa-agent-topic-row" key={t.topic}>
                <div className="wa-agent-topic-head">
                  <span>{TOPIC_LABEL[t.topic] ?? t.topic}</span>
                  <span className="wa-agent-muted">
                    {fmtInt(t.messages)} mensajes · {fmtInt(t.customers)} clientes · {percent(t.messages, total)}%
                  </span>
                </div>
                <IonProgressBar value={t.messages / max} color={t.topic === 'queja' ? 'danger' : 'primary'} />
              </div>
            ))}
            {other.length > 0 && (
              <p className="wa-agent-muted wa-agent-topic-other">
                Además: {other.map(t => `${TOPIC_LABEL[t.topic] ?? t.topic} ${fmtInt(t.messages)}`).join(' · ')}
              </p>
            )}
          </>
        )}
      </IonCardContent>
    </IonCard>
  );
};

export default TopicsCard;

import React from 'react';
import { IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonIcon, IonProgressBar } from '@ionic/react';
import {
  alertCircleOutline, checkmarkCircleOutline, personOutline, removeCircleOutline, repeatOutline, sadOutline,
} from 'ionicons/icons';
import EmptyState from '../../../../components/ui/EmptyState';
import { fmtInt, percent } from '../../../../utils/format';
import type { WhatsAppAgentDashboard } from '../../../../api/whatsappAgentApi';

interface Props { d: WhatsAppAgentDashboard }

/** ¿Respondimos bien? — how conversations ended, plus re-asked topics and complaints. */
const QualityCard: React.FC<Props> = ({ d }) => {
  const q = d.quality;
  const outcomes = [
    { icon: checkmarkCircleOutline, color: 'success', label: 'Resueltas',
      help: 'Terminaron en "gracias / ok / sí" o en una reservación', n: q.resolved },
    { icon: personOutline, color: 'tertiary', label: 'Pasadas a una persona',
      help: 'El agente no pudo y pidió ayuda del equipo', n: q.handedOff },
    { icon: alertCircleOutline, color: 'danger', label: 'Con falla del agente',
      help: 'El cliente recibió el mensaje genérico de respaldo', n: q.withFailure },
    { icon: removeCircleOutline, color: 'medium', label: 'Sin cierre',
      help: 'El cliente dejó de escribir sin confirmar', n: q.noClosure },
  ];

  return (
    <IonCard className="wa-agent-card">
      <IonCardHeader><IonCardTitle>¿Respondimos bien?</IonCardTitle></IonCardHeader>
      <IonCardContent>
        {q.conversations === 0 ? (
          <EmptyState icon={checkmarkCircleOutline} text="Sin conversaciones en el periodo." />
        ) : (
          <>
            <p className="wa-agent-quality-hero">
              <strong>{percent(q.resolved, q.conversations)}%</strong> de {fmtInt(q.conversations)} conversaciones
              terminaron resueltas
            </p>
            {outcomes.map(o => (
              <div className="wa-agent-quality-row" key={o.label}>
                <div className="wa-agent-topic-head">
                  <span><IonIcon icon={o.icon} color={o.color} /> {o.label}</span>
                  <span className="wa-agent-muted">{fmtInt(o.n)} · {percent(o.n, q.conversations)}%</span>
                </div>
                <IonProgressBar value={q.conversations ? o.n / q.conversations : 0} color={o.color} />
                <p className="wa-agent-muted">{o.help}</p>
              </div>
            ))}
            <div className="wa-agent-quality-signals">
              <div>
                <IonIcon icon={repeatOutline} />
                <span><strong>{fmtInt(q.reasked)}</strong> veces volvieron a preguntar lo mismo
                  {q.reaskedRatePct != null ? ` (${q.reaskedRatePct}% de las preguntas)` : ''}: la respuesta no les sirvió.</span>
              </div>
              <div>
                <IonIcon icon={sadOutline} />
                <span><strong>{fmtInt(q.complaints)}</strong> clientes con una queja.</span>
              </div>
            </div>
            <p className="wa-agent-muted">
              Son señales, no una calificación: para ver si una respuesta fue correcta, abre la conversación en
              Conversaciones.
            </p>
          </>
        )}
      </IonCardContent>
    </IonCard>
  );
};

export default QualityCard;

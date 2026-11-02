import React from 'react';
import {
  IonBadge, IonButton, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonIcon, IonItem, IonLabel,
  IonList, IonProgressBar,
} from '@ionic/react';
import {
  alertCircleOutline, checkmarkCircleOutline, chatbubblesOutline, personOutline, removeCircleOutline,
  repeatOutline, sadOutline, thumbsDownOutline, thumbsUpOutline,
} from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import EmptyState from '../../../../components/ui/EmptyState';
import { fmtInt, mxChatDate, percent } from '../../../../utils/format';
import { fmtPhone10, openWhatsAppChat } from '../../../../utils/whatsappChat';
import type { WhatsAppAgentDashboard, WhatsAppChatOutcome, WhatsAppUnfinishedChat } from '../../../../api/whatsappAgentApi';
import { CHAT_OUTCOME } from '../WhatsAppAgentConstants';

interface Props { d: WhatsAppAgentDashboard }

const OUTCOME_ICON: Record<WhatsAppChatOutcome, string> = {
  cerrada: checkmarkCircleOutline,
  le_sirvio: thumbsUpOutline,
  no_le_sirvio: thumbsDownOutline,
  falla_agente: alertCircleOutline,
  pidio_persona: personOutline,
  sin_cierre: removeCircleOutline,
};

/** ¿Los chats terminaron bien? — one outcome per conversation, and the ones to fix. */
const QualityCard: React.FC<Props> = ({ d }) => {
  const q = d.quality;
  const history = useHistory();
  const rows: { key: WhatsAppChatOutcome; n: number }[] = [
    { key: 'cerrada', n: q.closed },
    { key: 'le_sirvio', n: q.helped },
    { key: 'no_le_sirvio', n: q.notHelped },
    { key: 'falla_agente', n: q.withFailure },
    { key: 'pidio_persona', n: q.handedOff },
    { key: 'sin_cierre', n: q.noClosure },
  ];

  /** In the dock on desktop; the full Conversaciones page on a phone. */
  const open = (c: WhatsAppUnfinishedChat) => {
    if (!openWhatsAppChat({ phone10: c.phone10, customerName: c.customerName })) {
      history.push('/whatsapp-agent/conversations', { openPhone10: c.phone10, customerName: c.customerName });
    }
  };

  return (
    <IonCard className="wa-agent-card">
      <IonCardHeader><IonCardTitle>¿Los chats terminaron bien?</IonCardTitle></IonCardHeader>
      <IonCardContent>
        {q.conversations === 0 ? (
          <EmptyState icon={checkmarkCircleOutline} text="Sin conversaciones en el periodo." />
        ) : (
          <>
            <p className="wa-agent-quality-hero">
              <strong>{q.finalizedRatePct ?? percent(q.finalized, q.conversations)}%</strong> de{' '}
              {fmtInt(q.conversations)} conversaciones terminaron bien
            </p>
            {rows.map(r => {
              const meta = CHAT_OUTCOME[r.key];
              return (
                <div className="wa-agent-quality-row" key={r.key}>
                  <div className="wa-agent-topic-head">
                    <span><IonIcon icon={OUTCOME_ICON[r.key]} color={meta.color} /> {meta.label}</span>
                    <span className="wa-agent-muted">{fmtInt(r.n)} · {percent(r.n, q.conversations)}%</span>
                  </div>
                  <IonProgressBar value={r.n / q.conversations} color={meta.color} />
                  <p className="wa-agent-muted">{meta.help}</p>
                </div>
              );
            })}
            <div className="wa-agent-quality-signals">
              <div>
                <IonIcon icon={thumbsUpOutline} />
                <span>"¿Te funcionó la respuesta?": <strong>{fmtInt(q.helpfulYes)}</strong> sí ·{' '}
                  <strong>{fmtInt(q.helpfulNo)}</strong> no.</span>
              </div>
              <div>
                <IonIcon icon={repeatOutline} />
                <span><strong>{fmtInt(q.reasked)}</strong> veces volvieron a preguntar lo mismo
                  {q.reaskedRatePct != null ? ` (${q.reaskedRatePct}% de las preguntas)` : ''}.</span>
              </div>
              <div>
                <IonIcon icon={sadOutline} />
                <span><strong>{fmtInt(q.complaints)}</strong> clientes con una queja.</span>
              </div>
            </div>

            <h4 className="wa-agent-subtitle">Chats que no terminaron bien</h4>
            {q.unfinished.length === 0 ? (
              <p className="wa-agent-muted">Ninguno: todos los chats del periodo terminaron bien.</p>
            ) : (
              <IonList lines="full" className="wa-agent-unfinished">
                {q.unfinished.map(c => {
                  const meta = CHAT_OUTCOME[c.outcome];
                  return (
                    <IonItem key={`${c.phone10}-${c.date}`}>
                      <IonLabel className="ion-text-wrap">
                        <h3>
                          {c.customerName || fmtPhone10(c.phone10)}{' '}
                          <span className="wa-agent-muted">· {mxChatDate(c.lastAtUtc)}</span>
                        </h3>
                        <p>{c.lastMessage ? `"${c.lastMessage}"` : '—'}</p>
                        <IonBadge color={meta.color}>{meta.label}</IonBadge>
                      </IonLabel>
                      <IonButton slot="end" fill="outline" size="small" onClick={() => open(c)}>
                        <IonIcon icon={chatbubblesOutline} slot="start" /> Abrir
                      </IonButton>
                    </IonItem>
                  );
                })}
              </IonList>
            )}
          </>
        )}
      </IonCardContent>
    </IonCard>
  );
};

export default QualityCard;

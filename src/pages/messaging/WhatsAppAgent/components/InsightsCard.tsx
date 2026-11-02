import React from 'react';
import {
  IonButton, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonIcon, IonItem, IonLabel, IonList, IonSpinner,
} from '@ionic/react';
import { bulbOutline, sparklesOutline } from 'ionicons/icons';
import { fmtInt } from '../../../../utils/format';
import { useAgentInsights } from '../AgentInsightsLogic';

interface Props { startDate: string; endDate: string }

/** ¿Qué quieren mis clientes? — AI reads the period's messages: doubts, suggestions, unmet needs. */
const InsightsCard: React.FC<Props> = ({ startDate, endDate }) => {
  const { insights, loading, error, analyze } = useAgentInsights(startDate, endDate);

  return (
    <IonCard className="wa-agent-card">
      <IonCardHeader>
        <div className="wa-agent-insights-head">
          <IonCardTitle>¿Qué quieren mis clientes?</IonCardTitle>
          <IonButton size="small" fill={insights ? 'clear' : 'solid'} onClick={analyze} disabled={loading}>
            {loading ? <IonSpinner name="dots" /> : <><IonIcon icon={sparklesOutline} slot="start" />
              {insights ? 'Volver a analizar' : 'Analizar con IA'}</>}
          </IonButton>
        </div>
      </IonCardHeader>
      <IonCardContent>
        {!insights && !loading && !error && (
          <p className="wa-agent-muted">
            Lee los mensajes del periodo (sin teléfonos ni correos) y te dice las dudas más comunes, qué hacer con
            cada una y lo que piden que no ofreces.
          </p>
        )}
        {loading && <p className="wa-agent-muted">Leyendo los mensajes del periodo…</p>}
        {error && <p className="wa-agent-muted wa-agent-error">No se pudo hacer el análisis. Intenta de nuevo.</p>}
        {insights && (
          <>
            <p className="wa-agent-insights-summary">{insights.summary}</p>
            {insights.commonDoubts.length > 0 && (
              <>
                <h4 className="wa-agent-subtitle">Dudas más comunes</h4>
                <IonList lines="full">
                  {insights.commonDoubts.map(q => (
                    <IonItem key={q.question}>
                      <IonLabel className="ion-text-wrap">
                        <h3>"{q.question}" <span className="wa-agent-muted">· ~{fmtInt(q.count)}</span></h3>
                        {q.suggestion && <p><IonIcon icon={bulbOutline} /> {q.suggestion}</p>}
                      </IonLabel>
                    </IonItem>
                  ))}
                </IonList>
              </>
            )}
            {insights.unmetNeeds.length > 0 && (
              <>
                <h4 className="wa-agent-subtitle">Lo que piden y no encuentran</h4>
                <ul className="wa-agent-needs">
                  {insights.unmetNeeds.map(n => <li key={n}>{n}</li>)}
                </ul>
              </>
            )}
            <p className="wa-agent-muted">Basado en {fmtInt(insights.messagesAnalyzed)} mensajes. Es una guía de la IA, revísala.</p>
          </>
        )}
      </IonCardContent>
    </IonCard>
  );
};

export default InsightsCard;

import React from 'react';
import { IonBadge, IonIcon } from '@ionic/react';
import { informationCircleOutline } from 'ionicons/icons';
import { toHermosillo } from '../../../../../utils/format';
import { retryEligibility } from '../../NotificationStats';
import { CHANNEL_LABELS, OUTCOME_LABELS } from '../../NotificationDispatchLogConstants';
import type { DispatchRow } from '../../NotificationDispatchLogTypes';

/**
 * Retry eligibility + history. The only retries that exist today are the automatic
 * channel cascade (push → WhatsApp → SMS); a manual resend needs a backend endpoint.
 */
const RetriesTab: React.FC<{ row: DispatchRow }> = ({ row }) => {
  const retry = retryEligibility(row);
  return (
    <>
      <h4 className="ndl-detail-h">¿Se puede reintentar?</h4>
      <div className="ndl-retry">
        <IonBadge color={retry.eligible ? 'warning' : 'medium'}>{retry.eligible ? 'Sí, es candidato' : 'No'}</IonBadge>
        <p>{retry.reason}</p>
      </div>

      <h4 className="ndl-detail-h">Historial de intentos ({row.attempts.length})</h4>
      {row.attempts.length === 0 && <p className="ndl-detail-empty">Sin intentos registrados.</p>}
      <ol className="ndl-attempts">
        {row.attempts.map((a, i) => (
          <li key={i}>
            <strong>{i + 1}. {CHANNEL_LABELS[a.channel] ?? a.channel}: {OUTCOME_LABELS[a.outcome] ?? a.outcome.toLowerCase()}</strong>
            {a.at && <span>{toHermosillo(a.at)}</span>}
            {a.error && <span className="ndl-attempt-error">{a.error}</span>}
            {a.outcome !== 'SENT' && i < row.attempts.length - 1 && <span>Se pasó al siguiente canal automáticamente.</span>}
          </li>
        ))}
      </ol>

      <div className="ndl-channel-note">
        <IonIcon icon={informationCircleOutline} />
        <p>El reenvío manual todavía no está disponible: solo existen los cambios de canal automáticos.</p>
      </div>
    </>
  );
};

export default RetriesTab;

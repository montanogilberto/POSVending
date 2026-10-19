import React from 'react';
import { IonButton, IonIcon } from '@ionic/react';
import { checkmarkCircle, closeCircle, copyOutline, ellipseOutline } from 'ionicons/icons';
import { toHermosillo } from '../../../../../utils/format';
import { deliveryTimeline } from '../../NotificationStats';
import {
  CHANNEL_LABELS, PROVIDER_LABELS, SOURCE_LABELS, describeProviderError, explainProviderError,
} from '../../NotificationDispatchLogConstants';
import type { TimelineTone } from '../../NotificationDispatchLogTypes';
import type { NotificationDispatchLogVM } from '../../NotificationDispatchLogLogic';
import DetailField from '../../../../../components/ui/DetailField';

const TONE_ICONS: Record<TimelineTone, string> = { done: checkmarkCircle, failed: closeCircle, waiting: ellipseOutline };

const InfoTab: React.FC<{ vm: NotificationDispatchLogVM }> = ({ vm }) => {
  const row = vm.selected;
  if (!row) return null;
  const hadFailure = row.delivery === 'failed' || !!row.failedAt;
  const error = explainProviderError(row.providerErrorCode, row.providerErrorMessage);
  const steps = deliveryTimeline(row, hadFailure ? describeProviderError(row.providerErrorCode, row.providerErrorMessage) : '');

  return (
    <>
      <h4 className="ndl-detail-h">Mensaje completo</h4>
      <div className="ndl-message-box">
        <p>{row.messagePreview || 'Sin texto guardado.'}</p>
        {row.messagePreview && (
          <IonButton fill="clear" size="small" aria-label="Copiar mensaje" onClick={() => vm.copyText(row.messagePreview, 'Mensaje')}>
            <IonIcon slot="icon-only" icon={copyOutline} />
          </IonButton>
        )}
      </div>
      <DetailField label="Destinatario">
        {row.clientName || (row.recipientType === 'client' ? `Cliente #${row.recipientId}` : `Usuario #${row.recipientId}`)}
      </DetailField>

      <h4 className="ndl-detail-h">Canal y origen</h4>
      <DetailField label="Canal">{CHANNEL_LABELS[row.selectedChannel] ?? row.selectedChannel}</DetailField>
      <DetailField label="Proveedor">{PROVIDER_LABELS[row.providerName ?? ''] ?? (row.providerName || '—')}</DetailField>
      <DetailField label="Módulo GMO">POS · {SOURCE_LABELS[row.sourceType] ?? row.sourceType} #{row.sourceId}</DetailField>
      <DetailField label="Evento">{row.eventName}</DetailField>

      <h4 className="ndl-detail-h">Estado de entrega</h4>
      <ol className="ndl-timeline">
        {steps.map(s => (
          <li key={s.key} className={`ndl-step ndl-step--${s.tone}`}>
            <IonIcon icon={TONE_ICONS[s.tone]} />
            <div>
              <strong>{s.label}</strong>
              {s.at && <span>{toHermosillo(s.at)}</span>}
            </div>
          </li>
        ))}
      </ol>

      {hadFailure && (
        <>
          <h4 className="ndl-detail-h">Error del proveedor</h4>
          <div className="ndl-error-box">
            <DetailField label="Código">{error.code || '—'}</DetailField>
            <DetailField label="Qué significa">{error.meaning}</DetailField>
            {error.providerText && <DetailField label="Texto del proveedor">{error.providerText}</DetailField>}
            {row.delivery === 'confirmed' && <p>Después de este error, el proveedor confirmó la entrega.</p>}
          </div>
        </>
      )}

      <h4 className="ndl-detail-h">Identificadores</h4>
      <div className="ndl-id-line">
        <DetailField label="ID interno (GMO)">{row.notificationDispatchId}</DetailField>
        <IonButton fill="clear" size="small" aria-label="Copiar ID interno"
          onClick={() => vm.copyText(row.notificationDispatchId, 'ID interno')}><IonIcon slot="icon-only" icon={copyOutline} /></IonButton>
      </div>
      <div className="ndl-id-line">
        <DetailField label="ID del proveedor">{row.providerMessageId || '—'}</DetailField>
        {row.providerMessageId && (
          <IonButton fill="clear" size="small" aria-label="Copiar ID del proveedor"
            onClick={() => vm.copyText(row.providerMessageId, 'ID del proveedor')}><IonIcon slot="icon-only" icon={copyOutline} /></IonButton>
        )}
      </div>
    </>
  );
};

export default InfoTab;

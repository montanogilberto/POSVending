import React from 'react';
import { toHermosillo } from '../../../../../utils/format';
import { OUTCOME_LABELS } from '../../NotificationDispatchLogConstants';
import type { DispatchRow } from '../../NotificationDispatchLogTypes';
import DetailField from '../../../../../components/ui/DetailField';

/** Every timestamp we stored for the message (attempts are under "Reintentos"). */
const TraceTab: React.FC<{ row: DispatchRow }> = ({ row }) => (
  <>
    <h4 className="ndl-detail-h">Registro</h4>
    <DetailField label="Creado">{toHermosillo(row.created_At) || '—'}</DetailField>
    <DetailField label="Enviado al proveedor">{toHermosillo(row.sentAt) || '—'}</DetailField>
    <DetailField label="Entrega confirmada">{toHermosillo(row.confirmedAt) || '—'}</DetailField>
    <DetailField label="Falló">{toHermosillo(row.failedAt) || '—'}</DetailField>
    <DetailField label="Última actualización">{toHermosillo(row.updated_at) || '—'}</DetailField>
    <DetailField label="Canal preferido">{row.preferredChannel}</DetailField>
    <DetailField label="Canal usado">{row.selectedChannel}</DetailField>
    {row.fallbackReason && (
      <DetailField label="Motivo del cambio de canal">{OUTCOME_LABELS[row.fallbackReason] ?? row.fallbackReason}</DetailField>
    )}
  </>
);

export default TraceTab;

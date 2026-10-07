import React from 'react';
import { IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonList, IonItem, IonLabel, IonModal, IonTitle, IonToolbar } from '@ionic/react';
import { closeOutline } from 'ionicons/icons';
import StatusBadge from '../../../../components/ui/StatusBadge';
import { NOTIFICATION_CHANNEL, NOTIFICATION_DISPATCH_STATUS } from '../../../../components/ui/statusMaps';
import { toHermosillo } from '../../../../utils/format';
import { CHANNEL_LABELS, OUTCOME_LABELS } from '../NotificationDispatchLogConstants';
import type { DispatchRow } from '../NotificationDispatchLogTypes';

interface DispatchDetailModalProps {
  row: DispatchRow | null;
  onClose: () => void;
}

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <IonItem lines="full">
    <IonLabel className="ion-text-wrap">
      <p>{label}</p>
      <h3>{children}</h3>
    </IonLabel>
  </IonItem>
);

const DispatchDetailModal: React.FC<DispatchDetailModalProps> = ({ row, onClose }) => (
  <IonModal isOpen={!!row} onDidDismiss={onClose} className="ndl-detail">
    <IonHeader>
      <IonToolbar>
        <IonTitle>Detalle del mensaje</IonTitle>
        <IonButtons slot="end">
          <IonButton onClick={onClose} aria-label="Cerrar"><IonIcon icon={closeOutline} slot="icon-only" /></IonButton>
        </IonButtons>
      </IonToolbar>
    </IonHeader>
    <IonContent>
      {row && (
        <IonList>
          <Field label="Cliente">{row.clientName || `${row.recipientType} #${row.recipientId}`}</Field>
          <Field label="Origen">{row.eventName} · {row.sourceType} #{row.sourceId}</Field>
          <Field label="Canal"><StatusBadge status={row.selectedChannel} map={NOTIFICATION_CHANNEL} /></Field>
          <Field label="Estado"><StatusBadge status={row.delivery} map={NOTIFICATION_DISPATCH_STATUS} /></Field>
          <Field label="Mensaje">{row.messagePreview || '—'}</Field>
          <Field label="Creado">{toHermosillo(row.created_At) || '—'}</Field>
          <Field label="Enviado">{toHermosillo(row.sentAt) || '—'}</Field>
          <Field label="Confirmado">{toHermosillo(row.confirmedAt) || '—'}</Field>
          <Field label="Falló">{toHermosillo(row.failedAt) || '—'}</Field>
          <Field label="Proveedor">{row.providerName || '—'}</Field>
          <Field label="ID del mensaje en el proveedor">{row.providerMessageId || '—'}</Field>
          <Field label={`Intentos (${row.attempts.length})`}>
            {row.attempts.length === 0
              ? '—'
              : row.attempts.map((a, i) => (
                <div key={i}>{CHANNEL_LABELS[a.channel] ?? a.channel}: {OUTCOME_LABELS[a.outcome] ?? a.outcome.toLowerCase()}</div>
              ))}
          </Field>
          {row.fallbackReason && <Field label="Motivo del cambio de canal">{row.fallbackReason}</Field>}
        </IonList>
      )}
    </IonContent>
  </IonModal>
);

export default DispatchDetailModal;

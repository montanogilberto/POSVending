import React from 'react';
import { IonButton, IonIcon, IonItem, IonLabel, IonList, IonSegment, IonSegmentButton, IonSpinner } from '@ionic/react';
import { copyOutline, createOutline, paperPlaneOutline, trashOutline } from 'ionicons/icons';
import DetailField from '../../../../components/ui/DetailField';
import StatusBadge from '../../../../components/ui/StatusBadge';
import { NOTIFICATION_PRIORITY, NOTIFICATION_TYPE, PUSH_READ_STATUS } from '../../../../components/ui/statusMaps';
import { toHermosillo } from '../../../../utils/format';
import { targetLabel } from '../PushNotificationsStats';
import type { PushDetailTab } from '../PushNotificationsTypes';
import type { PushNotificationsVM } from '../PushNotificationsLogic';

const HISTORY_LIMIT = 10;

/** Everything inside the drawer/modal below its title bar. */
const PushDetailBody: React.FC<{ vm: PushNotificationsVM }> = ({ vm }) => {
  const r = vm.selected;
  if (!r) return null;
  return (
    <>
      <div className="pnd-detail-summary">
        <div>
          <strong>{r.title}</strong>
          <span>{targetLabel(r)} · {toHermosillo(r.created_At)}</span>
        </div>
        <StatusBadge status={r.isRead ? 'read' : 'unread'} map={PUSH_READ_STATUS} />
      </div>

      <IonSegment value={vm.detailTab} onIonChange={(e) => vm.setDetailTab(e.detail.value as PushDetailTab)}>
        <IonSegmentButton value="info"><IonLabel>Información</IonLabel></IonSegmentButton>
        <IonSegmentButton value="recipient"><IonLabel>Destinatario</IonLabel></IonSegmentButton>
      </IonSegment>

      {vm.detailTab === 'info' ? (
        <div className="pnd-detail-tab">
          <h4 className="pnd-detail-h">Mensaje</h4>
          <div className="pnd-message-box">
            <p>{r.message}</p>
            <IonButton fill="clear" size="small" aria-label="Copiar mensaje" onClick={() => vm.copyText(r.message, 'Mensaje')}>
              <IonIcon slot="icon-only" icon={copyOutline} />
            </IonButton>
          </div>

          <h4 className="pnd-detail-h">Envío</h4>
          <DetailField label="Destino">{targetLabel(r)}</DetailField>
          <DetailField label="Tipo"><StatusBadge status={r.notificationType} map={NOTIFICATION_TYPE} /></DetailField>
          <DetailField label="Prioridad"><StatusBadge status={r.priority} map={NOTIFICATION_PRIORITY} /></DetailField>
          <DetailField label="Al tocarla abre">{r.navigationRoute || 'La bandeja de notificaciones'}</DetailField>
          <DetailField label="Lectura">{r.isRead ? 'El destinatario la abrió en la app' : 'Aún no la abre'}</DetailField>
          <DetailField label="Creada (enviada)">{toHermosillo(r.created_At)}</DetailField>
          {r.updated_at && <DetailField label="Registro editado">{toHermosillo(r.updated_at)}</DetailField>}
          {r.scheduledAt && <DetailField label="Programada para">{toHermosillo(r.scheduledAt)} (no aplica: se envió al crearla)</DetailField>}

          <h4 className="pnd-detail-h">Identificador</h4>
          <div className="pnd-id-line">
            <DetailField label="ID de notificación">{r.pushNotificationId}</DetailField>
            <IonButton fill="clear" size="small" aria-label="Copiar ID"
              onClick={() => vm.copyText(r.pushNotificationId, 'ID')}><IonIcon slot="icon-only" icon={copyOutline} /></IonButton>
          </div>
          {r.payloadJson && <DetailField label="Datos extra (JSON)">{r.payloadJson}</DetailField>}
        </div>
      ) : (
        <div className="pnd-detail-tab">
          <DetailField label="Destino">{targetLabel(r)}</DetailField>
          <h4 className="pnd-detail-h">Otras notificaciones a este usuario ({vm.history.length})</h4>
          {r.targetType !== 'User' && <p className="pnd-muted">Se envió a todo el negocio: no hay un solo destinatario.</p>}
          {r.targetType === 'User' && vm.history.length === 0 && <p className="pnd-muted">Es la única registrada.</p>}
          <IonList lines="full">
            {vm.history.slice(0, HISTORY_LIMIT).map(h => (
              <IonItem key={h.pushNotificationId} button detail={false} onClick={() => vm.openDetail(h)}>
                <IonLabel className="ion-text-wrap">
                  <p>{toHermosillo(h.created_At)}</p>
                  <h3>{h.title}</h3>
                </IonLabel>
                <StatusBadge status={h.isRead ? 'read' : 'unread'} map={PUSH_READ_STATUS} />
              </IonItem>
            ))}
          </IonList>
        </div>
      )}

      <div className="pnd-detail-actions">
        <IonButton expand="block" onClick={vm.openResend}>
          <IonIcon slot="start" icon={paperPlaneOutline} />Enviar de nuevo
        </IonButton>
        <IonButton expand="block" fill="outline" onClick={vm.openEdit}>
          <IonIcon slot="start" icon={createOutline} />Editar registro
        </IonButton>
        <p className="pnd-muted">Editar solo corrige el registro: no vuelve a enviar el push.</p>
        <IonButton expand="block" fill="clear" color="danger" disabled={vm.deleting} onClick={() => vm.askDelete(r)}>
          {vm.deleting ? <IonSpinner name="dots" /> : <><IonIcon slot="start" icon={trashOutline} />Eliminar</>}
        </IonButton>
      </div>
    </>
  );
};

export default PushDetailBody;

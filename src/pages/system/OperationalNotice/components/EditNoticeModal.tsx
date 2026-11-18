import React from 'react';
import {
  IonButton, IonButtons, IonContent, IonFooter, IonHeader, IonIcon, IonInput, IonModal, IonNote, IonSpinner,
  IonTextarea, IonTitle, IonToggle, IonToolbar,
} from '@ionic/react';
import { closeOutline } from 'ionicons/icons';
import { hermosilloTodayISO } from '../../../../utils/format';
import { MESSAGE_MAX, TITLE_MAX } from '../OperationalNoticeConstants';
import type { OperationalNoticeVM } from '../OperationalNoticeLogic';
import NoticeDatesFields from './NoticeDatesFields';

/** Update the message or extend / shorten the window of a current or scheduled notice. */
const EditNoticeModal: React.FC<{ vm: OperationalNoticeVM }> = ({ vm }) => {
  const f = vm.editForm;
  return (
    <IonModal isOpen={!!vm.editing} onDidDismiss={vm.closeEdit} className="notice-modal">
      <IonHeader>
        <IonToolbar>
          <IonTitle>Editar aviso</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={vm.closeEdit} disabled={vm.savingEdit} aria-label="Cerrar"><IonIcon icon={closeOutline} /></IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding notice-modal-content">
        <IonInput className="notice-field" label="Título (interno)" labelPlacement="stacked" fill="outline"
          value={f.title} maxlength={TITLE_MAX} onIonInput={e => vm.setEditField('title', String(e.detail.value ?? ''))} />
        <IonTextarea className="notice-preview" label="Mensaje para clientes" labelPlacement="stacked" fill="outline"
          autoGrow counter maxlength={MESSAGE_MAX} value={f.customerMessage}
          onIonInput={e => vm.setEditField('customerMessage', String(e.detail.value ?? ''))} />
        <NoticeDatesFields
          startDate={f.startDate} endDate={f.endDate} minDate={hermosilloTodayISO()}
          useHours={f.useHours} startTime={f.startTime} endTime={f.endTime}
          onStartDate={v => vm.setEditField('startDate', v)} onEndDate={v => vm.setEditField('endDate', v)}
          onUseHours={v => vm.setEditField('useHours', v)} onStartTime={v => vm.setEditField('startTime', v)}
          onEndTime={v => vm.setEditField('endTime', v)} />
        {vm.editing?.noticeType === 'cierre' && (
          <IonToggle checked={f.blocksReservations} labelPlacement="end" className="notice-toggle"
            onIonChange={e => vm.setEditField('blocksReservations', e.detail.checked)}>
            No aceptar reservaciones en esas fechas
          </IonToggle>
        )}
        <IonNote className="notice-hint">
          ¿Sigue el problema? Mueve la fecha "Hasta". Si ya se resolvió, mejor usa "Finalizar ahora".
        </IonNote>
      </IonContent>
      <IonFooter className="notice-modal-footer">
        <IonToolbar>
          <IonButton expand="block" disabled={!vm.editValid || vm.savingEdit} onClick={vm.saveEdit}>
            {vm.savingEdit ? <IonSpinner name="dots" /> : 'Guardar cambios'}
          </IonButton>
        </IonToolbar>
      </IonFooter>
    </IonModal>
  );
};

export default EditNoticeModal;

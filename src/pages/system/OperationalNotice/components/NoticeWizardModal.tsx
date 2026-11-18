import React from 'react';
import {
  IonButton, IonButtons, IonCard, IonChip, IonContent, IonFooter, IonHeader, IonIcon, IonInput, IonModal,
  IonNote, IonSegment, IonSegmentButton, IonLabel, IonSpinner, IonTextarea, IonTitle, IonToggle, IonToolbar,
} from '@ionic/react';
import { arrowBackOutline, chatbubbleEllipsesOutline, closeOutline } from 'ionicons/icons';
import { mxLongDay } from '../../../../utils/format';
import type { NoticeType } from '../../../../api/operationalNoticeApi';
import {
  MESSAGE_MAX, NOTICE_TYPES, SCRATCH_ICON, TITLE_MAX, VARIABLES, templateIcon,
} from '../OperationalNoticeConstants';
import type { OperationalNoticeVM } from '../OperationalNoticeLogic';
import NoticeDatesFields from './NoticeDatesFields';

const STEP_LABEL = { 1: 'Plantilla', 2: 'Personalizar', 3: 'Vista previa' } as const;

const NoticeWizardModal: React.FC<{ vm: OperationalNoticeVM }> = ({ vm }) => {
  const w = vm.wizard;
  return (
    <IonModal isOpen={w.open} onDidDismiss={w.close} className="notice-modal">
      <IonHeader>
        <IonToolbar>
          {w.step > 1 && (
            <IonButtons slot="start">
              <IonButton onClick={w.back} disabled={w.publishing} aria-label="Atrás"><IonIcon icon={arrowBackOutline} /></IonButton>
            </IonButtons>
          )}
          <IonTitle>Nuevo aviso · {STEP_LABEL[w.step]}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={w.close} disabled={w.publishing} aria-label="Cerrar"><IonIcon icon={closeOutline} /></IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding notice-modal-content">
        <p className="notice-step-kicker">Paso {w.step} de 3</p>

        {w.step === 1 && (
          <div className="notice-template-grid">
            {vm.activeTemplates.map(t => (
              <IonCard key={t.operationalNoticeTemplateId} button className="notice-template-card" onClick={() => w.pickTemplate(t)}>
                <IonIcon icon={templateIcon(t.icon)} className={`notice-template-icon notice-type-${t.noticeType}`} />
                <strong>{t.name}</strong>
                <span>{t.description}</span>
              </IonCard>
            ))}
            <IonCard button className="notice-template-card notice-template-scratch" onClick={() => w.pickTemplate(null)}>
              <IonIcon icon={SCRATCH_ICON} className="notice-template-icon" />
              <strong>Desde cero</strong>
              <span>Escribe tu propio mensaje.</span>
            </IonCard>
          </div>
        )}

        {w.step === 2 && (
          <>
            {w.template && (
              <div className="notice-picked">
                <IonIcon icon={templateIcon(w.template.icon)} />
                <span><strong>{w.template.name}</strong> · {w.template.description}</span>
              </div>
            )}
            {!w.template && (
              <IonSegment value={w.noticeType} onIonChange={e => w.setNoticeType(e.detail.value as NoticeType)}
                className="notice-type-segment">
                {NOTICE_TYPES.map(t => (
                  <IonSegmentButton key={t.value} value={t.value}><IonLabel>{t.label}</IonLabel></IonSegmentButton>
                ))}
              </IonSegment>
            )}

            {w.variables.map(v => v === 'fecha_reapertura' ? (
              <div key={v} className="notice-field">
                <IonInput type="date" label={VARIABLES[v].label} labelPlacement="stacked" fill="outline"
                  value={w.reopenDate} min={w.startDate} onIonInput={e => w.setReopenDate(String(e.detail.value ?? ''))}
                  helperText={w.reopenDate ? `El agente dirá: "${mxLongDay(w.reopenDate)}"` : undefined} />
                <div className="notice-shortcuts">
                  <IonChip outline={w.reopenDate !== w.today} onClick={() => w.setReopenDate(w.today)}>Hoy</IonChip>
                  <IonChip outline={w.reopenDate !== w.tomorrow} onClick={() => w.setReopenDate(w.tomorrow)}>Mañana</IonChip>
                </div>
              </div>
            ) : (
              <IonInput key={v} className="notice-field" label={VARIABLES[v].label} labelPlacement="stacked" fill="outline"
                placeholder={VARIABLES[v].placeholder} helperText={VARIABLES[v].helper} value={w.values[v] ?? ''}
                maxlength={200} onIonInput={e => w.setValue(v, String(e.detail.value ?? ''))} />
            ))}

            <NoticeDatesFields
              startDate={w.startDate} endDate={w.endDate} minDate={w.today}
              useHours={w.useHours} startTime={w.startTime} endTime={w.endTime}
              onStartDate={w.setStartDate} onEndDate={w.setEndDate} onUseHours={w.setUseHours}
              onStartTime={w.setStartTime} onEndTime={w.setEndTime} />

            {w.noticeType === 'cierre' && (
              <IonToggle checked={w.blocksReservations} labelPlacement="end" className="notice-toggle"
                onIonChange={e => w.setBlocksReservations(e.detail.checked)}>
                No aceptar reservaciones en esas fechas
              </IonToggle>
            )}
            <IonNote className="notice-hint">
              Las fechas son de Hermosillo. Al terminar la última fecha, el aviso deja de aplicar solo.
            </IonNote>
          </>
        )}

        {w.step === 3 && (
          <>
            <IonInput className="notice-field" label="Título (interno)" labelPlacement="stacked" fill="outline"
              value={w.title} maxlength={TITLE_MAX} onIonInput={e => w.setTitle(String(e.detail.value ?? ''))} />
            <div className="notice-preview-label"><IonIcon icon={chatbubbleEllipsesOutline} /> Así lo dirá el agente</div>
            <IonTextarea className="notice-preview" fill="outline" autoGrow value={w.message} maxlength={MESSAGE_MAX}
              counter placeholder="Escribe el mensaje para tus clientes"
              errorText="Llena los campos que siguen entre llaves { }"
              onIonInput={e => w.setMessage(String(e.detail.value ?? ''))} />
            {w.leftoverPlaceholders && (
              <IonNote color="danger" className="notice-hint">El mensaje todavía tiene campos entre llaves sin llenar.</IonNote>
            )}
            <IonNote className="notice-hint">
              Puedes editar el texto antes de publicar. El agente lo usa tal cual, con prioridad sobre el horario normal.
            </IonNote>
          </>
        )}
      </IonContent>

      {w.step > 1 && (
        <IonFooter className="notice-modal-footer">
          <IonToolbar>
            {w.step === 2 ? (
              <IonButton expand="block" disabled={!w.step2Ok} onClick={w.goToPreview}>Ver vista previa</IonButton>
            ) : (
              <IonButton expand="block" disabled={!w.canPublish} onClick={w.publish}>
                {w.publishing ? <IonSpinner name="dots" /> : 'Publicar aviso'}
              </IonButton>
            )}
          </IonToolbar>
        </IonFooter>
      )}
    </IonModal>
  );
};

export default NoticeWizardModal;

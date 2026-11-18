import React from 'react';
import {
  IonAlert, IonButton, IonButtons, IonCard, IonContent, IonFooter, IonHeader, IonIcon, IonInput, IonModal,
  IonNote, IonSelect, IonSelectOption, IonSpinner, IonTextarea, IonTitle, IonToggle, IonToolbar,
} from '@ionic/react';
import { addOutline, closeOutline } from 'ionicons/icons';
import StatusBadge from '../../../../components/ui/StatusBadge';
import { OPERATIONAL_NOTICE_TEMPLATE_STATUS } from '../../../../components/ui/statusMaps';
import type { NoticeType } from '../../../../api/operationalNoticeApi';
import {
  ASKED_VARIABLES, MESSAGE_MAX, NOTICE_TYPES, TEMPLATE_ICONS, TITLE_MAX, VARIABLES, templateIcon,
} from '../OperationalNoticeConstants';
import type { OperationalNoticeVM } from '../OperationalNoticeLogic';

/** "Plantillas" segment — platform admin (companyId 1008) only; the backend enforces it. */
const TemplatesAdmin: React.FC<{ vm: OperationalNoticeVM }> = ({ vm }) => {
  const a = vm.templateAdmin;
  return (
    <>
      <div className="notice-section-head">
        <IonNote>Biblioteca GMO: todas las empresas la ven; cada una copia el texto a su propio aviso.</IonNote>
        <IonButton size="small" onClick={a.openCreate}><IonIcon icon={addOutline} slot="start" />Nueva plantilla</IonButton>
      </div>
      <div className="notice-template-grid">
        {vm.templates.map(t => (
          <IonCard key={t.operationalNoticeTemplateId} button className="notice-template-card" onClick={() => a.openEdit(t)}>
            <IonIcon icon={templateIcon(t.icon)} className={`notice-template-icon notice-type-${t.noticeType}`} />
            <strong>{t.name}</strong>
            <span>{t.description}</span>
            <StatusBadge status={t.status} map={OPERATIONAL_NOTICE_TEMPLATE_STATUS} className="notice-template-status" />
          </IonCard>
        ))}
      </div>

      <IonModal isOpen={a.open} onDidDismiss={a.close} className="notice-modal">
        <IonHeader>
          <IonToolbar>
            <IonTitle>{a.editing ? 'Editar plantilla' : 'Nueva plantilla'}</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={a.close} disabled={a.saving} aria-label="Cerrar"><IonIcon icon={closeOutline} /></IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding notice-modal-content">
          <IonInput className="notice-field" label="Clave" labelPlacement="stacked" fill="outline" value={a.form.templateKey}
            disabled={!!a.editing} placeholder="falta_agua" maxlength={50}
            helperText="Minúsculas, números y guion bajo. No cambia después."
            onIonInput={e => a.setField('templateKey', String(e.detail.value ?? ''))} />
          <IonInput className="notice-field" label="Nombre" labelPlacement="stacked" fill="outline" value={a.form.name}
            maxlength={80} onIonInput={e => a.setField('name', String(e.detail.value ?? ''))} />
          <IonInput className="notice-field" label="Descripción" labelPlacement="stacked" fill="outline" value={a.form.description}
            maxlength={200} onIonInput={e => a.setField('description', String(e.detail.value ?? ''))} />
          <div className="notice-row">
            <IonSelect label="Tipo" labelPlacement="stacked" fill="outline" interface="popover" value={a.form.noticeType}
              onIonChange={e => a.setField('noticeType', e.detail.value as NoticeType)}>
              {NOTICE_TYPES.map(t => <IonSelectOption key={t.value} value={t.value}>{t.label}</IonSelectOption>)}
            </IonSelect>
            <IonSelect label="Ícono" labelPlacement="stacked" fill="outline" interface="popover" value={a.form.icon}
              onIonChange={e => a.setField('icon', String(e.detail.value))}>
              {Object.keys(TEMPLATE_ICONS).map(k => <IonSelectOption key={k} value={k}>{k}</IonSelectOption>)}
            </IonSelect>
          </div>
          <IonSelect className="notice-field" label="Campos que se piden" labelPlacement="stacked" fill="outline" multiple
            value={a.form.variables} onIonChange={e => a.setField('variables', e.detail.value as string[])}>
            {ASKED_VARIABLES.map(v => <IonSelectOption key={v} value={v}>{VARIABLES[v].label} {`{${v}}`}</IonSelectOption>)}
          </IonSelect>
          <IonInput className="notice-field" label="Título del aviso" labelPlacement="stacked" fill="outline"
            value={a.form.defaultTitle} maxlength={TITLE_MAX} placeholder="Cierre por {motivo}"
            onIonInput={e => a.setField('defaultTitle', String(e.detail.value ?? ''))} />
          <IonTextarea className="notice-field" label="Mensaje" labelPlacement="stacked" fill="outline" autoGrow counter
            maxlength={MESSAGE_MAX} value={a.form.defaultMessage}
            helperText="Usa {nombre_empresa}, {motivo}, {fecha_reapertura}, {horario}, {servicio_afectado}."
            onIonInput={e => a.setField('defaultMessage', String(e.detail.value ?? ''))} />
          <IonToggle checked={a.form.blocksReservations} labelPlacement="end" className="notice-toggle"
            onIonChange={e => a.setField('blocksReservations', e.detail.checked)}>
            Bloquear reservaciones por defecto
          </IonToggle>
          {a.editing && a.editing.status === 'activo' && (
            <IonButton fill="clear" color="danger" expand="block" disabled={a.saving} onClick={() => a.setConfirmRetire(true)}>
              Retirar plantilla
            </IonButton>
          )}
        </IonContent>
        <IonFooter className="notice-modal-footer">
          <IonToolbar>
            <IonButton expand="block" disabled={!a.formValid || a.saving} onClick={a.save}>
              {a.saving ? <IonSpinner name="dots" /> : 'Guardar plantilla'}
            </IonButton>
          </IonToolbar>
        </IonFooter>
        <IonAlert
          isOpen={a.confirmRetire}
          onDidDismiss={() => a.setConfirmRetire(false)}
          header="Retirar plantilla"
          message={`"${a.editing?.name ?? ''}" dejará de aparecer en la biblioteca. Los avisos ya publicados no cambian.`}
          buttons={[
            { text: 'Cancelar', role: 'cancel' },
            { text: 'Retirar', role: 'destructive', handler: () => { a.retire(); } },
          ]}
        />
      </IonModal>
    </>
  );
};

export default TemplatesAdmin;

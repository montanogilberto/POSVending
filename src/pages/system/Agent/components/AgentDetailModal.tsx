import React from 'react';
import {
  IonAlert, IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonInput, IonModal, IonNote, IonSelect,
  IonSelectOption, IonSpinner, IonTextarea, IonTitle, IonToggle, IonToolbar,
} from '@ionic/react';
import { closeOutline, logoWhatsapp } from 'ionicons/icons';
import StatusBadge from '../../../../components/ui/StatusBadge';
import { AGENT_STATUS } from '../../../../components/ui/statusMaps';
import { mxDate } from '../../../../utils/format';
import { AREAS } from '../AgentConstants';
import type { AgentVM } from '../AgentLogic';

/** Agent card: read-only for everyone except the SmartLoans admin, who can edit, create and retire. */
const AgentDetailModal: React.FC<{ vm: AgentVM }> = ({ vm }) => {
  const readOnly = !vm.canEditCatalog;
  const { form, editing } = vm;

  return (
    <IonModal isOpen={vm.modalOpen} onDidDismiss={vm.closeModal} className="agent-modal">
      <IonHeader>
        <IonToolbar>
          <IonTitle>{editing ? editing.name : 'Nuevo agente'}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={vm.closeModal} disabled={vm.saving} aria-label="Cerrar">
              <IonIcon icon={closeOutline} slot="icon-only" />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding agent-modal-content">
        {editing && (
          <div className="agent-modal-meta">
            <StatusBadge status={editing.status} map={AGENT_STATUS} />
            {editing.updatedAt && <span>Actualizado {mxDate(editing.updatedAt)}</span>}
          </div>
        )}
        <p className="agent-modal-hint">
          Esta es la ficha del agente. Su prompt, modelo y herramientas viven en el código de los agentes y no se
          cambian desde aquí.
        </p>

        <IonInput fill="outline" label="Clave del agente" labelPlacement="floating" value={form.agentKey}
          helperText="snake_case, igual que en el código. No cambia después de crearlo."
          disabled={readOnly || !!editing} maxlength={80}
          onIonInput={e => vm.setField('agentKey', String(e.detail.value ?? ''))} />
        <IonInput fill="outline" label="Nombre" labelPlacement="floating" value={form.name}
          disabled={readOnly} maxlength={120}
          onIonInput={e => vm.setField('name', String(e.detail.value ?? ''))} />
        <IonTextarea fill="outline" label="Descripción" labelPlacement="floating" value={form.description}
          disabled={readOnly} maxlength={500} counter autoGrow rows={3}
          onIonInput={e => vm.setField('description', String(e.detail.value ?? ''))} />
        <IonSelect fill="outline" label="Área" labelPlacement="floating" value={form.area} disabled={readOnly}
          onIonChange={e => vm.setField('area', e.detail.value)}>
          {AREAS.map(a => <IonSelectOption key={a.value} value={a.value}>{a.label}</IonSelectOption>)}
        </IonSelect>
        <IonInput fill="outline" label="Endpoint" labelPlacement="floating" value={form.endpoint}
          helperText="Solo la ruta (ej. /support/pos-income), nunca el dominio."
          errorText="Debe empezar con / y no incluir el dominio."
          className={form.endpoint && !vm.endpointOk ? 'ion-invalid ion-touched' : ''}
          disabled={readOnly} maxlength={120}
          onIonInput={e => vm.setField('endpoint', String(e.detail.value ?? ''))} />
        <IonInput fill="outline" label="Modelo (informativo)" labelPlacement="floating" value={form.model}
          disabled={readOnly} maxlength={60}
          onIonInput={e => vm.setField('model', String(e.detail.value ?? ''))} />
        <IonToggle checked={form.customerFacing} disabled={readOnly} labelPlacement="end" className="agent-toggle"
          onIonChange={e => vm.setField('customerFacing', e.detail.checked)}>
          Atiende clientes
        </IonToggle>

        {form.area === 'whatsapp' && editing && (
          <IonButton fill="outline" expand="block" routerLink="/whatsapp-agent" onClick={vm.closeModal}>
            <IonIcon icon={logoWhatsapp} slot="start" /> Ver tablero del agente de WhatsApp
          </IonButton>
        )}

        {vm.canEditCatalog ? (
          <div className="agent-modal-actions">
            <IonButton expand="block" onClick={vm.save} disabled={vm.saving || !vm.formValid}>
              {vm.saving ? <IonSpinner name="dots" /> : 'Guardar'}
            </IonButton>
            {editing && editing.status === 'activo' && (
              <IonButton expand="block" fill="clear" color="danger" disabled={vm.saving}
                onClick={() => vm.setConfirmRetire(true)}>
                Retirar agente
              </IonButton>
            )}
          </div>
        ) : (
          <IonNote className="agent-modal-hint">Solo un administrador de SmartLoans puede editar la ficha.</IonNote>
        )}

        <IonAlert
          isOpen={vm.confirmRetire}
          onDidDismiss={() => vm.setConfirmRetire(false)}
          header="Retirar agente"
          message={`"${editing?.name ?? ''}" quedará como retirado en el catálogo. No se borra y no apaga el agente en el código.`}
          buttons={[
            { text: 'Cancelar', role: 'cancel' },
            { text: 'Retirar', role: 'destructive', handler: () => { vm.retire(); } },
          ]}
        />
      </IonContent>
    </IonModal>
  );
};

export default AgentDetailModal;

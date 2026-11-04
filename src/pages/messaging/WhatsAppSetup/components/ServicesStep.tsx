import React from 'react';
import { IonInput, IonSelect, IonSelectOption } from '@ionic/react';
import { calendarOutline } from 'ionicons/icons';
import { MACHINE_TYPES } from '../WhatsAppSetupConstants';
import type { WhatsAppSetupVM } from '../WhatsAppSetupLogic';
import CatalogSection from './CatalogSection';

const machineLabel = (t: string | null) => MACHINE_TYPES.find(m => m.value === (t ?? ''))?.label;

/** Bookable services (sp_reservationServices). Removing one keeps its past reservations. */
const ServicesStep: React.FC<{ vm: WhatsAppSetupVM }> = ({ vm }) => {
  const ed = vm.serviceEditor;
  const d = ed.editing?.draft;
  const usesMachines = !!d?.machineType;

  return (
    <CatalogSection
      items={vm.services}
      idOf={s => s.reservationServiceId}
      title={s => s.name}
      detail={s => [
        s.durationMinutes ? `${s.durationMinutes} min` : null,
        s.capacity ? `${s.capacity} por horario` : null,
        s.machineType ? machineLabel(s.machineType) : null,
        s.description,
      ].filter(Boolean).join(' · ') || null}
      editor={ed}
      addLabel="Agregar servicio"
      emptyIcon={calendarOutline}
      emptyText="Aún no hay servicios para reservar. Sin ellos el agente no puede agendar citas."
      form={d && (
        <div className="was-form-grid">
          <IonInput label="Nombre" labelPlacement="stacked" fill="outline" placeholder="Lavado de edredón"
            maxlength={60} value={d.name} disabled={ed.saving}
            onIonInput={e => ed.setField('name', e.detail.value ?? '')} />
          <IonInput label="Descripción (opcional)" labelPlacement="stacked" fill="outline"
            placeholder="Incluye secado y doblado" maxlength={250} value={d.description} disabled={ed.saving}
            onIonInput={e => ed.setField('description', e.detail.value ?? '')} />
          <IonSelect label="Usa máquinas" labelPlacement="stacked" fill="outline" interface="popover"
            value={d.machineType} disabled={ed.saving}
            onIonChange={e => ed.setField('machineType', e.detail.value)}>
            {MACHINE_TYPES.map(m => <IonSelectOption key={m.value} value={m.value}>{m.label}</IonSelectOption>)}
          </IonSelect>
          <IonInput label="Duración (min)" labelPlacement="stacked" fill="outline" type="number" inputmode="numeric"
            placeholder={usesMachines ? 'Ciclo de la máquina' : '60'} value={d.durationMinutes} disabled={ed.saving}
            onIonInput={e => ed.setField('durationMinutes', e.detail.value ?? '')} />
          <IonInput label="Lugares por horario" labelPlacement="stacked" fill="outline" type="number" inputmode="numeric"
            placeholder={usesMachines ? 'Máquinas disponibles' : '1'} value={d.capacity} disabled={ed.saving}
            onIonInput={e => ed.setField('capacity', e.detail.value ?? '')} />
          {usesMachines && (
            <p className="was-muted was-form-wide">
              Deja vacíos duración y lugares para tomarlos de tus máquinas: el ciclo más largo y cuántas están en servicio.
            </p>
          )}
        </div>
      )}
    />
  );
};

export default ServicesStep;

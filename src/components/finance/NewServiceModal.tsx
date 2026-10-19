import React, { useState } from 'react';
import {
  IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon, IonContent,
  IonInput, IonTextarea, IonSpinner, IonToast,
} from '@ionic/react';
import { closeOutline, saveOutline } from 'ionicons/icons';
import { createService, getAllServices, Service } from '../../api/serviceApi';
import { useToast } from '../../hooks/useToast';
import { notifyDataChanged } from '../../utils/refreshBus';
import './NewSupplierModal.css';

interface NewServiceModalProps {
  isOpen: boolean;
  companyId: number;
  onClose: () => void;
  /** The created service (re-read from /all_services) — the caller selects it. */
  onCreated: (service: Service, services: Service[]) => void;
}

const EMPTY = { serviceName: '', description: '' };

/**
 * Quick service creation from the expense form (Servicios tab), so a new
 * recurring bill (CFE, agua, internet, renta) doesn't send the user to
 * /services and back. Same backend as ServicePage (sp_services rejects a
 * duplicate name per company; its message is shown as-is). Reuses
 * NewSupplierModal's CSS — same layout, different fields.
 */
const NewServiceModal: React.FC<NewServiceModalProps> = ({ isOpen, companyId, onClose, onCreated }) => {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const { showToast, toastProps } = useToast({ defaultColor: 'danger' });

  const set = (key: keyof typeof EMPTY) => (e: CustomEvent) =>
    setForm(f => ({ ...f, [key]: String(e.detail.value ?? '') }));

  const close = () => {
    if (saving) return;
    setForm(EMPTY);
    onClose();
  };

  const save = async () => {
    const serviceName = form.serviceName.trim();
    if (!serviceName) {
      showToast('El nombre del servicio es obligatorio');
      return;
    }
    setSaving(true);
    try {
      await createService({
        companyId,
        serviceName,
        description: form.description.trim(),
        active: '1',
      });
      // sp_services doesn't return the new id — re-read and match by name
      // (unique per company, enforced by the SP).
      const services = await getAllServices(companyId);
      const created = services.find(s => s.serviceName.trim().toLowerCase() === serviceName.toLowerCase());
      if (!created) throw new Error('El servicio se creó pero no aparece en la lista; recarga.');
      notifyDataChanged('service-created');
      setForm(EMPTY);
      onCreated(created, services);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al crear el servicio');
    } finally {
      setSaving(false);
    }
  };

  return (
    <IonModal isOpen={isOpen} onDidDismiss={close} className="new-supplier-modal"
      initialBreakpoint={0.75} breakpoints={[0, 0.75, 1]}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Nuevo servicio</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={close} disabled={saving} aria-label="Cerrar">
              <IonIcon icon={closeOutline} slot="icon-only" />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <div className="new-supplier-fields">
          <IonInput fill="outline" label="Nombre del servicio *" labelPlacement="floating" maxlength={200}
            placeholder="Ej. CFE, Agua, Internet, Renta" value={form.serviceName} onIonInput={set('serviceName')} />
          <IonTextarea fill="outline" label="Descripción" labelPlacement="floating" autoGrow
            value={form.description} onIonInput={set('description')} />

          <IonButton expand="block" className="new-supplier-save" disabled={saving} onClick={save}>
            {saving ? <IonSpinner name="dots" /> : <><IonIcon slot="start" icon={saveOutline} /> Guardar servicio</>}
          </IonButton>
        </div>
        <IonToast {...toastProps} />
      </IonContent>
    </IonModal>
  );
};

export default NewServiceModal;

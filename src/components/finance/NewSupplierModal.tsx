import React, { useEffect, useState } from 'react';
import {
  IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon, IonContent,
  IonInput, IonSpinner, IonToast,
} from '@ionic/react';
import { closeOutline, saveOutline } from 'ionicons/icons';
import { createSupplier, getAllSuppliers, Supplier } from '../../api/supplierApi';
import { useToast } from '../../hooks/useToast';
import { notifyDataChanged } from '../../utils/refreshBus';
import './NewSupplierModal.css';

interface NewSupplierModalProps {
  isOpen: boolean;
  companyId: number;
  /** Prefills the name, e.g. the merchant read off a ticket. */
  initialName?: string;
  onClose: () => void;
  /** The created supplier (re-read from /all_suppliers) — the caller selects it. */
  onCreated: (supplier: Supplier, suppliers: Supplier[]) => void;
}

const EMPTY = { supplierName: '', contactName: '', phone: '', email: '' };

/**
 * Quick supplier creation from the expense form, so a new bill doesn't send
 * the user to /suppliers and back. Same backend as SupplierPage (sp_suppliers
 * rejects duplicate name/email/phone per company; its message is shown as-is).
 */
const NewSupplierModal: React.FC<NewSupplierModalProps> = ({ isOpen, companyId, initialName = '', onClose, onCreated }) => {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const { showToast, toastProps } = useToast({ defaultColor: 'danger' });

  useEffect(() => {
    if (isOpen) setForm(f => ({ ...f, supplierName: initialName }));
  }, [isOpen, initialName]);

  const set = (key: keyof typeof EMPTY) => (e: CustomEvent) =>
    setForm(f => ({ ...f, [key]: String(e.detail.value ?? '') }));

  const close = () => {
    if (saving) return;
    setForm(EMPTY);
    onClose();
  };

  const save = async () => {
    const supplierName = form.supplierName.trim();
    if (!supplierName) {
      showToast('El nombre del proveedor es obligatorio');
      return;
    }
    setSaving(true);
    try {
      await createSupplier({
        companyId,
        supplierName,
        contactName: form.contactName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        address: '',
        active: '1',
      });
      // sp_suppliers doesn't return the new id — re-read and match by name
      // (unique per company, enforced by the SP).
      const suppliers = await getAllSuppliers(companyId);
      const created = suppliers.find(s => s.supplierName.trim().toLowerCase() === supplierName.toLowerCase());
      if (!created) throw new Error('El proveedor se creó pero no aparece en la lista; recarga.');
      notifyDataChanged('supplier-created');
      setForm(EMPTY);
      onCreated(created, suppliers);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al crear el proveedor');
    } finally {
      setSaving(false);
    }
  };

  return (
    <IonModal isOpen={isOpen} onDidDismiss={close} className="new-supplier-modal"
      initialBreakpoint={0.75} breakpoints={[0, 0.75, 1]}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Nuevo proveedor</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={close} disabled={saving} aria-label="Cerrar">
              <IonIcon icon={closeOutline} slot="icon-only" />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <div className="new-supplier-fields">
          <IonInput fill="outline" label="Nombre del proveedor *" labelPlacement="floating" maxlength={200}
            value={form.supplierName} onIonInput={set('supplierName')} />
          <IonInput fill="outline" label="Contacto" labelPlacement="floating" maxlength={100}
            value={form.contactName} onIonInput={set('contactName')} />
          <IonInput fill="outline" label="Teléfono" labelPlacement="floating" type="tel" maxlength={20}
            value={form.phone} onIonInput={set('phone')} />
          <IonInput fill="outline" label="Correo" labelPlacement="floating" type="email" maxlength={100}
            value={form.email} onIonInput={set('email')} />

          <IonButton expand="block" className="new-supplier-save" disabled={saving} onClick={save}>
            {saving ? <IonSpinner name="dots" /> : <><IonIcon slot="start" icon={saveOutline} /> Guardar proveedor</>}
          </IonButton>
        </div>
        <IonToast {...toastProps} />
      </IonContent>
    </IonModal>
  );
};

export default NewSupplierModal;

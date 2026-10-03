import React, { useEffect, useState } from 'react';
import {
  IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon, IonContent,
  IonInput, IonSelect, IonSelectOption, IonSpinner, IonToast,
} from '@ionic/react';
import { closeOutline, saveOutline } from 'ionicons/icons';
import { createSupplyProduct } from '../../api/productsApi';
import { fetchCategories, Category } from '../../api/categoriesApi';
import { useToast } from '../../hooks/useToast';
import { notifyDataChanged } from '../../utils/refreshBus';
import './NewSupplierModal.css';

interface NewSupplyProductModalProps {
  isOpen: boolean;
  companyId: number;
  /** Prefills the name, e.g. what the user had typed in the picker's search. */
  initialName?: string;
  onClose: () => void;
  onCreated: (product: { productId: number; name: string; code: string }) => void;
}

/**
 * Quick supply-product creation from the expense form, so buying something
 * that isn't in the catalog yet (a new detergent, a new soap) doesn't send
 * the user to Productos and back. Supplies are created without options or a
 * sale price, so the POS sales menu (sp_products_by_company) never lists them.
 */
const NewSupplyProductModal: React.FC<NewSupplyProductModalProps> = ({
  isOpen, companyId, initialName = '', onClose, onCreated,
}) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const { showToast, toastProps } = useToast({ defaultColor: 'danger' });

  useEffect(() => {
    if (isOpen) setName(initialName);
  }, [isOpen, initialName]);

  useEffect(() => {
    if (!isOpen || categories.length > 0) return;
    fetchCategories(String(companyId))
      .then((list) => {
        setCategories(list);
        // "Productos" is the natural home for consumables; otherwise the first one.
        const preferred = list.find((c) => c.name.trim().toLowerCase() === 'productos') ?? list[0];
        if (preferred) setCategoryId(preferred.categoryId);
      })
      .catch((err) => console.error('[NewSupplyProductModal] fetchCategories failed:', err));
  }, [isOpen, companyId, categories.length]);

  const close = () => {
    if (saving) return;
    setName('');
    setCode('');
    onClose();
  };

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      showToast('El nombre del producto es obligatorio');
      return;
    }
    if (!categoryId) {
      showToast('Selecciona una categoría');
      return;
    }
    setSaving(true);
    try {
      const productId = await createSupplyProduct({ companyId, categoryId, name: trimmed, code: code.trim() });
      notifyDataChanged('product-created');
      onCreated({ productId, name: trimmed, code: code.trim() });
      setName('');
      setCode('');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al crear el producto');
    } finally {
      setSaving(false);
    }
  };

  return (
    <IonModal isOpen={isOpen} onDidDismiss={close} className="new-supplier-modal"
      initialBreakpoint={0.75} breakpoints={[0, 0.75, 1]}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Nuevo producto</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={close} disabled={saving} aria-label="Cerrar">
              <IonIcon icon={closeOutline} slot="icon-only" />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <div className="new-supplier-fields">
          <IonInput fill="outline" labelPlacement="stacked" maxlength={200}
            placeholder="Ej. Detergente líquido Ariel 8.5 L"
            value={name} onIonInput={(e) => setName(String(e.detail.value ?? ''))}>
            <div slot="label">Nombre del producto <span className="expense-required">*</span></div>
          </IonInput>
          <IonInput fill="outline" label="Código (opcional)" labelPlacement="stacked" maxlength={50}
            value={code} onIonInput={(e) => setCode(String(e.detail.value ?? ''))} />
          <IonSelect fill="outline" labelPlacement="stacked" interface="popover"
            placeholder="Seleccionar categoría"
            value={categoryId || undefined} onIonChange={(e) => setCategoryId(Number(e.detail.value) || 0)}>
            <div slot="label">Categoría <span className="expense-required">*</span></div>
            {categories.map((c) => (
              <IonSelectOption key={c.categoryId} value={c.categoryId}>{c.name}</IonSelectOption>
            ))}
          </IonSelect>

          <IonButton expand="block" className="new-supplier-save" disabled={saving} onClick={save}>
            {saving ? <IonSpinner name="dots" /> : <><IonIcon slot="start" icon={saveOutline} /> Guardar producto</>}
          </IonButton>
        </div>
        <IonToast {...toastProps} />
      </IonContent>
    </IonModal>
  );
};

export default NewSupplyProductModal;

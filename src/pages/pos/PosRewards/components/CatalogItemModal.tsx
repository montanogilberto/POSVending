import React from 'react';
import {
  IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon,
  IonContent, IonInput, IonSelect, IonSelectOption, IonCheckbox,
} from '@ionic/react';
import { closeOutline, giftOutline } from 'ionicons/icons';
import { PosRewardsVM } from '../PosRewardsLogic';

interface Props {
  vm: PosRewardsVM;
}

// Coupon dates are stored in UTC; the form edits whole local days.
const toLocalDate = (utc?: string | null): string => {
  if (!utc) return '';
  const d = new Date(utc.endsWith('Z') ? utc : `${utc}Z`);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const toUtc = (localDate: string | null | undefined, endOfDay: boolean): string | null =>
  localDate ? new Date(`${localDate}T${endOfDay ? '23:59:59' : '00:00:00'}`).toISOString().slice(0, 19) : null;

const CatalogItemModal: React.FC<Props> = ({ vm }) => {
  const { showCatalogModal, setShowCatalogModal, editCatalogItem, setEditCatalogItem, saveCatalogItem } = vm;
  const type = editCatalogItem.rewardType;
  const productField = (label: string) => (
    <IonInput fill="outline" label={label} labelPlacement="floating" type="number"
      value={editCatalogItem.freeProductId ?? ''}
      onIonInput={e => setEditCatalogItem(p => ({ ...p, freeProductId: e.detail.value ? parseInt(e.detail.value) : null }))} />
  );

  return (
    <IonModal isOpen={showCatalogModal} onDidDismiss={() => setShowCatalogModal(false)}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{editCatalogItem.catalogItemId ? 'Editar Recompensa' : 'Nueva Recompensa'}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => setShowCatalogModal(false)}>
              <IonIcon icon={closeOutline} slot="icon-only" />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <div className="pr-form">
          <IonInput fill="outline" label="Nombre" labelPlacement="floating"
            value={editCatalogItem.name}
            onIonInput={e => setEditCatalogItem(p => ({ ...p, name: e.detail.value! }))} />

          <IonSelect fill="outline" label="Tipo de recompensa" labelPlacement="floating"
            value={editCatalogItem.rewardType}
            onIonChange={e => setEditCatalogItem(p => ({ ...p, rewardType: e.detail.value }))}>
            <IonSelectOption value="discount_fixed">Descuento fijo con puntos ($ MXN)</IonSelectOption>
            <IonSelectOption value="discount_pct">Descuento porcentual con puntos (%)</IonSelectOption>
            <IonSelectOption value="free_product">Tarjeta de sellos (compra N, el siguiente gratis)</IonSelectOption>
            <IonSelectOption value="coupon_b2g1">Cupón 2x1 (código en caja)</IonSelectOption>
          </IonSelect>

          {(type === 'discount_fixed' || type === 'discount_pct') && (
            <>
              <IonInput fill="outline" label="Puntos requeridos" labelPlacement="floating" type="number"
                value={editCatalogItem.requiredPoints}
                onIonInput={e => setEditCatalogItem(p => ({ ...p, requiredPoints: parseFloat(e.detail.value!) }))} />
              <IonInput fill="outline" label={type === 'discount_pct' ? 'Descuento (%)' : 'Descuento ($ MXN)'}
                labelPlacement="floating" type="number"
                value={editCatalogItem.discountValue ?? ''}
                onIonInput={e => setEditCatalogItem(p => ({ ...p, discountValue: e.detail.value ? parseFloat(e.detail.value) : null }))} />
            </>
          )}

          {type === 'free_product' && (
            <>
              {productField('ID del producto gratis')}
              <IonInput fill="outline" label="Compras requeridas de ese producto" labelPlacement="floating" type="number"
                value={editCatalogItem.requiredUnits ?? editCatalogItem.requiredPoints ?? ''}
                onIonInput={e => setEditCatalogItem(p => ({ ...p, requiredUnits: e.detail.value ? parseFloat(e.detail.value) : null }))} />
            </>
          )}

          {type === 'coupon_b2g1' && (
            <>
              <IonInput fill="outline" label="Código (ej. 2X1)" labelPlacement="floating"
                value={editCatalogItem.code ?? ''}
                onIonInput={e => setEditCatalogItem(p => ({ ...p, code: (e.detail.value ?? '').toUpperCase() }))} />
              {productField('ID del producto (vacío = todos)')}
              <IonInput fill="outline" label="Válido desde (opcional)" labelPlacement="floating" type="date"
                value={toLocalDate(editCatalogItem.startAtUtc)}
                onIonInput={e => setEditCatalogItem(p => ({ ...p, startAtUtc: toUtc(e.detail.value, false) }))} />
              <IonInput fill="outline" label="Válido hasta (opcional)" labelPlacement="floating" type="date"
                value={toLocalDate(editCatalogItem.endAtUtc)}
                onIonInput={e => setEditCatalogItem(p => ({ ...p, endAtUtc: toUtc(e.detail.value, true) }))} />
              <IonCheckbox labelPlacement="end" checked={!!editCatalogItem.firstPurchaseOnly}
                onIonChange={e => setEditCatalogItem(p => ({ ...p, firstPurchaseOnly: e.detail.checked }))}>
                Solo primera compra del cliente
              </IonCheckbox>
            </>
          )}

          <IonInput fill="outline" label="Descripción (opcional)" labelPlacement="floating"
            value={editCatalogItem.description}
            onIonInput={e => setEditCatalogItem(p => ({ ...p, description: e.detail.value! }))} />

          <IonCheckbox labelPlacement="end" checked={editCatalogItem.isActive}
            onIonChange={e => setEditCatalogItem(p => ({ ...p, isActive: e.detail.checked }))}>
            Activa
          </IonCheckbox>

          <IonButton expand="block" shape="round" onClick={saveCatalogItem} className="pr-save-btn">
            <IonIcon icon={giftOutline} slot="start" />
            {editCatalogItem.catalogItemId ? 'Actualizar recompensa' : 'Crear recompensa'}
          </IonButton>
        </div>
      </IonContent>
    </IonModal>
  );
};

export default CatalogItemModal;

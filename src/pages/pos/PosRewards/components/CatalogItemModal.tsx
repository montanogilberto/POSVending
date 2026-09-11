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

const CatalogItemModal: React.FC<Props> = ({ vm }) => {
  const { showCatalogModal, setShowCatalogModal, editCatalogItem, setEditCatalogItem, saveCatalogItem } = vm;

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
            <IonSelectOption value="discount_fixed">Descuento fijo ($ MXN)</IonSelectOption>
            <IonSelectOption value="discount_pct">Descuento porcentual (%)</IonSelectOption>
            <IonSelectOption value="free_product">Producto gratis</IonSelectOption>
          </IonSelect>

          <IonInput fill="outline" label="Puntos requeridos" labelPlacement="floating" type="number"
            value={editCatalogItem.requiredPoints}
            onIonInput={e => setEditCatalogItem(p => ({ ...p, requiredPoints: parseFloat(e.detail.value!) }))} />

          {editCatalogItem.rewardType !== 'free_product' ? (
            <IonInput fill="outline" label="Valor del descuento" labelPlacement="floating" type="number"
              value={editCatalogItem.discountValue ?? ''}
              onIonInput={e => setEditCatalogItem(p => ({ ...p, discountValue: e.detail.value ? parseFloat(e.detail.value) : null }))} />
          ) : (
            <IonInput fill="outline" label="ID del producto gratis" labelPlacement="floating" type="number"
              value={editCatalogItem.freeProductId ?? ''}
              onIonInput={e => setEditCatalogItem(p => ({ ...p, freeProductId: e.detail.value ? parseInt(e.detail.value) : null }))} />
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

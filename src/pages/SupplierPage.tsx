import React, { useState, useEffect, useMemo, useContext } from 'react';
import {
  IonPage,
  IonContent,
  IonButton,
  IonIcon,
  IonList,
  IonItem,
  IonLabel,
  IonCard,
  IonCardContent,
  IonSearchbar,
  IonFab,
  IonFabButton,
  IonModal,
  IonInput,
  IonAlert,
  IonToast,
  IonLoading,
  IonSelect,
  IonSelectOption,
} from '@ionic/react';
import { addOutline, createOutline, trashOutline, personCircleOutline } from 'ionicons/icons';
import Header from '../components/Header';
import AlertPopover from '../components/PopOver/AlertPopover';
import MailPopover from '../components/PopOver/MailPopover';
import { UserContext } from '../components/UserContext';
import { Supplier, getAllSuppliers, createSupplier, updateSupplier, deleteSupplier } from '../api/supplierApi';
import { SearchbarInputEventDetail } from '@ionic/core';
import { InputInputEventDetail } from '@ionic/core';
import IonInfiniteScroll from '@ionic/react/dist/types/components/IonInfiniteScroll';
import IonInfiniteScrollContent from '@ionic/react/dist/types/components/IonInfiniteScrollContent';

const toHermosillo = (utc: string | undefined): string => {
  if (!utc) return '';
  const d = new Date(utc.includes('Z') ? utc : utc + 'Z');
  return new Date(d.getTime() - 7 * 60 * 60 * 1000).toLocaleString();
};

const ITEMS_PER_LOAD = 20;

const SupplierPage: React.FC = () => {
  const { user } = useContext(UserContext);
  const companyId = user?.companyId;

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState<Supplier[]>([]);
  const [displayedSuppliers, setDisplayedSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchText, setSearchText] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Partial<Supplier> | null>(null);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);
  const [page, setPage] = useState(1);
  const [hasMoreItems, setHasMoreItems] = useState(true);

  const [popoverState, setPopoverState] = useState<{ showAlertPopover: boolean; showMailPopover: boolean; event?: Event }>(
    { showAlertPopover: false, showMailPopover: false }
  );

  const presentAlertPopover = (e: React.MouseEvent) =>
    setPopoverState({ ...popoverState, showAlertPopover: true, event: e.nativeEvent });
  const dismissAlertPopover = () =>
    setPopoverState({ ...popoverState, showAlertPopover: false });
  const presentMailPopover = (e: React.MouseEvent) =>
    setPopoverState({ ...popoverState, showMailPopover: true, event: e.nativeEvent });
  const dismissMailPopover = () =>
    setPopoverState({ ...popoverState, showMailPopover: false });

  const fetchSuppliers = async (companyId: number, text: string = '') => {
    setLoading(true);
    setError('');
    try {
      const data = await getAllSuppliers(companyId, text);
      setSuppliers(data);
      setPage(1);
      setHasMoreItems(true);
      setDisplayedSuppliers(data.slice(0, ITEMS_PER_LOAD));
      if (data.length <= ITEMS_PER_LOAD) {
        setHasMoreItems(false);
      }
    } catch (err) {
      setError((err as Error).message ?? 'Error desconocido al cargar proveedores');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (companyId) {
      fetchSuppliers(companyId, searchText);
    }
  }, [companyId, searchText]);

  const loadMoreItems = () => {
    const newPage = page + 1;
    const newItems = filteredSuppliers.slice(0, newPage * ITEMS_PER_LOAD);
    setDisplayedSuppliers(newItems);
    setPage(newPage);
    if (newItems.length >= filteredSuppliers.length) {
      setHasMoreItems(false);
    }
  };

  useEffect(() => {
    const filtered = suppliers.filter(supplier =>
      supplier.supplierName.toLowerCase().includes(searchText.toLowerCase()) ||
      supplier.contactName?.toLowerCase().includes(searchText.toLowerCase()) ||
      supplier.email?.toLowerCase().includes(searchText.toLowerCase()) ||
      supplier.phone?.toLowerCase().includes(searchText.toLowerCase())
    );
    setFilteredSuppliers(filtered);
    setDisplayedSuppliers(filtered.slice(0, ITEMS_PER_LOAD));
    setPage(1);
    setHasMoreItems(filtered.length > ITEMS_PER_LOAD);
  }, [suppliers, searchText]);


  const handleSearchChange = (e: CustomEvent<SearchbarInputEventDetail>) => {
    setSearchText(e.detail.value!);
  };

  const openCreateModal = () => {
    setEditingSupplier({ active: '1' }); // Default active to '1' for new supplier
    setShowCreateModal(true);
  };

  const editSupplier = (supplier: Supplier) => {
    setEditingSupplier({ ...supplier });
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setEditingSupplier(null);
  };

  const handleInputChange = (e: CustomEvent<InputInputEventDetail>) => {
    const { name, value } = e.target as HTMLIonInputElement;
    setEditingSupplier(prev => ({ ...prev, [name!]: value }));
  };

  const handleSelectChange = (e: CustomEvent) => {
    const { name, value } = e.target as HTMLIonSelectElement;
    setEditingSupplier(prev => ({ ...prev, [name!]: value }));
  };

  const saveSupplier = async () => {
    if (!editingSupplier?.supplierName || !editingSupplier?.active || !companyId) {
      setError('El nombre del proveedor y el estado activo son obligatorios.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      if (editingSupplier.supplierId) {
        // Update existing supplier
        await updateSupplier(editingSupplier.supplierId, { ...editingSupplier, companyId });
        setError('Proveedor actualizado exitosamente.');
      } else {
        // Create new supplier
        await createSupplier({ ...editingSupplier as Omit<Supplier, 'supplierId'>, companyId });
        setError('Proveedor creado exitosamente.');
      }
      closeCreateModal();
      if (companyId) await fetchSuppliers(companyId);
    } catch (err) {
      setError((err as Error).message ?? 'Error al guardar el proveedor');
    } finally {
      setLoading(false);
    }
  };

  const confirmDeleteSupplier = (supplier: Supplier) => {
    setSupplierToDelete(supplier);
    setShowDeleteAlert(true);
  };

  const deleteSelectedSupplier = async () => {
    if (supplierToDelete && companyId) {
      setLoading(true);
      setError('');
      try {
        await deleteSupplier(supplierToDelete.supplierId, companyId);
        setError('Proveedor eliminado exitosamente.');
        if (companyId) await fetchSuppliers(companyId);
      } catch (err) {
        setError((err as Error).message ?? 'Error al eliminar el proveedor');
      } finally {
        setLoading(false);
        setSupplierToDelete(null);
        setShowDeleteAlert(false);
      }
    }
  };

  return (
    <IonPage>
      <Header
        presentAlertPopover={presentAlertPopover}
        presentMailPopover={presentMailPopover}
        screenTitle="Proveedores — POS GMO"
      />
      <AlertPopover
        isOpen={popoverState.showAlertPopover}
        event={popoverState.event}
        onDidDismiss={dismissAlertPopover}
      />
      <MailPopover
        isOpen={popoverState.showMailPopover}
        event={popoverState.event}
        onDidDismiss={dismissMailPopover}
      />

      <IonContent className="ion-padding supplier-page">
        <IonLoading isOpen={loading} message={'Cargando proveedores...'}
        />

        <IonToast
          isOpen={!!error}
          message={error}
          duration={3000}
          onDidDismiss={() => setError('')}
          color="danger"
        />

        <div className="supplier-search-container">
          <IonSearchbar
            placeholder="Buscar proveedores..."
            value={searchText}
            onIonInput={handleSearchChange}
            debounce={300}
            className="supplier-searchbar"
          />
        </div>

        <IonList className="supplier-list">
          {displayedSuppliers.map(supplier => (
            <IonCard key={supplier.supplierId} className="supplier-card">
              <IonCardContent className="supplier-card-content">
                <div className="supplier-card-row">
                  <div className="supplier-left">
                    <IonIcon icon={personCircleOutline} className="supplier-avatar" />
                  </div>
                  <div className="supplier-main">
                    <h2 className="supplier-name">{supplier.supplierName}</h2>
                    {supplier.contactName && (
                      <p className="supplier-subtitle">
                        Contacto: {supplier.contactName}
                      </p>
                    )}
                    {supplier.phone && (
                      <p className="supplier-meta-badge">
                        Teléfono: {supplier.phone}
                      </p>
                    )}
                    {supplier.email && (
                      <p className="supplier-meta-badge">
                        Email: {supplier.email}
                      </p>
                    )}
                    {supplier.address && (
                      <p className="supplier-meta-badge">
                        Dirección: {supplier.address}
                      </p>
                    )}
                    <p className="supplier-meta-badge">
                      Estado: {supplier.active === '1' ? 'Activo' : 'Inactivo'}
                    </p>
                  </div>
                  <div className="supplier-actions">
                    <IonButton
                      fill="clear"
                      color="primary"
                      onClick={() => editSupplier(supplier)}
                      className="action-button edit-button"
                    >
                      <IonIcon icon={createOutline} slot="icon-only" />
                    </IonButton>
                    <IonButton
                      fill="clear"
                      color="danger"
                      onClick={() => confirmDeleteSupplier(supplier)}
                      className="action-button delete-button"
                    >
                      <IonIcon icon={trashOutline} slot="icon-only" />
                    </IonButton>
                  </div>
                </div>
              </IonCardContent>
            </IonCard>
          ))}
          <IonInfiniteScroll
            onIonInfinite={(ev: CustomEvent<void>) => {
              loadMoreItems();
              (ev.target as HTMLIonInfiniteScrollElement).complete();
            }}
            threshold="100px"
            disabled={!hasMoreItems}
          >
            <IonInfiniteScrollContent
              loadingText="Cargando más proveedores..."
            ></IonInfiniteScrollContent>
          </IonInfiniteScroll>
        </IonList>

        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton onClick={openCreateModal}>
            <IonIcon icon={addOutline} />
          </IonFabButton>
        </IonFab>

        <IonModal isOpen={showCreateModal} onDidDismiss={closeCreateModal} className="supplier-modal">
          <Header
            presentAlertPopover={presentAlertPopover}
            presentMailPopover={presentMailPopover}
            screenTitle={editingSupplier?.supplierId ? "Editar Proveedor" : "Crear Proveedor"}
          />
          <IonContent className="ion-padding">
            <IonList>
              <IonItem>
                <IonLabel position="floating">Nombre del Proveedor</IonLabel>
                <IonInput
                  name="supplierName"
                  value={editingSupplier?.supplierName}
                  onIonInput={handleInputChange}
                  required
                ></IonInput>
              </IonItem>
              <IonItem>
                <IonLabel position="floating">Nombre de Contacto</IonLabel>
                <IonInput
                  name="contactName"
                  value={editingSupplier?.contactName}
                  onIonInput={handleInputChange}
                ></IonInput>
              </IonItem>
              <IonItem>
                <IonLabel position="floating">Teléfono</IonLabel>
                <IonInput
                  name="phone"
                  value={editingSupplier?.phone}
                  onIonInput={handleInputChange}
                ></IonInput>
              </IonItem>
              <IonItem>
                <IonLabel position="floating">Email</IonLabel>
                <IonInput
                  name="email"
                  type="email"
                  value={editingSupplier?.email}
                  onIonInput={handleInputChange}
                ></IonInput>
              </IonItem>
              <IonItem>
                <IonLabel position="floating">Dirección</IonLabel>
                <IonInput
                  name="address"
                  value={editingSupplier?.address}
                  onIonInput={handleInputChange}
                ></IonInput>
              </IonItem>
              <IonItem>
                <IonLabel>Estado</IonLabel>
                <IonSelect
                  name="active"
                  value={editingSupplier?.active}
                  onIonChange={handleSelectChange}
                  interface="popover"
                >
                  <IonSelectOption value="1">Activo</IonSelectOption>
                  <IonSelectOption value="0">Inactivo</IonSelectOption>
                </IonSelect>
              </IonItem>
            </IonList>
            <IonButton expand="block" onClick={saveSupplier} className="ion-margin-top">
              Guardar Proveedor
            </IonButton>
            <IonButton expand="block" fill="outline" onClick={closeCreateModal} className="ion-margin-top">
              Cancelar
            </IonButton>
          </IonContent>
        </IonModal>

        <IonAlert
          isOpen={showDeleteAlert}
          onDidDismiss={() => setShowDeleteAlert(false)}
          header={'Confirmar Eliminación'}
          message={`¿Estás seguro de que quieres eliminar el proveedor ${supplierToDelete?.supplierName}?`}
          buttons={[
            { text: 'Cancelar', role: 'cancel' },
            { text: 'Eliminar', handler: deleteSelectedSupplier, cssClass: 'danger' },
          ]}
        />
      </IonContent>
    </IonPage>
  );
};

export default SupplierPage;

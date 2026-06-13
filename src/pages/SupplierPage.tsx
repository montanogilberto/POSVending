import React, { useState, useEffect, useContext, useRef } from 'react';
import {
  IonPage,
  IonContent,
  IonLoading,
  IonToast,
  IonFab,
  IonFabButton,
  IonIcon,
  IonList,
  IonItem,
  IonLabel,
  IonCard,
  IonCardContent,
  IonInput,
  IonModal,
  IonButton,
  IonAlert,
  IonSearchbar,
  SearchbarInputEventDetail,
  InputInputEventDetail,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonToggle,
  ToggleChangeEventDetail,
} from '@ionic/react';
import { add, create, trash, peopleOutline } from 'ionicons/icons';
import Header from '../components/Header';
import AlertPopover from '../components/PopOver/AlertPopover';
import MailPopover from '../components/PopOver/MailPopover';
import { AuthContext } from '../context/AuthContext'; // Assuming AuthContext provides companyId

import {
  Supplier,
  getAllSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} from '../api/supplierApi';
import './SupplierPage.css';

const toHermosillo = (utc: string | undefined): string => {
  if (!utc) return '';
  const d = new Date(utc.includes('Z') ? utc : utc + 'Z');
  return new Date(d.getTime() - 7 * 60 * 60 * 1000).toLocaleString();
};

const PAGE_SIZE = 20; // For infinite scroll

const SupplierPage: React.FC = () => {
  const { user } = useContext(AuthContext);
  const companyId = user?.companyId;

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState<Supplier[]>([]);
  const [displayedSuppliers, setDisplayedSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchText, setSearchText] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Partial<Supplier> | null>(null);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);

  const [popoverState, setPopoverState] = useState<{
    showAlertPopover: boolean;
    showMailPopover: boolean;
    event?: Event;
  }>({ showAlertPopover: false, showMailPopover: false });

  const presentAlertPopover = (e: React.MouseEvent) =>
    setPopoverState({ ...popoverState, showAlertPopover: true, event: e.nativeEvent });
  const dismissAlertPopover = () =>
    setPopoverState({ ...popoverState, showAlertPopover: false });
  const presentMailPopover = (e: React.MouseEvent) =>
    setPopoverState({ ...popoverState, showMailPopover: true, event: e.nativeEvent });
  const dismissMailPopover = () =>
    setPopoverState({ ...popoverState, showMailPopover: false });

  const loadSuppliers = async () => {
    if (!companyId) {
      setError('Company ID is not available.');
      return;
    }
    setLoading(true);
    try {
      const data = await getAllSuppliers(companyId);
      setSuppliers(data);
      setFilteredSuppliers(data);
      setDisplayedSuppliers(data.slice(0, PAGE_SIZE));
    } catch (err) {
      setError((err as Error).message ?? 'Error loading suppliers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, [companyId]); // Reload when companyId changes

  useEffect(() => {
    const lowercasedSearchText = searchText.toLowerCase();
    const filtered = suppliers.filter(
      (s) =>
        s.supplierName.toLowerCase().includes(lowercasedSearchText) ||
        s.contactName?.toLowerCase().includes(lowercasedSearchText) ||
        s.email?.toLowerCase().includes(lowercasedSearchText) ||
        s.phone?.toLowerCase().includes(lowercasedSearchText)
    );
    setFilteredSuppliers(filtered);
    setDisplayedSuppliers(filtered.slice(0, PAGE_SIZE));
  }, [searchText, suppliers]);

  const loadMoreItems = () => {
    const currentLength = displayedSuppliers.length;
    const moreItems = filteredSuppliers.slice(currentLength, currentLength + PAGE_SIZE);
    setDisplayedSuppliers((prev) => [...prev, ...moreItems]);
  };

  const handleSaveSupplier = async () => {
    if (!editingSupplier?.supplierName || !companyId) {
      setError('Supplier Name and Company ID are required.');
      return;
    }

    setLoading(true);
    try {
      if (isEditing && editingSupplier.supplierId) {
        await updateSupplier(editingSupplier.supplierId, {
          ...editingSupplier,
          companyId,
          active: editingSupplier.active === '1' ? '1' : '0', // Ensure active is '1' or '0'
        });
        setError('Supplier updated successfully!');
      } else {
        await createSupplier({
          ...editingSupplier,
          companyId,
          active: editingSupplier.active === '1' ? '1' : '0', // Ensure active is '1' or '0', default to '1' if not set
        } as Omit<Supplier, 'supplierId' | 'created_At' | 'updated_at'>);
        setError('Supplier created successfully!');
      }
      setShowModal(false);
      setEditingSupplier(null);
      loadSuppliers(); // Reload data after save
    } catch (err) {
      setError((err as Error).message ?? 'Error saving supplier');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSupplier = async () => {
    if (!supplierToDelete?.supplierId || !companyId) return;

    setLoading(true);
    try {
      await deleteSupplier(supplierToDelete.supplierId, companyId);
      setError('Supplier deleted successfully!');
      loadSuppliers(); // Reload data after delete
    } catch (err) {
      setError((err as Error).message ?? 'Error deleting supplier');
    } finally {
      setLoading(false);
      setShowDeleteAlert(false);
      setSupplierToDelete(null);
    }
  };

  const openCreateModal = () => {
    setIsEditing(false);
    setEditingSupplier({ active: '1' }); // Default to active
    setShowModal(true);
  };

  const openEditModal = (supplier: Supplier) => {
    setIsEditing(true);
    setEditingSupplier({ ...supplier });
    setShowModal(true);
  };

  const confirmDelete = (supplier: Supplier) => {
    setSupplierToDelete(supplier);
    setShowDeleteAlert(true);
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

      <IonContent className="ion-padding suppliers-page">
        <IonLoading isOpen={loading} message="Cargando proveedores..." />
        <IonToast
          isOpen={!!error}
          message={error}
          onDidDismiss={() => setError('')}
          duration={3000}
          color="danger"
        />

        <div className="suppliers-search-container">
          <IonSearchbar
            className="suppliers-searchbar"
            value={searchText}
            onIonChange={(e: CustomEvent<SearchbarInputEventDetail>) =>
              setSearchText(e.detail.value!)
            }
            placeholder="Buscar proveedores"
          ></IonSearchbar>
        </div>

        <IonList className="suppliers-list ion-no-padding">
          {displayedSuppliers.length === 0 && !loading && (
            <div className="empty-state">
              <IonLabel>No hay proveedores para mostrar.</IonLabel>
            </div>
          )}
          {displayedSuppliers.map((supplier) => (
            <IonCard key={supplier.supplierId} className="suppliers-card">
              <IonCardContent className="suppliers-card-content">
                <IonItem lines="none" className="suppliers-item">
                  <IonIcon icon={peopleOutline} slot="start" className="suppliers-icon" />
                  <IonLabel>
                    <h2 className="suppliers-name">{supplier.supplierName}</h2>
                    <p className="suppliers-contact">Contacto: {supplier.contactName || 'N/A'}</p>
                    <p className="suppliers-phone">Teléfono: {supplier.phone || 'N/A'}</p>
                    <p className="suppliers-email">Email: {supplier.email || 'N/A'}</p>
                    <p className="suppliers-address">Dirección: {supplier.address || 'N/A'}</p>
                    <p className="suppliers-active">Estado: {supplier.active === '1' ? 'Activo' : 'Inactivo'}</p>
                    {supplier.created_At && <p className="suppliers-created-at">Creado: {toHermosillo(supplier.created_At)}</p>}
                    {supplier.updated_at && <p className="suppliers-updated-at">Actualizado: {toHermosillo(supplier.updated_at)}</p>}
                  </IonLabel>
                  <div className="suppliers-actions">
                    <IonButton
                      fill="clear"
                      color="primary"
                      onClick={() => openEditModal(supplier)}
                      className="action-button edit-button"
                    >
                      <IonIcon icon={create} slot="icon-only" />
                    </IonButton>
                    <IonButton
                      fill="clear"
                      color="danger"
                      onClick={() => confirmDelete(supplier)}
                      className="action-button delete-button"
                    >
                      <IonIcon icon={trash} slot="icon-only" />
                    </IonButton>
                  </div>
                </IonItem>
              </IonCardContent>
            </IonCard>
          ))}

          <IonInfiniteScroll
            onIonInfinite={(ev: CustomEvent<void>) => {
              loadMoreItems();
              (ev.target as HTMLIonInfiniteScrollElement).complete();
            }}
            threshold="100px"
            disabled={displayedSuppliers.length === filteredSuppliers.length}
          >
            <IonInfiniteScrollContent loadingText="Cargando más proveedores..." />
          </IonInfiniteScroll>
        </IonList>

        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton onClick={openCreateModal}>
            <IonIcon icon={add} />
          </IonFabButton>
        </IonFab>

        <IonModal isOpen={showModal} onDidDismiss={() => setShowModal(false)} className="suppliers-modal">
          <IonCard className="ion-no-margin">
            <IonCardHeader>
              <IonCardTitle>{isEditing ? 'Editar Proveedor' : 'Agregar Proveedor'}</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <IonList>
                <IonItem>
                  <IonLabel position="stacked">Nombre del Proveedor <span className="required-asterisk">*</span></IonLabel>
                  <IonInput
                    value={editingSupplier?.supplierName}
                    onIonChange={(e: CustomEvent<InputInputEventDetail>) =>
                      setEditingSupplier({ ...editingSupplier, supplierName: e.detail.value! })
                    }
                    placeholder="Nombre del proveedor"
                    required
                  ></IonInput>
                </IonItem>
                <IonItem>
                  <IonLabel position="stacked">Nombre de Contacto</IonLabel>
                  <IonInput
                    value={editingSupplier?.contactName}
                    onIonChange={(e: CustomEvent<InputInputEventDetail>) =>
                      setEditingSupplier({ ...editingSupplier, contactName: e.detail.value! })
                    }
                    placeholder="Nombre de contacto"
                  ></IonInput>
                </IonItem>
                <IonItem>
                  <IonLabel position="stacked">Teléfono</IonLabel>
                  <IonInput
                    value={editingSupplier?.phone}
                    onIonChange={(e: CustomEvent<InputInputEventDetail>) =>
                      setEditingSupplier({ ...editingSupplier, phone: e.detail.value! })
                    }
                    placeholder="Teléfono"
                    type="tel"
                  ></IonInput>
                </IonItem>
                <IonItem>
                  <IonLabel position="stacked">Email</IonLabel>
                  <IonInput
                    value={editingSupplier?.email}
                    onIonChange={(e: CustomEvent<InputInputEventDetail>) =>
                      setEditingSupplier({ ...editingSupplier, email: e.detail.value! })
                    }
                    placeholder="Email"
                    type="email"
                  ></IonInput>
                </IonItem>
                <IonItem>
                  <IonLabel position="stacked">Dirección</IonLabel>
                  <IonInput
                    value={editingSupplier?.address}
                    onIonChange={(e: CustomEvent<InputInputEventDetail>) =>
                      setEditingSupplier({ ...editingSupplier, address: e.detail.value! })
                    }
                    placeholder="Dirección"
                  ></IonInput>
                </IonItem>
                <IonItem>
                  <IonLabel>Activo</IonLabel>
                  <IonToggle
                    checked={editingSupplier?.active === '1'}
                    onIonChange={(e: CustomEvent<ToggleChangeEventDetail>) =>
                      setEditingSupplier({ ...editingSupplier, active: e.detail.checked ? '1' : '0' })
                    }
                  ></IonToggle>
                </IonItem>
              </IonList>
              <IonButton expand="block" className="ion-margin-top" onClick={handleSaveSupplier}>
                Guardar
              </IonButton>
              <IonButton expand="block" fill="outline" className="ion-margin-top" onClick={() => setShowModal(false)}>
                Cancelar
              </IonButton>
            </IonCardContent>
          </IonCard>
        </IonModal>

        <IonAlert
          isOpen={showDeleteAlert}
          onDidDismiss={() => setShowDeleteAlert(false)}
          header={'Confirmar Eliminación'}
          message={`¿Estás seguro de que quieres eliminar el proveedor "${supplierToDelete?.supplierName}"?`}
          buttons=[
            {
              text: 'Cancelar',
              role: 'cancel',
              handler: () => {
                setSupplierToDelete(null);
              },
            },
            {
              text: 'Eliminar',
              handler: handleDeleteSupplier,
            },
          ]
        />
      </IonContent>
    </IonPage>
  );
};

export default SupplierPage;

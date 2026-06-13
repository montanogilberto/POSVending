import React, { useState, useEffect } from 'react';
import {
  IonPage, IonContent, IonList, IonItem, IonLabel, IonCard, IonCardHeader,
  IonCardTitle, IonCardContent, IonFab, IonFabButton, IonIcon, IonModal,
  IonInput, IonButton, IonAlert, IonLoading, IonToast, IonSearchbar,
  IonInfiniteScroll, IonInfiniteScrollContent, IonTextarea, IonToggle
} from '@ionic/react';
import { add, pencil, trash, peopleOutline } from 'ionicons/icons';
import Header from '../components/Header';
import AlertPopover from '../components/PopOver/AlertPopover';
import MailPopover from '../components/PopOver/MailPopover';
import { useUser } from '../components/UserContext';
import {
  getAllSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  Supplier
} from '../api/supplierApi';
import { SearchbarInputEventDetail, InputInputEventDetail, ToggleChangeEventDetail } from '@ionic/core';

const toHermosillo = (utc: string | undefined): string => {
  if (!utc) return '';
  const d = new Date(utc.includes('Z') ? utc : utc + 'Z');
  return new Date(d.getTime() - 7 * 60 * 60 * 1000).toLocaleString();
};

const ITEMS_PER_PAGE = 20;

const SupplierPage: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState<Supplier[]>([]);
  const [displayedSuppliers, setDisplayedSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchText, setSearchText] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Partial<Supplier> | null>(null);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);
  const [page, setPage] = useState(0);

  const { companyId } = useUser();

  const [popoverState, setPopoverState] = useState<{ showAlertPopover: boolean; showMailPopover: boolean; event?: Event }>({ showAlertPopover: false, showMailPopover: false });

  const presentAlertPopover = (e: React.MouseEvent) =>
    setPopoverState({ ...popoverState, showAlertPopover: true, event: e.nativeEvent });
  const dismissAlertPopover = () =>
    setPopoverState({ ...popoverState, showAlertPopover: false });
  const presentMailPopover = (e: React.MouseEvent) =>
    setPopoverState({ ...popoverState, showMailPopover: true, event: e.nativeEvent });
  const dismissMailPopover = () =>
    setPopoverState({ ...popoverState, showMailPopover: false });

  const loadSuppliers = async () => {
    if (!companyId) return;
    setLoading(true);
    setError('');
    try {
      const fetchedSuppliers = await getAllSuppliers(companyId);
      setSuppliers(fetchedSuppliers);
      setFilteredSuppliers(fetchedSuppliers);
      setDisplayedSuppliers(fetchedSuppliers.slice(0, ITEMS_PER_PAGE));
      setPage(1);
    } catch (err) {
      setError((err as Error).message ?? 'Error al cargar proveedores.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (companyId) {
      loadSuppliers();
    }
  }, [companyId]);

  useEffect(() => {
    const lowercasedSearchText = searchText.toLowerCase();
    const filtered = suppliers.filter(supplier =>
      supplier.supplierName.toLowerCase().includes(lowercasedSearchText) ||
      supplier.contactName?.toLowerCase().includes(lowercasedSearchText) ||
      supplier.email?.toLowerCase().includes(lowercasedSearchText) ||
      supplier.phone?.toLowerCase().includes(lowercasedSearchText)
    );
    setFilteredSuppliers(filtered);
    setDisplayedSuppliers(filtered.slice(0, ITEMS_PER_PAGE));
    setPage(1); // Reset page when filters change
  }, [searchText, suppliers]);

  const loadMoreItems = (ev: CustomEvent<void>) => {
    const newPage = page + 1;
    const newItems = filteredSuppliers.slice(0, newPage * ITEMS_PER_PAGE);
    setDisplayedSuppliers(newItems);
    setPage(newPage);
    (ev.target as HTMLIonInfiniteScrollElement).complete();
  };

  const handleSearch = (e: CustomEvent<SearchbarInputEventDetail>) => {
    const query = e.detail.value ?? '';
    setSearchText(query);
  };

  const handleChange = (e: CustomEvent<InputInputEventDetail | ToggleChangeEventDetail>) => {
    const { name, value, checked } = e.target as HTMLIonInputElement & HTMLIonToggleElement;
    setEditingSupplier(prev => ({
      ...prev,
      [name!]: name === 'active' ? (checked ? '1' : '0') : value
    }));
  };

  const handleSave = async () => {
    if (!companyId || !editingSupplier?.supplierName) {
      setError('El nombre del proveedor y la compañía son obligatorios.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      if (editingSupplier.supplierId) {
        // Update existing supplier
        await updateSupplier(editingSupplier.supplierId, editingSupplier as Partial<Omit<Supplier, 'created_At' | 'updated_at'>>);
      } else {
        // Create new supplier
        await createSupplier({ ...editingSupplier, companyId, active: editingSupplier.active ?? '1' } as Omit<Supplier, 'supplierId' | 'created_At' | 'updated_at'>);
      }
      setShowCreateModal(false);
      setShowEditModal(false);
      setEditingSupplier(null);
      await loadSuppliers();
    } catch (err) {
      setError((err as Error).message ?? 'Error al guardar proveedor.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!supplierToDelete?.supplierId) return;
    setLoading(true);
    setError('');
    try {
      await deleteSupplier(supplierToDelete.supplierId);
      setShowDeleteAlert(false);
      setSupplierToDelete(null);
      await loadSuppliers();
    } catch (err) {
      setError((err as Error).message ?? 'Error al eliminar proveedor.');
    } finally {
      setLoading(false);
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
      <IonLoading isOpen={loading} message={'Cargando...'} />
      <IonToast
        isOpen={!!error}
        message={error}
        onDidDismiss={() => setError('')}
        duration={5000}
        color="danger"
      />

      <IonContent fullscreen className="supplier-page">
        <div className="search-container">
          <IonSearchbar
            className="supplier-searchbar"
            value={searchText}
            onIonInput={handleSearch}
            placeholder="Buscar proveedores"
            debounce={300}
          />
        </div>

        <IonList className="supplier-list">
          {displayedSuppliers.length === 0 && !loading && !error ? (
            <IonItem>
              <IonLabel>No hay proveedores que mostrar.</IonLabel>
            </IonItem>
          ) : (
            displayedSuppliers.map(supplier => (
              <IonCard key={supplier.supplierId} className="supplier-card">
                <IonCardContent className="supplier-card-content">
                  <div className="supplier-card-row">
                    <div className="supplier-main">
                      <IonCardHeader className="supplier-header">
                        <IonCardTitle className="supplier-name">{supplier.supplierName}</IonCardTitle>
                        <IonLabel className="supplier-subtitle">ID: {supplier.supplierId}</IonLabel>
                      </IonCardHeader>
                      <div className="supplier-meta-row">
                        {supplier.contactName && (
                          <IonLabel className="supplier-meta-badge">
                            <span className="meta-label">Contacto:</span>
                            <span className="meta-value">{supplier.contactName}</span>
                          </IonLabel>
                        )}
                        {supplier.phone && (
                          <IonLabel className="supplier-meta-badge">
                            <span className="meta-label">Teléfono:</span>
                            <span className="meta-value">{supplier.phone}</span>
                          </IonLabel>
                        )}
                        {supplier.email && (
                          <IonLabel className="supplier-meta-badge">
                            <span className="meta-label">Email:</span>
                            <span className="meta-value">{supplier.email}</span>
                          </IonLabel>
                        )}
                        {supplier.address && (
                          <IonLabel className="supplier-meta-badge">
                            <span className="meta-label">Dirección:</span>
                            <span className="meta-value">{supplier.address}</span>
                          </IonLabel>
                        )}
                        <IonLabel className="supplier-meta-badge">
                          <span className="meta-label">Estado:</span>
                          <span className="meta-value">{supplier.active === '1' ? 'Activo' : 'Inactivo'}</span>
                        </IonLabel>
                        <IonLabel className="supplier-meta-badge">
                          <span className="meta-label">Creado:</span>
                          <span className="meta-value">{toHermosillo(supplier.created_At)}</span>
                        </IonLabel>
                        {supplier.updated_at && (
                          <IonLabel className="supplier-meta-badge">
                            <span className="meta-label">Actualizado:</span>
                            <span className="meta-value">{toHermosillo(supplier.updated_at)}</span>
                          </IonLabel>
                        )}
                      </div>
                    </div>
                    <div className="supplier-actions">
                      <IonButton
                        fill="outline"
                        color="primary"
                        size="small"
                        className="action-button edit-button"
                        onClick={() => {
                          setEditingSupplier(supplier);
                          setShowEditModal(true);
                        }}
                      >
                        <IonIcon icon={pencil} slot="icon-only" />
                      </IonButton>
                      <IonButton
                        fill="outline"
                        color="danger"
                        size="small"
                        className="action-button delete-button"
                        onClick={() => {
                          setSupplierToDelete(supplier);
                          setShowDeleteAlert(true);
                        }}
                      >
                        <IonIcon icon={trash} slot="icon-only" />
                      </IonButton>
                    </div>
                  </div>
                </IonCardContent>
              </IonCard>
            ))
          )}
          <IonInfiniteScroll
            onIonInfinite={loadMoreItems}
            threshold="100px"
            disabled={displayedSuppliers.length === filteredSuppliers.length}
          >
            <IonInfiniteScrollContent loadingSpinner="bubbles" loadingText="Cargando más proveedores..."></IonInfiniteScrollContent>
          </IonInfiniteScroll>
        </IonList>

        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton onClick={() => { setEditingSupplier(null); setShowCreateModal(true); }}>
            <IonIcon icon={add} />
          </IonFabButton>
        </IonFab>

        {/* Create Supplier Modal */}
        <IonModal isOpen={showCreateModal} onDidDismiss={() => setShowCreateModal(false)} className="supplier-modal">
          <IonContent>
            <IonCard>
              <IonCardHeader>
                <IonCardTitle>Crear Nuevo Proveedor</IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <IonItem>
                  <IonLabel position="floating">Nombre del Proveedor <span className="required">*</span></IonLabel>
                  <IonInput
                    name="supplierName"
                    value={editingSupplier?.supplierName}
                    onIonChange={handleChange}
                    required
                    type="text"
                  />
                </IonItem>
                <IonItem>
                  <IonLabel position="floating">Nombre de Contacto</IonLabel>
                  <IonInput
                    name="contactName"
                    value={editingSupplier?.contactName}
                    onIonChange={handleChange}
                    type="text"
                  />
                </IonItem>
                <IonItem>
                  <IonLabel position="floating">Teléfono</IonLabel>
                  <IonInput
                    name="phone"
                    value={editingSupplier?.phone}
                    onIonChange={handleChange}
                    type="tel"
                  />
                </IonItem>
                <IonItem>
                  <IonLabel position="floating">Email</IonLabel>
                  <IonInput
                    name="email"
                    value={editingSupplier?.email}
                    onIonChange={handleChange}
                    type="email"
                  />
                </IonItem>
                <IonItem>
                  <IonLabel position="floating">Dirección</IonLabel>
                  <IonTextarea
                    name="address"
                    value={editingSupplier?.address}
                    onIonChange={handleChange}
                  />
                </IonItem>
                <IonItem>
                  <IonLabel>Activo</IonLabel>
                  <IonToggle
                    name="active"
                    checked={editingSupplier?.active === '1'}
                    onIonChange={handleChange}
                    slot="end"
                  />
                </IonItem>
                <IonButton expand="block" onClick={handleSave} className="ion-margin-top">
                  Guardar Proveedor
                </IonButton>
                <IonButton expand="block" fill="clear" onClick={() => setShowCreateModal(false)}>
                  Cancelar
                </IonButton>
              </IonCardContent>
            </IonCard>
          </IonContent>
        </IonModal>

        {/* Edit Supplier Modal */}
        <IonModal isOpen={showEditModal} onDidDismiss={() => setShowEditModal(false)} className="supplier-modal">
          <IonContent>
            <IonCard>
              <IonCardHeader>
                <IonCardTitle>Editar Proveedor</IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <IonItem>
                  <IonLabel position="floating">Nombre del Proveedor <span className="required">*</span></IonLabel>
                  <IonInput
                    name="supplierName"
                    value={editingSupplier?.supplierName}
                    onIonChange={handleChange}
                    required
                    type="text"
                  />
                </IonItem>
                <IonItem>
                  <IonLabel position="floating">Nombre de Contacto</IonLabel>
                  <IonInput
                    name="contactName"
                    value={editingSupplier?.contactName}
                    onIonChange={handleChange}
                    type="text"
                  />
                </IonItem>
                <IonItem>
                  <IonLabel position="floating">Teléfono</IonLabel>
                  <IonInput
                    name="phone"
                    value={editingSupplier?.phone}
                    onIonChange={handleChange}
                    type="tel"
                  />
                </IonItem>
                <IonItem>
                  <IonLabel position="floating">Email</IonLabel>
                  <IonInput
                    name="email"
                    value={editingSupplier?.email}
                    onIonChange={handleChange}
                    type="email"
                  />
                </IonItem>
                <IonItem>
                  <IonLabel position="floating">Dirección</IonLabel>
                  <IonTextarea
                    name="address"
                    value={editingSupplier?.address}
                    onIonChange={handleChange}
                  />
                </IonItem>
                <IonItem>
                  <IonLabel>Activo</IonLabel>
                  <IonToggle
                    name="active"
                    checked={editingSupplier?.active === '1'}
                    onIonChange={handleChange}
                    slot="end"
                  />
                </IonItem>
                <IonButton expand="block" onClick={handleSave} className="ion-margin-top">
                  Actualizar Proveedor
                </IonButton>
                <IonButton expand="block" fill="clear" onClick={() => setShowEditModal(false)}>
                  Cancelar
                </IonButton>
              </IonCardContent>
            </IonCard>
          </IonContent>
        </IonModal>

        {/* Delete Confirmation Alert */}
        <IonAlert
          isOpen={showDeleteAlert}
          onDidDismiss={() => setShowDeleteAlert(false)}
          header={'Confirmar Eliminación'}
          message={`¿Estás seguro de que quieres eliminar a ${supplierToDelete?.supplierName}?`}
          buttons={[
            { text: 'Cancelar', role: 'cancel' },
            { text: 'Eliminar', handler: handleDelete, cssClass: 'danger' }
          ]}
        />
      </IonContent>
    </IonPage>
  );
};

export default SupplierPage;

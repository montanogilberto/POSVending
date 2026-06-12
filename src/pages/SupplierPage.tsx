import React, { useState, useEffect, useMemo } from 'react';
import {
  IonPage,
  IonContent,
  IonButton,
  IonIcon,
  IonList,
  IonItem,
  IonLabel,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonFab,
  IonFabButton,
  IonModal,
  IonInput,
  IonLoading,
  IonToast,
  IonAlert,
  IonSearchbar,
  IonToggle,
  IonInfiniteScrollContent,
  IonInfiniteScroll,
} from '@ionic/react';
import { add, create, trash, people, call, mail, location, personCircle, toggle as toggleIcon } from 'ionicons/icons';
import Header from '../components/Header';
import AlertPopover from '../components/PopOver/AlertPopover';
import MailPopover from '../components/PopOver/MailPopover';
import { useUser } from '../components/UserContext';
import {
  Supplier,
  getAllSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} from '../api/supplierApi';
import { SearchbarInputEventDetail, InputInputEventDetail, ToggleChangeEventDetail } from '@ionic/react';

const toHermosillo = (utc: string | undefined): string => {
  if (!utc) return '';
  const d = new Date(utc.includes('Z') ? utc : utc + 'Z');
  return new Date(d.getTime() - 7 * 60 * 60 * 1000).toLocaleString();
};

const PAGE_SIZE = 20;

const SupplierPage: React.FC = () => {
  const user = useUser();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState<Supplier[]>([]);
  const [displayedSuppliers, setDisplayedSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [newSupplierData, setNewSupplierData] = useState<Partial<Omit<Supplier, 'supplierId' | 'created_At' | 'updated_at'>>>({ active: '1' });
  const [editSupplierData, setEditSupplierData] = useState<Partial<Omit<Supplier, 'supplierId' | 'created_At' | 'updated_at'>>>({});
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const [popoverState, setPopoverState] = useState<{ 
    showAlertPopover: boolean; 
    showMailPopover: boolean; 
    event?: Event 
  }>({ showAlertPopover: false, showMailPopover: false });

  const presentAlertPopover = (e: React.MouseEvent) =>
    setPopoverState({ ...popoverState, showAlertPopover: true, event: e.nativeEvent });
  const dismissAlertPopover = () =>
    setPopoverState({ ...popoverState, showAlertPopover: false });
  const presentMailPopover = (e: React.MouseEvent) =>
    setPopoverState({ ...popoverState, showMailPopover: true, event: e.nativeEvent });
  const dismissMailPopover = () =>
    setPopoverState({ ...popoverState, showMailPopover: false });

  const fetchSuppliers = async (initialLoad: boolean = false) => {
    if (!user || !user.companyId) {
      setError('User or company ID not available.');
      return;
    }
    setLoading(true);
    try {
      const allData = await getAllSuppliers(user.companyId);
      setSuppliers(allData);
      if (initialLoad) {
        setDisplayedSuppliers(allData.slice(0, PAGE_SIZE));
        setHasMore(allData.length > PAGE_SIZE);
        setPage(1);
      }
    } catch (err) {
      setError((err as Error).message ?? 'Error al cargar proveedores');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers(true);
  }, [user]);

  useEffect(() => {
    const lowercasedSearchTerm = searchTerm.toLowerCase();
    const filtered = suppliers.filter(
      (s) =>
        s.supplierName.toLowerCase().includes(lowercasedSearchTerm) ||
        (s.contactName && s.contactName.toLowerCase().includes(lowercasedSearchTerm)) ||
        (s.email && s.email.toLowerCase().includes(lowercasedSearchTerm))
    );
    setFilteredSuppliers(filtered);
    setDisplayedSuppliers(filtered.slice(0, PAGE_SIZE));
    setHasMore(filtered.length > PAGE_SIZE);
    setPage(1);
  }, [searchTerm, suppliers]);

  const loadMoreItems = (ev: CustomEvent<void>) => {
    const newPage = page + 1;
    const startIndex = (newPage - 1) * PAGE_SIZE;
    const endIndex = startIndex + PAGE_SIZE;
    const newItems = filteredSuppliers.slice(startIndex, endIndex);
    setDisplayedSuppliers((prev) => [...prev, ...newItems]);
    setPage(newPage);
    if (displayedSuppliers.length + newItems.length >= filteredSuppliers.length) {
      setHasMore(false);
    }
    (ev.target as HTMLIonInfiniteScrollElement).complete();
  };

  const handleCreateSupplier = async () => {
    if (!user || !user.companyId || !newSupplierData.supplierName) {
      setError('Nombre del proveedor y ID de la compañía son requeridos.');
      return;
    }
    setLoading(true);
    try {
      const created = await createSupplier({
        ...newSupplierData,
        companyId: user.companyId,
        active: newSupplierData.active || '1'
      } as Omit<Supplier, 'supplierId' | 'created_At' | 'updated_at'>);
      setNewSupplierData({ active: '1' });
      setShowCreateModal(false);
      fetchSuppliers(true);
    } catch (err) {
      setError((err as Error).message ?? 'Error al crear proveedor');
    } finally {
      setLoading(false);
    }
  };

  const handleEditSupplier = async () => {
    if (!user || !user.companyId || !selectedSupplier || !editSupplierData.supplierName) {
      setError('Faltan datos para actualizar el proveedor.');
      return;
    }
    setLoading(true);
    try {
      await updateSupplier(selectedSupplier.supplierId, {
        ...editSupplierData,
        companyId: user.companyId,
        active: editSupplierData.active || '1' // Ensure active is passed, default to '1'
      } as Partial<Omit<Supplier, 'supplierId' | 'created_At' | 'updated_at'>>);
      setEditSupplierData({});
      setSelectedSupplier(null);
      setShowEditModal(false);
      fetchSuppliers(true);
    } catch (err) {
      setError((err as Error).message ?? 'Error al actualizar proveedor');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSupplier = async () => {
    if (!selectedSupplier) return;
    setLoading(true);
    try {
      await deleteSupplier(selectedSupplier.supplierId);
      fetchSuppliers(true);
      setShowDeleteAlert(false);
      setSelectedSupplier(null);
    } catch (err) {
      setError((err as Error).message ?? 'Error al eliminar proveedor');
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setEditSupplierData({ ...supplier });
    setShowEditModal(true);
  };

  const openDeleteAlert = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setShowDeleteAlert(true);
  };

  const onNewInputChange = (
    e: CustomEvent<InputInputEventDetail>,
    field: keyof Partial<Omit<Supplier, 'supplierId' | 'created_At' | 'updated_at'>>
  ) => {
    const value = e.detail.value;
    setNewSupplierData({ ...newSupplierData, [field]: value });
  };

  const onNewToggleChange = (e: CustomEvent<ToggleChangeEventDetail>) => {
    setNewSupplierData({ ...newSupplierData, active: e.detail.checked ? '1' : '0' });
  };

  const onEditInputChange = (
    e: CustomEvent<InputInputEventDetail>,
    field: keyof Partial<Omit<Supplier, 'supplierId' | 'created_At' | 'updated_at'>>
  ) => {
    const value = e.detail.value;
    setEditSupplierData({ ...editSupplierData, [field]: value });
  };

  const onEditToggleChange = (e: CustomEvent<ToggleChangeEventDetail>) => {
    setEditSupplierData({ ...editSupplierData, active: e.detail.checked ? '1' : '0' });
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

      <IonContent fullscreen className="ion-padding suppliers-page">
        <IonSearchbar
          placeholder="Buscar proveedores..."
          value={searchTerm}
          onIonInput={(e: CustomEvent<SearchbarInputEventDetail>) => setSearchTerm(e.detail.value!)}
          debounce={300}
          className="suppliers-searchbar"
        />

        <IonList className="suppliers-list">
          {displayedSuppliers.map((supplier) => (
            <IonCard key={supplier.supplierId} className="supplier-card">
              <IonCardContent className="supplier-card-content">
                <div className="supplier-card-row">
                  <div className="supplier-left">
                    <IonIcon icon={personCircle} className="supplier-avatar" />
                  </div>
                  <div className="supplier-main">
                    <IonCardHeader className="supplier-header">
                      <IonCardTitle className="supplier-name">{supplier.supplierName}</IonCardTitle>
                    </IonCardHeader>
                    <div className="supplier-meta-row">
                      {supplier.contactName && (
                        <IonItem lines="none" className="supplier-meta-badge">
                          <IonIcon icon={people} slot="start" size="small" />
                          <IonLabel>{supplier.contactName}</IonLabel>
                        </IonItem>
                      )}
                      {supplier.phone && (
                        <IonItem lines="none" className="supplier-meta-badge">
                          <IonIcon icon={call} slot="start" size="small" />
                          <IonLabel>{supplier.phone}</IonLabel>
                        </IonItem>
                      )}
                      {supplier.email && (
                        <IonItem lines="none" className="supplier-meta-badge">
                          <IonIcon icon={mail} slot="start" size="small" />
                          <IonLabel>{supplier.email}</IonLabel>
                        </IonItem>
                      )}
                      {supplier.address && (
                        <IonItem lines="none" className="supplier-meta-badge">
                          <IonIcon icon={location} slot="start" size="small" />
                          <IonLabel>{supplier.address}</IonLabel>
                        </IonItem>
                      )}
                       <IonItem lines="none" className="supplier-meta-badge">
                          <IonIcon icon={toggleIcon} slot="start" size="small" />
                          <IonLabel>{supplier.active === '1' ? 'Activo' : 'Inactivo'}</IonLabel>
                        </IonItem>
                    </div>
                    <IonItem lines="none">
                      <IonLabel className="meta-label">Creado:</IonLabel>
                      <IonLabel className="meta-value">{toHermosillo(supplier.created_At)}</IonLabel>
                    </IonItem>
                    {supplier.updated_at && (
                      <IonItem lines="none">
                        <IonLabel className="meta-label">Actualizado:</IonLabel>
                        <IonLabel className="meta-value">{toHermosillo(supplier.updated_at)}</IonLabel>
                      </IonItem>
                    )}
                  </div>
                  <div className="supplier-actions">
                    <IonButton onClick={() => openEditModal(supplier)} className="action-button edit-button">
                      <IonIcon icon={create} />
                    </IonButton>
                    <IonButton onClick={() => openDeleteAlert(supplier)} className="action-button delete-button" color="danger">
                      <IonIcon icon={trash} />
                    </IonButton>
                  </div>
                </div>
              </IonCardContent>
            </IonCard>
          ))}
          <IonInfiniteScroll onIonInfinite={loadMoreItems} threshold="100px" disabled={!hasMore}>
            <IonInfiniteScrollContent loadingText="Cargando más proveedores..."></IonInfiniteScrollContent>
          </IonInfiniteScroll>
        </IonList>

        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton onClick={() => setShowCreateModal(true)}>
            <IonIcon icon={add} />
          </IonFabButton>
        </IonFab>

        <IonModal isOpen={showCreateModal} onDidDismiss={() => setShowCreateModal(false)} className="supplier-modal">
          <IonContent className="ion-padding">
            <IonCard>
              <IonCardHeader>
                <IonCardTitle>Nuevo Proveedor</IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <IonInput
                  label="Nombre del Proveedor"
                  labelPlacement="floating"
                  value={newSupplierData.supplierName}
                  onIonChange={(e: CustomEvent<InputInputEventDetail>) => onNewInputChange(e, 'supplierName')}
                  required
                  className="supplier-input"
                />
                <IonInput
                  label="Nombre de Contacto"
                  labelPlacement="floating"
                  value={newSupplierData.contactName}
                  onIonChange={(e: CustomEvent<InputInputEventDetail>) => onNewInputChange(e, 'contactName')}
                  className="supplier-input"
                />
                <IonInput
                  label="Teléfono"
                  labelPlacement="floating"
                  value={newSupplierData.phone}
                  onIonChange={(e: CustomEvent<InputInputEventDetail>) => onNewInputChange(e, 'phone')}
                  type="tel"
                  className="supplier-input"
                />
                <IonInput
                  label="Email"
                  labelPlacement="floating"
                  value={newSupplierData.email}
                  onIonChange={(e: CustomEvent<InputInputEventDetail>) => onNewInputChange(e, 'email')}
                  type="email"
                  className="supplier-input"
                />
                <IonInput
                  label="Dirección"
                  labelPlacement="floating"
                  value={newSupplierData.address}
                  onIonChange={(e: CustomEvent<InputInputEventDetail>) => onNewInputChange(e, 'address')}
                  className="supplier-input"
                />
                <IonItem className="supplier-input-toggle">
                  <IonLabel>Activo</IonLabel>
                  <IonToggle
                    checked={newSupplierData.active === '1'}
                    onIonChange={(e: CustomEvent<ToggleChangeEventDetail>) => onNewToggleChange(e)}
                    color="primary"
                  />
                </IonItem>
                <IonButton expand="block" onClick={handleCreateSupplier} className="supplier-button">
                  Guardar Proveedor
                </IonButton>
                <IonButton expand="block" fill="outline" onClick={() => setShowCreateModal(false)} className="supplier-button-cancel">
                  Cancelar
                </IonButton>
              </IonCardContent>
            </IonCard>
          </IonContent>
        </IonModal>

        <IonModal isOpen={showEditModal} onDidDismiss={() => setShowEditModal(false)} className="supplier-modal">
          <IonContent className="ion-padding">
            <IonCard>
              <IonCardHeader>
                <IonCardTitle>Editar Proveedor</IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <IonInput
                  label="Nombre del Proveedor"
                  labelPlacement="floating"
                  value={editSupplierData.supplierName}
                  onIonChange={(e: CustomEvent<InputInputEventDetail>) => onEditInputChange(e, 'supplierName')}
                  required
                  className="supplier-input"
                />
                <IonInput
                  label="Nombre de Contacto"
                  labelPlacement="floating"
                  value={editSupplierData.contactName}
                  onIonChange={(e: CustomEvent<InputInputEventDetail>) => onEditInputChange(e, 'contactName')}
                  className="supplier-input"
                />
                <IonInput
                  label="Teléfono"
                  labelPlacement="floating"
                  value={editSupplierData.phone}
                  onIonChange={(e: CustomEvent<InputInputEventDetail>) => onEditInputChange(e, 'phone')}
                  type="tel"
                  className="supplier-input"
                />
                <IonInput
                  label="Email"
                  labelPlacement="floating"
                  value={editSupplierData.email}
                  onIonChange={(e: CustomEvent<InputInputEventDetail>) => onEditInputChange(e, 'email')}
                  type="email"
                  className="supplier-input"
                />
                <IonInput
                  label="Dirección"
                  labelPlacement="floating"
                  value={editSupplierData.address}
                  onIonChange={(e: CustomEvent<InputInputEventDetail>) => onEditInputChange(e, 'address')}
                  className="supplier-input"
                />
                <IonItem className="supplier-input-toggle">
                  <IonLabel>Activo</IonLabel>
                  <IonToggle
                    checked={editSupplierData.active === '1'}
                    onIonChange={(e: CustomEvent<ToggleChangeEventDetail>) => onEditToggleChange(e)}
                    color="primary"
                  />
                </IonItem>
                <IonButton expand="block" onClick={handleEditSupplier} className="supplier-button">
                  Actualizar Proveedor
                </IonButton>
                <IonButton expand="block" fill="outline" onClick={() => setShowEditModal(false)} className="supplier-button-cancel">
                  Cancelar
                </IonButton>
              </IonCardContent>
            </IonCard>
          </IonContent>
        </IonModal>

        <IonAlert
          isOpen={showDeleteAlert}
          onDidDismiss={() => setShowDeleteAlert(false)}
          header={'Confirmar Eliminación'}
          message={`¿Estás seguro de que quieres eliminar al proveedor ${selectedSupplier?.supplierName}?`}
          buttons={[
            { text: 'Cancelar', role: 'cancel' },
            { text: 'Eliminar', handler: handleDeleteSupplier, cssClass: 'delete-button' },
          ]}
        />

        <IonLoading isOpen={loading} message={'Cargando proveedores...'}>
        </IonLoading>

        <IonToast
          isOpen={!!error}
          message={error}
          onDidDismiss={() => setError('')}
          duration={3000}
          color="danger"
        />
      </IonContent>
    </IonPage>
  );
};

export default SupplierPage;

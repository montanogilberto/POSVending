import React, { useState, useEffect, useMemo } from 'react';
import { IonPage, IonContent, IonList, IonItem, IonLabel, IonText, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonSearchbar, IonFab, IonFabButton, IonIcon, IonModal, IonInput, IonButton, IonAlert, IonToast, IonLoading, SearchbarInputEventDetail, InputInputEventDetail, ToggleChangeEventDetail, IonToggle, IonToolbar, IonTitle, IonButtons, IonAvatar } from '@ionic/react';
import { add, create, trash, peopleOutline } from 'ionicons/icons';
import Header from '../components/Header';
import AlertPopover from '../components/PopOver/AlertPopover';
import MailPopover from '../components/PopOver/MailPopover';
import { Supplier, getAllSuppliers, createSupplier, updateSupplier, deleteSupplier } from '../api/supplierApi';
import { useAuth } from '../context/AuthContext';

const toHermosillo = (utc: string | undefined): string => {
  if (!utc) return '';
  const d = new Date(utc.includes('Z') ? utc : utc + 'Z');
  return new Date(d.getTime() - 7 * 60 * 60 * 1000).toLocaleString();
};

const SupplierPage: React.FC = () => {
  const { user } = useAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchText, setSearchText] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState<Omit<Supplier, 'supplierId' | 'created_At' | 'updated_at'>>({
    companyId: user?.companyId || 0,
    supplierName: '',
    contactName: '',
    phone: '',
    email: '',
    address: '',
    active: '1',
  });

  const [popoverState, setPopoverState] = useState<{ showAlertPopover: boolean; showMailPopover: boolean; event?: Event }>({ showAlertPopover: false, showMailPopover: false });

  const presentAlertPopover = (e: React.MouseEvent) => setPopoverState({ ...popoverState, showAlertPopover: true, event: e.nativeEvent });
  const dismissAlertPopover = () => setPopoverState({ ...popoverState, showAlertPopover: false });
  const presentMailPopover = (e: React.MouseEvent) => setPopoverState({ ...popoverState, showMailPopover: true, event: e.nativeEvent });
  const dismissMailPopover = () => setPopoverState({ ...popoverState, showMailPopover: false });

  const fetchSuppliers = async () => {
    if (!user?.companyId) {
      setError('Company ID not found. Please log in again.');
      return;
    }
    setLoading(true);
    try {
      const data = await getAllSuppliers(user.companyId);
      setSuppliers(data);
    } catch (err) {
      setError((err as Error).message ?? 'Error loading suppliers');
    }
    finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, [user?.companyId]);

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(supplier =>
      supplier.supplierName.toLowerCase().includes(searchText.toLowerCase()) ||
      supplier.contactName?.toLowerCase().includes(searchText.toLowerCase()) ||
      supplier.email?.toLowerCase().includes(searchText.toLowerCase()) ||
      supplier.phone?.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [suppliers, searchText]);

  const handleSearchbarInput = (e: CustomEvent<SearchbarInputEventDetail>) => {
    setSearchText(e.detail.value!);
  };

  const openCreateModal = () => {
    setFormData({
      companyId: user?.companyId || 0,
      supplierName: '',
      contactName: '',
      phone: '',
      email: '',
      address: '',
      active: '1',
    });
    setShowCreateModal(true);
  };

  const openEditModal = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setFormData({
      companyId: supplier.companyId,
      supplierName: supplier.supplierName,
      contactName: supplier.contactName || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      address: supplier.address || '',
      active: supplier.active,
    });
    setShowEditModal(true);
  };

  const closeModal = () => {
    setShowCreateModal(false);
    setShowEditModal(false);
    setSelectedSupplier(null);
  };

  const handleInputChange = (e: CustomEvent<InputInputEventDetail | ToggleChangeEventDetail>) => {
    const { name, value } = e.target as HTMLIonInputElement | HTMLIonToggleElement;
    setFormData({
      ...formData,
      [name]: (e.target as HTMLIonToggleElement).tagName === 'ION-TOGGLE' ? ((e.detail.checked === true) ? '1' : '0') : value,
    });
  };

  const handleCreateSupplier = async () => {
    if (!formData.supplierName || !formData.companyId) {
      setError('Supplier Name and Company ID are required.');
      return;
    }
    setLoading(true);
    try {
      await createSupplier(formData);
      fetchSuppliers();
      closeModal();
    } catch (err) {
      setError((err as Error).message ?? 'Error creating supplier');
    }
    finally {
      setLoading(false);
    }
  };

  const handleUpdateSupplier = async () => {
    if (!selectedSupplier?.supplierId || !formData.supplierName || !formData.companyId) {
      setError('Supplier ID, Name, and Company ID are required for update.');
      return;
    }
    setLoading(true);
    try {
      await updateSupplier(selectedSupplier.supplierId, formData);
      fetchSuppliers();
      closeModal();
    } catch (err) {
      setError((err as Error).message ?? 'Error updating supplier');
    }
    finally {
      setLoading(false);
    }
  };

  const handleDeleteSupplier = async () => {
    if (!selectedSupplier?.supplierId) {
      setError('No supplier selected for deletion.');
      return;
    }
    setLoading(true);
    try {
      await deleteSupplier(selectedSupplier.supplierId);
      fetchSuppliers();
      setShowDeleteAlert(false);
      setSelectedSupplier(null);
    } catch (err) {
      setError((err as Error).message ?? 'Error deleting supplier');
    }
    finally {
      setLoading(false);
    }
  };

  // Infinite scroll is implemented if has_list_view is true. The PRD specifies has_list_view: true.
  // This module does not require a complex pagination system from the server as it just fetches all.
  // However, the rule states to ALWAYS add IonInfiniteScroll if has_list_view is true. 
  // This implementation will always `complete()` immediately as `filteredSuppliers` contains all data.
  const loadMoreItems = () => {
    // In a real scenario with backend pagination, you would fetch more items here
    // For this module, all items are loaded initially and filtered client-side.
    // We just complete the infinite scroll event as per the rule.
  };

  return (
    <IonPage className="suppliers-page">
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

      <IonContent className="ion-padding">
        <IonLoading isOpen={loading} message={'Cargando proveedores...'}>
        </IonLoading>
        <IonToast
          isOpen={!!error}
          message={error}
          onDidDismiss={() => setError('')}
          duration={5000}
          color="danger"
        ></IonToast>

        <div className="search-container">
          <IonSearchbar
            placeholder="Buscar proveedores..."
            onIonInput={handleSearchbarInput}
            value={searchText}
            className="suppliers-searchbar"
          ></IonSearchbar>
        </div>

        <IonList className="suppliers-list">
          {filteredSuppliers.length === 0 && !loading ? (
            <IonItem>
              <IonLabel>No hay proveedores para mostrar.</IonLabel>
            </IonItem>
          ) : (
            filteredSuppliers.map(supplier => (
              <IonCard key={supplier.supplierId} className="supplier-card">
                <IonCardContent className="supplier-card-content">
                  <div className="supplier-main">
                    <div className="supplier-header">
                      <IonCardTitle className="supplier-name">{supplier.supplierName}</IonCardTitle>
                    </div>
                    <div className="supplier-meta-row">
                      {supplier.contactName && (
                        <IonText className="supplier-meta-badge">Contacto: {supplier.contactName}</IonText>
                      )}
                      {supplier.phone && (
                        <IonText className="supplier-meta-badge">Teléfono: {supplier.phone}</IonText>
                      )}
                      {supplier.email && (
                        <IonText className="supplier-meta-badge">Email: {supplier.email}</IonText>
                      )}
                      {supplier.address && (
                        <IonText className="supplier-meta-badge">Dirección: {supplier.address}</IonText>
                      )}
                      <IonText className="supplier-meta-badge">Activo: {supplier.active === '1' ? 'Sí' : 'No'}</IonText>
                      <IonText className="supplier-meta-badge">Creado: {toHermosillo(supplier.created_At)}</IonText>
                      {supplier.updated_at && (
                        <IonText className="supplier-meta-badge">Actualizado: {toHermosillo(supplier.updated_at)}</IonText>
                      )}
                    </div>
                  </div>
                  <div className="supplier-actions">
                    <IonButton onClick={() => openEditModal(supplier)} className="action-button edit-button" fill="outline">
                      <IonIcon icon={create} slot="icon-only" />
                    </IonButton>
                    <IonButton onClick={() => {
                      setSelectedSupplier(supplier);
                      setShowDeleteAlert(true);
                    }} className="action-button delete-button" color="danger" fill="outline">
                      <IonIcon icon={trash} slot="icon-only" />
                    </IonButton>
                  </div>
                </IonCardContent>
              </IonCard>
            ))
          )}
          <IonInfiniteScroll onIonInfinite={(ev: CustomEvent<void>) => {
            loadMoreItems();
            (ev.target as HTMLIonInfiniteScrollElement).complete();
          }}>
            <IonInfiniteScrollContent loadingText="Cargando más proveedores..."></IonInfiniteScrollContent>
          </IonInfiniteScroll>
        </IonList>

        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton onClick={openCreateModal} className="add-supplier-fab">
            <IonIcon icon={add} />
          </IonFabButton>
        </IonFab>

        {/* Create Supplier Modal */}
        <IonModal isOpen={showCreateModal} onDidDismiss={closeModal} className="supplier-modal">
          <IonHeader>
            <IonToolbar>
              <IonTitle>Crear Proveedor</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={closeModal}>Cerrar</IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            <IonInput
              label="Nombre del Proveedor"
              labelPlacement="floating"
              name="supplierName"
              value={formData.supplierName}
              onIonChange={handleInputChange}
              required
              className="supplier-input"
            ></IonInput>
            <IonInput
              label="Nombre de Contacto"
              labelPlacement="floating"
              name="contactName"
              value={formData.contactName}
              onIonChange={handleInputChange}
              className="supplier-input"
            ></IonInput>
            <IonInput
              label="Teléfono"
              labelPlacement="floating"
              name="phone"
              value={formData.phone}
              onIonChange={handleInputChange}
              type="tel"
              className="supplier-input"
            ></IonInput>
            <IonInput
              label="Email"
              labelPlacement="floating"
              name="email"
              value={formData.email}
              onIonChange={handleInputChange}
              type="email"
              className="supplier-input"
            ></IonInput>
            <IonInput
              label="Dirección"
              labelPlacement="floating"
              name="address"
              value={formData.address}
              onIonChange={handleInputChange}
              className="supplier-input"
            ></IonInput>
            <IonItem className="supplier-toggle-item">
              <IonLabel>Activo</IonLabel>
              <IonToggle
                name="active"
                checked={formData.active === '1'}
                onIonChange={handleInputChange}
                color="primary"
              />
            </IonItem>
            <IonButton expand="block" onClick={handleCreateSupplier} className="supplier-action-button">
              Crear Proveedor
            </IonButton>
          </IonContent>
        </IonModal>

        {/* Edit Supplier Modal */}
        <IonModal isOpen={showEditModal} onDidDismiss={closeModal} className="supplier-modal">
          <IonHeader>
            <IonToolbar>
              <IonTitle>Editar Proveedor</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={closeModal}>Cerrar</IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            <IonInput
              label="Nombre del Proveedor"
              labelPlacement="floating"
              name="supplierName"
              value={formData.supplierName}
              onIonChange={handleInputChange}
              required
              className="supplier-input"
            ></IonInput>
            <IonInput
              label="Nombre de Contacto"
              labelPlacement="floating"
              name="contactName"
              value={formData.contactName}
              onIonChange={handleInputChange}
              className="supplier-input"
            ></IonInput>
            <IonInput
              label="Teléfono"
              labelPlacement="floating"
              name="phone"
              value={formData.phone}
              onIonChange={handleInputChange}
              type="tel"
              className="supplier-input"
            ></IonInput>
            <IonInput
              label="Email"
              labelPlacement="floating"
              name="email"
              value={formData.email}
              onIonChange={handleInputChange}
              type="email"
              className="supplier-input"
            ></IonInput>
            <IonInput
              label="Dirección"
              labelPlacement="floating"
              name="address"
              value={formData.address}
              onIonChange={handleInputChange}
              className="supplier-input"
            ></IonInput>
            <IonItem className="supplier-toggle-item">
              <IonLabel>Activo</IonLabel>
              <IonToggle
                name="active"
                checked={formData.active === '1'}
                onIonChange={handleInputChange}
                color="primary"
              />
            </IonItem>
            <IonButton expand="block" onClick={handleUpdateSupplier} className="supplier-action-button">
              Actualizar Proveedor
            </IonButton>
          </IonContent>
        </IonModal>

        {/* Delete Supplier Alert */}
        <IonAlert
          isOpen={showDeleteAlert}
          onDidDismiss={() => setShowDeleteAlert(false)}
          header={'Confirmar Eliminación'}
          message={`¿Estás seguro de que quieres eliminar al proveedor "${selectedSupplier?.supplierName}"?`}
          buttons={[
            { text: 'Cancelar', role: 'cancel', handler: () => setSelectedSupplier(null) },
            { text: 'Eliminar', handler: handleDeleteSupplier, cssClass: 'delete-button-alert' },
          ]}
          className="supplier-delete-alert"
        />
      </IonContent>
    </IonPage>
  );
};

export default SupplierPage;
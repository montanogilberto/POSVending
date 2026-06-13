import React, { useState, useEffect, useMemo } from 'react';
import {
  IonPage,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonFab,
  IonFabButton,
  IonIcon,
  IonSearchbar,
  IonLoading,
  IonToast,
  IonModal,
  IonInput,
  IonButton,
  IonAlert,
  IonButtons,
  IonNote,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  SearchbarInputEventDetail,
  InputInputEventDetail,
  CheckboxChangeEventDetail,
} from '@ionic/react';
import { addOutline, createOutline, trashOutline, peopleOutline } from 'ionicons/icons';
import Header from '../components/Header';
import AlertPopover from '../components/PopOver/AlertPopover';
import MailPopover from '../components/PopOver/MailPopover';
import {
  Supplier,
  getAllSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} from '../api/supplierApi';

// No date fields, so toHermosillo is not directly used but included as per rule.
const toHermosillo = (utc: string | undefined): string => {
  if (!utc) return '';
  const d = new Date(utc.includes('Z') ? utc : utc + 'Z');
  return new Date(d.getTime() - 7 * 60 * 60 * 1000).toLocaleString();
};

const SupplierPage: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchText, setSearchText] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState<Partial<Supplier>>({});
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const itemsPerPage = 20; // Example: items per page for infinite scroll

  const [popoverState, setPopoverState] = useState<{
    showAlertPopover: boolean;
    showMailPopover: boolean;
    event?: Event;
  }>({
    showAlertPopover: false,
    showMailPopover: false,
    event: undefined
  });

  const presentAlertPopover = (e: React.MouseEvent) =>
    setPopoverState({ ...popoverState, showAlertPopover: true, event: e.nativeEvent });
  const dismissAlertPopover = () =>
    setPopoverState({ ...popoverState, showAlertPopover: false });
  const presentMailPopover = (e: React.MouseEvent) =>
    setPopoverState({ ...popoverState, showMailPopover: true, event: e.nativeEvent });
  const dismissMailPopover = () =>
    setPopoverState({ ...popoverState, showMailPopover: false });

  const loggedInCompanyId = 1; // This should come from auth context in a real app

  const fetchSuppliers = async (reset = false) => {
    setLoading(true);
    try {
      // In a real app, this would be paginated on the backend.
      // For now, we fetch all and paginate on frontend for infinite scroll example.
      const allSuppliers = await getAllSuppliers(loggedInCompanyId);
      if (reset) {
        setSuppliers(allSuppliers);
        setPage(1);
        setHasMore(allSuppliers.length > itemsPerPage);
      } else {
        setSuppliers((prev) => [...prev, ...allSuppliers.slice(page * itemsPerPage, (page + 1) * itemsPerPage)]);
        setPage((prev) => prev + 1);
        setHasMore(allSuppliers.length > (page + 1) * itemsPerPage);
      }
    } catch (err) {
      setError((err as Error).message ?? 'Error fetching suppliers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers(true);
  }, []);

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((supplier) =>
      supplier.supplierName.toLowerCase().includes(searchText.toLowerCase()) ||
      (supplier.contactName && supplier.contactName.toLowerCase().includes(searchText.toLowerCase())) ||
      (supplier.email && supplier.email.toLowerCase().includes(searchText.toLowerCase()))
    );
  }, [suppliers, searchText]);

  const loadMoreItems = () => {
    fetchSuppliers();
  };

  const handleCreateClick = () => {
    setFormData({ companyId: loggedInCompanyId, active: '1' }); // Set default active status
    setShowCreateModal(true);
  };

  const handleEditClick = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setFormData(supplier);
    setShowEditModal(true);
  };

  const handleDeleteClick = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setShowDeleteAlert(true);
  };

  const handleFormChange = (e: CustomEvent<InputInputEventDetail>) => {
    const { name, value } = e.target as HTMLIonInputElement;
    setFormData({ ...formData, [name!]: value });
  };

  const handleActiveToggle = (e: CustomEvent<CheckboxChangeEventDetail>) => {
    setFormData({ ...formData, active: e.detail.checked ? '1' : '0' });
  };

  const handleSaveCreate = async () => {
    if (!formData.supplierName) {
      setError('Supplier Name is required.');
      return;
    }
    setLoading(true);
    try {
      await createSupplier(formData as Omit<Supplier, 'supplierId'>);
      setShowCreateModal(false);
      await fetchSuppliers(true); // Re-fetch all to ensure list is updated
    } catch (err) {
      setError((err as Error).message ?? 'Failed to create supplier.');
    }
    finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedSupplier || !formData.supplierName) {
      setError('Supplier Name is required.');
      return;
    }
    setLoading(true);
    try {
      await updateSupplier(selectedSupplier.supplierId, formData);
      setShowEditModal(false);
      await fetchSuppliers(true); // Re-fetch all to ensure list is updated
    } catch (err) {
      setError((err as Error).message ?? 'Failed to update supplier.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedSupplier) return;
    setLoading(true);
    try {
      await deleteSupplier(selectedSupplier.supplierId, loggedInCompanyId);
      setShowDeleteAlert(false);
      await fetchSuppliers(true); // Re-fetch all to ensure list is updated
    } catch (err) {
      setError((err as Error).message ?? 'Failed to delete supplier.');
    } finally {
      setLoading(false);
      setSelectedSupplier(null);
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

      <IonContent fullscreen className="ion-padding suppliers-page">
        <IonLoading isOpen={loading} message={'Cargando proveedores...'} />
        <IonToast
          isOpen={!!error}
          message={error}
          duration={3000}
          onDidDismiss={() => setError('')}
          color="danger"
        />

        <div className="suppliers-search-container">
          <IonSearchbar
            value={searchText}
            onIonInput={(e: CustomEvent<SearchbarInputEventDetail>) =>
              setSearchText(e.detail.value!)}
            placeholder="Buscar proveedores..."
            className="suppliers-searchbar"
          ></IonSearchbar>
        </div>

        <IonList className="suppliers-list">
          {filteredSuppliers.length === 0 && !loading && (
            <IonItem>
              <IonLabel>No hay proveedores para mostrar.</IonLabel>
            </IonItem>
          )}

          {filteredSuppliers.map((supplier) => (
            <IonCard key={supplier.supplierId} className="supplier-card">
              <IonCardHeader>
                <IonCardTitle className="supplier-name">{supplier.supplierName}</IonCardTitle>
                <IonNote>{supplier.active === '1' ? 'Activo' : 'Inactivo'}</IonNote>
              </IonCardHeader>
              <IonCardContent className="supplier-card-content">
                <div className="supplier-meta-row">
                  <div className="supplier-meta-badge">
                    <span className="meta-label">Contacto:</span>
                    <span className="meta-value">{supplier.contactName || 'N/A'}</span>
                  </div>
                  <div className="supplier-meta-badge">
                    <span className="meta-label">Teléfono:</span>
                    <span className="meta-value">{supplier.phone || 'N/A'}</span>
                  </div>
                </div>
                <div className="supplier-meta-row">
                  <div className="supplier-meta-badge">
                    <span className="meta-label">Email:</span>
                    <span className="meta-value">{supplier.email || 'N/A'}</span>
                  </div>
                  <div className="supplier-meta-badge">
                    <span className="meta-label">Dirección:</span>
                    <span className="meta-value">{supplier.address || 'N/A'}</span>
                  </div>
                </div>
                <div className="supplier-actions">
                  <IonButton
                    fill="outline"
                    color="primary"
                    size="small"
                    className="action-button edit-button"
                    onClick={() => handleEditClick(supplier)}
                  >
                    <IonIcon slot="start" icon={createOutline} />
                    Editar
                  </IonButton>
                  <IonButton
                    fill="outline"
                    color="danger"
                    size="small"
                    className="action-button delete-button"
                    onClick={() => handleDeleteClick(supplier)}
                  >
                    <IonIcon slot="start" icon={trashOutline} />
                    Eliminar
                  </IonButton>
                </div>
              </IonCardContent>
            </IonCard>
          ))}

          <IonInfiniteScroll
            onIonInfinite={(ev: CustomEvent<void>) => {
              if (hasMore && !loading) {
                loadMoreItems();
              }
              (ev.target as HTMLIonInfiniteScrollElement).complete();
            }}
            threshold="100px"
            disabled={!hasMore || loading}
          >
            <IonInfiniteScrollContent
              loadingSpinner="bubbles"
              loadingText="Cargando más proveedores..."
            ></IonInfiniteScrollContent>
          </IonInfiniteScroll>
        </IonList>

        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton onClick={handleCreateClick}>
            <IonIcon icon={addOutline} />
          </IonFabButton>
        </IonFab>

        {/* Create Supplier Modal */}
        <IonModal isOpen={showCreateModal} onDidDismiss={() => setShowCreateModal(false)} className="supplier-modal">
          <IonHeader>
            <IonToolbar>
              <IonButtons slot="start">
                <IonButton onClick={() => setShowCreateModal(false)}>Cancelar</IonButton>
              </IonButtons>
              <IonTitle>Nuevo Proveedor</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={handleSaveCreate} strong={true}>
                  Guardar
                </IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            <IonInput
              label="Nombre del Proveedor"
              labelPlacement="floating"
              fill="outline"
              name="supplierName"
              value={formData.supplierName}
              onIonInput={handleFormChange}
              required
            ></IonInput>
            <IonInput
              label="Nombre de Contacto"
              labelPlacement="floating"
              fill="outline"
              name="contactName"
              value={formData.contactName}
              onIonInput={handleFormChange}
            ></IonInput>
            <IonInput
              label="Teléfono"
              labelPlacement="floating"
              fill="outline"
              name="phone"
              value={formData.phone}
              onIonInput={handleFormChange}
              type="tel"
            ></IonInput>
            <IonInput
              label="Email"
              labelPlacement="floating"
              fill="outline"
              name="email"
              value={formData.email}
              onIonInput={handleFormChange}
              type="email"
            ></IonInput>
            <IonInput
              label="Dirección"
              labelPlacement="floating"
              fill="outline"
              name="address"
              value={formData.address}
              onIonInput={handleFormChange}
            ></IonInput>
             <IonItem>
                <IonLabel>Activo</IonLabel>
                <IonInput
                  type="checkbox"
                  name="active"
                  checked={formData.active === '1'}
                  onIonChange={handleActiveToggle}
                ></IonInput>
            </IonItem>
          </IonContent>
        </IonModal>

        {/* Edit Supplier Modal */}
        <IonModal isOpen={showEditModal} onDidDismiss={() => setShowEditModal(false)} className="supplier-modal">
          <IonHeader>
            <IonToolbar>
              <IonButtons slot="start">
                <IonButton onClick={() => setShowEditModal(false)}>Cancelar</IonButton>
              </IonButtons>
              <IonTitle>Editar Proveedor</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={handleSaveEdit} strong={true}>
                  Guardar
                </IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            <IonInput
              label="Nombre del Proveedor"
              labelPlacement="floating"
              fill="outline"
              name="supplierName"
              value={formData.supplierName}
              onIonInput={handleFormChange}
              required
            ></IonInput>
            <IonInput
              label="Nombre de Contacto"
              labelPlacement="floating"
              fill="outline"
              name="contactName"
              value={formData.contactName}
              onIonInput={handleFormChange}
            ></IonInput>
            <IonInput
              label="Teléfono"
              labelPlacement="floating"
              fill="outline"
              name="phone"
              value={formData.phone}
              onIonInput={handleFormChange}
              type="tel"
            ></IonInput>
            <IonInput
              label="Email"
              labelPlacement="floating"
              fill="outline"
              name="email"
              value={formData.email}
              onIonInput={handleFormChange}
              type="email"
            ></IonInput>
            <IonInput
              label="Dirección"
              labelPlacement="floating"
              fill="outline"
              name="address"
              value={formData.address}
              onIonInput={handleFormChange}
            ></IonInput>
            <IonItem>
                <IonLabel>Activo</IonLabel>
                <IonInput
                  type="checkbox"
                  name="active"
                  checked={formData.active === '1'}
                  onIonChange={handleActiveToggle}
                ></IonInput>
            </IonItem>
          </IonContent>
        </IonModal>

        {/* Delete Supplier Alert */}
        <IonAlert
          isOpen={showDeleteAlert}
          onDidDismiss={() => setShowDeleteAlert(false)}
          header={'Confirmar Eliminación'}
          message={`¿Estás seguro de que quieres eliminar el proveedor "${selectedSupplier?.supplierName}"?`}
          buttons={[
            {
              text: 'Cancelar',
              role: 'cancel',
              handler: () => {
                setSelectedSupplier(null);
              },
            },
            {
              text: 'Eliminar',
              handler: handleConfirmDelete,
            },
          ]}
        />
      </IonContent>
    </IonPage>
  );
};

export default SupplierPage;

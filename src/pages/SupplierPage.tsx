import React, { useState, useEffect, useContext } from 'react';
import { 
  IonPage,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonInput,
  IonButton,
  IonIcon,
  IonModal,
  IonLoading,
  IonToast,
  IonAlert,
  IonSearchbar,
  IonButtons,
  IonTitle,
  IonToolbar,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonToggle
} from '@ionic/react';
import { addOutline, pencilOutline, trashOutline, closeOutline, saveOutline } from 'ionicons/icons';
import Header from '../components/Header';
import AlertPopover from '../components/PopOver/AlertPopover';
import MailPopover from '../components/PopOver/MailPopover';
import UserContext from '../components/UserContext';
import {
  Supplier,
  getAllSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier
} from '../api/supplierApi';
import { SearchbarInputEventDetail } from '@ionic/core';
import { InputChangeEventDetail } from '@ionic/core/dist/types/components/ion-input/ion-input';
import { ToggleChangeEventDetail } from '@ionic/core/dist/types/components/ion-toggle/ion-toggle';

const toHermosillo = (utc: string | undefined): string => {
  if (!utc) return '';
  const d = new Date(utc.includes('Z') ? utc : utc + 'Z');
  return new Date(d.getTime() - 7 * 60 * 60 * 1000).toLocaleString();
};

const SupplierPage: React.FC = () => {
  const { user } = useContext(UserContext);
  const companyId = user?.companyId;

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [displayedSuppliers, setDisplayedSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [searchText, setSearchText] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState<boolean>(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [supplierToDelete, setSupplierToDelete] = useState<number | null>(null);
  const [editMode, setEditMode] = useState<boolean>(false);
  const [newSupplierName, setNewSupplierName] = useState<string>('');
  const [newContactName, setNewContactName] = useState<string>('');
  const [newPhone, setNewPhone] = useState<string>('');
  const [newEmail, setNewEmail] = useState<string>('');
  const [newAddress, setNewAddress] = useState<string>('');
  const [newActive, setNewActive] = useState<boolean>(true);

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

  const itemsPerPage = 20;
  const [page, setPage] = useState<number>(1);

  const fetchSuppliers = async () => {
    if (!companyId) {
      setError('Company ID not found. Please log in again.');
      return;
    }
    setLoading(true);
    try {
      const fetchedSuppliers = await getAllSuppliers(companyId);
      const filtered = fetchedSuppliers.filter(supplier =>
        supplier.supplierName.toLowerCase().includes(searchText.toLowerCase())
      );
      setSuppliers(filtered);
      setDisplayedSuppliers(filtered.slice(0, itemsPerPage));
      setPage(1);
    } catch (err) {
      setError((err as Error).message ?? 'Error loading suppliers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, [companyId, searchText]);

  const loadMoreItems = () => {
    const nextPage = page + 1;
    const newItems = suppliers.slice(page * itemsPerPage, nextPage * itemsPerPage);
    setDisplayedSuppliers(prev => [...prev, ...newItems]);
    setPage(nextPage);
  };

  const handleSearch = (e: CustomEvent<SearchbarInputEventDetail>) => {
    setSearchText(e.detail.value!);
  };

  const openCreateModal = () => {
    setEditMode(false);
    setSelectedSupplier(null);
    setNewSupplierName('');
    setNewContactName('');
    setNewPhone('');
    setNewEmail('');
    setNewAddress('');
    setNewActive(true);
    setIsModalOpen(true);
  };

  const openEditModal = (supplier: Supplier) => {
    setEditMode(true);
    setSelectedSupplier(supplier);
    setNewSupplierName(supplier.supplierName);
    setNewContactName(supplier.contactName || '');
    setNewPhone(supplier.phone || '');
    setNewEmail(supplier.email || '');
    setNewAddress(supplier.address || '');
    setNewActive(supplier.active === '1');
    setIsModalOpen(true);
  };

  const handleModalDismiss = () => {
    setIsModalOpen(false);
    setSelectedSupplier(null);
    setNewSupplierName('');
    setNewContactName('');
    setNewPhone('');
    setNewEmail('');
    setNewAddress('');
    setNewActive(true);
  };

  const handleSaveSupplier = async () => {
    if (!companyId) {
      setError('Company ID is missing.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const supplierData = {
        companyId,
        supplierName: newSupplierName,
        contactName: newContactName,
        phone: newPhone,
        email: newEmail,
        address: newAddress,
        active: newActive ? '1' : '0',
      };

      if (editMode && selectedSupplier) {
        await updateSupplier(selectedSupplier.supplierId, supplierData);
      } else {
        await createSupplier(supplierData);
      }
      handleModalDismiss();
      await fetchSuppliers();
    } catch (err) {
      setError((err as Error).message ?? 'Error saving supplier');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (supplierId: number) => {
    setSupplierToDelete(supplierId);
    setIsDeleteAlertOpen(true);
  };

  const confirmDelete = async () => {
    if (supplierToDelete === null) return;
    setLoading(true);
    setError('');
    try {
      await deleteSupplier(supplierToDelete);
      await fetchSuppliers();
    } catch (err) {
      setError((err as Error).message ?? 'Error deleting supplier');
    } finally {
      setLoading(false);
      setSupplierToDelete(null);
      setIsDeleteAlertOpen(false);
    }
  };

  return (
    <IonPage className="supplier-page">
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

      <IonContent fullscreen className="ion-padding">
        <IonLoading isOpen={loading} message={'Cargando proveedores...'} />
        <IonToast
          isOpen={!!error}
          message={error}
          duration={5000}
          onDidDismiss={() => setError('')}
          color="danger"
        />

        <IonSearchbar
          value={searchText}
          onIonInput={handleSearch}
          placeholder="Buscar por nombre de proveedor"
          debounce={300}
        />

        <IonButton expand="block" onClick={openCreateModal} className="ion-margin-bottom">
          <IonIcon slot="start" icon={addOutline} />
          Agregar Nuevo Proveedor
        </IonButton>

        <IonList className="supplier-list">
          {displayedSuppliers.map((supplier) => (
            <IonItem key={supplier.supplierId} className="supplier-item">
              <IonLabel>
                <h2>{supplier.supplierName}</h2>
                {supplier.contactName && <p>Contacto: {supplier.contactName}</p>}
                {supplier.phone && <p>Teléfono: {supplier.phone}</p>}
                {supplier.email && <p>Email: {supplier.email}</p>}
                {supplier.address && <p>Dirección: {supplier.address}</p>}
                <p>Estado: {supplier.active === '1' ? 'Activo' : 'Inactivo'}</p>
                <p>Creado: {toHermosillo(supplier.created_At)}</p>
                {supplier.updated_at && <p>Actualizado: {toHermosillo(supplier.updated_at)}</p>}
              </IonLabel>
              <IonButton fill="clear" onClick={() => openEditModal(supplier)}>
                <IonIcon slot="icon-only" icon={pencilOutline} />
              </IonButton>
              <IonButton fill="clear" color="danger" onClick={() => handleDeleteClick(supplier.supplierId)}>
                <IonIcon slot="icon-only" icon={trashOutline} />
              </IonButton>
            </IonItem>
          ))}

          <IonInfiniteScroll
            onIonInfinite={(ev: CustomEvent<void>) => {
              loadMoreItems();
              (ev.target as HTMLIonInfiniteScrollElement).complete();
            }}
            threshold="100px"
            disabled={displayedSuppliers.length === suppliers.length}
          >
            <IonInfiniteScrollContent loadingText="Cargando más proveedores..."></IonInfiniteScrollContent>
          </IonInfiniteScroll>
        </IonList>

        <IonModal isOpen={isModalOpen} onDidDismiss={handleModalDismiss}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>{editMode ? 'Editar Proveedor' : 'Agregar Proveedor'}</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={handleModalDismiss}>
                  <IonIcon icon={closeOutline} />
                </IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            <IonList>
              <IonItem>
                <IonLabel position="floating">Nombre del Proveedor</IonLabel>
                <IonInput
                  value={newSupplierName}
                  onIonChange={(e: CustomEvent<InputChangeEventDetail>) => setNewSupplierName(e.detail.value!)}
                  required
                />
              </IonItem>
              <IonItem>
                <IonLabel position="floating">Nombre de Contacto</IonLabel>
                <IonInput
                  value={newContactName}
                  onIonChange={(e: CustomEvent<InputChangeEventDetail>) => setNewContactName(e.detail.value!)}
                />
              </IonItem>
              <IonItem>
                <IonLabel position="floating">Teléfono</IonLabel>
                <IonInput
                  value={newPhone}
                  onIonChange={(e: CustomEvent<InputChangeEventDetail>) => setNewPhone(e.detail.value!)}
                  type="tel"
                />
              </IonItem>
              <IonItem>
                <IonLabel position="floating">Email</IonLabel>
                <IonInput
                  value={newEmail}
                  onIonChange={(e: CustomEvent<InputChangeEventDetail>) => setNewEmail(e.detail.value!)}
                  type="email"
                />
              </IonItem>
              <IonItem>
                <IonLabel position="floating">Dirección</IonLabel>
                <IonInput
                  value={newAddress}
                  onIonChange={(e: CustomEvent<InputChangeEventDetail>) => setNewAddress(e.detail.value!)}
                />
              </IonItem>
              <IonItem>
                <IonLabel>Activo</IonLabel>
                <IonToggle
                  checked={newActive}
                  onIonChange={(e: CustomEvent<ToggleChangeEventDetail>) => setNewActive(e.detail.checked)}
                  slot="end"
                />
              </IonItem>
            </IonList>
            <IonButton expand="block" onClick={handleSaveSupplier} className="ion-margin-top">
              <IonIcon slot="start" icon={saveOutline} />
              Guardar Proveedor
            </IonButton>
          </IonContent>
        </IonModal>

        <IonAlert
          isOpen={isDeleteAlertOpen}
          onDidDismiss={() => setIsDeleteAlertOpen(false)}
          header={'Confirmar Eliminación'}
          message={'¿Estás seguro de que quieres eliminar este proveedor?'}
          buttons={[
            { text: 'Cancelar', role: 'cancel' },
            { text: 'Eliminar', handler: confirmDelete, cssClass: 'danger' },
          ]}
        />
      </IonContent>
    </IonPage>
  );
};

export default SupplierPage;

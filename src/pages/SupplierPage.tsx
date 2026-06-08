import React, { useState, useEffect, useRef } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonFab,
  IonFabButton,
  IonIcon,
  IonModal,
  IonInput,
  IonButton,
  IonLoading,
  IonToast,
  IonButtons,
  IonBackButton,
  IonAlert,
  IonToggle,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonCard, IonCardHeader, IonCardSubtitle, IonCardTitle, IonCardContent
} from '@ionic/react';
import { add, pencil, trash } from 'ionicons/icons';
import { Supplier, getAllSuppliers, getSupplierById, createSupplier, updateSupplier, deleteSupplier } from '../api/supplierApi';
import './SupplierPage.css';

const UTC_OFFSET_MS = 7 * 60 * 60 * 1000;

const convertUtcToHermosillo = (utcDateString: string | undefined): string => {
  if (!utcDateString) return '';
  try {
    const utcDate = new Date(utcDateString + (utcDateString.includes('Z') ? '' : 'Z'));
    const hermosilloDate = new Date(utcDate.getTime() - UTC_OFFSET_MS);
    return hermosilloDate.toLocaleString(); // Or format as needed
  } catch (error) {
    console.error('Error converting date:', error);
    return utcDateString; // Return original if conversion fails
  }
};

const SupplierPage: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentSupplier, setCurrentSupplier] = useState<Partial<Supplier> | null>(null);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const limit = 20; // Number of items per page for infinite scroll

  // Dummy companyId for now, ideally this would come from user context
  const companyId = 1; 

  const fetchSuppliers = async (pageNumber: number, initialLoad = false) => {
    setLoading(true);
    try {
      const allSuppliers = await getAllSuppliers(companyId);
      // Simulate pagination for infinite scroll
      const startIndex = pageNumber * limit;
      const endIndex = startIndex + limit;
      const newSuppliers = allSuppliers.slice(startIndex, endIndex);

      if (initialLoad) {
        setSuppliers(newSuppliers);
      } else {
        setSuppliers((prev) => [...prev, ...newSuppliers]);
      }
      setHasMore(newSuppliers.length === limit && suppliers.length + newSuppliers.length < allSuppliers.length);
      setPage(pageNumber + 1);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers(0, true);
  }, []);

  const handleSave = async () => {
    if (!currentSupplier) return;
    setLoading(true);
    try {
      if (isEditing && currentSupplier.supplierId) {
        await updateSupplier(currentSupplier.supplierId, {
          companyId: currentSupplier.companyId,
          supplierName: currentSupplier.supplierName,
          contactName: currentSupplier.contactName,
          phone: currentSupplier.phone,
          email: currentSupplier.email,
          address: currentSupplier.address,
          active: currentSupplier.active,
        });
      } else {
        await createSupplier({
          companyId: companyId, // Assign companyId on creation
          supplierName: currentSupplier.supplierName || '',
          contactName: currentSupplier.contactName,
          phone: currentSupplier.phone,
          email: currentSupplier.email,
          address: currentSupplier.address,
          active: currentSupplier.active || '1',
        });
      }
      setShowModal(false);
      setCurrentSupplier(null);
      setIsEditing(false);
      await fetchSuppliers(0, true); // Re-fetch all to refresh list
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!supplierToDelete || !supplierToDelete.supplierId) return;
    setLoading(true);
    try {
      await deleteSupplier(supplierToDelete.supplierId, companyId);
      await fetchSuppliers(0, true); // Re-fetch all to refresh list
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setShowDeleteAlert(false);
      setSupplierToDelete(null);
    }
  };

  const openCreateModal = () => {
    setIsEditing(false);
    setCurrentSupplier({ companyId: companyId, active: '1' }); // Set default active to '1'
    setShowModal(true);
  };

  const openEditModal = async (supplierId: number) => {
    setLoading(true);
    try {
      const supplier = await getSupplierById(supplierId, companyId);
      setCurrentSupplier(supplier);
      setIsEditing(true);
      setShowModal(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = (supplier: Supplier) => {
    setSupplierToDelete(supplier);
    setShowDeleteAlert(true);
  };

  const loadMoreData = async (ev: any) => {
    if (hasMore) {
      await fetchSuppliers(page);
    }
    ev.detail.complete();
  };

  return (
    <IonPage className="supplier-page">
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/home" />
          </IonButtons>
          <IonTitle>Suppliers</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="ion-padding">
        <IonLoading isOpen={loading} message={'Loading...'} />
        <IonToast
          isOpen={!!error}
          message={error}
          duration={3000}
          onDidDismiss={() => setError('')}
          color="danger"
        />

        <IonList className="supplier-list">
          {suppliers.map((supplier) => (
            <IonCard key={supplier.supplierId} className="supplier-card">
              <IonCardHeader>
                <IonCardSubtitle>Supplier ID: {supplier.supplierId}</IonCardSubtitle>
                <IonCardTitle>{supplier.supplierName}</IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <p><strong>Contact:</strong> {supplier.contactName}</p>
                <p><strong>Phone:</strong> {supplier.phone}</p>
                <p><strong>Email:</strong> {supplier.email}</p>
                <p><strong>Address:</strong> {supplier.address}</p>
                <p><strong>Active:</strong> {supplier.active === '1' ? 'Yes' : 'No'}</p>
                <p><strong>Created At:</strong> {convertUtcToHermosillo(supplier.createdAt)}</p>
                <p><strong>Last Updated:</strong> {convertUtcToHermosillo(supplier.updatedAt)}</p>
                <IonButton onClick={() => openEditModal(supplier.supplierId)} fill="clear">
                  <IonIcon icon={pencil} slot="icon-only" />
                </IonButton>
                <IonButton color="danger" onClick={() => confirmDelete(supplier)} fill="clear">
                  <IonIcon icon={trash} slot="icon-only" />
                </IonButton>
              </IonCardContent>
            </IonCard>
          ))}
        </IonList>

        <IonInfiniteScroll onIonInfinite={loadMoreData} threshold="100px" disabled={!hasMore || loading}>
          <IonInfiniteScrollContent loadingSpinner="bubbles" loadingText="Loading more data..."></IonInfiniteScrollContent>
        </IonInfiniteScroll>

        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton onClick={openCreateModal}>
            <IonIcon icon={add} />
          </IonFabButton>
        </IonFab>

        <IonModal isOpen={showModal} onDidDismiss={() => setShowModal(false)}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>{isEditing ? 'Edit Supplier' : 'Add Supplier'}</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setShowModal(false)}>Close</IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            <IonInput
              label="Supplier Name"
              labelPlacement="floating"
              value={currentSupplier?.supplierName}
              onIonChange={(e) => setCurrentSupplier({ ...currentSupplier, supplierName: e.detail.value || '' })}
              required
            ></IonInput>
            <IonInput
              label="Contact Name"
              labelPlacement="floating"
              value={currentSupplier?.contactName}
              onIonChange={(e) => setCurrentSupplier({ ...currentSupplier, contactName: e.detail.value || '' })}
            ></IonInput>
            <IonInput
              label="Phone"
              labelPlacement="floating"
              value={currentSupplier?.phone}
              onIonChange={(e) => setCurrentSupplier({ ...currentSupplier, phone: e.detail.value || '' })}
              type="tel"
            ></IonInput>
            <IonInput
              label="Email"
              labelPlacement="floating"
              value={currentSupplier?.email}
              onIonChange={(e) => setCurrentSupplier({ ...currentSupplier, email: e.detail.value || '' })}
              type="email"
            ></IonInput>
            <IonInput
              label="Address"
              labelPlacement="floating"
              value={currentSupplier?.address}
              onIonChange={(e) => setCurrentSupplier({ ...currentSupplier, address: e.detail.value || '' })}
            ></IonInput>
            <IonItem>
              <IonLabel>Active</IonLabel>
              <IonToggle
                checked={currentSupplier?.active === '1'}
                onIonChange={(e) => setCurrentSupplier({ ...currentSupplier, active: e.detail.checked ? '1' : '0' })}
              />
            </IonItem>
            <IonButton expand="block" onClick={handleSave} className="ion-margin-top">
              Save
            </IonButton>
          </IonContent>
        </IonModal>

        <IonAlert
          isOpen={showDeleteAlert}
          onDidDismiss={() => setShowDeleteAlert(false)}
          header={'Confirm Delete'}
          message={`Are you sure you want to delete supplier "${supplierToDelete?.supplierName}"?`}
          buttons={[
            { text: 'Cancel', role: 'cancel' },
            { text: 'Delete', handler: handleDelete }
          ]}
        />
      </IonContent>
    </IonPage>
  );
};

export default SupplierPage;

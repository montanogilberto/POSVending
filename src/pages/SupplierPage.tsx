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
  IonInput,
  IonButton,
  IonIcon,
  IonModal,
  IonButtons,
  IonLoading,
  IonToast,
  IonAlert,
  IonFab,
  IonFabButton,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonSearchbar,
  SearchbarInputEventDetail,
  InputInputEventDetail,
  ToggleChangeEventDetail,
  IonToggle,
  IonBackButton
} from '@ionic/react';
import { add, pencil, trash, close } from 'ionicons/icons';
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

const PAGE_SIZE = 20;

const SupplierPage: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState<Supplier[]>([]);
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [searchText, setSearchText] = useState('');

  const [supplierName, setSupplierName] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [active, setActive] = useState(true);
  const [companyId, setCompanyId] = useState<number>(1); // Assuming a default companyId for now

  const infiniteScrollRef = useRef<HTMLIonInfiniteScrollElement>(null);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  useEffect(() => {
    filterSuppliers();
  }, [searchText, suppliers]);

  const fetchSuppliers = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getAllSuppliers();
      setSuppliers(data);
      setFilteredSuppliers(data);
      setDisplayCount(PAGE_SIZE);
    } catch (err) {
      setError(`Failed to fetch suppliers: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const filterSuppliers = () => {
    const lowerCaseSearchText = searchText.toLowerCase();
    const filtered = suppliers.filter(supplier =>
      supplier.supplierName.toLowerCase().includes(lowerCaseSearchText) ||
      supplier.contactName?.toLowerCase().includes(lowerCaseSearchText) ||
      supplier.email?.toLowerCase().includes(lowerCaseSearchText) ||
      supplier.phone?.toLowerCase().includes(lowerCaseSearchText)
    );
    setFilteredSuppliers(filtered);
    setDisplayCount(PAGE_SIZE); // Reset display count on filter change
  };

  const loadMoreItems = (ev: CustomEvent<void>) => {
    setTimeout(() => {
      setDisplayCount(prevCount => Math.min(prevCount + PAGE_SIZE, filteredSuppliers.length));
      (ev.target as HTMLIonInfiniteScrollElement).complete();
    }, 500); // Simulate network delay
  };

  const handleSave = async () => {
    setLoading(true);
    setError('');
    try {
      if (selectedSupplier) {
        // Update
        await updateSupplier(selectedSupplier.supplierId, {
          companyId,
          supplierName,
          contactName: contactName || undefined,
          phone: phone || undefined,
          email: email || undefined,
          address: address || undefined,
          active: active ? '1' : '0',
        });
        setError('Supplier updated successfully');
      } else {
        // Create
        await createSupplier({
          companyId,
          supplierName,
          contactName: contactName || undefined,
          phone: phone || undefined,
          email: email || undefined,
          address: address || undefined,
          active: active ? '1' : '0',
        });
        setError('Supplier created successfully');
      }
      setShowModal(false);
      fetchSuppliers(); // Refresh list
    } catch (err) {
      setError(`Failed to save supplier: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedSupplier) return;
    setLoading(true);
    setError('');
    try {
      await deleteSupplier(selectedSupplier.supplierId);
      setShowDeleteAlert(false);
      setError('Supplier deleted successfully');
      fetchSuppliers(); // Refresh list
    } catch (err) {
      setError(`Failed to delete supplier: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setSelectedSupplier(null);
    setSupplierName('');
    setContactName('');
    setPhone('');
    setEmail('');
    setAddress('');
    setActive(true);
    setCompanyId(1); // Default company ID for new entries
    setShowModal(true);
  };

  const openEditModal = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setSupplierName(supplier.supplierName);
    setContactName(supplier.contactName || '');
    setPhone(supplier.phone || '');
    setEmail(supplier.email || '');
    setAddress(supplier.address || '');
    setActive(supplier.active === '1');
    setCompanyId(supplier.companyId);
    setShowModal(true);
  };

  const handleSearchChange = (e: CustomEvent<SearchbarInputEventDetail>) => {
    setSearchText(e.detail.value || '');
  };

  const handleToggleChange = (e: CustomEvent<ToggleChangeEventDetail>) => {
    setActive(e.detail.checked);
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
        <IonSearchbar
          placeholder="Search suppliers"
          value={searchText}
          onIonInput={handleSearchChange}
          debounce={300}
        />

        <IonList className="supplier-list">
          {filteredSuppliers.slice(0, displayCount).map((supplier) => (
            <IonItem key={supplier.supplierId} className="supplier-item">
              <IonLabel>
                <h2>{supplier.supplierName}</h2>
                <p>Contact: {supplier.contactName}</p>
                <p>Phone: {supplier.phone}</p>
                <p>Email: {supplier.email}</p>
                <p>Address: {supplier.address}</p>
                <p>Active: {supplier.active === '1' ? 'Yes' : 'No'}</p>
                <p>Created: {toHermosillo(supplier.created_At)}</p>
                {supplier.updated_at && <p>Updated: {toHermosillo(supplier.updated_at)}</p>}
              </IonLabel>
              <IonButton onClick={() => openEditModal(supplier)} fill="clear" color="primary">
                <IonIcon icon={pencil} />
              </IonButton>
              <IonButton onClick={() => { setSelectedSupplier(supplier); setShowDeleteAlert(true); }} fill="clear" color="danger">
                <IonIcon icon={trash} />
              </IonButton>
            </IonItem>
          ))}
          <IonInfiniteScroll
            ref={infiniteScrollRef}
            onIonInfinite={loadMoreItems}
            threshold="100px"
            disabled={displayCount >= filteredSuppliers.length}
          >
            <IonInfiniteScrollContent loadingText="Loading more suppliers..." />
          </IonInfiniteScroll>
        </IonList>

        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton onClick={openCreateModal}>
            <IonIcon icon={add} />
          </IonFabButton>
        </IonFab>

        <IonModal isOpen={showModal} onDidDismiss={() => setShowModal(false)}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>{selectedSupplier ? 'Edit Supplier' : 'Add Supplier'}</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setShowModal(false)}>
                  <IonIcon icon={close} />
                </IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            <IonList>
              <IonItem>
                <IonLabel position="floating">Company ID</IonLabel>
                <IonInput
                  value={companyId}
                  onIonChange={(e: CustomEvent<InputInputEventDetail>) => setCompanyId(Number(e.detail.value!))}
                  type="number"
                  required
                />
              </IonItem>
              <IonItem>
                <IonLabel position="floating">Supplier Name</IonLabel>
                <IonInput
                  value={supplierName}
                  onIonChange={(e: CustomEvent<InputInputEventDetail>) => setSupplierName(e.detail.value!)}
                  required
                  maxlength={200}
                />
              </IonItem>
              <IonItem>
                <IonLabel position="floating">Contact Name</IonLabel>
                <IonInput
                  value={contactName}
                  onIonChange={(e: CustomEvent<InputInputEventDetail>) => setContactName(e.detail.value!)}
                  maxlength={100}
                />
              </IonItem>
              <IonItem>
                <IonLabel position="floating">Phone</IonLabel>
                <IonInput
                  value={phone}
                  onIonChange={(e: CustomEvent<InputInputEventDetail>) => setPhone(e.detail.value!)}
                  type="tel"
                  maxlength={20}
                />
              </IonItem>
              <IonItem>
                <IonLabel position="floating">Email</IonLabel>
                <IonInput
                  value={email}
                  onIonChange={(e: CustomEvent<InputInputEventDetail>) => setEmail(e.detail.value!)}
                  type="email"
                  maxlength={100}
                />
              </IonItem>
              <IonItem>
                <IonLabel position="floating">Address</IonLabel>
                <IonInput
                  value={address}
                  onIonChange={(e: CustomEvent<InputInputEventDetail>) => setAddress(e.detail.value!)}
                />
              </IonItem>
              <IonItem>
                <IonLabel>Active</IonLabel>
                <IonToggle checked={active} onIonChange={handleToggleChange} />
              </IonItem>
            </IonList>
            <IonButton expand="block" onClick={handleSave} className="ion-margin-top">
              Save Supplier
            </IonButton>
          </IonContent>
        </IonModal>

        <IonAlert
          isOpen={showDeleteAlert}
          onDidDismiss={() => setShowDeleteAlert(false)}
          header={'Confirm Delete'}
          message={`Are you sure you want to delete ${selectedSupplier?.supplierName}?`}
          buttons={[
            {
              text: 'Cancel',
              role: 'cancel',
            },
            {
              text: 'Delete',
              handler: handleDelete,
            },
          ]}
        />

        <IonLoading isOpen={loading} message={'Please wait...'} />
        <IonToast
          isOpen={!!error}
          message={error}
          duration={3000}
          onDidDismiss={() => setError('')}
          color="danger"
        />
      </IonContent>
    </IonPage>
  );
};

export default SupplierPage;

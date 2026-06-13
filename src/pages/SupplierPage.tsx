import React, { useState, useEffect } from 'react';
import { 
  IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonList, IonItem, IonLabel,
  IonInput, IonButton, IonIcon, IonButtons, IonToast, IonLoading, IonAlert, IonSearchbar
} from '@ionic/react';
import { addOutline, createOutline, trashOutline, closeOutline } from 'ionicons/icons';
import { Supplier, createSupplier, updateSupplier, deleteSupplier, fetchAllSuppliers } from '../api/supplierApi';
import './SupplierPage.css';

const SupplierPage: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showAlert, setShowAlert] = useState(false);
  const [alertHeader, setAlertHeader] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [newContactName, setNewContactName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newActive, setNewActive] = useState<'0' | '1'>('1');
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    setLoading(true);
    try {
      const data = await fetchAllSuppliers();
      setSuppliers(data);
    } catch (error) {
      setToastMessage('Error loading suppliers.');
      setShowToast(true);
    }
    setLoading(false);
  };

  const handleSaveSupplier = async () => {
    if (!newSupplierName) {
      setAlertHeader('Validation Error');
      setAlertMessage('Supplier Name is required.');
      setShowAlert(true);
      return;
    }

    setLoading(true);
    try {
      if (editingSupplier) {
        await updateSupplier({
          supplierId: editingSupplier.supplierId,
          supplierName: newSupplierName,
          contactName: newContactName,
          phone: newPhone,
          email: newEmail,
          address: newAddress,
          active: newActive,
        });
        setToastMessage('Supplier updated successfully!');
      } else {
        await createSupplier({
          supplierName: newSupplierName,
          contactName: newContactName,
          phone: newPhone,
          email: newEmail,
          address: newAddress,
          active: newActive,
        });
        setToastMessage('Supplier created successfully!');
      }
      setShowToast(true);
      clearForm();
      loadSuppliers();
    } catch (error) {
      setToastMessage('Error saving supplier.');
      setShowToast(true);
    }
    setLoading(false);
  };

  const handleEditSupplier = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setNewSupplierName(supplier.supplierName);
    setNewContactName(supplier.contactName || '');
    setNewPhone(supplier.phone || '');
    setNewEmail(supplier.email || '');
    setNewAddress(supplier.address || '');
    setNewActive(supplier.active);
  };

  const handleDeleteSupplier = async (supplierId: number) => {
    setLoading(true);
    try {
      await deleteSupplier(supplierId);
      setToastMessage('Supplier deleted successfully!');
      setShowToast(true);
      loadSuppliers();
    } catch (error) {
      setToastMessage('Error deleting supplier.');
      setShowToast(true);
    }
    setLoading(false);
  };

  const clearForm = () => {
    setEditingSupplier(null);
    setNewSupplierName('');
    setNewContactName('');
    setNewPhone('');
    setNewEmail('');
    setNewAddress('');
    setNewActive('1');
  };

  const filteredSuppliers = suppliers.filter(supplier => 
    supplier.supplierName.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Suppliers</IonTitle>
          <IonButtons slot="end">
            {editingSupplier && (
              <IonButton onClick={clearForm}>
                <IonIcon icon={closeOutline} slot="icon-only" />
              </IonButton>
            )}
            <IonButton onClick={() => {
              clearForm();
              // Optionally open a modal for creating new supplier if needed
            }}>
              <IonIcon icon={addOutline} slot="icon-only" />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="ion-padding">
        <IonLoading isOpen={loading} message="Please wait..." />
        <IonToast isOpen={showToast} onDidDismiss={() => setShowToast(false)} message={toastMessage} duration={2000} />
        <IonAlert
          isOpen={showAlert}
          onDidDismiss={() => setShowAlert(false)}
          header={alertHeader}
          message={alertMessage}
          buttons={['OK']}
        />

        <div className="supplier-form">
          <IonInput
            label="Supplier Name"
            labelPlacement="floating"
            value={newSupplierName}
            onIonChange={(e) => setNewSupplierName(e.detail.value!)}
            placeholder="Enter supplier name"
            required
          ></IonInput>
          <IonInput
            label="Contact Name"
            labelPlacement="floating"
            value={newContactName}
            onIonChange={(e) => setNewContactName(e.detail.value!)}
            placeholder="Enter contact name"
          ></IonInput>
          <IonInput
            label="Phone"
            labelPlacement="floating"
            value={newPhone}
            onIonChange={(e) => setNewPhone(e.detail.value!)}
            placeholder="Enter phone number"
          ></IonInput>
          <IonInput
            label="Email"
            labelPlacement="floating"
            type="email"
            value={newEmail}
            onIonChange={(e) => setNewEmail(e.detail.value!)}
            placeholder="Enter email address"
          ></IonInput>
          <IonInput
            label="Address"
            labelPlacement="floating"
            value={newAddress}
            onIonChange={(e) => setNewAddress(e.detail.value!)}
            placeholder="Enter address"
          ></IonInput>
          <IonItem>
            <IonLabel>Active</IonLabel>
            <IonInput
              value={newActive}
              onIonChange={(e) => setNewActive(e.detail.value === '1' ? '1' : '0')}
              placeholder="1 for active, 0 for inactive"
              maxlength={1}
            ></IonInput>
          </IonItem>
          <IonButton expand="block" onClick={handleSaveSupplier} className="ion-margin-top">
            {editingSupplier ? 'Update Supplier' : 'Add Supplier'}
          </IonButton>
        </div>

        <IonSearchbar
          value={searchText}
          onIonChange={(e) => setSearchText(e.detail.value!)}
          placeholder="Search suppliers"
          className="ion-margin-top"
        ></IonSearchbar>

        <IonList className="ion-margin-top">
          {filteredSuppliers.map((supplier) => (
            <IonItem key={supplier.supplierId}>
              <IonLabel>
                <h2>{supplier.supplierName}</h2>
                <p>{supplier.contactName} - {supplier.phone}</p>
                <p>{supplier.email} - {supplier.address}</p>
                <p>Active: {supplier.active === '1' ? 'Yes' : 'No'}</p>
              </IonLabel>
              <IonButton fill="clear" onClick={() => handleEditSupplier(supplier)}>
                <IonIcon icon={createOutline} slot="icon-only" />
              </IonButton>
              <IonButton fill="clear" color="danger" onClick={() => handleDeleteSupplier(supplier.supplierId)}>
                <IonIcon icon={trashOutline} slot="icon-only" />
              </IonButton>
            </IonItem>
          ))}
        </IonList>
      </IonContent>
    </IonPage>
  );
};

export default SupplierPage;

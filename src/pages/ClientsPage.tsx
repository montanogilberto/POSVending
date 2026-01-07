import React, { useState, useEffect, useMemo } from 'react';
import './ClientsPage.css';
import {
  IonPage,
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonButton,
  IonIcon,
  IonList,
  IonItem,
  IonLabel,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonFab,
  IonFabButton,
  IonAlert,
  IonToast,
  IonModal,
  IonInput,
  IonNote,
  IonText,
  IonSearchbar,
} from '@ionic/react';
import { add, create, trash, pencil, arrowBack, person, mail, checkmarkCircle, closeCircle, call, save, personCircle, time } from 'ionicons/icons';
import Header from '../components/Header';
import AlertPopover from '../components/PopOver/AlertPopover';
import MailPopover from '../components/PopOver/MailPopover';
import { Client, getAllClients, createOrUpdateClient } from '../api/clientsApi';

const ClientsPage: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [popoverState, setPopoverState] = useState<{ showAlertPopover: boolean; showMailPopover: boolean; event?: Event }>({
    showAlertPopover: false,
    showMailPopover: false,
  });

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newClient, setNewClient] = useState<Partial<Client>>({
    first_name: '',
    last_name: '',
    email: '',
    cellphone: '',
  });
  const [createErrors, setCreateErrors] = useState({
    first_name: '',
    last_name: '',
    email: { isValid: true, message: '' },
    cellphone: '',
  });

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Partial<Client>>({
    first_name: '',
    last_name: '',
    email: '',
    cellphone: '',
  });
  const [editErrors, setEditErrors] = useState({
    first_name: '',
    last_name: '',
    email: { isValid: true, message: '' },
    cellphone: '',
  });

  // Search functionality
  const [searchTerm, setSearchTerm] = useState('');

  const presentAlertPopover = (e: React.MouseEvent) => {
    setPopoverState({ ...popoverState, showAlertPopover: true, event: e.nativeEvent });
  };

  const dismissAlertPopover = () => setPopoverState({ ...popoverState, showAlertPopover: false });

  const presentMailPopover = (e: React.MouseEvent) => {
    setPopoverState({ ...popoverState, showMailPopover: true, event: e.nativeEvent });
  };

  const dismissMailPopover = () => setPopoverState({ ...popoverState, showMailPopover: false });

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    setLoading(true);
    try {
      const fetchedClients = await getAllClients();
      setClients(fetchedClients);
    } catch (error) {
      console.error('Error loading clients:', error);
      setToastMessage('Error al cargar los clientes');
      setShowToast(true);
    } finally {
      setLoading(false);
    }
  };

  // Filter clients based on search term
  const filteredClients = useMemo(() => {
    if (!searchTerm.trim()) {
      return clients;
    }
    const term = searchTerm.toLowerCase().trim();
    return clients.filter(client => 
      client.first_name?.toLowerCase().includes(term) ||
      client.last_name?.toLowerCase().includes(term) ||
      client.cellphone?.includes(term) ||
      client.email?.toLowerCase().includes(term)
    );
  }, [clients, searchTerm]);

  const handleDelete = (client: Client) => {
    setSelectedClient(client);
    setShowDeleteAlert(true);
  };

  const confirmDelete = async () => {
    if (selectedClient) {
      try {
        setClients(clients.filter(c => c.clientId !== selectedClient.clientId));
        setToastMessage('Cliente eliminado exitosamente');
        setShowToast(true);
      } catch (error) {
        console.error('Error deleting client:', error);
        setToastMessage('Error al eliminar el cliente');
        setShowToast(true);
      }
    }
    setShowDeleteAlert(false);
    setSelectedClient(null);
  };

  const validateEmail = (email: string) => {
    if (!email.trim()) return { isValid: true, message: '' }; // Email is not required

    // More comprehensive email validation
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    if (!emailRegex.test(email)) {
      return {
        isValid: false,
        message: 'Por favor ingrese un email válido (ejemplo: nombre@dominio.com)'
      };
    }

    return { isValid: true, message: 'Email válido' };
  };

  const validateCellphone = (cellphone: string) => {
    if (!cellphone) return 'El teléfono es obligatorio';
    const digitsOnly = cellphone.replace(/\D/g, '');
    if (digitsOnly.length < 10) return 'El teléfono debe tener al menos 10 dígitos';
    if (!/^\d+$/.test(digitsOnly)) return 'El teléfono solo puede contener números';
    return '';
  };

  const createIsValid = useMemo(() => {
    const emailValidation = validateEmail(newClient.email || '');
    const errors: any = {
      first_name: newClient.first_name ? '' : 'El nombre es obligatorio',
      last_name: newClient.last_name ? '' : 'El apellido es obligatorio',
      email: emailValidation,
      cellphone: validateCellphone(newClient.cellphone || ''),
    };
    return !Object.values(errors).some((error: any) =>
      typeof error === 'string' ? error !== '' : !error.isValid
    );
  }, [newClient.first_name, newClient.last_name, newClient.email, newClient.cellphone]);

  useEffect(() => {
    const emailValidation = validateEmail(newClient.email || '');
    const errors: any = {
      first_name: newClient.first_name ? '' : 'El nombre es obligatorio',
      last_name: newClient.last_name ? '' : 'El apellido es obligatorio',
      email: emailValidation,
      cellphone: validateCellphone(newClient.cellphone || ''),
    };
    setCreateErrors(errors);
  }, [newClient.first_name, newClient.last_name, newClient.email, newClient.cellphone]);

  const validateCreateClient = () => createIsValid;

  const editIsValid = useMemo(() => {
    const emailValidation = validateEmail(editingClient.email || '');
    const errors: any = {
      first_name: editingClient.first_name ? '' : 'El nombre es obligatorio',
      last_name: editingClient.last_name ? '' : 'El apellido es obligatorio',
      email: emailValidation,
      cellphone: validateCellphone(editingClient.cellphone || ''),
    };
    return !Object.values(errors).some((error: any) =>
      typeof error === 'string' ? error !== '' : !error.isValid
    );
  }, [editingClient.first_name, editingClient.last_name, editingClient.email, editingClient.cellphone]);

  useEffect(() => {
    const emailValidation = validateEmail(editingClient.email || '');
    const errors: any = {
      first_name: editingClient.first_name ? '' : 'El nombre es obligatorio',
      last_name: editingClient.last_name ? '' : 'El apellido es obligatorio',
      email: emailValidation,
      cellphone: validateCellphone(editingClient.cellphone || ''),
    };
    setEditErrors(errors);
  }, [editingClient.first_name, editingClient.last_name, editingClient.email, editingClient.cellphone]);

  const validateEditClient = () => editIsValid;

  const handleCreate = () => {
    setShowCreateModal(true);
    setCreateErrors({ first_name: '', last_name: '', email: { isValid: true, message: '' }, cellphone: '' } as any);
  };

  const handleSaveClient = async () => {
    if (createIsValid) {
      try {
        const clientId = Date.now(); // Generate a unique numeric ID using the current timestamp
        const requestData = {
          clients: [{
            clientId,
            first_name: newClient.first_name!,
            last_name: newClient.last_name!,
            cellphone: newClient.cellphone!,
            email: newClient.email!,
            action: "1" // "1" for create
          }]
        };

        await createOrUpdateClient(requestData);
        setToastMessage('Cliente agregado exitosamente');
        setShowToast(true);
        setShowCreateModal(false);
        setNewClient({ first_name: '', last_name: '', email: '', cellphone: '' });
        setCreateErrors({ first_name: '', last_name: '', email: { isValid: true, message: '' }, cellphone: '' });
        loadClients(); // Refresh the list
      } catch (error) {
        console.error('Error creating client:', error);
        setToastMessage('Error al agregar el cliente');
        setShowToast(true);
      }
    }
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setShowEditModal(true);
    setEditErrors({ first_name: '', last_name: '', email: { isValid: true, message: '' }, cellphone: '' });
  };

  const handleEmailChange = (value: string, isCreate: boolean) => {
    const validation = validateEmail(value);
    if (isCreate) {
      setCreateErrors((prev: any) => ({ ...prev, email: validation }));
      setNewClient((prev: any) => ({ ...prev, email: value }));
    } else {
      setEditErrors((prev: any) => ({ ...prev, email: validation }));
      setEditingClient((prev: any) => ({ ...prev, email: value }));
    }
  };

  const handleUpdateClient = async () => {
    if (editIsValid) {
      try {
        const requestData = {
          clients: [{
            clientId: editingClient.clientId!,
            first_name: editingClient.first_name!,
            last_name: editingClient.last_name!,
            cellphone: editingClient.cellphone!,
            email: editingClient.email!,
            action: "2" // "2" for update
          }]
        };

        await createOrUpdateClient(requestData);
        setToastMessage('Cliente actualizado exitosamente');
        setShowToast(true);
        setShowEditModal(false);
        setEditingClient({ first_name: '', last_name: '', email: '', cellphone: '' });
        setEditErrors({ first_name: '', last_name: '', email: { isValid: true, message: '' }, cellphone: '' } as any);
        loadClients(); // Refresh the list
      } catch (error) {
        console.error('Error updating client:', error);
        setToastMessage('Error al actualizar el cliente');
        setShowToast(true);
      }
    }
  };

  // Format date helper
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <IonPage>
      <Header
        presentAlertPopover={presentAlertPopover}
        presentMailPopover={presentMailPopover}
        screenTitle="Clientes"
        showBackButton={true}
        backButtonText="Menú"
        backButtonHref="/Laundry"
      />

      <IonContent>
        {/* Search Bar */}
        <div className="search-container">
          <IonSearchbar
            value={searchTerm}
            onIonInput={(e) => setSearchTerm(e.detail.value!)}
            placeholder="Buscar por nombre, teléfono o email..."
            className="clients-searchbar"
          />
        </div>

        <IonList className="clients-list">
          {filteredClients.map((client) => (
            <IonCard key={client.clientId} className="client-card">
              <IonCardContent className="client-card-content">
                {/* Client Name - Main Element */}
                <div className="client-header">
                  <IonIcon icon={personCircle} className="client-avatar" />
                  <IonCardTitle className="client-name">
                    {client.first_name} {client.last_name}
                  </IonCardTitle>
                </div>

                {/* Metadata */}
                <div className="client-metadata">
                  {/* Phone - Primary */}
                  <div className="metadata-row">
                    <IonIcon icon={call} className="metadata-icon phone-icon" />
                    <IonText className="metadata-value">{client.cellphone}</IonText>
                  </div>

                  {/* Email - Secondary */}
                  <div className="metadata-row">
                    <IonIcon icon={mail} className="metadata-icon email-icon" />
                    <IonText className={`metadata-value ${!client.email ? 'text-muted' : ''}`}>
                      {client.email || 'No registrado'}
                    </IonText>
                  </div>

                  {/* Created Date - Small, Muted */}
                  <div className="metadata-row date-row">
                    <IonIcon icon={time} className="metadata-icon date-icon" />
                    <IonText className="metadata-value date-value">
                      Creado: {formatDate(client.created_At)}
                    </IonText>
                  </div>
                </div>

                {/* Action Buttons - Bottom Right */}
                <div className="client-actions">
                  <IonButton 
                    fill="outline" 
                    size="small" 
                    color="primary" 
                    onClick={() => handleEdit(client)}
                    className="action-button edit-button"
                  >
                    <IonIcon icon={pencil} slot="start" />
                    Editar
                  </IonButton>
                  <IonButton 
                    fill="outline" 
                    size="small" 
                    color="danger" 
                    onClick={() => handleDelete(client)}
                    className="action-button delete-button"
                  >
                    <IonIcon icon={trash} slot="start" />
                    Eliminar
                  </IonButton>
                </div>
              </IonCardContent>
            </IonCard>
          ))}
        </IonList>

        {/* Empty State */}
        {filteredClients.length === 0 && !loading && (
          <div className="empty-state">
            <IonIcon icon={person} className="empty-icon" />
            <IonText color="medium">
              <p>{searchTerm ? 'No se encontraron clientes' : 'No hay clientes registrados'}</p>
            </IonText>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="loading-state">
            <IonText color="medium">
              <p>Cargando clientes...</p>
            </IonText>
          </div>
        )}

        {/* Floating Action Button with Tooltip */}
        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton onClick={handleCreate} aria-label="Nuevo cliente">
            <IonIcon icon={add} />
          </IonFabButton>
        </IonFab>

        <IonModal isOpen={showCreateModal} onDidDismiss={() => setShowCreateModal(false)} className="client-modal">
          <IonHeader className="ion-no-border">
            <IonToolbar className="modal-toolbar">
              <IonButtons slot="start">
                <IonButton fill="clear" onClick={() => setShowCreateModal(false)}>
                  <IonIcon icon={arrowBack} />
                </IonButton>
              </IonButtons>
              <IonTitle className="modal-title">Agregar Cliente</IonTitle>
            </IonToolbar>
            <div className="modal-subtitle">
              <IonText color="medium">Registra un nuevo cliente en el sistema</IonText>
            </div>
          </IonHeader>
          <IonContent className="modal-content">
            <div className="form-container">
              <IonItem className="form-item outline">
                <IonIcon icon={person} slot="start" color="primary" />
                <IonLabel position="floating">Nombre *</IonLabel>
                <IonInput
                  value={newClient.first_name}
                  onIonChange={(e) => setNewClient(prev => ({ ...prev, first_name: e.detail.value! }))}
                  color={createErrors.first_name ? 'danger' : 'primary'}
                  className="modern-input"
                />
                {createErrors.first_name && (
                  <IonNote slot="helper" color="danger">{createErrors.first_name}</IonNote>
                )}
              </IonItem>

              <IonItem className="form-item outline">
                <IonIcon icon={person} slot="start" color="primary" />
                <IonLabel position="floating">Apellido *</IonLabel>
                <IonInput
                  value={newClient.last_name}
                  onIonChange={(e) => setNewClient(prev => ({ ...prev, last_name: e.detail.value! }))}
                  color={createErrors.last_name ? 'danger' : 'primary'}
                  className="modern-input"
                />
                {createErrors.last_name && (
                  <IonNote slot="helper" color="danger">{createErrors.last_name}</IonNote>
                )}
              </IonItem>

              <IonItem className="form-item outline">
                <IonIcon icon={mail} slot="start" color="primary" />
                <IonLabel position="floating">Email</IonLabel>
                <IonInput
                  value={newClient.email}
                  onIonChange={(e) => handleEmailChange(e.detail.value!, true)}
                  color={createErrors.email.isValid ? (newClient.email ? 'success' : 'primary') : 'danger'}
                  className="modern-input"
                />
                {newClient.email && createErrors.email.isValid && (
                  <IonIcon icon={checkmarkCircle} slot="end" color="success" />
                )}
                {newClient.email && !createErrors.email.isValid && (
                  <IonIcon icon={closeCircle} slot="end" color="danger" />
                )}
                {newClient.email && createErrors.email.isValid && (
                  <IonNote slot="helper" color="success">Email válido</IonNote>
                )}
                {newClient.email && !createErrors.email.isValid && (
                  <IonNote slot="helper" color="danger">Formato de email inválido (ej. nombre@dominio.com)</IonNote>
                )}
              </IonItem>

              <IonItem className="form-item outline">
                <IonIcon icon={call} slot="start" color="primary" />
                <IonLabel position="floating">Teléfono *</IonLabel>
                <IonInput
                  value={newClient.cellphone}
                  onIonChange={(e) => setNewClient(prev => ({ ...prev, cellphone: e.detail.value! }))}
                  color={createErrors.cellphone ? 'danger' : 'primary'}
                  className="modern-input"
                  type="tel"
                />
                {createErrors.cellphone && (
                  <IonNote slot="helper" color="danger">{createErrors.cellphone}</IonNote>
                )}
              </IonItem>

              <div className="button-container">
                <IonButton
                  expand="block"
                  size="large"
                  className="primary-button"
                  onClick={handleSaveClient}
                  disabled={!createIsValid}
                >
                  <IonIcon icon={save} slot="start" />
                  GUARDAR CLIENTE
                </IonButton>
              </div>
            </div>
          </IonContent>
        </IonModal>

        <IonModal isOpen={showEditModal} onDidDismiss={() => setShowEditModal(false)}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>Editar Cliente</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setShowEditModal(false)}>Cerrar</IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent>
            <IonItem>
              <IonLabel position="stacked">Nombre *</IonLabel>
              <IonInput
                value={editingClient.first_name}
                onIonChange={(e) => setEditingClient(prev => ({ ...prev, first_name: e.detail.value! }))}
                color={editErrors.first_name ? 'danger' : 'primary'}
              />
              {editErrors.first_name && <IonNote color="danger">{editErrors.first_name}</IonNote>}
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Apellido *</IonLabel>
              <IonInput
                value={editingClient.last_name}
                onIonChange={(e) => setEditingClient(prev => ({ ...prev, last_name: e.detail.value! }))}
                color={editErrors.last_name ? 'danger' : 'primary'}
              />
              {editErrors.last_name && <IonNote color="danger">{editErrors.last_name}</IonNote>}
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Email</IonLabel>
              <IonInput
                value={editingClient.email}
                onIonChange={(e) => handleEmailChange(e.detail.value!, false)}
                color={editErrors.email.isValid ? (editingClient.email ? 'success' : 'primary') : 'danger'}
              />
              {editingClient.email && (
                <IonNote color={editErrors.email.isValid ? 'success' : 'danger'}>
                  {editErrors.email.isValid ? '✅ Email válido' : '❌ Formato de email inválido'}
                </IonNote>
              )}
              {!editErrors.email.isValid && (
                <IonText color="danger">
                  <small>{editErrors.email.message}</small>
                </IonText>
              )}
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Teléfono *</IonLabel>
              <IonInput
                value={editingClient.cellphone}
                onIonChange={(e) => setEditingClient({ ...editingClient, cellphone: e.detail.value! })}
                color={editErrors.cellphone ? 'danger' : 'primary'}
              />
              {editErrors.cellphone && <IonNote color="danger">{editErrors.cellphone}</IonNote>}
            </IonItem>
            <IonButton expand="block" onClick={handleUpdateClient} disabled={!editIsValid}>
              Actualizar
            </IonButton>
          </IonContent>
        </IonModal>

        <IonAlert
          isOpen={showDeleteAlert}
          onDidDismiss={() => setShowDeleteAlert(false)}
          header="Confirmar eliminación"
          message={`¿Estás seguro de que quieres eliminar al cliente ${selectedClient?.first_name} ${selectedClient?.last_name}?`}
          buttons={[
            {
              text: 'Cancelar',
              role: 'cancel',
              handler: () => setShowDeleteAlert(false),
            },
            {
              text: 'Eliminar',
              role: 'destructive',
              handler: confirmDelete,
            },
          ]}
        />

        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message={toastMessage}
          duration={2000}
          color={toastMessage.includes('Error') ? 'danger' : 'success'}
        />
      </IonContent>

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
    </IonPage>
  );
};

export default ClientsPage;


import React, { useState, useEffect, useRef, useMemo } from 'react';
import './ClientSelector.css';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonSearchbar,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonChip,
  IonText,
  IonLoading,
  IonFooter,
  IonInput,
  IonNote,
  IonToast,
  IonRow,
  IonCol,
} from '@ionic/react';
import { person, close, checkmarkCircle, business, add, mail, call, save, arrowBack } from 'ionicons/icons';
import { Client, getAllClients, createOrUpdateClient } from '../api/clientsApi';

interface ClientSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onChange: (client: Client | null) => void;
  selectedClient: Client | null;
}

const ClientSelector: React.FC<ClientSelectorProps> = ({
  isOpen,
  onClose,
  onChange,
  selectedClient,
}) => {
  const [searchText, setSearchText] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const searchbarRef = useRef<HTMLIonSearchbarElement>(null);

  // Create client form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newClient, setNewClient] = useState<Partial<Client>>({
    first_name: '',
    last_name: '',
    cellphone: '',
    email: '',
  });
  const [createErrors, setCreateErrors] = useState<{
    first_name: string;
    last_name: string;
    email: { isValid: boolean; message: string };
    cellphone: string;
  }>({
    first_name: '',
    last_name: '',
    email: { isValid: true, message: '' },
    cellphone: '',
  });
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastColor, setToastColor] = useState<'success' | 'danger'>('success');

  // Load clients only when modal opens
  useEffect(() => {
    if (isOpen && !hasLoaded) {
      loadClients();
    }
  }, [isOpen]);

  // Focus searchbar when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchbarRef.current?.setFocus();
      }, 100);
    } else {
      // Reset states when modal closes
      setSearchText('');
      setShowCreateForm(false);
      setNewClient({ first_name: '', last_name: '', cellphone: '', email: '' });
      setCreateErrors({
        first_name: '',
        last_name: '',
        email: { isValid: true, message: '' },
        cellphone: '',
      });
    }
  }, [isOpen]);

  const loadClients = async () => {
    setLoading(true);
    try {
      const fetchedClients = await getAllClients();
      setClients(fetchedClients);
      setHasLoaded(true);
    } catch (error) {
      console.error('Error loading clients:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter clients based on search text
  const filteredClients = clients.filter((client) => {
    const search = searchText.toLowerCase().trim();
    if (!search) return true;
    
    return (
      client.first_name.toLowerCase().includes(search) ||
      client.last_name.toLowerCase().includes(search) ||
      client.cellphone.includes(search) ||
      (client.email && client.email.toLowerCase().includes(search))
    );
  });

  const handleSelectClient = (client: Client) => {
    onChange(client);
    onClose();
  };

  const handleSelectMostrador = () => {
    onChange(null);
    onClose();
  };

  const formatPhone = (phone: string) => {
    // Format phone as XXX-XXX-XXXX if 10 digits
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10) {
      return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    return phone;
  };

  const getClientDisplayName = (client: Client | null) => {
    if (!client) return 'Mostrador / Desconocido';
    return `${client.first_name} ${client.last_name}`.trim();
  };

  // Validation functions
  const validateEmail = (email: string) => {
    if (!email.trim()) return { isValid: true, message: '' };
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      return {
        isValid: false,
        message: 'Email inválido (ej. nombre@dominio.com)'
      };
    }
    return { isValid: true, message: '' };
  };

  const validateCellphone = (cellphone: string) => {
    if (!cellphone) return 'El teléfono es obligatorio';
    const digitsOnly = cellphone.replace(/\D/g, '');
    if (digitsOnly.length < 10) return 'El teléfono debe tener al menos 10 dígitos';
    return '';
  };

  // Computed validation for create form
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

  // Update errors when form fields change
  useEffect(() => {
    const emailValidation = validateEmail(newClient.email || '');
    const errors = {
      first_name: newClient.first_name ? '' : 'El nombre es obligatorio',
      last_name: newClient.last_name ? '' : 'El apellido es obligatorio',
      email: emailValidation,
      cellphone: validateCellphone(newClient.cellphone || ''),
    };
    setCreateErrors(errors);
  }, [newClient.first_name, newClient.last_name, newClient.email, newClient.cellphone]);

  const handleEmailChange = (value: string) => {
    const validation = validateEmail(value);
    setCreateErrors((prev) => ({ ...prev, email: validation }));
    setNewClient((prev) => ({ ...prev, email: value }));
  };

  const handleSaveClient = async () => {
    if (createIsValid) {
      setIsCreating(true);
      try {
        const clientId = Date.now(); // Generate unique ID
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

        console.log('[CLIENT_CREATION] Request to create client:', JSON.stringify(requestData, null, 2));

        const response = await createOrUpdateClient(requestData);
        
        console.log('[CLIENT_CREATION] Response from API:', JSON.stringify(response, null, 2));
        console.log('[CLIENT_CREATION] API msg:', response.result?.[0]?.msg);
        console.log('[CLIENT_CREATION] API error:', response.result?.[0]?.error);
        
        if (response.result?.[0]?.error) {
          throw new Error(response.result[0].error);
        }
        
        // Create the new client object
        const createdClient: Client = {
          clientId,
          first_name: newClient.first_name!,
          last_name: newClient.last_name!,
          cellphone: newClient.cellphone!,
          email: newClient.email!,
        };

        setToastMessage('Cliente creado exitosamente');
        setToastColor('success');
        setShowToast(true);
        
        // Select the newly created client and close modal
        onChange(createdClient);
        onClose();
        
        // Reset form
        setShowCreateForm(false);
        setNewClient({ first_name: '', last_name: '', cellphone: '', email: '' });
        setCreateErrors({
          first_name: '',
          last_name: '',
          email: { isValid: true, message: '' },
          cellphone: '',
        });
        
        // Refresh client list
        setHasLoaded(false);
        
        // Load clients again to verify the new client exists in database
        console.log('[CLIENT_CREATION] Refreshing client list to verify...');
        const updatedClients = await getAllClients();
        console.log('[CLIENT_CREATION] Updated clients count:', updatedClients.length);
        const newClientExists = updatedClients.some(c => c.clientId === clientId);
        console.log('[CLIENT_CREATION] New client exists in database:', newClientExists);
        setClients(updatedClients);
        setHasLoaded(true);
        
      } catch (error) {
        console.error('Error creating client:', error);
        setToastMessage('Error al crear el cliente');
        setToastColor('danger');
        setShowToast(true);
      } finally {
        setIsCreating(false);
      }
    }
  };

  const handleCancelCreate = () => {
    setShowCreateForm(false);
    setNewClient({ first_name: '', last_name: '', cellphone: '', email: '' });
    setCreateErrors({
      first_name: '',
      last_name: '',
      email: { isValid: true, message: '' },
      cellphone: '',
    });
  };

  return (
    <IonModal
      isOpen={isOpen}
      onDidDismiss={onClose}
      breakpoints={[0, 1]}
      initialBreakpoint={1}
      className="client-selector-modal"
    >
      <IonHeader className="ion-no-border client-selector-header">
        <IonToolbar className="client-selector-toolbar">
          <IonButtons slot="start">
            <IonButton fill="clear" onClick={onClose} className="close-button">
              <IonIcon icon={close} slot="icon-only" />
            </IonButton>
          </IonButtons>
          <IonTitle className="client-selector-title">Seleccionar Cliente</IonTitle>
          <IonButtons slot="end">
            <IonButton 
              fill="clear" 
              onClick={handleSelectMostrador} 
              className="mostrador-button"
            >
              <IonIcon icon={business} slot="start" />
              Mostrador
            </IonButton>
            {!showCreateForm && (
              <IonButton 
                fill="solid" 
                color="primary" 
                onClick={() => setShowCreateForm(true)}
                className="create-client-btn"
              >
                <IonIcon icon={add} slot="start" />
                Crear cliente
              </IonButton>
            )}
          </IonButtons>
        </IonToolbar>
        <div className="client-searchbar-container">
          <IonSearchbar
            ref={searchbarRef}
            value={searchText}
            onIonInput={(e) => setSearchText(e.detail.value || '')}
            placeholder="Buscar por nombre, teléfono o email..."
            animated={false}
            showClearButton="focus"
            className="client-searchbar"
          />
        </div>
        
        {/* Create Client Form - Collapsible */}
        {showCreateForm && (
          <div className="create-client-form">
            <div className="form-header">
              <IonText color="primary">
                <h3>Nuevo Cliente</h3>
              </IonText>
              <IonButton fill="clear" size="small" onClick={handleCancelCreate}>
                <IonIcon icon={close} />
              </IonButton>
            </div>
            
            <IonRow>
              <IonCol size="6">
                <IonItem className="form-item">
                  <IonIcon icon={person} slot="start" color="primary" />
                  <IonLabel position="floating">Nombre *</IonLabel>
                  <IonInput
                    value={newClient.first_name}
                    onIonChange={(e) => setNewClient(prev => ({ ...prev, first_name: e.detail.value! }))}
                    color={createErrors.first_name ? 'danger' : 'primary'}
                    className="form-input"
                  />
                </IonItem>
                {createErrors.first_name && (
                  <IonText color="danger" className="error-text">
                    {createErrors.first_name}
                  </IonText>
                )}
              </IonCol>
              <IonCol size="6">
                <IonItem className="form-item">
                  <IonIcon icon={person} slot="start" color="primary" />
                  <IonLabel position="floating">Apellido *</IonLabel>
                  <IonInput
                    value={newClient.last_name}
                    onIonChange={(e) => setNewClient(prev => ({ ...prev, last_name: e.detail.value! }))}
                    color={createErrors.last_name ? 'danger' : 'primary'}
                    className="form-input"
                  />
                </IonItem>
                {createErrors.last_name && (
                  <IonText color="danger" className="error-text">
                    {createErrors.last_name}
                  </IonText>
                )}
              </IonCol>
            </IonRow>
            
            <IonRow>
              <IonCol size="6">
                <IonItem className="form-item">
                  <IonIcon icon={call} slot="start" color="primary" />
                  <IonLabel position="floating">Teléfono *</IonLabel>
                  <IonInput
                    value={newClient.cellphone}
                    onIonChange={(e) => setNewClient(prev => ({ ...prev, cellphone: e.detail.value! }))}
                    color={createErrors.cellphone ? 'danger' : 'primary'}
                    className="form-input"
                    type="tel"
                  />
                </IonItem>
                {createErrors.cellphone && (
                  <IonText color="danger" className="error-text">
                    {createErrors.cellphone}
                  </IonText>
                )}
              </IonCol>
              <IonCol size="6">
                <IonItem className="form-item">
                  <IonIcon icon={mail} slot="start" color="primary" />
                  <IonLabel position="floating">Email</IonLabel>
                  <IonInput
                    value={newClient.email}
                    onIonChange={(e) => handleEmailChange(e.detail.value!)}
                    color={createErrors.email.isValid ? (newClient.email ? 'success' : 'primary') : 'danger'}
                    className="form-input"
                  />
                </IonItem>
                {newClient.email && !createErrors.email.isValid && (
                  <IonText color="danger" className="error-text">
                    {createErrors.email.message}
                  </IonText>
                )}
              </IonCol>
            </IonRow>
            
            <div className="form-actions">
              <IonButton 
                fill="outline" 
                onClick={handleCancelCreate}
                disabled={isCreating}
              >
                Cancelar
              </IonButton>
              <IonButton 
                fill="solid" 
                color="success"
                onClick={handleSaveClient}
                disabled={!createIsValid || isCreating}
              >
                {isCreating ? (
                  <IonLoading isOpen={true} message="Guardando..." />
                ) : (
                  <>
                    <IonIcon icon={save} slot="start" />
                    Guardar
                  </>
                )}
              </IonButton>
            </div>
          </div>
        )}
      </IonHeader>

      <IonContent className="client-selector-content">
        {/* Selected client indicator */}
        {selectedClient && (
          <div className="selected-client-chip">
            <IonChip color="success" outline>
              <IonIcon icon={checkmarkCircle} />
              <IonLabel>Seleccionado: {getClientDisplayName(selectedClient)}</IonLabel>
            </IonChip>
          </div>
        )}

        {loading ? (
          <div className="loading-container">
            <IonLoading isOpen={loading} message="Cargando clientes..." />
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="empty-state">
            <IonIcon icon={person} className="empty-icon" />
            <IonText color="medium">
              {searchText
                ? 'No se encontraron clientes'
                : 'No hay clientes disponibles'}
            </IonText>
            {!searchText && !showCreateForm && (
              <IonButton 
                fill="solid" 
                color="primary" 
                onClick={() => setShowCreateForm(true)}
                className="create-from-empty"
              >
                <IonIcon icon={add} slot="start" />
                Crear nuevo cliente
              </IonButton>
            )}
          </div>
        ) : (
          <IonList className="client-list">
            {filteredClients.map((client) => (
              <IonItem
                key={client.clientId}
                button
                onClick={() => handleSelectClient(client)}
                className={`client-item ${
                  selectedClient?.clientId === client.clientId ? 'selected' : ''
                }`}
              >
                <div className="client-item-content">
                  <div className="client-name-row">
                    <IonLabel className="client-name">
                      {client.first_name} {client.last_name}
                    </IonLabel>
                    {selectedClient?.clientId === client.clientId && (
                      <IonChip color="success" className="small-chip">
                        <IonIcon icon={checkmarkCircle} slot="start" />
                        <IonLabel>Seleccionado</IonLabel>
                      </IonChip>
                    )}
                  </div>
                  <div className="client-contact-row">
                    <IonText color="medium" className="client-phone">
                      📱 {formatPhone(client.cellphone)}
                    </IonText>
                    {client.email && (
                      <IonText color="medium" className="client-email">
                        ✉️ {client.email}
                      </IonText>
                    )}
                  </div>
                </div>
              </IonItem>
            ))}
          </IonList>
        )}
      </IonContent>

      <IonFooter className="client-selector-footer">
        <IonButton
          expand="block"
          fill="outline"
          onClick={handleSelectMostrador}
          className="mostrador-footer-btn"
        >
          <IonIcon icon={business} slot="start" />
          Usar "Mostrador" (sin cliente)
        </IonButton>
      </IonFooter>

      {/* Toast Notifications */}
      <IonToast
        isOpen={showToast}
        onDidDismiss={() => setShowToast(false)}
        message={toastMessage}
        duration={2000}
        color={toastColor}
      />
    </IonModal>
  );
};

export default ClientSelector;


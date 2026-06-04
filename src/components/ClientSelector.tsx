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
  IonToast,
  IonRow,
  IonCol,
  IonSelect,
  IonSelectOption,
} from '@ionic/react';
import { person, close, checkmarkCircle, business, add, mail, call, save } from 'ionicons/icons';
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

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newClient, setNewClient] = useState<Partial<Client>>({
    first_name: '',
    last_name: '',
    cellphone: '',
    email: '',
  });
  const [selectedCountryCode, setSelectedCountryCode] = useState('+52');
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

  useEffect(() => {
    if (isOpen && !hasLoaded) {
      loadClients();
    }
  }, [isOpen, hasLoaded]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchbarRef.current?.setFocus();
      }, 100);
    } else {
      setSearchText('');
      setShowCreateForm(false);
      setNewClient({ first_name: '', last_name: '', cellphone: '', email: '' });
      setSelectedCountryCode('+52');
      setCreateErrors({
        first_name: '',
        last_name: '',
        email: { isValid: true, message: '' },
        cellphone: '',
      });
    }
  }, [isOpen]);

  const normalizePhoneDigits = (phone: string) => (phone || '').replace(/\D/g, '');

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

  const searchableClients = useMemo(() => {
    const map = new Map<number, Client>();
    clients.forEach((client) => {
      map.set(client.clientId, client);
    });
    return Array.from(map.values());
  }, [clients]);

  const filteredClients = useMemo(() => {
    const search = searchText.toLowerCase().trim();
    if (!search) return searchableClients;

    const searchDigits = normalizePhoneDigits(search);

    return searchableClients.filter((client) => {
      const firstName = (client.first_name || '').toLowerCase();
      const lastName = (client.last_name || '').toLowerCase();
      const email = (client.email || '').toLowerCase();
      const cellphone = client.cellphone || '';
      const cellphoneDigits = normalizePhoneDigits(cellphone);

      return (
        firstName.includes(search) ||
        lastName.includes(search) ||
        `${firstName} ${lastName}`.includes(search) ||
        email.includes(search) ||
        cellphone.includes(search) ||
        (searchDigits.length > 0 && cellphoneDigits.includes(searchDigits))
      );
    });
  }, [searchText, searchableClients]);

  const handleSelectClient = (client: Client) => {
    onChange(client);
    onClose();
  };

  const handleSelectMostrador = () => {
    onChange(null);
    onClose();
  };

  const formatPhone = (phone: string) => {
    const digits = normalizePhoneDigits(phone);
    if (digits.length === 10) {
      return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    return phone;
  };

  const getClientDisplayName = (client: Client | null) => {
    if (!client) return 'Mostrador / Desconocido';
    return `${client.first_name} ${client.last_name}`.trim();
  };

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
    const digitsOnly = normalizePhoneDigits(cellphone);
    if (digitsOnly.length < 10) return 'El teléfono debe tener al menos 10 dígitos';
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

  const isDuplicateCellphoneMessage = (text: string) => {
    const normalized = (text || '').toLowerCase();
    return (
      normalized.includes('cellphone already exists') ||
      normalized.includes('uq_clients_cellphone') ||
      normalized.includes('unique key constraint') ||
      normalized.includes('duplicate key')
    );
  };

  const handleSaveClient = async () => {
    if (!createIsValid || isCreating) return;

    setIsCreating(true);
    try {
      const localDigits = normalizePhoneDigits(newClient.cellphone || '');
      const formattedCellphone = `${selectedCountryCode}${localDigits}`;

      const requestData = {
        clients: [{
          clientId: 0,
          first_name: newClient.first_name!,
          last_name: newClient.last_name!,
          cellphone: formattedCellphone,
          email: newClient.email || '',
          action: '1'
        }]
      };

      const response = await createOrUpdateClient(requestData);

      const apiMsg = typeof response === 'string'
        ? response
        : response.result?.[0]?.msg || response.msg || '';

      const apiError = typeof response === 'string'
        ? ''
        : response.result?.[0]?.error || response.error || '';

      const responseText = `${apiMsg} ${apiError} ${typeof response === 'string' ? response : ''}`;

      const updatedClients = await getAllClients();
      setClients(updatedClients);
      setHasLoaded(true);

      const normalizedTarget = `${selectedCountryCode.replace(/\D/g, '')}${localDigits}`;

      const findByPhone = (list: Client[]) =>
        list.find((c) => {
          const d = normalizePhoneDigits(c.cellphone || '');
          return d === normalizedTarget || d.endsWith(localDigits) || normalizedTarget.endsWith(d);
        });

      if (isDuplicateCellphoneMessage(responseText)) {
        const existingClient = findByPhone(updatedClients);
        if (existingClient) {
          onChange(existingClient);
          onClose();
          setToastMessage('El teléfono ya existe. Se seleccionó el cliente existente.');
          setToastColor('success');
          setShowToast(true);
        } else {
          throw new Error('El teléfono ya existe pero no se encontró el cliente.');
        }
      } else if (apiError && apiError !== '0') {
        throw new Error(apiMsg || apiError || 'Error al crear el cliente');
      } else {
        const persistedClient = findByPhone(updatedClients);
        if (!persistedClient) {
          throw new Error('No se pudo verificar el cliente creado en la base de datos.');
        }

        onChange(persistedClient);
        onClose();
        setToastMessage('Cliente creado exitosamente');
        setToastColor('success');
        setShowToast(true);
      }

      setShowCreateForm(false);
      setNewClient({ first_name: '', last_name: '', cellphone: '', email: '' });
      setSelectedCountryCode('+52');
      setCreateErrors({
        first_name: '',
        last_name: '',
        email: { isValid: true, message: '' },
        cellphone: '',
      });
    } catch (error) {
      console.error('Error creating client:', error);
      setToastMessage(error instanceof Error ? error.message : 'Error al crear el cliente');
      setToastColor('danger');
      setShowToast(true);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCancelCreate = () => {
    setShowCreateForm(false);
    setNewClient({ first_name: '', last_name: '', cellphone: '', email: '' });
    setSelectedCountryCode('+52');
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
              <IonCol size="12">
                <IonItem className="form-item">
                  <IonLabel position="stacked">País</IonLabel>
                  <IonSelect
                    value={selectedCountryCode}
                    onIonChange={(e) => setSelectedCountryCode(e.detail.value)}
                    interface="popover"
                    className="form-input"
                  >
                    <IonSelectOption value="+52">México (+52)</IonSelectOption>
                    <IonSelectOption value="+1">Estados Unidos (+1)</IonSelectOption>
                    <IonSelectOption value="+1">Canadá (+1)</IonSelectOption>
                  </IonSelect>
                </IonItem>
              </IonCol>
            </IonRow>

            <IonRow>
              <IonCol size="12">
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
            </IonRow>

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
              <IonCol size="12">
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
              {searchText ? 'No se encontraron clientes' : 'No hay clientes disponibles'}
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
                className={`client-item ${selectedClient?.clientId === client.clientId ? 'selected' : ''}`}
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

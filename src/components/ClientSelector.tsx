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
  IonActionSheet,
  IonRow,
  IonCol,
  IonSelect,
  IonSelectOption,
} from '@ionic/react';
import { person, close, checkmarkCircle, business, add, save } from 'ionicons/icons';
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
  const [cellphoneInfoMessage, setCellphoneInfoMessage] = useState('');
  const [showCellphoneInfoSheet, setShowCellphoneInfoSheet] = useState(false);

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

  const handleCellphoneBlurLookup = async () => {
    const rawCellphone = newClient.cellphone || '';
    const localDigits = normalizePhoneDigits(rawCellphone);
    console.log('[ClientSelector] onIonBlur cellphone raw:', rawCellphone, 'digits:', localDigits);

    if (localDigits.length < 7) {
      console.log('[ClientSelector] lookup skipped: less than 7 digits');
      return;
    }

    try {
      const fetchedClients = await getAllClients();
      const selectedCountryDigits = selectedCountryCode.replace(/\D/g, '');
      const fullCandidate = `${selectedCountryDigits}${localDigits}`;
      console.log('[ClientSelector] fetched clients:', fetchedClients.length, 'selectedCountryDigits:', selectedCountryDigits, 'fullCandidate:', fullCandidate);

      const matchedClient = fetchedClients.find((c) => {
        const digits = normalizePhoneDigits(c.cellphone || '');
        const localMatch = digits.endsWith(localDigits) || localDigits.endsWith(digits);
        const fullMatch = digits === fullCandidate || fullCandidate.endsWith(digits) || digits.endsWith(fullCandidate);
        const isMatch = localMatch || fullMatch;
        if (isMatch) {
          console.log('[ClientSelector] matched client:', {
            clientId: c.clientId,
            name: `${c.first_name} ${c.last_name}`.trim(),
            cellphone: c.cellphone,
            email: c.email,
            digits,
            localMatch,
            fullMatch,
          });
        }
        return isMatch;
      });

      if (matchedClient) {
        const fullName = `${matchedClient.first_name || ''} ${matchedClient.last_name || ''}`.trim();
        const phoneText = matchedClient.cellphone ? ` • ${matchedClient.cellphone}` : '';
        const emailText = matchedClient.email ? ` • ${matchedClient.email}` : '';
        const infoMessage = `Asociado: ${fullName || 'Cliente'}${phoneText}${emailText}`;
        console.log('[ClientSelector] showing action sheet (matched):', infoMessage);
        setCellphoneInfoMessage(infoMessage);
        setShowCellphoneInfoSheet(true);
      } else {
        console.log('[ClientSelector] no associated person found for digits:', localDigits, '(no action sheet shown)');
      }
    } catch (error) {
      console.error('[ClientSelector] error looking up cellphone association:', error);
      setCellphoneInfoMessage('No se pudo validar el teléfono en este momento');
      setShowCellphoneInfoSheet(true);
    }
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
        throw new Error('Error: el teléfono ya está registrado. Usa otro número.');
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
                <div className="field-group">
                  <IonSelect
                    fill="outline"
                    label="País"
                    labelPlacement="floating"
                    value={selectedCountryCode}
                    onIonChange={(e) => setSelectedCountryCode(e.detail.value)}
                    interface="popover"
                  >
                    <IonSelectOption value="+52">México (+52)</IonSelectOption>
                    <IonSelectOption value="+1">Estados Unidos (+1)</IonSelectOption>
                    <IonSelectOption value="+1">Canadá (+1)</IonSelectOption>
                  </IonSelect>
                </div>
              </IonCol>
            </IonRow>

            <IonRow>
              <IonCol size="12">
                <div className="field-group">
                  <IonInput
                    fill="outline"
                    label="Teléfono *"
                    labelPlacement="floating"
                    value={newClient.cellphone}
                    onIonInput={(e: any) => {
                      const rawValue = e?.target?.value ?? e?.detail?.value ?? '';
                      const digitsOnly = String(rawValue).replace(/\D/g, '').slice(0, 15);
                      if (e?.target) {
                        e.target.value = digitsOnly;
                      }
                      setNewClient(prev => ({ ...prev, cellphone: digitsOnly }));
                    }}
                    onIonChange={(e) => {
                      const digitsOnly = String(e.detail.value || '').replace(/\D/g, '').slice(0, 15);
                      setNewClient(prev => ({ ...prev, cellphone: digitsOnly }));
                    }}
                    onKeyDown={(e: any) => {
                      const allowedControlKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Home', 'End'];
                      const isDigit = /^[0-9]$/.test(e.key);
                      if (!isDigit && !allowedControlKeys.includes(e.key)) {
                        e.preventDefault();
                      }
                    }}
                    onPaste={(e: any) => {
                      e.preventDefault();
                      const pasted = (e.clipboardData?.getData('text') || '').replace(/\D/g, '');
                      const nextValue = `${newClient.cellphone || ''}${pasted}`.slice(0, 15);
                      setNewClient(prev => ({ ...prev, cellphone: nextValue }));
                    }}
                    onIonBlur={handleCellphoneBlurLookup}
                    className={createErrors.cellphone ? 'ion-invalid ion-touched' : ''}
                    errorText={createErrors.cellphone}
                    type="text"
                    inputmode="numeric"
                    pattern="[0-9]*"
                    maxlength={15}
                  />
                </div>
              </IonCol>
            </IonRow>

            <IonRow>
              <IonCol size="6">
                <div className="field-group">
                  <IonInput
                    fill="outline"
                    label="Nombre *"
                    labelPlacement="floating"
                    value={newClient.first_name}
                    onIonChange={(e) => setNewClient(prev => ({ ...prev, first_name: e.detail.value! }))}
                    className={createErrors.first_name ? 'ion-invalid ion-touched' : ''}
                    errorText={createErrors.first_name}
                  />
                </div>
              </IonCol>
              <IonCol size="6">
                <div className="field-group">
                  <IonInput
                    fill="outline"
                    label="Apellido *"
                    labelPlacement="floating"
                    value={newClient.last_name}
                    onIonChange={(e) => setNewClient(prev => ({ ...prev, last_name: e.detail.value! }))}
                    className={createErrors.last_name ? 'ion-invalid ion-touched' : ''}
                    errorText={createErrors.last_name}
                  />
                </div>
              </IonCol>
            </IonRow>

            <IonRow>
              <IonCol size="12">
                <div className="field-group">
                  <IonInput
                    fill="outline"
                    label="Email"
                    labelPlacement="floating"
                    type="email"
                    value={newClient.email}
                    onIonChange={(e) => handleEmailChange(e.detail.value!)}
                    className={newClient.email && !createErrors.email.isValid ? 'ion-invalid ion-touched' : ''}
                    errorText={newClient.email && !createErrors.email.isValid ? createErrors.email.message : undefined}
                  />
                  {newClient.email && createErrors.email.isValid && (
                    <p className="field-success">Email válido</p>
                  )}
                </div>
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

      <IonActionSheet
        isOpen={showCellphoneInfoSheet}
        cssClass="cellphone-info-sheet"
        header="Información de teléfono"
        subHeader={cellphoneInfoMessage}
        onDidDismiss={() => {
          console.log('[ClientSelector] action sheet dismissed');
          setShowCellphoneInfoSheet(false);
        }}
        buttons={[
          {
            text: 'OK',
            role: 'confirm',
            data: { action: 'ok' },
            handler: () => {
              console.log('[ClientSelector] action sheet OK tapped');
              setShowCellphoneInfoSheet(false);
            },
          },
        ]}
      />
    </IonModal>
  );
};

export default ClientSelector;

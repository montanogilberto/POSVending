import React, { useState, useEffect, useRef } from 'react';
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
} from '@ionic/react';
import { person, close, checkmarkCircle, business } from 'ionicons/icons';
import { Client, getAllClients } from '../api/clientsApi';

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
      setSearchText('');
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
            <IonButton fill="clear" onClick={handleSelectMostrador} className="mostrador-button">
              <IonIcon icon={business} slot="start" />
              Mostrador
            </IonButton>
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
    </IonModal>
  );
};

export default ClientSelector;


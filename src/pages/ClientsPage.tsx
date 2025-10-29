import React, { useState } from 'react';
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
} from '@ionic/react';
import { add, create, trash, pencil } from 'ionicons/icons';
import Header from '../components/Header';
import AlertPopover from '../components/PopOver/AlertPopover';
import MailPopover from '../components/PopOver/MailPopover';

interface Client {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
}

const ClientsPage: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([
    { id: 1, name: 'Juan Pérez', email: 'juan@example.com', phone: '+52 55 1234 5678', address: 'Calle Principal 123' },
    { id: 2, name: 'María García', email: 'maria@example.com', phone: '+52 55 8765 4321', address: 'Avenida Central 456' },
  ]);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [popoverState, setPopoverState] = useState<{ showAlertPopover: boolean; showMailPopover: boolean; event?: Event }>({
    showAlertPopover: false,
    showMailPopover: false,
  });

  const presentAlertPopover = (e: React.MouseEvent) => {
    setPopoverState({ ...popoverState, showAlertPopover: true, event: e.nativeEvent });
  };

  const dismissAlertPopover = () => setPopoverState({ ...popoverState, showAlertPopover: false });

  const presentMailPopover = (e: React.MouseEvent) => {
    setPopoverState({ ...popoverState, showMailPopover: true, event: e.nativeEvent });
  };

  const dismissMailPopover = () => setPopoverState({ ...popoverState, showMailPopover: false });

  const handleDelete = (client: Client) => {
    setSelectedClient(client);
    setShowDeleteAlert(true);
  };

  const confirmDelete = () => {
    if (selectedClient) {
      setClients(clients.filter(c => c.id !== selectedClient.id));
      setSelectedClient(null);
    }
    setShowDeleteAlert(false);
  };

  const handleCreate = () => {
    // TODO: Implement create client modal/form
    console.log('Create new client');
  };

  const handleEdit = (client: Client) => {
    // TODO: Implement edit client modal/form
    console.log('Edit client:', client);
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
        <IonList>
          {clients.map((client) => (
            <IonCard key={client.id}>
              <IonCardHeader>
                <IonCardTitle>{client.name}</IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <p><strong>Email:</strong> {client.email}</p>
                <p><strong>Teléfono:</strong> {client.phone}</p>
                <p><strong>Dirección:</strong> {client.address}</p>
                <IonButtons slot="end">
                  <IonButton fill="clear" color="primary" onClick={() => handleEdit(client)}>
                    <IonIcon icon={pencil} />
                  </IonButton>
                  <IonButton fill="clear" color="danger" onClick={() => handleDelete(client)}>
                    <IonIcon icon={trash} />
                  </IonButton>
                </IonButtons>
              </IonCardContent>
            </IonCard>
          ))}
        </IonList>

        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton onClick={handleCreate}>
            <IonIcon icon={add} />
          </IonFabButton>
        </IonFab>

        <IonAlert
          isOpen={showDeleteAlert}
          onDidDismiss={() => setShowDeleteAlert(false)}
          header="Confirmar eliminación"
          message={`¿Estás seguro de que quieres eliminar al cliente ${selectedClient?.name}?`}
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

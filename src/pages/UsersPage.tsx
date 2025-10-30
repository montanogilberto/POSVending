import React, { useState, useRef } from 'react';
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
  IonCardSubtitle,
  IonFab,
  IonFabButton,
  IonAlert,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonModal,
  IonImg,
  IonAvatar,
  IonGrid,
  IonRow,
  IonCol,
} from '@ionic/react';
import { add, create, trash, pencil, camera, person } from 'ionicons/icons';
import Header from '../components/Header';
import AlertPopover from '../components/PopOver/AlertPopover';
import MailPopover from '../components/PopOver/MailPopover';

interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'employee';
  avatar: string;
  status: 'active' | 'inactive';
}

const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([
    {
      id: 1,
      name: 'Admin User',
      email: 'admin@posgmo.com',
      role: 'admin',
      avatar: 'logo192.png',
      status: 'active',
    },
    {
      id: 2,
      name: 'Manager User',
      email: 'manager@posgmo.com',
      role: 'manager',
      avatar: 'logo192.png',
      status: 'active',
    },
    {
      id: 3,
      name: 'Employee User',
      email: 'employee@posgmo.com',
      role: 'employee',
      avatar: 'logo192.png',
      status: 'inactive',
    },
  ]);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'employee' as 'admin' | 'manager' | 'employee',
    avatar: '',
    status: 'active' as 'active' | 'inactive',
  });
  const [popoverState, setPopoverState] = useState<{ showAlertPopover: boolean; showMailPopover: boolean; event?: Event }>({
    showAlertPopover: false,
    showMailPopover: false,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const presentAlertPopover = (e: React.MouseEvent) => {
    setPopoverState({ showAlertPopover: true, showMailPopover: false, event: e.nativeEvent });
  };

  const dismissAlertPopover = () => {
    setPopoverState({ showAlertPopover: false, showMailPopover: false });
  };

  const presentMailPopover = (e: React.MouseEvent) => {
    setPopoverState({ showAlertPopover: false, showMailPopover: true, event: e.nativeEvent });
  };

  const dismissMailPopover = () => {
    setPopoverState({ showAlertPopover: false, showMailPopover: false });
  };

  const handleDelete = (user: User) => {
    setSelectedUser(user);
    setShowDeleteAlert(true);
  };

  const confirmDelete = () => {
    if (selectedUser) {
      setUsers(users.filter(u => u.id !== selectedUser.id));
      setSelectedUser(null);
    }
    setShowDeleteAlert(false);
  };

  const handleCreate = () => {
    setEditingUser(null);
    setFormData({
      name: '',
      email: '',
      role: 'employee',
      avatar: '',
      status: 'active',
    });
    setShowModal(true);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      status: user.status,
    });
    setShowModal(true);
  };

  const handleSave = () => {
    if (editingUser) {
      // Edit existing
      setUsers(users.map(user =>
        user.id === editingUser.id
          ? { ...user, ...formData }
          : user
      ));
    } else {
      // Create new
      const newUser: User = {
        id: Math.max(...users.map(u => u.id)) + 1,
        ...formData,
      };
      setUsers([...users, newUser]);
    }
    setShowModal(false);
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setFormData({ ...formData, avatar: e.target?.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'manager': return 'Gerente';
      case 'employee': return 'Empleado';
      default: return role;
    }
  };

  const getStatusColor = (status: string) => {
    return status === 'active' ? 'success' : 'danger';
  };

  return (
    <IonPage>
      <Header
        presentAlertPopover={presentAlertPopover}
        presentMailPopover={presentMailPopover}
        screenTitle="Usuarios"
        showBackButton={true}
        backButtonText="Menú"
        backButtonHref="/Laundry"
      />

      <IonContent>
        <IonGrid>
          <IonRow>
            {users.map((user) => (
              <IonCol size="12" sizeMd="6" sizeLg="4" key={user.id}>
                <IonCard>
                  <IonCardHeader>
                    <IonAvatar style={{ margin: '0 auto 10px' }}>
                      <IonImg src={user.avatar} />
                    </IonAvatar>
                    <IonCardTitle>{user.name}</IonCardTitle>
                    <IonCardSubtitle>{user.email}</IonCardSubtitle>
                  </IonCardHeader>
                  <IonCardContent>
                    <p><strong>Rol:</strong> {getRoleLabel(user.role)}</p>
                    <p><strong>Estado:</strong>
                      <IonIcon
                        icon={person}
                        color={getStatusColor(user.status)}
                        style={{ marginLeft: '8px' }}
                      />
                      {user.status === 'active' ? 'Activo' : 'Inactivo'}
                    </p>
                    <IonButtons slot="end">
                      <IonButton fill="clear" color="primary" onClick={() => handleEdit(user)}>
                        <IonIcon icon={pencil} />
                      </IonButton>
                      <IonButton fill="clear" color="danger" onClick={() => handleDelete(user)}>
                        <IonIcon icon={trash} />
                      </IonButton>
                    </IonButtons>
                  </IonCardContent>
                </IonCard>
              </IonCol>
            ))}
          </IonRow>
        </IonGrid>

        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton onClick={handleCreate}>
            <IonIcon icon={add} />
          </IonFabButton>
        </IonFab>

        <IonModal isOpen={showModal} onDidDismiss={() => setShowModal(false)}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>{editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setShowModal(false)}>Cancelar</IonButton>
                <IonButton onClick={handleSave}>Guardar</IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent>
            <IonList>
              <IonItem>
                <IonLabel position="stacked">Nombre</IonLabel>
                <IonInput
                  value={formData.name}
                  onIonChange={(e) => setFormData({ ...formData, name: e.detail.value! })}
                  placeholder="Nombre completo"
                />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Email</IonLabel>
                <IonInput
                  type="email"
                  value={formData.email}
                  onIonChange={(e) => setFormData({ ...formData, email: e.detail.value! })}
                  placeholder="correo@ejemplo.com"
                />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Rol</IonLabel>
                <IonSelect
                  value={formData.role}
                  onIonChange={(e) => setFormData({ ...formData, role: e.detail.value })}
                >
                  <IonSelectOption value="employee">Empleado</IonSelectOption>
                  <IonSelectOption value="manager">Gerente</IonSelectOption>
                  <IonSelectOption value="admin">Administrador</IonSelectOption>
                </IonSelect>
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Estado</IonLabel>
                <IonSelect
                  value={formData.status}
                  onIonChange={(e) => setFormData({ ...formData, status: e.detail.value })}
                >
                  <IonSelectOption value="active">Activo</IonSelectOption>
                  <IonSelectOption value="inactive">Inactivo</IonSelectOption>
                </IonSelect>
              </IonItem>
              <IonItem>
                <IonLabel>Avatar</IonLabel>
                <IonButton fill="clear" onClick={triggerFileInput}>
                  <IonIcon icon={camera} slot="start" />
                  {formData.avatar ? 'Cambiar avatar' : 'Seleccionar avatar'}
                </IonButton>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  style={{ display: 'none' }}
                />
              </IonItem>
              {formData.avatar && (
                <IonItem>
                  <IonAvatar style={{ margin: '0 auto' }}>
                    <IonImg src={formData.avatar} />
                  </IonAvatar>
                </IonItem>
              )}
            </IonList>
          </IonContent>
        </IonModal>

        <IonAlert
          isOpen={showDeleteAlert}
          onDidDismiss={() => setShowDeleteAlert(false)}
          header="Confirmar eliminación"
          message={`¿Estás seguro de que quieres eliminar al usuario ${selectedUser?.name}?`}
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

export default UsersPage;

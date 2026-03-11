import React, { useState, useRef, useMemo } from 'react';
import './UsersPage.css';
import {
  IonPage,
  IonContent,
  IonButton,
  IonIcon,
  IonList,
  IonCard,
  IonCardTitle,
  IonFab,
  IonFabButton,
  IonAlert,
  IonModal,
  IonInput,
  IonItem,
  IonLabel,
  IonSelect,
  IonSelectOption,
  IonAvatar,
  IonImg,
  IonSearchbar,
  IonTextarea,
} from '@ionic/react';
import { add, trash, pencil, camera, personCircle } from 'ionicons/icons';
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

type UserFilter = 'all' | 'active' | 'inactive';

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
  const [popoverState, setPopoverState] = useState<{ showAlertPopover: boolean; showMailPopover: boolean; event?: Event }>({
    showAlertPopover: false,
    showMailPopover: false,
  });

  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<Partial<User> | null>(null);
  const [formData, setFormData] = useState<Partial<User>>({
    name: '',
    email: '',
    role: 'employee',
    avatar: '',
    status: 'active',
  });

  const [searchText, setSearchText] = useState('');
  const [activeFilter, setActiveFilter] = useState<UserFilter>('all');

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
      setUsers(users.map(user =>
        user.id === editingUser.id
          ? { ...user, ...formData } as User
          : user
      ));
    } else {
      const nextId = users.length ? Math.max(...users.map(u => u.id)) + 1 : 1;
      const newUser: User = {
        id: nextId,
        name: formData.name || '',
        email: formData.email || '',
        role: (formData.role as User['role']) || 'employee',
        avatar: formData.avatar || '',
        status: (formData.status as User['status']) || 'active',
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

  const getStatusLabel = (status: string) => (status === 'active' ? 'Activo' : 'Inactivo');

  const filteredUsers = useMemo(() => {
    let result = [...users];

    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      result = result.filter((u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        getRoleLabel(u.role).toLowerCase().includes(q)
      );
    }

    if (activeFilter === 'active') {
      result = result.filter((u) => u.status === 'active');
    } else if (activeFilter === 'inactive') {
      result = result.filter((u) => u.status === 'inactive');
    }

    return result.sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }, [users, searchText, activeFilter]);

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

      <IonContent className="users-content">
        <div className="users-search-section">
          <div className="users-search-row">
            <IonSearchbar
              className="users-searchbar"
              placeholder="Buscar por nombre, email o rol"
              value={searchText}
              onIonInput={(e) => setSearchText(e.detail.value ?? '')}
              debounce={200}
              animated={false}
            />
          </div>

          <div className="users-chips-row">
            <button
              className={`users-chip${activeFilter === 'all' ? ' active' : ''}`}
              onClick={() => setActiveFilter('all')}
            >
              Todos
            </button>
            <button
              className={`users-chip${activeFilter === 'active' ? ' active' : ''}`}
              onClick={() => setActiveFilter('active')}
            >
              Activos
            </button>
            <button
              className={`users-chip${activeFilter === 'inactive' ? ' active' : ''}`}
              onClick={() => setActiveFilter('inactive')}
            >
              Inactivos
            </button>
          </div>
        </div>

        <p className="users-results-count">
          {filteredUsers.length} {filteredUsers.length === 1 ? 'usuario' : 'usuarios'}
          {searchText.trim() ? ` para "${searchText.trim()}"` : ''}
        </p>

        <IonList className="users-list">
          {filteredUsers.map((user) => (
            <IonCard key={user.id} className="user-card">
              <div className="user-card-body">
                <div className="user-left">
                  {user.avatar ? (
                    <IonAvatar className="user-avatar">
                      <IonImg src={user.avatar} />
                    </IonAvatar>
                  ) : (
                    <div className="user-fallback-icon">
                      <IonIcon icon={personCircle} />
                    </div>
                  )}
                </div>

                <div className="user-main">
                  <IonCardTitle className="user-name">{user.name}</IonCardTitle>
                  <p className="user-subtitle">{user.email}</p>

                  <div className="user-meta-row">
                    <span className="user-meta-badge">
                      <span className="meta-label">Rol</span>
                      <span className="meta-value">{getRoleLabel(user.role)}</span>
                    </span>
                    <span className="user-meta-badge">
                      <span className="meta-label">Estado</span>
                      <span className={`meta-value ${user.status === 'active' ? 'status-active' : 'status-inactive'}`}>
                        {getStatusLabel(user.status)}
                      </span>
                    </span>
                  </div>
                </div>

                <div className="user-actions">
                  <IonButton
                    fill="outline"
                    size="small"
                    color="primary"
                    className="user-action-btn edit"
                    onClick={() => handleEdit(user)}
                  >
                    <IonIcon icon={pencil} slot="start" />
                    Editar
                  </IonButton>
                  <IonButton
                    fill="outline"
                    size="small"
                    color="danger"
                    className="user-action-btn delete"
                    onClick={() => handleDelete(user)}
                  >
                    <IonIcon icon={trash} slot="start" />
                    Eliminar
                  </IonButton>
                </div>
              </div>
            </IonCard>
          ))}
        </IonList>

        <div style={{ height: '88px' }} />

        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton onClick={handleCreate} className="users-fab">
            <IonIcon icon={add} />
          </IonFabButton>
        </IonFab>

        <IonModal isOpen={showModal} onDidDismiss={() => setShowModal(false)}>
          <IonItem lines="none" className="users-modal-title-item">
            <IonLabel className="users-modal-title">
              {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
            </IonLabel>
          </IonItem>
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

            <div className="users-modal-actions">
              <IonButton onClick={() => setShowModal(false)} fill="outline">Cancelar</IonButton>
              <IonButton onClick={handleSave}>Guardar</IonButton>
            </div>
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

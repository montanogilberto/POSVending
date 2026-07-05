import React, { useState, useEffect, useMemo } from 'react';
import './shared-card-list.css';
import { IonPage, IonContent, IonList, IonItem, IonLabel, IonText, IonLoading, IonToast, IonFab, IonFabButton, IonIcon, IonAlert, IonModal, IonInput, IonSelect, IonSelectOption, IonDatetime, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonSearchbar, IonButton, IonInfiniteScroll, IonInfiniteScrollContent, DatetimeChangeEventDetail, InputInputEventDetail, SelectChangeEventDetail } from '@ionic/react';
import { addOutline, notificationsOutline, createOutline, trashOutline, eyeOutline, closeOutline, informationCircleOutline, checkmarkCircleOutline, warningOutline, alertCircleOutline, cogOutline } from 'ionicons/icons';
import { IonHeader, IonToolbar, IonTitle, IonButtons } from '@ionic/react';
import Header from '../components/Header';
import AlertPopover from '../components/PopOver/AlertPopover';
import MailPopover from '../components/PopOver/MailPopover';
import { useUser } from '../components/UserContext';
import { PushNotification, getAllPushNotifications, createPushNotification, updatePushNotification, deletePushNotification } from '../api/pushNotificationsApi';

const toHermosillo = (utc: string | undefined): string => {
  if (!utc) return '';
  const d = new Date(utc.includes('Z') ? utc : utc + 'Z');
  return new Date(d.getTime() - 7 * 60 * 60 * 1000).toLocaleString();
};

const PushNotificationPage: React.FC = () => {
  const { companyId } = useUser();
  const [pushNotifications, setPushNotifications] = useState<PushNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchText, setSearchText] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<PushNotification | null>(null);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [offset, setOffset] = useState(0);
  const [limit] = useState(20);
  const [canLoadMore, setCanLoadMore] = useState(true);

  const [popoverState, setPopoverState] = useState<{ showAlertPopover: boolean; showMailPopover: boolean; event?: Event }>({ showAlertPopover: false, showMailPopover: false });

  const presentAlertPopover = (e: React.MouseEvent) => setPopoverState({ ...popoverState, showAlertPopover: true, event: e.nativeEvent });
  const dismissAlertPopover = () => setPopoverState({ ...popoverState, showAlertPopover: false });
  const presentMailPopover = (e: React.MouseEvent) => setPopoverState({ ...popoverState, showMailPopover: true, event: e.nativeEvent });
  const dismissMailPopover = () => setPopoverState({ ...popoverState, showMailPopover: false });

  const fetchPushNotifications = async (offsetVal: number, initialLoad: boolean) => {
    if (loading || (!canLoadMore && !initialLoad)) return;
    setLoading(true);
    try {
      const fetchedNotifications = await getAllPushNotifications(companyId);
      if (initialLoad) {
        setPushNotifications(fetchedNotifications);
        setOffset(limit);
        setCanLoadMore(fetchedNotifications.length === limit);
      } else {
        setPushNotifications((prev) => [...prev, ...fetchedNotifications]);
        setOffset((prev) => prev + limit);
        setCanLoadMore(fetchedNotifications.length === limit);
      }
    } catch (err) {
      setError((err as Error).message ?? 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (companyId) {
      fetchPushNotifications(0, true);
    }
  }, [companyId]);

  const filteredNotifications = useMemo(() => {
    if (!searchText) {
      return pushNotifications;
    }
    return pushNotifications.filter(
      (notification) =>
        notification.title.toLowerCase().includes(searchText.toLowerCase()) ||
        notification.message.toLowerCase().includes(searchText.toLowerCase()) ||
        notification.notificationType.toLowerCase().includes(searchText.toLowerCase()) ||
        notification.priority.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [pushNotifications, searchText]);

  const handleCreateClick = () => {
    setSelectedNotification(null);
    setShowCreateModal(true);
  };

  const handleEditClick = (notification: PushNotification) => {
    setSelectedNotification(notification);
    setShowCreateModal(true);
  };

  const handleDetailsClick = async (notification: PushNotification) => {
    setSelectedNotification(notification);
    setShowDetailsModal(true);
    if (!notification.isRead) {
      try {
        await updatePushNotification(notification.pushNotificationId, { isRead: true, companyId });
        setPushNotifications((prev) =>
          prev.map((n) => n.pushNotificationId === notification.pushNotificationId ? { ...n, isRead: true } : n)
        );
      } catch { }
    }
  };

  const handleDeleteClick = (notification: PushNotification) => {
    setSelectedNotification(notification);
    setShowDeleteAlert(true);
  };

  const confirmDelete = async () => {
    if (selectedNotification) {
      setLoading(true);
      try {
        await deletePushNotification(selectedNotification.pushNotificationId, companyId);
        setPushNotifications(pushNotifications.filter(n => n.pushNotificationId !== selectedNotification.pushNotificationId));
        setError('Notificación eliminada con éxito.');
      } catch (err) {
        setError((err as Error).message ?? 'Error al eliminar notificación');
      } finally {
        setLoading(false);
        setShowDeleteAlert(false);
      }
    }
  };

  const handleSaveNotification = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedNotification) return;

    setLoading(true);
    try {
      const payload = {
        companyId: companyId,
        title: selectedNotification.title,
        message: selectedNotification.message,
        notificationType: selectedNotification.notificationType,
        priority: selectedNotification.priority,
        targetType: selectedNotification.targetType,
        targetUserId: selectedNotification.targetUserId,
        targetRoleId: selectedNotification.targetRoleId,
        targetCompanyId: selectedNotification.targetCompanyId,
        navigationRoute: selectedNotification.navigationRoute,
        isRead: selectedNotification.isRead, // isRead and isSent handled by backend for create/update context
        isSent: selectedNotification.isSent,
        scheduledAt: selectedNotification.scheduledAt,
        payloadJson: selectedNotification.payloadJson,
      };

      if (selectedNotification.pushNotificationId) {
        await updatePushNotification(selectedNotification.pushNotificationId, payload);
        setPushNotifications(pushNotifications.map(n => n.pushNotificationId === selectedNotification.pushNotificationId ? { ...selectedNotification, ...payload } as PushNotification : n));
      } else {
        const newNotification = await createPushNotification(payload);
        setPushNotifications([newNotification, ...pushNotifications]);
      }
      setShowCreateModal(false);
      setError('Notificación guardada con éxito.');
    } catch (err) {
      setError((err as Error).message ?? 'Error al guardar notificación');
    } finally {
      setLoading(false);
    }
  };

  const loadMoreItems = (ev: CustomEvent<void>) => {
    fetchPushNotifications(offset, false);
    (ev.target as HTMLIonInfiniteScrollElement).complete();
  };

  return (
    <IonPage>
      <Header
        presentAlertPopover={presentAlertPopover}
        presentMailPopover={presentMailPopover}
        screenTitle="Notificaciones — POS GMO"
      />
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

      <IonContent fullscreen className="push-notifications-page">
        <IonLoading isOpen={loading} message="Cargando Notificaciones..." />
        <IonToast
          isOpen={!!error}
          message={error}
          duration={3000}
          onDidDismiss={() => setError('')}
          color="danger"
        />

        <IonSearchbar
          className="push-notifications-searchbar"
          value={searchText}
          onIonChange={(e: CustomEvent<InputInputEventDetail>) => setSearchText(e.detail.value!)}
          placeholder="Buscar notificaciones..."
        />

        <div className="pn-list">
          {filteredNotifications.length === 0 && !loading && (
            <div className="empty-state">
              <IonIcon icon={notificationsOutline} className="empty-icon" />
              <IonText color="medium"><p>{searchText ? 'Sin resultados' : 'No hay notificaciones'}</p></IonText>
            </div>
          )}
          {filteredNotifications.map((notification) => {
            const typeIcon = {
              Info: informationCircleOutline,
              Success: checkmarkCircleOutline,
              Warning: warningOutline,
              Error: alertCircleOutline,
              System: cogOutline,
            }[notification.notificationType] ?? notificationsOutline;

            const typeColor = {
              Info: '#3b82f6',
              Success: '#10b981',
              Warning: '#f59e0b',
              Error: '#ef4444',
              System: '#6b7280',
            }[notification.notificationType] ?? '#3b82f6';

            const priorityColor = {
              Low: '#6b7280',
              Normal: '#3b82f6',
              High: '#f59e0b',
              Critical: '#ef4444',
            }[notification.priority] ?? '#3b82f6';

            return (
              <IonCard key={notification.pushNotificationId} className="client-card">
                <IonCardContent className="client-card-content">
                  <div className="client-card-row">
                    <div className="client-left">
                      <div className="pn-type-icon" style={{ background: typeColor + '18', color: typeColor }}>
                        <IonIcon icon={typeIcon} />
                      </div>
                    </div>
                    <div className="client-main">
                      <div className="client-header">
                        <span className="client-name">{notification.title}</span>
                        <span className={`pn-read-badge ${notification.isRead ? 'pn-read' : 'pn-unread'}`}>
                          {notification.isRead ? 'Leída' : 'No leída'}
                        </span>
                      </div>
                      <p className="client-subtitle">{notification.message.substring(0, 90)}{notification.message.length > 90 ? '…' : ''}</p>
                      <div className="client-meta-row">
                        <span className="client-meta-badge">
                          <span className="meta-label">Tipo</span>
                          <span className="meta-value" style={{ color: typeColor }}>{notification.notificationType}</span>
                        </span>
                        <span className="client-meta-badge">
                          <span className="meta-label">Prioridad</span>
                          <span className="meta-value" style={{ color: priorityColor }}>{notification.priority}</span>
                        </span>
                        {notification.sentAt && (
                          <span className="client-meta-badge">
                            <span className="meta-label">Enviada</span>
                            <span className="meta-value">{toHermosillo(notification.sentAt)}</span>
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="client-actions">
                      <IonButton fill="outline" size="small" color="medium" onClick={() => handleDetailsClick(notification)} className="action-button">
                        <IonIcon icon={eyeOutline} slot="start" /> Detalles
                      </IonButton>
                      <IonButton fill="outline" size="small" color="primary" onClick={() => handleEditClick(notification)} className="action-button edit-button">
                        <IonIcon icon={createOutline} slot="start" /> Editar
                      </IonButton>
                      <IonButton fill="outline" size="small" color="danger" onClick={() => handleDeleteClick(notification)} className="action-button delete-button">
                        <IonIcon icon={trashOutline} slot="start" /> Eliminar
                      </IonButton>
                    </div>
                  </div>
                </IonCardContent>
              </IonCard>
            );
          })}
        </div>

        <IonInfiniteScroll onIonInfinite={loadMoreItems} threshold="100px" disabled={!canLoadMore || searchText !== ''}>
          <IonInfiniteScrollContent loadingText="Cargando más notificaciones..."></IonInfiniteScrollContent>
        </IonInfiniteScroll>

        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton onClick={handleCreateClick}>
            <IonIcon icon={addOutline} />
          </IonFabButton>
        </IonFab>

        {/* Create/Edit Notification Modal */}
        <IonModal isOpen={showCreateModal} onDidDismiss={() => setShowCreateModal(false)} className="push-notifications-modal">
          <IonHeader>
            <IonToolbar>
              <IonTitle>{selectedNotification?.pushNotificationId ? 'Editar Notificación' : 'Crear Notificación'}</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setShowCreateModal(false)}>
                  <IonIcon icon={closeOutline} slot="icon-only" />
                </IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            <form onSubmit={handleSaveNotification}>
              <IonItem>
                <IonLabel position="floating">Título</IonLabel>
                <IonInput
                  value={selectedNotification?.title}
                  onIonChange={(e: CustomEvent<InputInputEventDetail>) => setSelectedNotification({ ...selectedNotification!, title: e.detail.value! })}
                  required
                ></IonInput>
              </IonItem>
              <IonItem>
                <IonLabel position="floating">Mensaje</IonLabel>
                <IonInput
                  value={selectedNotification?.message}
                  onIonChange={(e: CustomEvent<InputInputEventDetail>) => setSelectedNotification({ ...selectedNotification!, message: e.detail.value! })}
                  required
                ></IonInput>
              </IonItem>
              <IonItem>
                <IonLabel position="floating">Tipo de Notificación</IonLabel>
                <IonSelect
                  value={selectedNotification?.notificationType}
                  onIonChange={(e: CustomEvent<SelectChangeEventDetail>) => setSelectedNotification({ ...selectedNotification!, notificationType: e.detail.value! })}
                  required
                >
                  <IonSelectOption value="Info">Info</IonSelectOption>
                  <IonSelectOption value="Success">Success</IonSelectOption>
                  <IonSelectOption value="Warning">Warning</IonSelectOption>
                  <IonSelectOption value="Error">Error</IonSelectOption>
                  <IonSelectOption value="System">System</IonSelectOption>
                </IonSelect>
              </IonItem>
              <IonItem>
                <IonLabel position="floating">Prioridad</IonLabel>
                <IonSelect
                  value={selectedNotification?.priority}
                  onIonChange={(e: CustomEvent<SelectChangeEventDetail>) => setSelectedNotification({ ...selectedNotification!, priority: e.detail.value! })}
                  required
                >
                  <IonSelectOption value="Low">Baja</IonSelectOption>
                  <IonSelectOption value="Normal">Normal</IonSelectOption>
                  <IonSelectOption value="High">Alta</IonSelectOption>
                  <IonSelectOption value="Critical">Crítica</IonSelectOption>
                </IonSelect>
              </IonItem>
              <IonItem>
                <IonLabel position="floating">Tipo de Objetivo</IonLabel>
                <IonSelect
                  value={selectedNotification?.targetType}
                  onIonChange={(e: CustomEvent<SelectChangeEventDetail>) => setSelectedNotification({ ...selectedNotification!, targetType: e.detail.value! })}
                  required
                >
                  <IonSelectOption value="User">Usuario</IonSelectOption>
                  <IonSelectOption value="Role">Rol</IonSelectOption>
                  <IonSelectOption value="Company">Compañía</IonSelectOption>
                  <IonSelectOption value="All">Todos</IonSelectOption>
                </IonSelect>
              </IonItem>
              {selectedNotification?.targetType === 'User' && (
                <IonItem>
                  <IonLabel position="floating">ID de Usuario Objetivo</IonLabel>
                  <IonInput
                    type="number"
                    value={selectedNotification?.targetUserId}
                    onIonChange={(e: CustomEvent<InputInputEventDetail>) => setSelectedNotification({ ...selectedNotification!, targetUserId: parseInt(e.detail.value!, 10) })}
                  ></IonInput>
                </IonItem>
              )}
              {selectedNotification?.targetType === 'Role' && (
                <IonItem>
                  <IonLabel position="floating">ID de Rol Objetivo</IonLabel>
                  <IonInput
                    type="number"
                    value={selectedNotification?.targetRoleId}
                    onIonChange={(e: CustomEvent<InputInputEventDetail>) => setSelectedNotification({ ...selectedNotification!, targetRoleId: parseInt(e.detail.value!, 10) })}
                  ></IonInput>
                </IonItem>
              )}
              {selectedNotification?.targetType === 'Company' && (
                <IonItem>
                  <IonLabel position="floating">ID de Compañía Objetivo</IonLabel>
                  <IonInput
                    type="number"
                    value={selectedNotification?.targetCompanyId}
                    onIonChange={(e: CustomEvent<InputInputEventDetail>) => setSelectedNotification({ ...selectedNotification!, targetCompanyId: parseInt(e.detail.value!, 10) })}
                  ></IonInput>
                </IonItem>
              )}
              <IonItem>
                <IonLabel position="floating">Ruta de Navegación (Opcional)</IonLabel>
                <IonInput
                  value={selectedNotification?.navigationRoute}
                  onIonChange={(e: CustomEvent<InputInputEventDetail>) => setSelectedNotification({ ...selectedNotification!, navigationRoute: e.detail.value! })}
                ></IonInput>
              </IonItem>
              <IonItem>
                <IonLabel position="floating">Programar para (Opcional)</IonLabel>
                <IonDatetime
                  value={selectedNotification?.scheduledAt}
                  onIonChange={(e: CustomEvent<DatetimeChangeEventDetail>) => setSelectedNotification({ ...selectedNotification!, scheduledAt: e.detail.value! as string })}
                  minuteValues="0,15,30,45"
                ></IonDatetime>
              </IonItem>
              <IonItem>
                <IonLabel position="floating">Payload JSON (Opcional)</IonLabel>
                <IonInput
                  value={selectedNotification?.payloadJson}
                  onIonChange={(e: CustomEvent<InputInputEventDetail>) => setSelectedNotification({ ...selectedNotification!, payloadJson: e.detail.value! })}
                ></IonInput>
              </IonItem>
              <IonButton expand="block" type="submit" className="ion-margin-top">
                Guardar Notificación
              </IonButton>
            </form>
          </IonContent>
        </IonModal>

        {/* Notification Details Modal */}
        <IonModal isOpen={showDetailsModal} onDidDismiss={() => setShowDetailsModal(false)} className="push-notifications-modal">
          <IonHeader>
            <IonToolbar>
              <IonTitle>Detalles de Notificación</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setShowDetailsModal(false)}>
                  <IonIcon icon={closeOutline} slot="icon-only" />
                </IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            {selectedNotification && (
              <IonCard>
                <IonCardHeader>
                  <IonCardTitle>{selectedNotification.title}</IonCardTitle>
                </IonCardHeader>
                <IonCardContent>
                  <p><strong>Mensaje:</strong> {selectedNotification.message}</p>
                  <p><strong>Tipo:</strong> {selectedNotification.notificationType}</p>
                  <p><strong>Prioridad:</strong> {selectedNotification.priority}</p>
                  <p><strong>Objetivo:</strong> {selectedNotification.targetType}</p>
                  {selectedNotification.targetUserId && <p><strong>ID Usuario Objetivo:</strong> {selectedNotification.targetUserId}</p>}
                  {selectedNotification.targetRoleId && <p><strong>ID Rol Objetivo:</strong> {selectedNotification.targetRoleId}</p>}
                  {selectedNotification.targetCompanyId && <p><strong>ID Compañía Objetivo:</strong> {selectedNotification.targetCompanyId}</p>}
                  {selectedNotification.navigationRoute && <p><strong>Ruta de Navegación:</strong> {selectedNotification.navigationRoute}</p>}
                  <p><strong>Leída:</strong> {selectedNotification.isRead ? 'Sí' : 'No'}</p>
                  <p><strong>Enviada:</strong> {selectedNotification.isSent ? 'Sí' : 'No'}</p>
                  {selectedNotification.sentAt && <p><strong>Enviada el:</strong> {toHermosillo(selectedNotification.sentAt)}</p>}
                  {selectedNotification.scheduledAt && <p><strong>Programada para:</strong> {toHermosillo(selectedNotification.scheduledAt)}</p>}
                  {selectedNotification.payloadJson && <p><strong>Payload JSON:</strong> {selectedNotification.payloadJson}</p>}
                  <p><strong>Creada el:</strong> {toHermosillo(selectedNotification.created_At)}</p>
                  {selectedNotification.updated_at && <p><strong>Actualizada el:</strong> {toHermosillo(selectedNotification.updated_at)}</p>}
                </IonCardContent>
              </IonCard>
            )}
            <IonButton expand="block" onClick={() => setShowDetailsModal(false)}>Cerrar</IonButton>
          </IonContent>
        </IonModal>

        <IonAlert
          isOpen={showDeleteAlert}
          onDidDismiss={() => setShowDeleteAlert(false)}
          header={'Confirmar Eliminación'}
          message={'¿Estás seguro de que quieres eliminar esta notificación?'}
          buttons={[
            { text: 'Cancelar', role: 'cancel', handler: () => setShowDeleteAlert(false) },
            { text: 'Eliminar', handler: confirmDelete }
          ]}
        />
      </IonContent>
    </IonPage>
  );
};

export default PushNotificationPage;

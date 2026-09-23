import React, { useState, useEffect, useRef } from 'react';
import {
  IonPage, IonContent, IonLoading, IonToast, IonList, IonItem, IonLabel,
  IonButton, IonIcon, IonFab, IonFabButton, IonModal, IonHeader, IonToolbar,
  IonTitle, IonInput, IonSelect, IonSelectOption, IonBadge, IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonRefresher,
  IonRefresherContent
} from '@ionic/react';
import { useIonViewWillEnter } from '@ionic/react-router';
import { useUser } from '../contexts/UserContext';
import Header from '../components/Header';
import AlertPopover from '../components/PopOver/AlertPopover';
import MailPopover from '../components/PopOver/MailPopover';
import {
  add, mailOutline, alertOutline, searchOutline, filterOutline,
  checkmarkCircle, chevronDown, chevronUp, cashOutline, swapHorizontalOutline,
  cardOutline, alertCircleOutline, timeOutline, calendarOutline, trashOutline,
  createOutline
} from 'ionicons/icons';
import {
  InputInputEventDetail,
  SelectChangeEventDetail,
  RefresherEventDetail
} from '@ionic/core'; // Explicitly import generic types for CustomEvent

import {
  TransactionNotification,
  getAllTransactionNotifications,
  createTransactionNotification,
  updateTransactionNotification,
  deleteTransactionNotification
} from '../api/transactionNotificationApi';
import './TransactionNotificationPage.css';

// Helper for UTC-7 conversion
const toHermosillo = (utc: string | undefined): string => {
  if (!utc) return '';
  const d = new Date(utc.includes('Z') ? utc : utc + 'Z');
  return new Date(d.getTime() - 7 * 60 * 60 * 1000).toLocaleString();
};

const PAGE_SIZE = 20;

const TransactionNotificationPage: React.FC = () => {
  const { companyId } = useUser();

  const [notifications, setNotifications] = useState<TransactionNotification[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<TransactionNotification[]>([]);
  const [displayNotifications, setDisplayNotifications] = useState<TransactionNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<TransactionNotification | null>(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [formState, setFormState] = useState<Partial<TransactionNotification>>({});
  const [isEditing, setIsEditing] = useState(false);

  const [searchText, setSearchText] = useState('');
  const [filterMovementType, setFilterMovementType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // Popover state for Header component
  const [popoverState, setPopoverState] = useState<{
    showAlertPopover: boolean;
    showMailPopover: boolean;
    event?: Event;
  }>({ showAlertPopover: false, showMailPopover: false });

  const presentAlertPopover = (e: React.MouseEvent) =>
    setPopoverState({ ...popoverState, showAlertPopover: true, event: e.nativeEvent });
  const dismissAlertPopover = () =>
    setPopoverState({ ...popoverState, showAlertPopover: false });
  const presentMailPopover = (e: React.MouseEvent) =>
    setPopoverState({ ...popoverState, showMailPopover: true, event: e.nativeEvent });
  const dismissMailPopover = () =>
    setPopoverState({ ...popoverState, showMailPopover: false });

  const contentRef = useRef<HTMLIonContentElement>(null);

  const fetchNotifications = async (isRefresher: boolean = false) => {
    if (!companyId) {
      setError('Company ID no está disponible.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await getAllTransactionNotifications(companyId);
      // Sort by created_At descending for newest first
      const sortedData = data.sort((a, b) => new Date(b.created_At).getTime() - new Date(a.created_At).getTime());
      setNotifications(sortedData);
      setPage(0); // Reset page on full fetch
      setHasMore(true);
    } catch (err) {
      setError((err as Error).message ?? 'Error cargando notificaciones de transacciones.');
    } finally {
      setLoading(false);
      if (isRefresher) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        document.getElementById('refresher')?.complete();
      }
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [companyId]);

  // Filter and paginate data whenever notifications, search text, or filters change
  useEffect(() => {
    let currentFiltered = notifications;

    if (searchText) {
      currentFiltered = currentFiltered.filter(n =>
        n.movementType.toLowerCase().includes(searchText.toLowerCase()) ||
        n.channel.toLowerCase().includes(searchText.toLowerCase()) ||
        n.status.toLowerCase().includes(searchText.toLowerCase()) ||
        (n.recipientEmail && n.recipientEmail.toLowerCase().includes(searchText.toLowerCase())) ||
        (n.subject && n.subject.toLowerCase().includes(searchText.toLowerCase())) ||
        (n.bankName && n.bankName.toLowerCase().includes(searchText.toLowerCase())) ||
        (n.bankLast4 && n.bankLast4.toLowerCase().includes(searchText.toLowerCase())) ||
        n.amount.toFixed(2).includes(searchText)
      );
    }

    if (filterMovementType) {
      currentFiltered = currentFiltered.filter(n => n.movementType === filterMovementType);
    }

    if (filterStatus) {
      currentFiltered = currentFiltered.filter(n => n.status === filterStatus);
    }

    setFilteredNotifications(currentFiltered);
    setDisplayNotifications(currentFiltered.slice(0, PAGE_SIZE));
    setPage(1); // Start with page 1 as initial data is PAGE_SIZE
    setHasMore(currentFiltered.length > PAGE_SIZE);
  }, [notifications, searchText, filterMovementType, filterStatus]);


  useIonViewWillEnter(() => {
    fetchNotifications();
  }, [companyId]);

  const loadMoreItems = (event: CustomEvent<void>) => {
    const nextPage = page + 1;
    const newItems = filteredNotifications.slice(0, nextPage * PAGE_SIZE);
    setDisplayNotifications(newItems);
    setPage(nextPage);
    if (newItems.length === filteredNotifications.length) {
      setHasMore(false);
    }
    (event.target as HTMLIonInfiniteScrollElement).complete();
  };

  const handleOpenDetailModal = (notification: TransactionNotification) => {
    setSelectedNotification(notification);
    setShowDetailModal(true);
  };

  const handleOpenCreateForm = () => {
    setIsEditing(false);
    setFormState({});
    setShowFormModal(true);
  };

  const handleOpenEditForm = (notification: TransactionNotification) => {
    setIsEditing(true);
    setFormState(notification);
    setSelectedNotification(notification); // Also set selected for context if needed
    setShowFormModal(true);
  };

  const handleSaveNotification = async () => {
    if (!companyId) {
      setError('Company ID no está disponible.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (isEditing && formState.transactionNotificationId) {
        await updateTransactionNotification(formState.transactionNotificationId, { ...formState, companyId: companyId });
      } else {
        await createTransactionNotification({ ...formState, companyId: companyId } as Omit<TransactionNotification, "transactionNotificationId" | "created_At" | "updated_at">);
      }
      setShowFormModal(false);
      await fetchNotifications();
    } catch (err) {
      setError((err as Error).message ?? `Error al ${isEditing ? 'actualizar' : 'crear'} la notificación.`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteNotification = async (id: number) => {
    if (!companyId) {
      setError('Company ID no está disponible.');
      return;
    }
    setLoading(true); // Reusing loading for delete operation
    setError('');
    try {
      await deleteTransactionNotification(id, companyId);
      await fetchNotifications();
    } catch (err) {
      setError((err as Error).message ?? 'Error al eliminar la notificación.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async (event: CustomEvent<RefresherEventDetail>) => {
    await fetchNotifications(true);
    event.detail.complete();
  };

  // Extract unique movement types and statuses for filters
  const uniqueMovementTypes = Array.from(new Set(notifications.map(n => n.movementType)));
  const uniqueStatuses = Array.from(new Set(notifications.map(n => n.status)));

  return (
    <IonPage className="transaction-notification-page">
      <Header
        presentAlertPopover={presentAlertPopover}
        presentMailPopover={presentMailPopover}
        screenTitle="Movimientos — POS GMO"
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

      <IonContent fullscreen ref={contentRef} className="ion-padding">
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh} id="refresher">
          <IonRefresherContent />
        </IonRefresher>

        <IonLoading isOpen={loading} message="Cargando notificaciones..." />
        <IonToast
          isOpen={!!error}
          message={error}
          duration={3000}
          onDidDismiss={() => setError('')}
          color="danger"
        />

        <div className="filters-container">
          <IonSearchbar
            value={searchText}
            onIonInput={(e: CustomEvent<InputInputEventDetail>) => setSearchText(e.detail.value!)}
            placeholder="Buscar por tipo, canal, estado..."
            debounce={300}
          />
          <IonSelect
            label="Tipo de Movimiento"
            labelPlacement="floating"
            fill="outline"
            value={filterMovementType}
            onIonChange={(e: CustomEvent<SelectChangeEventDetail>) => setFilterMovementType(e.detail.value)}
          >
            <IonSelectOption value="">Todos</IonSelectOption>
            {uniqueMovementTypes.map(type => (
              <IonSelectOption key={type} value={type}>{type}</IonSelectOption>
            ))}
          </IonSelect>
          <IonSelect
            label="Estado"
            labelPlacement="floating"
            fill="outline"
            value={filterStatus}
            onIonChange={(e: CustomEvent<SelectChangeEventDetail>) => setFilterStatus(e.detail.value)}
          >
            <IonSelectOption value="">Todos</IonSelectOption>
            {uniqueStatuses.map(status => (
              <IonSelectOption key={status} value={status}>{status}</IonSelectOption>
            ))}
          </IonSelect>
        </div>

        <IonList className="notification-list">
          {displayNotifications.length === 0 && !loading && !error && (
            <p className="ion-text-center">No hay notificaciones de transacciones para mostrar.</p>
          )}

          {displayNotifications.map((notification) => (
            <IonItem key={notification.transactionNotificationId} button onClick={() => handleOpenDetailModal(notification)} className="notification-item">
              <IonIcon
                slot="start"
                icon={getMovementIcon(notification.movementType)}
                className={`movement-icon movement-icon-${notification.movementType.toLowerCase().replace(/\s/g, '-')}`}
              />
              <IonLabel>
                <h2>{notification.movementType} - {notification.channel}</h2>
                <p>Monto: <strong>{notification.currency} {notification.amount.toFixed(2)}</strong></p>
                <p>Cliente ID: {notification.clientId}</p>
                <p>Fecha: {toHermosillo(notification.created_At)}</p>
              </IonLabel>
              <IonBadge slot="end" className={`status-badge status-${notification.status.toLowerCase().replace(/\s/g, '-')}`}>
                {notification.status}
              </IonBadge>
              {/* No direct edit/delete on list item for detail view pattern, but kept for potential future use */}
              {/* <IonButton fill="clear" color="medium" slot="end" onClick={(e) => { e.stopPropagation(); handleOpenEditForm(notification); }}>
                <IonIcon icon={createOutline} />
              </IonButton>
              <IonButton fill="clear" color="danger" slot="end" onClick={(e) => { e.stopPropagation(); handleDeleteNotification(notification.transactionNotificationId); }}>
                <IonIcon icon={trashOutline} />
              </IonButton> */}
            </IonItem>
          ))}

          <IonInfiniteScroll onIonInfinite={loadMoreItems} threshold="100px" disabled={!hasMore}>
            <IonInfiniteScrollContent loadingSpinner="dots" loadingText="Cargando más notificaciones..." />
          </IonInfiniteScroll>
        </IonList>

        {/* Detail Modal */}
        <IonModal isOpen={showDetailModal} onDidDismiss={() => setShowDetailModal(false)}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>Detalle de Notificación</IonTitle>
              <IonButton slot="end" onClick={() => setShowDetailModal(false)} fill="clear">Cerrar</IonButton>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            {selectedNotification && (
              <div className="notification-detail-card">
                <IonItem lines="none" className="detail-header-item">
                  <IonIcon slot="start" icon={getMovementIcon(selectedNotification.movementType)} className={`movement-icon movement-icon-${selectedNotification.movementType.toLowerCase().replace(/\s/g, '-')}`} />
                  <IonLabel>
                    <h1 className="ion-text-wrap">{selectedNotification.movementType} - {selectedNotification.channel}</h1>
                    <IonBadge className={`status-badge status-${selectedNotification.status.toLowerCase().replace(/\s/g, '-')}`}>
                      {selectedNotification.status}
                    </IonBadge>
                  </IonLabel>
                </IonItem>

                <IonList lines="none" className="detail-fields-list">
                  <IonItem>
                    <IonLabel>ID Notificación:</IonLabel>
                    <p>{selectedNotification.transactionNotificationId}</p>
                  </IonItem>
                  <IonItem>
                    <IonLabel>Cliente ID:</IonLabel>
                    <p>{selectedNotification.clientId}</p>
                  </IonItem>
                  <IonItem>
                    <IonLabel>ID Transacción:</IonLabel>
                    <p>{selectedNotification.transactionId}</p>
                  </IonItem>
                  <IonItem>
                    <IonLabel>Monto:</IonLabel>
                    <p><strong>{selectedNotification.currency} {selectedNotification.amount.toFixed(2)}</strong></p>
                  </IonItem>
                  {selectedNotification.recipientEmail && (
                    <IonItem>
                      <IonLabel>Email Destino:</IonLabel>
                      <p>{selectedNotification.recipientEmail}</p>
                    </IonItem>
                  )}
                  {selectedNotification.subject && (
                    <IonItem>
                      <IonLabel>Asunto:</IonLabel>
                      <p>{selectedNotification.subject}</p>
                    </IonItem>
                  )}
                  {selectedNotification.messageBody && (
                    <IonItem>
                      <IonLabel>Cuerpo del Mensaje:</IonLabel>
                      <p>{selectedNotification.messageBody}</p>
                    </IonItem>
                  )}
                  {selectedNotification.stripeReference && (
                    <IonItem>
                      <IonLabel>Referencia Stripe:</IonLabel>
                      <p>{selectedNotification.stripeReference}</p>
                    </IonItem>
                  )}
                  {(selectedNotification.bankName || selectedNotification.bankLast4) && (
                    <IonItem>
                      <IonLabel>Banco:</IonLabel>
                      <p>{selectedNotification.bankName} {selectedNotification.bankLast4 ? `****${selectedNotification.bankLast4}` : ''}</p>
                    </IonItem>
                  )}
                  <IonItem>
                    <IonLabel>Creado el:</IonLabel>
                    <p>{toHermosillo(selectedNotification.created_At)}</p>
                  </IonItem>
                  {selectedNotification.sentAt && (
                    <IonItem>
                      <IonLabel>Enviado el:</IonLabel>
                      <p>{toHermosillo(selectedNotification.sentAt)}</p>
                    </IonItem>
                  )}
                  {selectedNotification.confirmedAt && (
                    <IonItem>
                      <IonLabel>Confirmado el:</IonLabel>
                      <p>{toHermosillo(selectedNotification.confirmedAt)}</p>
                    </IonItem>
                  )}
                  {selectedNotification.failureReason && (
                    <IonItem color="danger">
                      <IonLabel className="ion-text-wrap">Razón de Fallo:</IonLabel>
                      <p className="ion-text-wrap">{selectedNotification.failureReason}</p>
                    </IonItem>
                  )}
                </IonList>
              </div>
            )}
          </IonContent>
        </IonModal>

        {/* Form Modal (Create/Edit) - keeping simple for now, might be expanded later */}
        <IonModal isOpen={showFormModal} onDidDismiss={() => setShowFormModal(false)}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>{isEditing ? 'Editar Notificación' : 'Crear Notificación'}</IonTitle>
              <IonButton slot="end" onClick={() => setShowFormModal(false)} fill="clear">Cancelar</IonButton>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            <div className="form-fields-container">
              <IonInput
                fill="outline" label="Tipo de Movimiento" labelPlacement="floating"
                value={formState.movementType}
                onIonInput={(e: CustomEvent<InputInputEventDetail>) => setFormState({ ...formState, movementType: e.detail.value! })}
              />
              <IonInput
                fill="outline" label="Canal" labelPlacement="floating"
                value={formState.channel}
                onIonInput={(e: CustomEvent<InputInputEventDetail>) => setFormState({ ...formState, channel: e.detail.value! })}
              />
              <IonInput
                fill="outline" label="Estado" labelPlacement="floating"
                value={formState.status}
                onIonInput={(e: CustomEvent<InputInputEventDetail>) => setFormState({ ...formState, status: e.detail.value! })}
              />
              <IonInput
                fill="outline" label="Email Destinatario" labelPlacement="floating" type="email"
                value={formState.recipientEmail}
                onIonInput={(e: CustomEvent<InputInputEventDetail>) => setFormState({ ...formState, recipientEmail: e.detail.value! })}
              />
              <IonInput
                fill="outline" label="Asunto" labelPlacement="floating"
                value={formState.subject}
                onIonInput={(e: CustomEvent<InputInputEventDetail>) => setFormState({ ...formState, subject: e.detail.value! })}
              />
              <IonInput
                fill="outline" label="Cuerpo del Mensaje" labelPlacement="floating"
                value={formState.messageBody}
                onIonInput={(e: CustomEvent<InputInputEventDetail>) => setFormState({ ...formState, messageBody: e.detail.value! })}
              />
              <IonInput
                fill="outline" label="Monto" labelPlacement="floating" type="number"
                value={formState.amount}
                onIonInput={(e: CustomEvent<InputInputEventDetail>) => setFormState({ ...formState, amount: parseFloat(e.detail.value!) })}
              />
              <IonInput
                fill="outline" label="Moneda" labelPlacement="floating"
                value={formState.currency}
                onIonInput={(e: CustomEvent<InputInputEventDetail>) => setFormState({ ...formState, currency: e.detail.value! })}
              />
              {/* Add more fields as needed for creation/editing */}
            </div>
            <IonButton expand="block" onClick={handleSaveNotification} disabled={saving}>
              {saving ? <IonSpinner name="dots" /> : 'Guardar Notificación'}
            </IonButton>
          </IonContent>
        </IonModal>

        {/* Fab button for adding new notifications (if applicable) */}
        {/* <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton onClick={handleOpenCreateForm}>
            <IonIcon icon={add} />
          </IonFabButton>
        </IonFab> */}
      </IonContent>
    </IonPage>
  );
};

// Helper function to determine icon based on movementType
const getMovementIcon = (movementType: string) => {
  switch (movementType.toLowerCase()) {
    case 'top-up':
      return add;
    case 'loan-disbursement':
      return cashOutline;
    case 'repayment':
      return swapHorizontalOutline;
    case 'withdrawal':
      return cardOutline;
    default:
      return alertCircleOutline; // Default icon for unknown types
  }
};

export default TransactionNotificationPage;

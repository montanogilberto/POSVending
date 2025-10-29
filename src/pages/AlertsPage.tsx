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
  IonCardSubtitle,
  IonBadge,
} from '@ionic/react';
import { notifications, warning, checkmarkCircle } from 'ionicons/icons';
import Header from '../components/Header';
import AlertPopover from '../components/PopOver/AlertPopover';
import MailPopover from '../components/PopOver/MailPopover';

interface Alert {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error';
  timestamp: string;
  read: boolean;
}

const AlertsPage: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([
    {
      id: 1,
      title: 'Producto agotado',
      message: 'El producto "Producto A" se ha agotado en el inventario.',
      type: 'warning',
      timestamp: '2024-01-15 10:30',
      read: false,
    },
    {
      id: 2,
      title: 'Nuevo pedido recibido',
      message: 'Se ha recibido un nuevo pedido de Juan Pérez.',
      type: 'info',
      timestamp: '2024-01-15 09:15',
      read: true,
    },
    {
      id: 3,
      title: 'Error en sincronización',
      message: 'Error al sincronizar datos con el servidor.',
      type: 'error',
      timestamp: '2024-01-14 16:45',
      read: false,
    },
  ]);
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

  const markAsRead = (alertId: number) => {
    setAlerts(alerts.map(alert =>
      alert.id === alertId ? { ...alert, read: true } : alert
    ));
  };

  const markAllAsRead = () => {
    setAlerts(alerts.map(alert => ({ ...alert, read: true })));
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'warning': return warning;
      case 'error': return notifications;
      default: return checkmarkCircle;
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'warning': return 'warning';
      case 'error': return 'danger';
      default: return 'primary';
    }
  };

  const unreadCount = alerts.filter(alert => !alert.read).length;

  return (
    <IonPage>
      <Header
        presentAlertPopover={presentAlertPopover}
        presentMailPopover={presentMailPopover}
        screenTitle={`Alertas ${unreadCount > 0 ? `(${unreadCount})` : ''}`}
        showBackButton={true}
        backButtonText="Menú"
        backButtonHref="/Laundry"
      />

      <IonContent>
        {unreadCount > 0 && (
          <IonButton expand="block" onClick={markAllAsRead} style={{ margin: '16px' }}>
            Marcar todas como leídas
          </IonButton>
        )}

        <IonList>
          {alerts.map((alert) => (
            <IonCard key={alert.id} style={{ opacity: alert.read ? 0.7 : 1 }}>
              <IonCardHeader>
                <IonCardTitle style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <IonIcon icon={getAlertIcon(alert.type)} color={getAlertColor(alert.type)} />
                  {alert.title}
                  {!alert.read && <IonBadge color="primary">Nuevo</IonBadge>}
                </IonCardTitle>
                <IonCardSubtitle>{alert.timestamp}</IonCardSubtitle>
              </IonCardHeader>
              <IonCardContent>
                <p>{alert.message}</p>
                {!alert.read && (
                  <IonButton fill="clear" size="small" onClick={() => markAsRead(alert.id)}>
                    Marcar como leído
                  </IonButton>
                )}
              </IonCardContent>
            </IonCard>
          ))}
        </IonList>
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

export default AlertsPage;

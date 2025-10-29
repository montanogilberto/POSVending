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
import { mail, person, checkmarkCircle } from 'ionicons/icons';
import Header from '../components/Header';
import AlertPopover from '../components/PopOver/AlertPopover';
import MailPopover from '../components/PopOver/MailPopover';

interface Email {
  id: number;
  subject: string;
  from: string;
  message: string;
  timestamp: string;
  read: boolean;
}

const EmailsPage: React.FC = () => {
  const [emails, setEmails] = useState<Email[]>([
    {
      id: 1,
      subject: 'Confirmación de pedido',
      from: 'sistema@posgmo.com',
      message: 'Su pedido ha sido confirmado exitosamente.',
      timestamp: '2024-01-15 11:00',
      read: false,
    },
    {
      id: 2,
      subject: 'Actualización de inventario',
      from: 'admin@posgmo.com',
      message: 'Se ha actualizado el inventario de productos.',
      timestamp: '2024-01-15 10:30',
      read: true,
    },
    {
      id: 3,
      subject: 'Recordatorio de mantenimiento',
      from: 'soporte@posgmo.com',
      message: 'Recuerde realizar el mantenimiento semanal del sistema.',
      timestamp: '2024-01-14 14:20',
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

  const markAsRead = (emailId: number) => {
    setEmails(emails.map(email =>
      email.id === emailId ? { ...email, read: true } : email
    ));
  };

  const markAllAsRead = () => {
    setEmails(emails.map(email => ({ ...email, read: true })));
  };

  const unreadCount = emails.filter(email => !email.read).length;

  return (
    <IonPage>
      <Header
        presentAlertPopover={presentAlertPopover}
        presentMailPopover={presentMailPopover}
        screenTitle={`Correos ${unreadCount > 0 ? `(${unreadCount})` : ''}`}
        showBackButton={true}
        backButtonText="Menú"
        backButtonHref="/Laundry"
      />

      <IonContent>
        {unreadCount > 0 && (
          <IonButton expand="block" onClick={markAllAsRead} style={{ margin: '16px' }}>
            Marcar todos como leídos
          </IonButton>
        )}

        <IonList>
          {emails.map((email) => (
            <IonCard key={email.id} style={{ opacity: email.read ? 0.7 : 1 }}>
              <IonCardHeader>
                <IonCardTitle style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <IonIcon icon={mail} color="primary" />
                  {email.subject}
                  {!email.read && <IonBadge color="primary">Nuevo</IonBadge>}
                </IonCardTitle>
                <IonCardSubtitle style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <IonIcon icon={person} size="small" />
                  {email.from}
                  <span style={{ marginLeft: 'auto' }}>{email.timestamp}</span>
                </IonCardSubtitle>
              </IonCardHeader>
              <IonCardContent>
                <p>{email.message}</p>
                {!email.read && (
                  <IonButton fill="clear" size="small" onClick={() => markAsRead(email.id)}>
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

export default EmailsPage;

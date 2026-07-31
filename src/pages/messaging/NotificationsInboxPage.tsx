/**
 * Mis notificaciones — per-user inbox behind the header bell.
 * The system push disappears after it's tapped/cleared; this page is the
 * persistent, trackable history (NotificationDeliveries), with unread
 * highlighting and tap-through to each notification's navigationRoute.
 */
import React, { useCallback, useState } from 'react';
import {
  IonPage, IonContent, IonRefresher, IonRefresherContent, IonIcon, IonBadge,
  IonSpinner, useIonViewWillEnter,
} from '@ionic/react';
import {
  notificationsOutline, checkmarkCircleOutline, alertCircleOutline,
  informationCircleOutline, warningOutline, chevronForwardOutline,
} from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { useUser } from '../../components/UserContext';
import Header from '../../components/Header';
import AlertPopover from '../../components/PopOver/AlertPopover';
import MailPopover from '../../components/PopOver/MailPopover';
import {
  fetchMyNotifications, markNotificationsRead, InboxNotification,
} from '../../api/myNotificationsApi';

const TYPE_ICON: Record<string, string> = {
  Success: checkmarkCircleOutline,
  Warning: warningOutline,
  Error: alertCircleOutline,
  Info: informationCircleOutline,
};
const TYPE_COLOR: Record<string, string> = {
  Success: '#059669', Warning: '#b45309', Error: '#dc2626', Info: '#2563eb',
};

const NotificationsInboxPage: React.FC = () => {
  const history = useHistory();
  const { userId } = useUser();
  const [items, setItems] = useState<InboxNotification[]>([]);
  const [loading, setLoading] = useState(false);

  const [showAlert, setShowAlert] = useState(false);
  const [showMail, setShowMail] = useState(false);
  const [popEvent, setPopEvent] = useState<React.MouseEvent | undefined>();

  const load = useCallback(async (markAll = false) => {
    if (!userId) return;
    setLoading(true);
    try {
      const { notifications } = await fetchMyNotifications(userId);
      setItems(notifications);
      if (markAll && notifications.some(n => !n.isRead)) {
        // Reading the inbox counts as reading the notifications — clears the
        // badge; unread styling on THIS render still shows what was new.
        markNotificationsRead(userId).catch(() => {});
      }
    } catch (e) {
      console.log('[Inbox] load ❌', String(e));
    }
    setLoading(false);
  }, [userId]);

  useIonViewWillEnter(() => { load(true); }, [load]);

  const open = (n: InboxNotification) => {
    console.log('[Inbox] open →', n.pushNotificationId, n.navigationRoute ?? '(sin ruta)');
    if (n.navigationRoute) history.push(n.navigationRoute);
  };

  return (
    <IonPage>
      <Header
        screenTitle="Mis notificaciones"
        presentAlertPopover={(e) => { setPopEvent(e); setShowAlert(true); }}
        presentMailPopover={(e) => { setPopEvent(e); setShowMail(true); }}
      />
      <AlertPopover isOpen={showAlert} event={popEvent as any} onDidDismiss={() => setShowAlert(false)} />
      <MailPopover isOpen={showMail} event={popEvent as any} onDidDismiss={() => setShowMail(false)} />
      <IonContent className="ion-padding">
        <IonRefresher slot="fixed" onIonRefresh={(e) => { load().then(() => e.detail.complete()); }}>
          <IonRefresherContent />
        </IonRefresher>

        {loading && items.length === 0 && (
          <div style={{ textAlign: 'center', padding: 24 }}><IonSpinner name="crescent" /></div>
        )}

        {!loading && items.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 16px', color: '#6b7280' }}>
            <IonIcon icon={notificationsOutline} style={{ fontSize: 44, color: '#cbd5e1' }} />
            <p>Sin notificaciones todavía.</p>
          </div>
        )}

        {items.map(n => (
          <div key={n.notificationDeliveryId} onClick={() => open(n)}
            style={{
              display: 'flex', gap: 12, alignItems: 'flex-start', padding: '12px 10px',
              borderBottom: '1px solid #f1f5f9', cursor: n.navigationRoute ? 'pointer' : 'default',
              background: n.isRead ? 'transparent' : 'rgba(37,99,235,0.06)', borderRadius: 8,
            }}>
            <IonIcon icon={TYPE_ICON[n.notificationType ?? 'Info'] ?? informationCircleOutline}
              style={{ fontSize: 24, marginTop: 2, color: TYPE_COLOR[n.notificationType ?? 'Info'] ?? '#2563eb', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <strong style={{ fontSize: 14 }}>{n.title}</strong>
                {!n.isRead && <IonBadge color="primary" style={{ flexShrink: 0 }}>nueva</IonBadge>}
              </div>
              <p style={{ margin: '2px 0 4px', fontSize: 13, color: '#374151' }}>{n.message}</p>
              <span style={{ fontSize: 11, color: '#9ca3af' }}>{new Date(n.receivedAt + 'Z').toLocaleString('es-MX')}</span>
            </div>
            {n.navigationRoute && <IonIcon icon={chevronForwardOutline} style={{ color: '#9ca3af', marginTop: 8 }} />}
          </div>
        ))}
      </IonContent>
    </IonPage>
  );
};

export default NotificationsInboxPage;

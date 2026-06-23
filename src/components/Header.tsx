import React, { useEffect, useRef, useState } from 'react';
import { IonHeader, IonToolbar, IonButtons, IonButton, IonIcon, IonTitle, IonBackButton, IonBadge, IonMenuButton } from '@ionic/react';
import { helpCircleOutline, notificationsOutline, mailOutline, cartOutline } from 'ionicons/icons';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { useHistory } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import './Header.css';

interface HeaderProps {
  presentAlertPopover: (e: React.MouseEvent) => void;
  presentMailPopover: (e: React.MouseEvent) => void;
  screenTitle?: string;
  showBackButton?: boolean;
  backButtonText?: string;
  backButtonHref?: string;
}

const Header: React.FC<HeaderProps> = ({
  presentAlertPopover,
  presentMailPopover,
  screenTitle = 'POS GMO',
  showBackButton = false,
  backButtonText = 'Atrás',
  backButtonHref = '/'
}) => {
  const history = useHistory();
  const { cart } = useCart();
  const [unreadCount, setUnreadCount] = useState(0);
  const listenerRef = useRef<any>(null);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    PushNotifications.addListener('pushNotificationReceived', () => {
      setUnreadCount((c) => c + 1);
    }).then((handle) => { listenerRef.current = handle; });
    return () => { listenerRef.current?.remove(); };
  }, []);

  const handleNotificationsClick = () => {
    setUnreadCount(0);
    history.push('/pushNotifications');
  };

  // Calculate total quantity of products in cart
  const totalQuantity = cart.reduce((acc, item) => acc + item.quantity, 0);

  const handleCartClick = () => {
    history.push('/cart');
  };

  return (
    <IonHeader className="dashboard-header">
      <IonToolbar color="light">
        <IonButtons slot="start">
          {showBackButton ? (
            <IonBackButton text={backButtonText} defaultHref={backButtonHref} />
          ) : (
            <IonMenuButton
              menu="main-menu"
              autoHide={false}
              className="only-mobile header-menu-button"
              aria-label="Abrir menú"
            />
          )}
        </IonButtons>
        <IonTitle className="screen-title" style={{ textAlign: 'center', flex: 1 }}>{screenTitle}</IonTitle>
        <IonButtons slot="end">
          <IonButton onClick={handleCartClick} title="Cart" className="header-action-button" style={{ '--padding-start': '12px', '--padding-end': '12px', minHeight: '48px', minWidth: '48px' }}>
            <span className="icon-with-badge">
              <IonIcon icon={cartOutline} style={{ fontSize: '28px' }} />
              {totalQuantity > 0 && (
                <IonBadge className="badge-side" color="danger">
                  {totalQuantity}
                </IonBadge>
              )}
            </span>
          </IonButton>
          <IonButton onClick={handleNotificationsClick} title="Notifications" className="header-action-button" style={{ '--padding-start': '12px', '--padding-end': '12px', minHeight: '48px', minWidth: '48px' }}>
            <span className="icon-with-badge">
              <IonIcon icon={notificationsOutline} style={{ fontSize: '28px' }} />
              {unreadCount > 0 && (
                <IonBadge className="badge-side" color="danger">
                  {unreadCount}
                </IonBadge>
              )}
            </span>
          </IonButton>
          <IonButton onClick={presentMailPopover} title="Messages" className="header-action-button" style={{ '--padding-start': '12px', '--padding-end': '12px', minHeight: '48px', minWidth: '48px' }}>
            <IonIcon icon={mailOutline} style={{ fontSize: '28px' }} />
          </IonButton>
          <IonButton onClick={presentAlertPopover} title="Help" className="header-action-button" style={{ '--padding-start': '12px', '--padding-end': '12px', minHeight: '48px', minWidth: '48px' }}>
            <IonIcon icon={helpCircleOutline} style={{ fontSize: '28px' }} />
          </IonButton>

        </IonButtons>
      </IonToolbar>
    </IonHeader>
  );
};

export default Header;

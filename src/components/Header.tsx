import React from 'react';
import { IonHeader, IonToolbar, IonButtons, IonButton, IonIcon, IonTitle, IonBackButton, IonBadge } from '@ionic/react';
import { helpCircleOutline, notificationsOutline, mailOutline, cartOutline } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { useCart } from '../context/CartContext';

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

  // Calculate total quantity of products in cart
  const totalQuantity = cart.reduce((acc, item) => acc + item.quantity, 0);

  const handleCartClick = () => {
    history.push('/cart');
  };

  return (
    <IonHeader className="dashboard-header">
      <IonToolbar color="light">
        <IonButtons slot="start">
          {showBackButton && (
            <IonBackButton text={backButtonText} defaultHref={backButtonHref} />
          )}
        </IonButtons>
        <IonTitle className="screen-title" style={{ textAlign: 'center', flex: 1 }}>{screenTitle}</IonTitle>
        <IonButtons slot="end">
          <IonButton onClick={presentAlertPopover} title="Help">
            <IonIcon icon={helpCircleOutline} />
          </IonButton>
          <IonButton title="Notifications">
            <IonIcon icon={notificationsOutline} />
          </IonButton>
          <IonButton onClick={presentMailPopover} title="Messages">
            <IonIcon icon={mailOutline} />
          </IonButton>
          <IonButton onClick={handleCartClick} title="Cart" style={{ position: 'relative' }}>
            <IonIcon icon={cartOutline} />
            {totalQuantity > 0 && (
              <IonBadge color="danger" style={{ position: 'absolute', top: '0px', right: '0px', fontSize: '10px' }}>
                {totalQuantity}
              </IonBadge>
            )}
          </IonButton>
        </IonButtons>
      </IonToolbar>
    </IonHeader>
  );
};

export default Header;

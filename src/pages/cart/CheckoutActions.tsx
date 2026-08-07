import React from 'react';
import { IonButton, IonFab, IonFabButton, IonIcon } from '@ionic/react';
import { trash } from 'ionicons/icons';

interface CheckoutActionsProps {
  isCheckoutEnabled: boolean;
  handleCheckout: () => void;
  clearCart: () => void;
  handleAddMoreProducts: () => void;
}

const CheckoutActions: React.FC<CheckoutActionsProps> = ({
  isCheckoutEnabled,
  handleCheckout,
  clearCart,
  handleAddMoreProducts,
}) => {
  return (
    <>
      <IonButton expand="block" color="primary" onClick={handleAddMoreProducts} >
        Agregar mas productos
      </IonButton>
      <IonButton expand="block" color="primary" onClick={handleCheckout} disabled={!isCheckoutEnabled}>
        Proceder al pago
      </IonButton>

      <IonFab vertical="bottom" horizontal="end" slot="fixed">
        <IonFabButton color="danger" onClick={clearCart}>
          <IonIcon icon={trash} />
        </IonFabButton>
      </IonFab>

    </>
  );
};

export default CheckoutActions;

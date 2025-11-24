import React from 'react';
import { IonButton, IonFab, IonFabButton, IonIcon } from '@ionic/react';
import { addCircle } from 'ionicons/icons';

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
      <IonButton expand="block" color="primary" onClick={handleCheckout} disabled={!isCheckoutEnabled}>
        Proceder al pago
      </IonButton>

      <IonButton expand="block" color="medium" onClick={clearCart}>
        Vaciar carrito
      </IonButton>

      <IonFab slot="fixed" horizontal="end">
        <IonFabButton onClick={handleAddMoreProducts} aria-label="agregar mas productos">
          <IonIcon icon={addCircle} />
        </IonFabButton>
      </IonFab>
    </>
  );
};

export default CheckoutActions;

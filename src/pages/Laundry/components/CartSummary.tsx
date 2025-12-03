import React from 'react';
import {
  IonCard,
  IonCardHeader,
  IonCardSubtitle,
  IonCardContent,
  IonButton,
} from '@ionic/react';
import { CartItem } from '../types';

interface CartSummaryProps {
  cart: CartItem[];
  onConfirmSale: () => void;
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  setShowCart: React.Dispatch<React.SetStateAction<boolean>>;
}

const CartSummary: React.FC<CartSummaryProps> = ({ cart, onConfirmSale, setCart, setShowCart }) => {
  const total = cart.reduce((sum, item) => sum + item.subtotal, 0);

  return (
    <IonCard className="dashboard-cart-card">
      <IonCardHeader>
        <IonCardSubtitle>Carrito de Compras</IonCardSubtitle>
      </IonCardHeader>
      <IonCardContent>
        <div className="cart-items">
          {cart.map((item, index) => (
            <div key={index} className="cart-item">
              <span>{item.name} x{item.quantity}</span>
              <span>${item.subtotal.toFixed(2)}</span>
            </div>
          ))}
        </div>
        <div className="cart-total">
          Total: ${total.toFixed(2)}
        </div>
        <div className="cart-actions">
          <IonButton
            expand="full"
            color="success"
            className="confirm-sale-button"
            onClick={onConfirmSale}
          >
            Confirmar Venta
          </IonButton>
          <IonButton
            expand="full"
            fill="clear"
            onClick={() => { setShowCart(false); setCart([]); }}
          >
            Cerrar
          </IonButton>
        </div>
      </IonCardContent>
    </IonCard>
  );
};

export default CartSummary;

import React from 'react';
import { IonList, IonText } from '@ionic/react';
import CartItem from '../../components/CartItem';

interface CartItemsListProps {
  cart: Array<{
    id: string;
    name: string;
    quantity: number;
    price: number;
    selectedOptionLabels?: { [key: string]: string | string[] };
  }>;
  removeFromCart: (id: string) => void;
}

const CartItemsList: React.FC<CartItemsListProps> = ({ cart, removeFromCart }) => {
  if (cart.length === 0) {
    return <IonText>El carrito está vacío.</IonText>;
  }

  return (
    <IonList>
      {cart.map((item) => (
        <CartItem
          key={item.id}
          id={item.id}
          name={item.name}
          quantity={item.quantity}
          price={item.price}
          selectedOptionLabels={item.selectedOptionLabels}
          onRemove={removeFromCart}
        />
      ))}
    </IonList>
  );
};

export default CartItemsList;

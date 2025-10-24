import React from 'react';
import { IonItem, IonLabel, IonButton, IonIcon } from '@ionic/react';
import { trash } from 'ionicons/icons';

interface CartItemProps {
  id: string;
  name: string;
  quantity: number;
  price: number;
  selectedOptionLabels?: { [key: string]: string | string[] };
  onRemove: (id: string) => void;
}

const CartItem: React.FC<CartItemProps> = ({ id, name, quantity, price, selectedOptionLabels, onRemove }) => {
  return (
    <IonItem>
      <IonLabel>
        <h2>{name}</h2>
        <p>Quantity: {quantity}</p>
        <p>Price: ${price.toFixed(2)}</p>
        {selectedOptionLabels && Object.keys(selectedOptionLabels).length > 0 && (
          <p>Options: {Object.entries(selectedOptionLabels).map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`).join('; ')}</p>
        )}
      </IonLabel>
      <IonButton fill="clear" onClick={() => onRemove(id)}>
        <IonIcon icon={trash} />
      </IonButton>
    </IonItem>
  );
};

export default CartItem;

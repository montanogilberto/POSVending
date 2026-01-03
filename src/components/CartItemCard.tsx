import React from 'react';
import { IonButton, IonIcon } from '@ionic/react';
import { close } from 'ionicons/icons';
import './CartItemCard.css';

interface CartItemCardProps {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  selectedChoices: {
    [key: number]: {
      id: number;
      name: string;
      price: number;
      quantity: number;
    }[];
  };
  onRemove: (id: string) => void;
}

const CartItemCard: React.FC<CartItemCardProps> = ({
  id,
  name,
  quantity,
  unitPrice,
  totalPrice,
  selectedChoices,
  onRemove,
}) => {
  // Format price with pesos symbol
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(price);
  };

  // Build option chips from selectedChoices
  const buildOptionChips = (): React.ReactNode[] => {
    const chips: React.ReactNode[] = [];

    Object.entries(selectedChoices).forEach(([optionId, choices]) => {
      choices.forEach((choice) => {
        chips.push(
          <span key={`${optionId}-${choice.id}`} className="option-chip">
            <span className="option-name">{choice.name}</span>
            {choice.quantity > 1 && (
              <span className="option-quantity">x{choice.quantity}</span>
            )}
          </span>
        );
      });
    });

    return chips;
  };

  return (
    <div className="cart-item-card">
      {/* Top row: Name + Quantity badge + Line total + Remove */}
      <div className="card-top-row">
        <div className="product-info">
          <h3 className="product-name">{name}</h3>
          <span className="quantity-badge">x{quantity}</span>
        </div>
        <div className="product-total">
          <span className="total-price">{formatPrice(totalPrice)}</span>
        </div>
        <IonButton
          fill="clear"
          className="remove-button"
          onClick={() => onRemove(id)}
        >
          <IonIcon icon={close} slot="icon-only" />
        </IonButton>
      </div>

      {/* Second row: Option chips */}
      <div className="card-options-row">
        {buildOptionChips()}
      </div>

      {/* Third row: Unit price (secondary metadata) */}
      <div className="card-unit-price">
        {formatPrice(unitPrice)} c/u
      </div>
    </div>
  );
};

export default CartItemCard;


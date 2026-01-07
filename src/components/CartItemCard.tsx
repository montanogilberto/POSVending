import React from 'react';
import { IonButton, IonIcon, IonText } from '@ionic/react';
import { close } from 'ionicons/icons';
import { Piezas } from '../data/type_products';
import './CartItemCard.css';

interface CartItemCardProps {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  selectedChoices?: {
    [key: number]: {
      id: number;
      name: string;
      price: number;
      quantity: number;
    }[];
  };
  selectedOptionLabels?: { [key: string]: string | string[] };
  pieces?: Piezas;
  onRemove: (id: string) => void;
}

const CartItemCard: React.FC<CartItemCardProps> = ({
  id,
  name,
  quantity,
  unitPrice,
  totalPrice,
  selectedChoices,
  selectedOptionLabels,
  pieces,
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

    if (selectedChoices) {
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
    }

    return chips;
  };

  // Format option labels (for "Servicio Completo" and other products)
  const formatOptionLabels = (): React.ReactNode[] | null => {
    if (!selectedOptionLabels) return null;

    const labels: React.ReactNode[] = [];

    Object.entries(selectedOptionLabels).forEach(([key, value]) => {
      if (key === 'Piezas') return; // Skip - handled separately in pieces

      if (Array.isArray(value)) {
        const joinedValue = value.join(', ');
        labels.push(
          <span key={key} className="option-label-chip">
            {key}: {joinedValue}
          </span>
        );
      } else {
        labels.push(
          <span key={key} className="option-label-chip">
            {key}: {value}
          </span>
        );
      }
    });

    return labels.length > 0 ? labels : null;
  };

  // Format pieces for display
  const formatPieces = (): React.ReactNode | null => {
    if (!pieces) return null;

    const total = pieces.pantalones + pieces.prendas + pieces.otros;
    return (
      <div className="pieces-display">
        <IonText className="pieces-label">Piezas:</IonText>
        <IonText className="pieces-values">
          Pantalones {pieces.pantalones}, Prendas {pieces.prendas}, Otros {pieces.otros}
        </IonText>
        <IonText className="pieces-total"> (Total: {total})</IonText>
      </div>
    );
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

      {/* Third row: Option labels (for "Servicio Completo" and other products) */}
      {formatOptionLabels() && (
        <div className="card-option-labels-row">
          {formatOptionLabels()}
        </div>
      )}

      {/* Pieces display for "Servicio Completo" products */}
      {pieces && (
        <div className="card-pieces-row">
          {formatPieces()}
        </div>
      )}

      {/* Unit price (secondary metadata) */}
      <div className="card-unit-price">
        {formatPrice(unitPrice)} c/u
      </div>
    </div>
  );
};

export default CartItemCard;


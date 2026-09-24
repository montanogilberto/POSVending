import React, { createContext, useContext, useState } from 'react';
import { Piezas } from '../data/type_products';

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  quantity: number;
  price: number;
  selectedOptions: { [optionId: string]: any };
  selectedOptionLabels?: { [optionId: string]: any };
  selectedChoices: { [key: number]: { id: number; name: string; price: number; quantity: number }[] };
  pieces?: Piezas; // For "Servicio Completo" product
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

/**
 * Helper function to calculate the total quantity from selected checkbox choices.
 * This sums up all quantities from checkbox options (e.g., "Ciclo Medio (x2)" = 2).
 * Radio options always have quantity 1 and do not affect the total.
 */
export const calculateCartItemQuantity = (
  selectedChoices: CartItem['selectedChoices']
): number => {
  let total = 0;
  Object.values(selectedChoices || {}).forEach((choices) => {
    choices.forEach((choice) => {
      total += choice.quantity;
    });
  });
  // If no choices or all quantities are 0, default to 1
  return total || 1;
};

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>([]);

  const addToCart = (item: CartItem) => {
    // Calculate the actual quantity from selected checkbox choices
    // This handles cases where options like "Ciclo Medio (x2)" have quantity > 1
    const computedQuantity = calculateCartItemQuantity(item.selectedChoices);

    // Same product + same options (+ same pieces breakdown, when present) must
    // merge into one line with quantity summed, not become a second line at
    // quantity 1. Without this, adding "Servicio de lavado / Básico" twice
    // produced two $40 x1 lines instead of one $80 x2 line — and every
    // quantity-based discount (2x1, etc.) reads item.quantity per line, so it
    // silently never had anything to discount.
    const mergeKey = JSON.stringify({
      productId: item.productId,
      selectedChoices: item.selectedChoices,
      pieces: item.pieces,
    });

    setCart((prev) => {
      const existingIndex = prev.findIndex((existing) => JSON.stringify({
        productId: existing.productId,
        selectedChoices: existing.selectedChoices,
        pieces: existing.pieces,
      }) === mergeKey);

      if (existingIndex !== -1) {
        const merged = [...prev];
        const existing = merged[existingIndex];
        merged[existingIndex] = {
          ...existing,
          quantity: existing.quantity + computedQuantity,
          price: existing.price + item.price,
        };
        return merged;
      }

      return [
        ...prev,
        { ...item, quantity: computedQuantity, id: `${item.productId}-${Date.now()}` },
      ];
    });
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const clearCart = () => setCart([]);

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, clearCart }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
};

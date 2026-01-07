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
    
    setCart((prev) => [
      ...prev,
      { ...item, quantity: computedQuantity, id: `${item.productId}-${Date.now()}` },
    ]);
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

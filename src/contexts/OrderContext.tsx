import React, { createContext, useContext, useState } from 'react';

interface OrderData {
  productId: string;
  quantity: number;
  selectedOptions: { [key: string]: any };
  paymentMethod?: string;
}

interface OrderContextType {
  order: OrderData | null;
  setOrder: (data: OrderData) => void;
  clearOrder: () => void;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export const OrderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [order, setOrderData] = useState<OrderData | null>(null);

  const setOrder = (data: OrderData) => setOrderData(data);
  const clearOrder = () => setOrderData(null);

  return (
    <OrderContext.Provider value={{ order, setOrder, clearOrder }}>
      {children}
    </OrderContext.Provider>
  );
};

export const useOrder = (): OrderContextType => {
  const context = useContext(OrderContext);
  if (!context) throw new Error('useOrder must be used within OrderProvider');
  return context;
};

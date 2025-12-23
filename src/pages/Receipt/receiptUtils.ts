export interface Product {
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  options?: Array<{
    optionName: string;
    choiceName: string;
  }>;
}

export interface TicketData {
  paymentDate: string;
  client: {
    name: string;
    cellphone: string;
    email: string;
  };
  user: {
    name: string;
  };
  products: Product[];
  totals: {
    subtotal: number;
    iva: number;
    total: number;
  };
  paymentMethod: string;
}

export interface ReceiptDisplayProps {
  ticketData: TicketData;
  paymentMethod: string;
  cashPaid: string;
  clearCart: () => void;
  setTicketData: (data: TicketData | null) => void;
}

/**
 * Formats a date string to Spanish locale date format
 */
export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('es-ES');
};

/**
 * Formats a date string to Spanish locale time format (HH:MM)
 */
export const formatTime = (dateString: string): string => {
  return new Date(dateString).toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Maps payment method codes to display names
 */
export const getPaymentMethodText = (paymentMethod: string): string => {
  switch (paymentMethod) {
    case 'efectivo':
      return 'Efectivo';
    case 'tarjeta':
      return 'Tarjeta';
    default:
      return 'Transferencia';
  }
};

/**
 * Generates HTML for product list
 */
export const generateProductsHTML = (products: Product[]): string => {
  return products
    .map(
      (prod) => `
      <div class="product-item">
        <div class="product-name">${prod.name}</div>
        <div class="product-details">
          Cantidad: ${prod.quantity} × $${prod.unitPrice.toFixed(
        2
      )} = $${prod.subtotal.toFixed(2)}
          ${
        prod.options
          ? prod.options
              .map(
                (opt) => `<br/>${opt.optionName}: ${opt.choiceName}`
              )
              .join('')
          : ''
      }
        </div>
      </div>
    `
    )
    .join('');
};

/**
 * Generates HTML for cash payment details
 */
export const generateCashDetailsHTML = (
  cashPaid: string,
  total: number
): string => {
  const recibido = parseFloat(cashPaid) || total;
  const cambio = (parseFloat(cashPaid) || 0) - total;

  return `
    <div class="receipt-row">
      <span class="receipt-label">Recibido:</span>
      <span class="receipt-value">$${recibido.toFixed(2)}</span>
    </div>
    <div class="receipt-row">
      <span class="receipt-label">Cambio:</span>
      <span class="receipt-value">$${cambio.toFixed(2)}</span>
    </div>
  `;
};

/**
 * Safely parses cash paid amount
 */
export const parseCashPaid = (cashPaid: string): number => {
  const parsed = parseFloat(cashPaid);
  return isNaN(parsed) ? 0 : parsed;
};

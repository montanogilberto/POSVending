import { Ticket } from '../../api/ticketApi';
import {
  LegacyCartData,
  LegacyIncomeData,
  UnifiedProduct,
  UnifiedReceiptData
} from '../../types/receipt';
import { COMPANY_INFO } from './companyInfo';
import { normalizePaymentMethod, toEsDateTime } from './normalizers';

export function extractCiclo(options: any[]): string | null {
  if (!options || !Array.isArray(options)) return null;

  for (const option of options) {
    if (option.optionName && option.optionName.toLowerCase().includes('ciclo')) {
      if (option.choiceName) return option.choiceName;
    }

    if (option.name && option.name.toLowerCase().includes('ciclo')) {
      if (option.choices && Array.isArray(option.choices) && option.choices.length > 0) {
        return option.choices[0].name || option.choices[0].choiceName;
      }
      if (option.choiceName) return option.choiceName;
    }

    if (option.choices) {
      for (const choice of option.choices) {
        if (
          choice.name &&
          (choice.name.toLowerCase().includes('carga alta') ||
            choice.name.toLowerCase().includes('basico') ||
            choice.name.toLowerCase().includes('carga baja') ||
            choice.name.toLowerCase().includes('medio'))
        ) {
          return choice.name;
        }
      }
    }
  }

  return null;
}

function resolveQuantity(unitPrice: number, subtotal: number, quantity?: number): number {
  if (quantity && quantity > 0) return quantity;
  if (unitPrice > 0) return Math.round(subtotal / unitPrice);
  return 1;
}

function mapTicketProductOptions(product: any): any[] | undefined {
  if (!product.options || !Array.isArray(product.options)) return undefined;
  const options = product.options.map((option: any) => ({
    productOptionId: option.productOptionId,
    optionName: option.optionName || option.name || 'Opción',
    productOptionChoiceId: option.productOptionChoiceId,
    choiceName: option.choiceName || '',
    price: option.price || 0,
    quantity: option.quantity || 1
  }));
  return options.length > 0 ? options : undefined;
}

function mapLegacyOptionsToNames(product: any): string[] {
  let options: string[] = [];
  if (!product.options || !Array.isArray(product.options)) return options;

  if (product.options[0]?.optionName || product.options[0]?.choiceName) {
    product.options.forEach((option: any) => {
      const choiceName = option.choiceName || '';
      if (choiceName) options.push(choiceName);
    });
  } else if (product.options[0]?.choices) {
    product.options.forEach((option: any) => {
      if (option.choices && Array.isArray(option.choices)) {
        option.choices.forEach((choice: any) => options.push(choice.name));
      }
    });
  } else {
    options = product.options.map((option: any) => option.choiceName || option);
  }

  return options;
}

export function parseSelectedOptions(selectedOptions: Record<string, any>): any[] {
  return Object.entries(selectedOptions).map(([key, value]) => ({
    optionName: key,
    choiceName: Array.isArray(value) ? value.join(', ') : String(value),
    price: 0,
    quantity: 1
  }));
}

export function adaptTicketToUnifiedReceipt(ticket: Ticket): UnifiedReceiptData {
  const { date: transactionDate, time: transactionTime } = toEsDateTime(ticket.paymentDate);

  const products: UnifiedProduct[] = ticket.products.map((product: any, index: number) => {
    const unitPrice = product.unitPrice || 0;
    const subtotal = product.subtotal || 0;
    const quantity = resolveQuantity(unitPrice, subtotal, product.quantity);

    return {
      id: product.incomeDetailId || index,
      name: product.name,
      quantity,
      unitPrice,
      subtotal,
      options: mapTicketProductOptions(product),
      pieces: product.pieces
    };
  });

  return {
    id: `income_${ticket.incomeId || Date.now()}`,
    type: 'income',
    date: transactionDate,
    time: transactionTime,
    client: {
      name: ticket.client.name,
      phone: ticket.client.cellphone,
      email: ticket.client.email
    },
    user: {
      name: ticket.user.name,
      id: ticket.user.userId || 0
    },
    company: COMPANY_INFO,
    products,
    totals: {
      subtotal: ticket.totals.subtotal,
      iva: 0,
      total: ticket.totals.subtotal
    },
    payment: {
      method: normalizePaymentMethod(ticket.paymentMethod),
      amountReceived: ticket.totals.amountReceived,
      change: ticket.totals.change
    }
  };
}

export function adaptTicketToLegacyIncome(ticket: Ticket): LegacyIncomeData {
  const { date: transactionDate, time: transactionTime } = toEsDateTime(ticket.paymentDate);

  const legacyProducts: any[] = ticket.products.map((product: any) => {
    const unitPrice = product.unitPrice || 0;
    const subtotal = product.subtotal || 0;
    const quantity = resolveQuantity(unitPrice, subtotal, product.quantity);

    return {
      name: product.name,
      quantity,
      unitPrice,
      subtotal,
      options: mapLegacyOptionsToNames(product)
    };
  });

  return {
    transactionDate,
    transactionTime,
    clientName: ticket.client.name,
    clientPhone: ticket.client.cellphone,
    clientEmail: ticket.client.email,
    userName: ticket.user.name,
    products: legacyProducts,
    subtotal: ticket.totals.subtotal,
    iva: ticket.totals.iva,
    total: ticket.totals.total,
    paymentMethod: ticket.paymentMethod,
    amountReceived: ticket.totals.total,
    change: 0
  };
}

export function transformIncomeData(apiData: LegacyIncomeData): UnifiedReceiptData {
  const products: UnifiedProduct[] = apiData.products.map((product, index) => {
    const quantity = product.quantity || 1;
    const unitPrice = product.unitPrice || 0;
    const subtotal = product.subtotal !== undefined ? product.subtotal : unitPrice * quantity;

    let options: any[] | undefined;
    if (product.options && product.options.length > 0) {
      options = product.options.map((option: any, optIndex: number) => ({
        productOptionId: optIndex,
        optionName: 'Opción',
        productOptionChoiceId: optIndex,
        choiceName: typeof option === 'string' ? option : option.name || '',
        price: 0,
        quantity: 1
      }));
    }

    return {
      id: index,
      name: product.name,
      quantity,
      unitPrice,
      subtotal,
      options
    };
  });

  return {
    id: `income_${Date.now()}`,
    type: 'income',
    date: apiData.transactionDate,
    time: apiData.transactionTime,
    client: {
      name: apiData.clientName,
      phone: apiData.clientPhone,
      email: apiData.clientEmail
    },
    user: {
      name: apiData.userName,
      id: 0
    },
    company: COMPANY_INFO,
    products,
    totals: {
      subtotal: apiData.subtotal,
      iva: 0,
      total: apiData.subtotal
    },
    payment: {
      method: normalizePaymentMethod(apiData.paymentMethod),
      amountReceived: apiData.amountReceived,
      change: apiData.change
    }
  };
}

export function transformCartData(cartData: LegacyCartData): UnifiedReceiptData {
  const products: UnifiedProduct[] = cartData.products.map((product: any, index: number) => {
    const quantity = product.quantity || 1;
    const unitPrice = product.price || product.unitPrice || 0;
    const subtotal = product.subtotal !== undefined ? product.subtotal : unitPrice * quantity;

    let options: any[] | undefined;
    if (product.selectedOptions) {
      options = Object.entries(product.selectedOptions).map(([key, value], optIndex: number) => ({
        productOptionId: optIndex,
        optionName: key,
        productOptionChoiceId: optIndex,
        choiceName: Array.isArray(value) ? value.join(', ') : String(value),
        price: 0,
        quantity: 1
      }));
    }

    return {
      id: index,
      name: product.name,
      quantity,
      unitPrice,
      subtotal,
      options,
      pieces: product.pieces
    };
  });

  const { date, time } = toEsDateTime(cartData.paymentDate);

  return {
    id: `cart_${Date.now()}`,
    type: 'income',
    date,
    time,
    client: {
      name: cartData.client.name,
      phone: cartData.client.cellphone,
      email: cartData.client.email
    },
    user: {
      name: cartData.user.name,
      id: 0
    },
    company: COMPANY_INFO,
    products,
    totals: {
      subtotal: cartData.totals.subtotal,
      iva: 0,
      total: cartData.totals.subtotal
    },
    payment: {
      method: normalizePaymentMethod(cartData.paymentMethod),
      amountReceived: cartData.totals.total,
      change: 0
    }
  };
}

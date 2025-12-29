import {
  UnifiedReceiptData,
  UnifiedProduct,
  LegacyIncomeData,
  LegacyCartData,
  PrintOptions
} from '../types/receipt';

// Import Ticket interface for adapter function
import { Ticket } from '../api/ticketApi';

export class ReceiptService {
  private static readonly COMPANY_INFO = {
    name: 'POS GMO',
    rfc: 'XXX123456XXX',
    address: 'Calle Ficticia 123, Ciudad, País',
    website: 'www.posgmo.com'
  };

  // Adapter function to convert Ticket to LegacyIncomeData format
  static adaptTicketToLegacyIncome(ticket: Ticket): LegacyIncomeData {
    // Convert paymentDate to date and time components
    const paymentDateTime = new Date(ticket.paymentDate);
    const transactionDate = paymentDateTime.toLocaleDateString('es-ES');
    const transactionTime = paymentDateTime.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    // Convert Ticket products to LegacyProduct format
    const legacyProducts: any[] = ticket.products.map((product: any) => ({
      name: product.name,
      quantity: product.quantity,
      unitPrice: product.unitPrice,
      subtotal: product.subtotal,
      options: product.options?.map((option: any) => option.choiceName) || []
    }));

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
      amountReceived: ticket.totals.total, // Default to total for now
      change: 0 // Default to 0 for now
    };
  }

  // Transform legacy income data to unified format
  static transformIncomeData(apiData: LegacyIncomeData): UnifiedReceiptData {
    const products: UnifiedProduct[] = apiData.products.map(product => ({
      id: 0, // Income data doesn't include product ID
      name: product.name,
      quantity: product.quantity,
      unitPrice: product.unitPrice,
      subtotal: product.subtotal,
      options: product.options && product.options.length > 0 ? [{
        name: 'Opciones',
        choices: product.options.map(option => ({
          name: option,
          price: 0
        }))
      }] : undefined
    }));

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
      company: this.COMPANY_INFO,
      products,
      totals: {
        subtotal: apiData.subtotal,
        iva: apiData.iva,
        total: apiData.total
      },
      payment: {
        method: this.normalizePaymentMethod(apiData.paymentMethod),
        amountReceived: apiData.amountReceived,
        change: apiData.change
      }
    };
  }

  // Transform legacy cart data to unified format
  static transformCartData(cartData: LegacyCartData): UnifiedReceiptData {
    const products: UnifiedProduct[] = cartData.products.map((product: any, index: number) => ({
      id: index, // Use array index as fallback ID
      name: product.name,
      quantity: product.quantity || 1,
      unitPrice: product.price || 0,
      subtotal: (product.price || 0) * (product.quantity || 1),
      options: product.selectedOptions ? this.parseSelectedOptions(product.selectedOptions) : undefined
    }));

    return {
      id: `cart_${Date.now()}`,
      type: 'income',
      date: new Date(cartData.paymentDate).toLocaleDateString('es-ES'),
      time: new Date(cartData.paymentDate).toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      client: {
        name: cartData.client.name,
        phone: cartData.client.cellphone,
        email: cartData.client.email
      },
      user: {
        name: cartData.user.name,
        id: 0
      },
      company: this.COMPANY_INFO,
      products,
      totals: cartData.totals,
      payment: {
        method: this.normalizePaymentMethod(cartData.paymentMethod),
        amountReceived: cartData.totals.total, // Default to total for non-cash payments
        change: 0
      }
    };
  }

  // Transform expense data to unified format (placeholder for future implementation)
  static transformExpenseData(expenseData: any): UnifiedReceiptData {
    // This will be implemented when expense receipt functionality is added
    throw new Error('Expense data transformation not yet implemented');
  }

  // Normalize payment method strings
  private static normalizePaymentMethod(method: string): 'efectivo' | 'tarjeta' | 'transferencia' {
    const normalized = method.toLowerCase().trim();
    if (normalized.includes('efectivo') || normalized.includes('cash')) return 'efectivo';
    if (normalized.includes('tarjeta') || normalized.includes('card')) return 'tarjeta';
    return 'transferencia'; // Default fallback
  }

  // Parse selected options from cart data
  private static parseSelectedOptions(selectedOptions: Record<string, any>): any {
    return Object.entries(selectedOptions).map(([key, value]) => ({
      name: key,
      choices: [{
        name: Array.isArray(value) ? value.join(', ') : String(value),
        price: 0
      }]
    }));
  }

  // Generate optimized HTML for printing
  static generatePrintHTML(data: UnifiedReceiptData, options: PrintOptions = {}): string {
    const width = options.width || '58mm';
    const isThermal = options.thermal !== false;

    return `
<!DOCTYPE html>
<html>
<head>
  <title>Recibo - ${data.type === 'income' ? 'Ingreso' : 'Egreso'}</title>
  ${this.generatePrintStyles(width, isThermal)}
</head>
<body>
  <div class="receipt-container">
    ${this.generateHeader(data)}
    ${this.generateClientInfo(data)}
    ${this.generateProducts(data)}
    ${this.generateTotals(data)}
    ${this.generatePaymentInfo(data)}
    ${this.generateFooter(data)}
  </div>
</body>
</html>`;
  }

  // Generate CSS styles for printing
  private static generatePrintStyles(width: string, isThermal: boolean): string {
    return `
<style>
  html, body {
    margin: 0;
    padding: 0;
    width: ${width};
    font-family: Arial, sans-serif;
    font-size: ${isThermal ? '9px' : '12px'};
    color: #000;
    background: white;
    line-height: 1.1;
  }

  * {
    box-sizing: border-box;
    color: #000;
  }

  .receipt-container {
    width: 100%;
    max-width: ${width};
    margin: 0 auto;
    padding: ${isThermal ? '2mm' : '10px'};
  }

  .receipt-title {
    font-size: ${isThermal ? '14px' : '18px'};
    font-weight: bold;
    text-align: center;
    border-bottom: ${isThermal ? '1px dashed' : '2px solid'} #000;
    padding-bottom: ${isThermal ? '2px' : '5px'};
    margin-bottom: ${isThermal ? '3px' : '10px'};
  }

  .receipt-section {
    margin-bottom: ${isThermal ? '2px' : '8px'};
  }

  .receipt-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: ${isThermal ? '1px' : '3px'};
    font-size: ${isThermal ? '8px' : '11px'};
  }

  .receipt-label {
    font-weight: bold;
  }

  .receipt-value {
    text-align: right;
  }

  .receipt-products {
    margin: ${isThermal ? '3px' : '8px'} 0;
  }

  .product-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: ${isThermal ? '1px' : '3px'};
    font-size: ${isThermal ? '7px' : '10px'};
  }

  .product-name {
    flex: 1;
    font-weight: bold;
  }

  .product-qty {
    width: ${isThermal ? '15%' : '20%'};
    text-align: center;
  }

  .product-price {
    width: ${isThermal ? '20%' : '25%'};
    text-align: right;
  }

  .receipt-totals {
    border-top: ${isThermal ? '1px dashed' : '2px solid'} #000;
    border-bottom: ${isThermal ? '1px dashed' : '2px solid'} #000;
    padding: ${isThermal ? '2px' : '5px'} 0;
    margin: ${isThermal ? '3px' : '8px'} 0;
  }

  .total-row {
    display: flex;
    justify-content: space-between;
    font-weight: bold;
    font-size: ${isThermal ? '9px' : '12px'};
  }

  .grand-total {
    font-size: ${isThermal ? '11px' : '14px'};
    font-weight: bold;
    border-top: ${isThermal ? '1px solid' : '2px solid'} #000;
    padding-top: ${isThermal ? '2px' : '5px'};
  }

  .receipt-footer {
    text-align: center;
    font-size: ${isThermal ? '6px' : '9px'};
    margin-top: ${isThermal ? '5px' : '15px'};
    padding-top: ${isThermal ? '3px' : '8px'};
    border-top: ${isThermal ? '1px dashed' : '1px solid'} #000;
  }

  .payment-method {
    font-weight: bold;
    text-align: center;
    margin: ${isThermal ? '2px' : '5px'} 0;
  }

  @page {
    size: ${width} auto;
    margin: 0;
  }
</style>`;
  }

  // Generate header section
  private static generateHeader(data: UnifiedReceiptData): string {
    return `
    <div class="receipt-title">${data.company.name}</div>
    <div style="text-align: center; font-size: 8px; margin-bottom: 5px;">
      RECIBO - ${data.type === 'income' ? 'INGRESO' : 'EGRESO'}
    </div>`;
  }

  // Generate client and user info
  private static generateClientInfo(data: UnifiedReceiptData): string {
    return `
    <div class="receipt-section">
      <div class="receipt-row">
        <span class="receipt-label">Fecha:</span>
        <span class="receipt-value">${data.date}</span>
      </div>
      <div class="receipt-row">
        <span class="receipt-label">Hora:</span>
        <span class="receipt-value">${data.time}</span>
      </div>
      <div class="receipt-row">
        <span class="receipt-label">Cliente:</span>
        <span class="receipt-value">${data.client.name}</span>
      </div>
      <div class="receipt-row">
        <span class="receipt-label">Usuario:</span>
        <span class="receipt-value">${data.user.name}</span>
      </div>
    </div>`;
  }

  // Generate products section
  private static generateProducts(data: UnifiedReceiptData): string {
    const productRows = data.products.map(product => `
      <div class="product-row">
        <div class="product-name">${product.name}</div>
        <div class="product-qty">${product.quantity}</div>
        <div class="product-price">$${product.subtotal.toFixed(2)}</div>
      </div>
      ${product.options ? `<div style="font-size: 6px; margin-left: 10px; margin-bottom: 2px;">${product.options.map(opt => `${opt.name}: ${opt.choices.map(c => c.name).join(', ')}`).join('; ')}</div>` : ''}
    `).join('');

    return `
    <div class="receipt-products">
      <div class="receipt-row" style="font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 2px;">
        <div class="product-name">Producto</div>
        <div class="product-qty">Cant</div>
        <div class="product-price">Total</div>
      </div>
      ${productRows}
    </div>`;
  }

  // Generate totals section
  private static generateTotals(data: UnifiedReceiptData): string {
    return `
    <div class="receipt-section receipt-totals">
      <div class="total-row">
        <span>Subtotal:</span>
        <span>$${data.totals.subtotal.toFixed(2)}</span>
      </div>
      <div class="total-row">
        <span>IVA:</span>
        <span>$${data.totals.iva.toFixed(2)}</span>
      </div>
      <div class="total-row grand-total">
        <span>TOTAL:</span>
        <span>$${data.totals.total.toFixed(2)}</span>
      </div>
    </div>`;
  }

  // Generate payment information
  private static generatePaymentInfo(data: UnifiedReceiptData): string {
    const paymentMethodText = this.getPaymentMethodText(data.payment.method);
    return `
    <div class="receipt-section">
      <div class="payment-method">Pago: ${paymentMethodText}</div>
      ${data.payment.method === 'efectivo' ? `
      <div class="receipt-row">
        <span class="receipt-label">Recibido:</span>
        <span class="receipt-value">$${data.payment.amountReceived.toFixed(2)}</span>
      </div>
      <div class="receipt-row">
        <span class="receipt-label">Cambio:</span>
        <span class="receipt-value">$${data.payment.change.toFixed(2)}</span>
      </div>` : ''}
    </div>`;
  }

  // Generate footer
  private static generateFooter(data: UnifiedReceiptData): string {
    return `
    <div class="receipt-footer">
      ¡Gracias por su ${data.type === 'income' ? 'compra' : 'pago'}!<br/>
      ${data.company.website}<br/>
      <div style="font-size: 6px; margin-top: 3px;">
        ${data.company.name} - RFC: ${data.company.rfc}<br/>
        ${data.company.address}
      </div>
    </div>`;
  }

  // Get readable payment method text
  private static getPaymentMethodText(method: string): string {
    switch (method) {
      case 'efectivo': return 'Efectivo';
      case 'tarjeta': return 'Tarjeta';
      case 'transferencia': return 'Transferencia';
      default: return method;
    }
  }

  // Print receipt function
  static printReceipt(data: UnifiedReceiptData, options: PrintOptions = {}): void {
    const html = this.generatePrintHTML(data, options);
    
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (!printWindow) {
      console.error('Unable to open print window');
      return;
    }

    printWindow.document.write(html);
    printWindow.document.close();

    printWindow.onload = () => {
      setTimeout(() => {
        if (options.autoPrint !== false) {
          printWindow.print();
        }
        printWindow.onafterprint = () => {
          printWindow.close();
        };
      }, 100);
    };
  }

  // Create a blob URL for the receipt HTML (useful for downloads)
  static generateReceiptBlob(data: UnifiedReceiptData, options: PrintOptions = {}): string {
    const html = this.generatePrintHTML(data, options);
    const blob = new Blob([html], { type: 'text/html' });
    return URL.createObjectURL(blob);
  }
}


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
    address: 'Codorniz 1B Gavilan, Musaro, Nuevo Hermosillo, CP. 83296 ',
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
    const legacyProducts: any[] = ticket.products.map((product: any) => {
      // Calculate quantity if not provided by API
      const unitPrice = product.unitPrice || 0;
      const subtotal = product.subtotal || 0;
      const quantity = product.quantity || (unitPrice > 0 ? Math.round(subtotal / unitPrice) : 1);

      // Handle both old format (options as array of choiceNames) and new format (options with nested choices)
      let options: string[] = [];
      if (product.options && Array.isArray(product.options)) {
        // New format: options with nested choices structure
        if (product.options[0]?.choices) {
          product.options.forEach((option: any) => {
            if (option.choices && Array.isArray(option.choices)) {
              option.choices.forEach((choice: any) => {
                options.push(choice.name);
              });
            }
          });
        } else {
          // Old format: options as array of choice names
          options = product.options.map((option: any) => option.choiceName || option);
        }
      }

      return {
        name: product.name,
        quantity: quantity,
        unitPrice: unitPrice,
        subtotal: subtotal,
        options: options
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
      amountReceived: ticket.totals.total, // Default to total for now
      change: 0 // Default to 0 for now
    };
  }

  // Transform legacy income data to unified format
  static transformIncomeData(apiData: LegacyIncomeData): UnifiedReceiptData {
    const products: UnifiedProduct[] = apiData.products.map((product, index) => {
      // Use pre-calculated subtotal if available, otherwise calculate it
      const quantity = product.quantity || 1;
      const unitPrice = product.unitPrice || 0;
      const subtotal = product.subtotal !== undefined ? product.subtotal : (unitPrice * quantity);
      
      return {
        id: index,
        name: product.name,
        quantity: quantity,
        unitPrice: unitPrice,
        subtotal: subtotal,
        options: product.options && product.options.length > 0 ? [{
          name: 'Opciones',
          choices: product.options.map(option => ({
            name: option,
            price: 0
          }))
        }] : undefined
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
    const products: UnifiedProduct[] = cartData.products.map((product: any, index: number) => {
      // Use pre-calculated subtotal if available, otherwise calculate it
      const quantity = product.quantity || 1;
      const unitPrice = product.price || product.unitPrice || 0;
      const subtotal = product.subtotal !== undefined ? product.subtotal : (unitPrice * quantity);
      
      return {
        id: index, // Use array index as fallback ID
        name: product.name,
        quantity: quantity,
        unitPrice: unitPrice,
        subtotal: subtotal,
        options: product.selectedOptions ? this.parseSelectedOptions(product.selectedOptions) : undefined,
        pieces: product.pieces
      };
    });

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
    const isUltraCompact = width === '46mm';

    return `
<!DOCTYPE html>
<html>
<head>
  <title>Recibo - ${data.type === 'income' ? 'Ingreso' : 'Egreso'}</title>
  ${this.generatePrintStyles(width, isThermal, isUltraCompact)}
</head>
<body>
  <div class="receipt-container">
    ${this.generateHeader(data, isUltraCompact)}
    ${this.generateClientInfo(data, isUltraCompact)}
    ${this.generateProducts(data, isUltraCompact)}
    ${this.generateTotals(data, isUltraCompact)}
    ${this.generatePaymentInfo(data, isUltraCompact)}
    ${this.generateFooter(data, isUltraCompact)}
  </div>
</body>
</html>`;
  }

  // Generate CSS styles for printing
  private static generatePrintStyles(width: string, isThermal: boolean, isUltraCompact: boolean): string {
    // Define sizes based on width mode
    const baseFontSize = isUltraCompact ? '6px' : (isThermal ? '9px' : '12px');
    const smallFontSize = isUltraCompact ? '5px' : (isThermal ? '7px' : '10px');
    const titleFontSize = isUltraCompact ? '10px' : (isThermal ? '14px' : '18px');
    const totalFontSize = isUltraCompact ? '9px' : (isThermal ? '11px' : '14px');
    const padding = isUltraCompact ? '1px' : (isThermal ? '2mm' : '10px');
    const margin = isUltraCompact ? '1px' : (isThermal ? '3px' : '10px');
    const lineHeight = isUltraCompact ? '1.0' : '1.1';
    const borderStyle = isUltraCompact ? 'none' : (isThermal ? '1px dashed' : '2px solid');
    
    return `
<style>
  html, body {
    margin: 0;
    padding: 0;
    width: ${width};
    font-family: Arial, Helvetica, sans-serif;
    font-size: ${baseFontSize};
    color: #000;
    background: white;
    line-height: ${lineHeight};
  }

  * {
    box-sizing: border-box;
    color: #000;
  }

  .receipt-container {
    width: 100%;
    max-width: ${width};
    margin: 0 auto;
    padding: ${padding};
  }

  .receipt-title {
    font-size: ${titleFontSize};
    font-weight: bold;
    text-align: center;
    border-bottom: ${borderStyle} #000;
    padding-bottom: ${isUltraCompact ? '1px' : '5px'};
    margin-bottom: ${margin};
  }

  .receipt-subtitle {
    font-size: ${smallFontSize};
    text-align: center;
    margin-bottom: ${margin};
  }

  .receipt-section {
    margin-bottom: ${margin};
  }

  .receipt-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: ${isUltraCompact ? '0px' : '3px'};
    font-size: ${baseFontSize};
  }

  .receipt-label {
    font-weight: bold;
  }

  .receipt-value {
    text-align: right;
  }

  .receipt-products {
    margin: ${margin} 0;
  }

  .product-header {
    display: flex;
    font-weight: bold;
    font-size: ${smallFontSize};
    border-bottom: ${borderStyle} #000;
    padding-bottom: ${isUltraCompact ? '0px' : '2px'};
    margin-bottom: ${isUltraCompact ? '1px' : '3px'};
  }

  .product-header-name {
    flex: 1;
  }

  .product-header-qty {
    width: 15%;
    text-align: center;
  }

  .product-header-price {
    width: 25%;
    text-align: right;
  }

  .product-row {
    display: flex;
    margin-bottom: ${isUltraCompact ? '0px' : '2px'};
    font-size: ${baseFontSize};
  }

  .product-name {
    flex: 1;
    font-weight: bold;
    word-wrap: break-word;
  }

  .product-qty {
    width: 15%;
    text-align: center;
  }

  .product-price {
    width: 25%;
    text-align: right;
  }

  .product-options {
    font-size: ${smallFontSize};
    margin-left: 10px;
    margin-bottom: ${isUltraCompact ? '0px' : '2px'};
  }

  .product-pieces {
    font-size: ${smallFontSize};
    margin-left: 10px;
    margin-bottom: ${isUltraCompact ? '0px' : '2px'};
    font-style: italic;
  }

  .receipt-totals {
    border-top: ${borderStyle} #000;
    border-bottom: ${borderStyle} #000;
    padding: ${isUltraCompact ? '1px' : '5px'} 0;
    margin: ${margin} 0;
  }

  .total-row {
    display: flex;
    justify-content: space-between;
    font-weight: bold;
    font-size: ${baseFontSize};
  }

  .grand-total {
    font-size: ${totalFontSize};
    font-weight: bold;
    border-top: ${isUltraCompact ? '1px solid' : borderStyle} #000;
    padding-top: ${isUltraCompact ? '1px' : '5px'};
    margin-top: ${isUltraCompact ? '1px' : '3px'};
  }

  .receipt-footer {
    text-align: center;
    font-size: ${smallFontSize};
    margin-top: ${margin};
    padding-top: ${isUltraCompact ? '1px' : '8px'};
    border-top: ${borderStyle} #000;
  }

  .payment-method {
    font-weight: bold;
    text-align: center;
    margin: ${isUltraCompact ? '1px' : '5px'} 0;
  }

  .company-info {
    font-size: ${smallFontSize};
    margin-top: ${isUltraCompact ? '1px' : '3px'};
  }

  @page {
    size: ${width} auto;
    margin: 0;
  }

  @media print {
    body {
      width: ${width};
    }
    .receipt-container {
      width: ${width};
      max-width: ${width};
    }
  }
</style>`;
  }

  // Generate header section
  private static generateHeader(data: UnifiedReceiptData, isUltraCompact: boolean): string {
    return `
    <div class="receipt-title">${data.company.name}</div>
    ${!isUltraCompact ? `
    <div class="receipt-subtitle">
      RECIBO - ${data.type === 'income' ? 'INGRESO' : 'EGRESO'}
    </div>` : ''}`;
  }

  // Generate client and user info
  private static generateClientInfo(data: UnifiedReceiptData, isUltraCompact: boolean): string {
    if (isUltraCompact) {
      return `
    <div class="receipt-section">
      <div class="receipt-row">
        <span>${data.date}</span>
        <span>${data.time}</span>
      </div>
      <div class="receipt-row">
        <span>${data.client.name}</span>
        <span>$${data.totals.total.toFixed(2)}</span>
      </div>
    </div>`;
    }
    
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
  private static generateProducts(data: UnifiedReceiptData, isUltraCompact: boolean): string {
    const productRows = data.products.map(product => {
      const optionsText = product.options && product.options.length > 0 
        ? product.options.map(opt => `${opt.name}: ${opt.choices.map(c => c.name).join(', ')}`).join('; ')
        : '';
      
      // Generate pieces text for "Servicio Completo" products
      const piecesText = product.pieces 
        ? `Piezas: Pantalones ${product.pieces.pantalones}, Prendas ${product.pieces.prendas}, Otros ${product.pieces.otros}`
        : '';
      
      return `
      <div class="product-row">
        <div class="product-name">${product.quantity}x ${product.name}</div>
        <div class="product-price">$${product.subtotal.toFixed(2)}</div>
      </div>
      ${optionsText && !isUltraCompact ? `<div class="product-options">${optionsText}</div>` : ''}
      ${piecesText && !isUltraCompact ? `<div class="product-pieces">${piecesText}</div>` : ''}`;
    }).join('');

    return `
    <div class="receipt-products">
      ${!isUltraCompact ? `
      <div class="product-header">
        <div class="product-header-name">Producto</div>
        <div class="product-header-qty">Cant</div>
        <div class="product-header-price">Total</div>
      </div>` : ''}
      ${productRows}
    </div>`;
  }

  // Generate totals section
  private static generateTotals(data: UnifiedReceiptData, isUltraCompact: boolean): string {
    if (isUltraCompact) {
      return `
    <div class="receipt-section receipt-totals">
      <div class="total-row grand-total">
        <span>TOTAL:</span>
        <span>$${data.totals.total.toFixed(2)}</span>
      </div>
    </div>`;
    }
    
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
  private static generatePaymentInfo(data: UnifiedReceiptData, isUltraCompact: boolean): string {
    const paymentMethodText = this.getPaymentMethodText(data.payment.method);
    
    if (isUltraCompact) {
      return `
    <div class="receipt-section">
      <div class="receipt-row">
        <span>${paymentMethodText}</span>
        ${data.payment.method === 'efectivo' ? `
        <span>Cambio: $${data.payment.change.toFixed(2)}</span>` : ''}
      </div>
    </div>`;
    }
    
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
  private static generateFooter(data: UnifiedReceiptData, isUltraCompact: boolean): string {
    if (isUltraCompact) {
      return `
    <div class="receipt-footer">
      ¡Gracias!
    </div>`;
    }
    
    return `
    <div class="receipt-footer">
      ¡Gracias por su ${data.type === 'income' ? 'compra' : 'pago'}!<br/>
      ${data.company.website}<br/>
      <div class="company-info">
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


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
    name: 'Lavanderia GMO',
    rfc: 'XXX123456XXX',
    address: 'Codorniz 1B Gavilan, Musaro, Nuevo Hermosillo, CP. 83296',
    website: 'https://www.gmolavanderia.com'
  };

  // Format client name for display - shows truncated form for "Desconocido"
  private static formatClientName(name: string): string {
    if (!name) return 'Desconocido -…';
    const lowerName = name.toLowerCase().trim();
    if (lowerName === 'desconocido' || 
        lowerName === 'mostrador' || 
        lowerName === 'mostrador / desconocido' ||
        lowerName.includes('desconocido')) {
      return 'Desconocido -…';
    }
    return name;
  }

  // Extract Ciclo value from product options (supports both old and new formats)
  private static extractCiclo(options: any[]): string | null {
    if (!options || !Array.isArray(options)) return null;
    
    for (const option of options) {
      // New format: flat structure with optionName and choiceName
      if (option.optionName && option.optionName.toLowerCase().includes('ciclo')) {
        if (option.choiceName) {
          return option.choiceName;
        }
      }
      
      // Old format: nested structure with name and choices
      if (option.name && option.name.toLowerCase().includes('ciclo')) {
        if (option.choices && Array.isArray(option.choices) && option.choices.length > 0) {
          return option.choices[0].name || option.choices[0].choiceName;
        }
        if (option.choiceName) {
          return option.choiceName;
        }
      }
      
      // Also check in choices for ciclo (old format)
      if (option.choices) {
        for (const choice of option.choices) {
          if (choice.name && (choice.name.toLowerCase().includes('carga alta') || 
                             choice.name.toLowerCase().includes('basico') ||
                             choice.name.toLowerCase().includes('carga baja') ||
                             choice.name.toLowerCase().includes('medio'))) {
            return choice.name;
          }
        }
      }
    }
    return null;
  }

  // Adapter function to convert Ticket to UnifiedReceiptData format (NEW approach)
  static adaptTicketToUnifiedReceipt(ticket: Ticket): UnifiedReceiptData {
    // Convert paymentDate to date and time components
    const paymentDateTime = new Date(ticket.paymentDate);
    const transactionDate = paymentDateTime.toLocaleDateString('es-ES');
    const transactionTime = paymentDateTime.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    // Convert Ticket products to UnifiedProduct format with new option structure
    const products: UnifiedProduct[] = ticket.products.map((product: any, index: number) => {
      // Calculate quantity if not provided by API
      const unitPrice = product.unitPrice || 0;
      const subtotal = product.subtotal || 0;
      const quantity = product.quantity || (unitPrice > 0 ? Math.round(subtotal / unitPrice) : 1);

      // Transform options to new format
      let options: any[] | undefined;
      if (product.options && Array.isArray(product.options)) {
        options = product.options.map((option: any) => ({
          productOptionId: option.productOptionId,
          optionName: option.optionName || option.name || 'Opción',
          productOptionChoiceId: option.productOptionChoiceId,
          choiceName: option.choiceName || '',
          price: option.price || 0,
          quantity: option.quantity || 1
        }));
      }

      return {
        id: product.incomeDetailId || index,
        name: product.name,
        quantity: quantity,
        unitPrice: unitPrice,
        subtotal: subtotal,
        options: options && options.length > 0 ? options : undefined
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
      company: this.COMPANY_INFO,
      products,
      totals: {
        subtotal: ticket.totals.subtotal,
        iva: 0, // Force IVA to 0
        total: ticket.totals.subtotal
      },
      payment: {
        method: this.normalizePaymentMethod(ticket.paymentMethod),
        amountReceived: ticket.totals.total,
        change: 0
      }
    };
  }

  // Adapter function to convert Ticket to LegacyIncomeData format (OLD approach - for backward compatibility)
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
        // New format: options with flat structure
        if (product.options[0]?.optionName || product.options[0]?.choiceName) {
          product.options.forEach((option: any) => {
            const choiceName = option.choiceName || '';
            if (choiceName) {
              options.push(choiceName);
            }
          });
        } else if (product.options[0]?.choices) {
          // Old format: options with nested choices structure
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
      
      // Transform to new option format
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
        quantity: quantity,
        unitPrice: unitPrice,
        subtotal: subtotal,
        options: options
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
        iva: 0, // Force IVA to 0
        total: apiData.subtotal
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
      
      // Transform options to new format
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
        id: index, // Use array index as fallback ID
        name: product.name,
        quantity: quantity,
        unitPrice: unitPrice,
        subtotal: subtotal,
        options: options,
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
      totals: {
        subtotal: cartData.totals.subtotal,
        iva: 0, // Force IVA to 0
        total: cartData.totals.subtotal
      },
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

  // Parse selected options from cart data (supports both old and new formats)
  private static parseSelectedOptions(selectedOptions: Record<string, any>): any {
    return Object.entries(selectedOptions).map(([key, value]) => ({
      optionName: key,
      choiceName: Array.isArray(value) ? value.join(', ') : String(value),
      price: 0,
      quantity: 1
    }));
  }

  // Generate optimized HTML for printing - COMPACT THERMAL FORMAT
  static generatePrintHTML(data: UnifiedReceiptData, options: PrintOptions = {}): string {
    const width = options.width || '58mm';
    const isThermal = options.thermal !== false;
    const isUltraCompact = width === '46mm';

    return `
<!DOCTYPE html>
<html>
<head>
  <title>Recibo - ${data.type === 'income' ? 'Ingreso' : 'Egreso'}</title>
  ${this.generateCompactPrintStyles(width, isThermal, isUltraCompact)}
</head>
<body>
  <div class="receipt-container">
    ${this.generateCompactHeader(data, isUltraCompact)}
    ${this.generateCompactClientInfo(data, isUltraCompact)}
    ${this.generateCompactProducts(data, isUltraCompact)}
    ${this.generateCompactTotals(data, isUltraCompact)}
    ${this.generateCompactPayment(data, isUltraCompact)}
    ${this.generateCompactFooter(data, isUltraCompact)}
  </div>
</body>
</html>`;
  }

  // Compact thermal print styles - DARK BOLD FONTS
  private static generateCompactPrintStyles(width: string, isThermal: boolean, isUltraCompact: boolean): string {
    const charsPerLine = isUltraCompact ? 32 : 42;
    const baseFontSize = isUltraCompact ? '8px' : '10px';
    
    return `
<style>
  @page { size: ${width} auto; margin: 0; }
  html, body {
    margin: 0; padding: 2px;
    width: ${width};
    font-family: 'Courier New', Courier, monospace;
    font-size: ${baseFontSize};
    font-weight: bold;
    color: #000;
    background: white;
    line-height: 1.1;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .receipt-container { width: 100%; max-width: ${width}; margin: 0 auto; }
  .receipt-title { font-size: ${isUltraCompact ? '12px' : '14px'}; font-weight: 900; text-align: center; margin-bottom: 4px; }
  .receipt-subtitle { font-size: ${baseFontSize}; font-weight: bold; text-align: center; margin-bottom: 4px; }
  .receipt-field { margin: 2px 0; font-size: ${baseFontSize}; font-weight: bold; }
  .receipt-field strong { font-weight: 900; }
  .meta-row { margin: 1px 0; font-size: ${baseFontSize}; font-weight: bold; }
  .divider { border-top: 1px dashed #000; margin: 4px 0; }
  .product-line { display: flex; justify-content: space-between; margin: 2px 0; font-size: ${baseFontSize}; font-weight: bold; }
  .product-name { flex: 1; word-wrap: break-word; margin-right: 8px; font-weight: bold; }
  .product-price { text-align: right; min-width: 60px; font-weight: bold; }
  .product-qty { text-align: center; min-width: 30px; font-weight: bold; }
  .totals-row { display: flex; justify-content: space-between; margin: 2px 0; }
  .total-label { font-weight: 900; }
  .total-value { text-align: right; min-width: 60px; font-weight: bold; }
  .grand-total { font-weight: 900; font-size: ${isUltraCompact ? '11px' : '13px'}; }
  .footer { text-align: center; margin-top: 6px; font-size: ${baseFontSize}; }
  .footer-line { margin: 1px 0; font-weight: bold; }
  @media print {
    body { width: ${width}; }
    .receipt-container { width: ${width}; max-width: ${width}; }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  }
</style>`;
  }

  // Compact header section
  private static generateCompactHeader(data: UnifiedReceiptData, isUltraCompact: boolean): string {
    return `
    <div class="receipt-title">${data.company.name}</div>
    ${!isUltraCompact ? `<div class="receipt-subtitle">RECIBO - ${data.type === 'income' ? 'INGRESO' : 'EGRESO'}</div>` : ''}
    <div class="divider"></div>`;
  }

  // Compact metadata (Fecha, ID, Cliente, Teléfono, Email, Usuario)
  private static generateCompactClientInfo(data: UnifiedReceiptData, isUltraCompact: boolean): string {
    const clientName = this.formatClientName(data.client.name);
    
    return `
    <div class="receipt-field"><strong>Fecha:</strong> ${data.date} ${data.time}</div>
    <div class="receipt-field"><strong>ID:</strong> ${data.id}</div>
    <div class="receipt-field"><strong>Cliente:</strong> ${clientName}</div>
    ${data.client.phone ? `<div class="receipt-field"><strong>Teléfono:</strong> ${data.client.phone}</div>` : ''}
    ${data.client.email ? `<div class="receipt-field"><strong>Email:</strong> ${data.client.email}</div>` : ''}
    <div class="receipt-field"><strong>Usuario:</strong> ${data.user.name}</div>
    <div class="divider"></div>`;
  }

  // Compact products section
  private static generateCompactProducts(data: UnifiedReceiptData, isUltraCompact: boolean): string {
    const productRows = data.products.map(product => {
      // Safely access options
      const productOptions = product.options ?? [];
      const ciclo = productOptions.length > 0 ? this.extractCiclo(productOptions) : null;
      
      if (productOptions.length > 0) {
        // Product with options - show each option as separate line
        return productOptions.map((opt: any) => {
          const optQty = Number(opt.quantity ?? 1);
          const optPrice = Number(opt.price ?? 0);
          const displayPrice = productOptions.length === 1 ? product.subtotal : optPrice;
          
          return `
    <div class="product-line">
      <span class="product-name">${optQty}x ${opt.optionName}: ${opt.choiceName}</span>
      <span class="product-price">$${displayPrice.toFixed(2)}</span>
    </div>`;
        }).join('');
      } else {
        // Simple product
        return `
    <div class="product-line">
      <span class="product-name">${product.quantity}x ${product.name}${ciclo ? ` (${ciclo})` : ''}</span>
      <span class="product-price">$${product.subtotal.toFixed(2)}</span>
    </div>`;
      }
    }).join('');

    return `
    <div class="receipt-field"><strong>Productos / Servicios</strong></div>
    ${productRows}
    <div class="divider"></div>`;
  }

  // Compact totals section
  private static generateCompactTotals(data: UnifiedReceiptData, isUltraCompact: boolean): string {
    return `
    <div class="totals-row">
      <span class="total-label">Subtotal:</span>
      <span class="total-value">$${data.totals.subtotal.toFixed(2)}</span>
    </div>
    <div class="totals-row">
      <span class="total-label">IVA:</span>
      <span class="total-value">$${data.totals.iva.toFixed(2)}</span>
    </div>
    <div class="divider"></div>
    <div class="totals-row grand-total">
      <span class="total-label">TOTAL:</span>
      <span class="total-value">$${data.totals.total.toFixed(2)}</span>
    </div>
    <div class="divider"></div>`;
  }

  // Compact payment section
  private static generateCompactPayment(data: UnifiedReceiptData, isUltraCompact: boolean): string {
    const methodText = this.getPaymentMethodText(data.payment.method);
    
    return `
    <div class="receipt-field"><strong>Método:</strong> ${methodText}</div>
    ${data.payment.method === 'efectivo' ? `
    
    <div class="receipt-field"><strong>Cambio:</strong> $${Number(data.payment.change ?? 0).toFixed(2)}</div>` : ''}
    <div class="divider"></div>`;
  }

  // Compact footer section
  private static generateCompactFooter(data: UnifiedReceiptData, isUltraCompact: boolean): string {
    return `
    <div class="footer">
      <div class="footer-line">¡Gracias por tu ${data.type === 'income' ? 'compra' : 'pago'}!</div>
      <div class="footer-line">${data.company.website}</div>
      <div class="footer-line">${data.company.name} - RFC: ${data.company.rfc}</div>
      <div class="footer-line">${data.company.address}</div>
    </div>`;
  }

  // Generate CSS styles for printing
  private static generatePrintStyles(width: string, isThermal: boolean, isUltraCompact: boolean): string {
    // Define sizes based on width mode - IMPROVED: larger fonts, tighter spacing
    const baseFontSize = isUltraCompact ? '8px' : (isThermal ? '9px' : '12px');
    const smallFontSize = isUltraCompact ? '7px' : (isThermal ? '7px' : '10px');
    const titleFontSize = isUltraCompact ? '12px' : (isThermal ? '14px' : '18px');
    const totalFontSize = isUltraCompact ? '11px' : (isThermal ? '11px' : '14px');
    const padding = isUltraCompact ? '1px' : (isThermal ? '2mm' : '10px');
    const margin = isUltraCompact ? '0px' : (isThermal ? '3px' : '10px');
    const lineHeight = isUltraCompact ? '0.9' : '1.1';
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

  /* Service Card Styles - Match UnifiedReceipt.tsx */
  .service-card {
    background: white;
    border-radius: ${isUltraCompact ? '2px' : '4px'};
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    margin-bottom: ${isUltraCompact ? '2px' : '8px'};
    overflow: hidden;
    border: 1px solid #e5e7eb;
    page-break-inside: avoid;
  }

  .service-primary-header {
    background: #64748b;
    padding: ${isUltraCompact ? '2px 4px' : '6px 8px'};
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .service-label {
    font-size: ${isUltraCompact ? '6px' : '9px'};
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: rgba(255, 255, 255, 0.9);
    white-space: nowrap;
  }

  .service-name {
    font-size: ${isUltraCompact ? '8px' : '11px'};
    font-weight: 600;
    color: white;
  }

  .service-secondary-header {
    background: #94a3b8;
    padding: ${isUltraCompact ? '1px 4px' : '4px 8px'};
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .product-header-name {
    flex: 1;
    text-align: left;
    font-size: ${isUltraCompact ? '7px' : '10px'};
    font-weight: 600;
    text-transform: uppercase;
    color: white;
  }

  .product-header-qty {
    width: 12%;
    text-align: center;
    font-size: ${isUltraCompact ? '7px' : '10px'};
    font-weight: 600;
    text-transform: uppercase;
    color: white;
  }

  .product-header-unit-price,
  .product-header-price {
    width: 20%;
    text-align: right;
    font-size: ${isUltraCompact ? '7px' : '10px'};
    font-weight: 600;
    text-transform: uppercase;
    color: white;
  }

  .product-header-price {
    width: 22%;
  }

  /* Product Row Styles */
  .product-row {
    display: flex;
    margin-bottom: ${isUltraCompact ? '0px' : '2px'};
    font-size: ${baseFontSize};
    padding: ${isUltraCompact ? '1px 4px' : '3px 8px'};
    background: white;
    border-bottom: 1px solid #e5e7eb;
  }

  .product-row:last-child {
    border-bottom: none;
  }

  .product-name {
    flex: 1;
    font-weight: 500;
    color: #334155;
    text-align: left;
    font-size: ${isUltraCompact ? '7px' : '11px'};
    word-wrap: break-word;
  }

  .product-qty {
    width: 12%;
    text-align: center;
    font-weight: 600;
    color: #475569;
    font-size: ${isUltraCompact ? '7px' : '11px'};
  }

  .product-unit-price,
  .product-price {
    width: 20%;
    text-align: right;
    font-weight: 600;
    color: #334155;
    font-size: ${isUltraCompact ? '7px' : '11px'};
  }

  .product-price {
    width: 22%;
  }

  .product-options {
    font-size: ${smallFontSize};
    margin-left: 10px;
    margin-bottom: ${isUltraCompact ? '0px' : '2px'};
    color: #6c757d;
    font-style: italic;
  }

  .product-pieces {
    font-size: ${smallFontSize};
    margin-left: 10px;
    margin-bottom: ${isUltraCompact ? '0px' : '2px'};
    font-style: italic;
    background: #f1f3f5;
    padding: 2px 6px;
    border-radius: 2px;
    border-left: 2px solid #667eea;
  }

  .product-quantity {
    font-size: ${baseFontSize};
    margin-left: 10px;
    margin-bottom: ${isUltraCompact ? '0px' : '2px'};
  }

  .product-ciclo {
    font-size: ${baseFontSize};
    margin-left: 10px;
    margin-bottom: ${isUltraCompact ? '0px' : '2px'};
    font-weight: bold;
    color: #667eea;
  }

  .productos-title {
    font-size: ${isUltraCompact ? '10px' : '14px'};
    font-weight: 700;
    color: #111827;
    margin-bottom: ${isUltraCompact ? '4px' : '8px'};
    display: block;
  }

  /* Original product-header for backward compatibility */
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
    width: 12%;
    text-align: center;
  }

  .product-header-unit-price {
    width: 20%;
    text-align: right;
  }

  .product-header-price {
    width: 20%;
    text-align: right;
  }

  .payment-section {
    border-top: ${borderStyle} #000;
    padding-top: ${isUltraCompact ? '1px' : '5px'};
    margin-top: ${margin};
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

  .template-id {
    font-size: ${smallFontSize};
    font-weight: bold;
    margin-top: ${isUltraCompact ? '1px' : '3px'};
    text-align: center;
  }

  .section-divider {
    border-top: 1px dashed #000;
    margin: ${isUltraCompact ? '1px' : '5px'} 0;
  }

  .section-divider-short {
    border-top: 1px dashed #000;
    margin: ${isUltraCompact ? '1px' : '3px'} auto;
    width: 50%;
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
    .service-card {
      page-break-inside: avoid;
    }
    .receipt-section {
      page-break-inside: avoid;
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
      RECIBO
    </div>
    <div class="section-divider"></div>` : ''}`;
  }

  // Generate client and user info - MATCHES UnifiedReceipt.tsx
  private static generateClientInfo(data: UnifiedReceiptData, isUltraCompact: boolean): string {
    const clientName = this.formatClientName(data.client.name);
    
    if (isUltraCompact) {
      // Ultra-compact format with all info
      return `
    <div class="receipt-section">
      <div class="receipt-row">
        <span class="receipt-label">Fecha:</span>
        <span class="receipt-value">${data.date} ${data.time}</span>
      </div>
      <div class="receipt-row">
        <span class="receipt-label">ID:</span>
        <span class="receipt-value">${data.id}</span>
      </div>
      <div class="receipt-row">
        <span class="receipt-label">Cliente:</span>
        <span class="receipt-value">${clientName}</span>
      </div>
      ${data.client.phone ? `
      <div class="receipt-row">
        <span class="receipt-label">Teléfono:</span>
        <span class="receipt-value">${data.client.phone}</span>
      </div>` : ''}
      ${data.client.email ? `
      <div class="receipt-row">
        <span class="receipt-label">Email:</span>
        <span class="receipt-value">${data.client.email}</span>
      </div>` : ''}
      <div class="receipt-row">
        <span class="receipt-label">Usuario:</span>
        <span class="receipt-value">${data.user.name}</span>
      </div>
    </div>
    <div class="section-divider"></div>`;
    }
    
    // Full format - matches UnifiedReceipt.tsx section
    return `
    <div class="receipt-section">
      <div class="receipt-row">
        <span class="receipt-label">Fecha y Hora:</span>
        <span class="receipt-value">${data.date} ${data.time}</span>
      </div>
      <div class="receipt-row">
        <span class="receipt-label">ID:</span>
        <span class="receipt-value">${data.id}</span>
      </div>
      <div class="receipt-row">
        <span class="receipt-label">Cliente:</span>
        <span class="receipt-value">${clientName}</span>
      </div>
      ${data.client.phone ? `
      <div class="receipt-row">
        <span class="receipt-label">Teléfono:</span>
        <span class="receipt-value">${data.client.phone}</span>
      </div>` : ''}
      ${data.client.email ? `
      <div class="receipt-row">
        <span class="receipt-label">Email:</span>
        <span class="receipt-value">${data.client.email}</span>
      </div>` : ''}
      <div class="receipt-row">
        <span class="receipt-label">Usuario:</span>
        <span class="receipt-value">${data.user.name}</span>
      </div>
    </div>
    <div class="section-divider"></div>`;
  }

  // Generate products section - MATCHES UnifiedReceipt.tsx service card format
  private static generateProducts(data: UnifiedReceiptData, isUltraCompact: boolean): string {
    const productRows = data.products.map((product, index) => {
      // Extract Ciclo from options (supports both old and new formats)
      const ciclo = product.options ? this.extractCiclo(product.options) : null;
      
      // Build options text (supports both old and new formats)
      let optionsText = '';
      if (product.options && product.options.length > 0) {
        // New format: flat structure with optionName and choiceName
        if (product.options[0]?.optionName) {
          optionsText = product.options
            .filter((opt: any) => !opt.optionName?.toLowerCase().includes('ciclo'))
            .map((opt: any) => `${opt.optionName} ${opt.choiceName}`)
            .join('; ');
        } else {
          // Old format: nested structure with name and choices
          optionsText = product.options
            .filter((opt: any) => !opt.name?.toLowerCase().includes('ciclo'))
            .map((opt: any) => {
              const choices = opt.choices?.map((c: any) => c.name || c.choiceName).join(', ');
              return choices ? `${opt.name}: ${choices}` : opt.name;
            })
            .join('; ');
        }
      }
      
      // Generate pieces text for "Servicio Completo" products
      const piecesText = product.pieces 
        ? `Piezas: P:${product.pieces.pantalones} Pr:${product.pieces.prendas} O:${product.pieces.otros}`
        : '';
      
      if (isUltraCompact) {
        // Ultra-compact single-line product format
        let productLine = `${product.quantity}x ${product.name}`;
        if (ciclo) productLine += ` (${ciclo})`;
        if (optionsText) productLine += ` ${optionsText}`;
        return `
      <div class="product-row">
        <div class="product-name">${productLine}</div>
        <div class="product-price">$${product.subtotal.toFixed(2)}</div>
      </div>`;
      }
      
      // Full format - matches UnifiedReceipt.tsx service card with table
      // Service card structure with headers and option rows
      let optionRows = '';
      
      // Safely access product.options
      const productOptions = product.options ?? [];
      
      if (productOptions.length > 0) {
        // Show each option as a row with quantity, price columns
        optionRows = productOptions.map((opt: any, optIndex: number) => {
          const optQty = Number(opt.quantity ?? 1);
          const optPrice = Number(opt.price ?? 0);
          const displayPrice = productOptions.length === 1 ? product.subtotal : optPrice;
          
          return `
      <div class="product-row">
        <div class="product-name">${opt.optionName}: ${opt.choiceName}</div>
        <div class="product-qty">${optQty}</div>
        <div class="product-unit-price">$${displayPrice.toFixed(2)}</div>
        <div class="product-price">$${(optPrice * optQty).toFixed(2)}</div>
      </div>`;
        }).join('');
      } else {
        // Simple product without options
        optionRows = `
      <div class="product-row">
        <div class="product-name">${product.name}</div>
        <div class="product-qty">${Number(product.quantity ?? 0)}</div>
        <div class="product-unit-price">$${product.unitPrice.toFixed(2)}</div>
        <div class="product-price">$${product.subtotal.toFixed(2)}</div>
      </div>`;
      }
      
      return `
      <div class="service-card">
        <div class="service-primary-header">
          <span class="service-label">Servicio</span>
          <span class="service-name">${product.name}</span>
        </div>
        <div class="service-secondary-header">
          <div class="product-header-name">Producto</div>
          <div class="product-header-qty">Cant</div>
          <div class="product-header-price">Precio</div>
        </div>
        ${optionRows}
      </div>`;
    }).join('');

    if (isUltraCompact) {
      return `
    <div class="section-divider"></div>
    <div class="receipt-products">
      <div class="productos-title">Productos / Servicios</div>
      ${productRows}
    </div>`;
    }

    // Full format - matches UnifiedReceipt.tsx structure
    return `
    <div class="section-divider"></div>
    <div class="receipt-products">
      <div class="productos-title">Productos / Servicios</div>
      ${productRows}
    </div>
    <div class="section-divider"></div>`;
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
    </div>
    <div class="section-divider"></div>`;
    }
    
    return `
    <div class="section-divider"></div>
    <div class="receipt-section receipt-totals">
      <div class="total-row">
        <span>Subtotal:</span>
        <span>$${data.totals.subtotal.toFixed(2)}</span>
      </div>
      <div class="total-row">
        <span>IVA:</span>
        <span>$${data.totals.iva.toFixed(2)}</span>
      </div>
      <div class="section-divider"></div>
      <div class="total-row grand-total">
        <span>TOTAL:</span>
        <span>$${data.totals.total.toFixed(2)}</span>
      </div>
    </div>
    <div class="section-divider"></div>`;
  }

  // Generate payment information - MATCHES UnifiedReceipt.tsx
  private static generatePaymentInfo(data: UnifiedReceiptData, isUltraCompact: boolean): string {
    const paymentMethodText = this.getPaymentMethodText(data.payment.method);
    
    if (isUltraCompact) {
      // Ultra-compact format with cash details
      if (data.payment.method === 'efectivo') {
        return `
    <div class="receipt-section payment-section">
      <div class="receipt-row">
        <span class="receipt-label">Método:</span>
        <span class="receipt-value">${paymentMethodText}</span>
      </div>
      <div class="receipt-row">
        <span class="receipt-label">Recibido:</span>
        <span class="receipt-value">$${Number(data.payment.amountReceived ?? 0).toFixed(2)}</span>
      </div>
      <div class="receipt-row">
        <span class="receipt-label">Cambio:</span>
        <span class="receipt-value">$${Number(data.payment.change ?? 0).toFixed(2)}</span>
      </div>
    </div>
    <div class="section-divider"></div>`;
      }
      return `
    <div class="receipt-section payment-section">
      <div class="receipt-row">
        <span class="receipt-label">Método:</span>
        <span class="receipt-value">${paymentMethodText}</span>
      </div>
    </div>
    <div class="section-divider"></div>`;
    }
    
    // Full format - matches UnifiedReceipt.tsx payment section
    return `
    <div class="receipt-section">
      <div class="section-divider"></div>
      <div class="payment-method">Método: ${paymentMethodText}</div>
      ${data.payment.method === 'efectivo' ? `

      <div class="receipt-row">
        <span class="receipt-label">Cambio:</span>
        <span class="receipt-value">$${Number(data.payment.change ?? 0).toFixed(2)}</span>
      </div>` : ''}
      <div class="section-divider"></div>
    </div>`;
  }

  // Generate footer
  private static generateFooter(data: UnifiedReceiptData, isUltraCompact: boolean): string {
    if (isUltraCompact) {
      // IMPROVED: Ultra-compact footer - minimal info
      return `
    <div class="receipt-footer">
      <div>¡Gracias!</div>
      <div class="company-info">${data.company.name}</div>
      <div>${data.company.website}</div>
      <div class="template-id">TEMPLATE_ID: GMO-46MM-FIT-v5</div>
    </div>`;
    }
    
    return `
    <div class="receipt-footer">
      <div class="section-divider"></div>
      ¡Gracias por tu ${data.type === 'income' ? 'compra' : 'pago'}!<br/>
      ${data.company.website}<br/>
      <div class="company-info">
        ${data.company.name} - RFC: ${data.company.rfc}<br/>
        ${data.company.address}
      </div>
      <div class="section-divider"></div>
      <div class="template-id">TEMPLATE_ID: GMO-46MM-FIT-v5</div>
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


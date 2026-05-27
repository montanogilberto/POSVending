import { PrintOptions, UnifiedReceiptData } from '../../types/receipt';
import { extractCiclo } from './adapters';
import { formatClientName, getPaymentMethodText } from './normalizers';
import { generateCompactPrintStyles } from './printStyles';

function generateCompactHeader(data: UnifiedReceiptData, isUltraCompact: boolean): string {
  return `
    <div class="receipt-title">${data.company.name}</div>
    ${!isUltraCompact ? `<div class="receipt-subtitle">RECIBO - ${data.type === 'income' ? 'INGRESO' : 'EGRESO'}</div>` : ''}
    <div class="divider"></div>`;
}

function generateCompactClientInfo(data: UnifiedReceiptData): string {
  const clientName = formatClientName(data.client.name);

  return `
    <div class="receipt-field"><strong>Fecha</strong><span>${data.date} ${data.time}</span></div>
    <div class="receipt-field"><strong>ID</strong><span>${data.id}</span></div>
    <div class="receipt-field"><strong>Cliente</strong><span>${clientName}</span></div>
    ${data.client.phone ? `<div class="receipt-field"><strong>Teléfono</strong><span>${data.client.phone}</span></div>` : ''}
    ${data.client.email ? `<div class="receipt-field"><strong>Email</strong><span>${data.client.email}</span></div>` : ''}
    <div class="receipt-field"><strong>Usuario</strong><span>${data.user.name}</span></div>
    <div class="divider"></div>`;
}

function generateCompactProducts(data: UnifiedReceiptData): string {
  const productRows = data.products
    .map(product => {
      const productOptions = product.options ?? [];
      const ciclo = productOptions.length > 0 ? extractCiclo(productOptions) : null;

      const headerLine = `
    <div class="product-line">
      <span class="product-name">${product.quantity}x ${product.name}${ciclo ? ` (${ciclo})` : ''}</span>
      <span class="product-price">$${product.subtotal.toFixed(2)}</span>
    </div>`;

      const optionLines =
        productOptions.length > 0
          ? productOptions
              .map((opt: any) => {
                const optQty = Number(opt.quantity ?? 1);
                return `<div class="option-line">• ${optQty}x ${opt.optionName}: ${opt.choiceName}</div>`;
              })
              .join('')
          : '';

      const piecesLine = product.pieces
        ? `<div class="pieces-line">Piezas P:${product.pieces.pantalones} Pr:${product.pieces.prendas} O:${product.pieces.otros}</div>`
        : '';

      return `${headerLine}${optionLines}${piecesLine}`;
    })
    .join('');

  return `
    <div class="section-title">Productos / Servicios</div>
    ${productRows}
    <div class="divider"></div>`;
}

function generateCompactTotals(data: UnifiedReceiptData): string {
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

function generateCompactPayment(data: UnifiedReceiptData): string {
  const methodText = getPaymentMethodText(data.payment.method);

  return `
    <div class="receipt-field"><strong>Método</strong><span>${methodText}</span></div>
    ${data.payment.method === 'efectivo' ? `
    <div class="receipt-field"><strong>Efectivo</strong><span>$${Number(data.payment.cashPaid ?? data.payment.amountReceived ?? 0).toFixed(2)}</span></div>
    <div class="receipt-field"><strong>Cambio</strong><span>$${Number(data.payment.change ?? 0).toFixed(2)}</span></div>` : ''}
    <div class="divider"></div>`;
}

function generateCompactFooter(data: UnifiedReceiptData): string {
  const qrImageSrc = 'https://imageprofile.blob.core.windows.net/profile/qr_gmolavanderia.png';

  return `
    <div class="qr-wrapper">
      <div class="qr-label">Escanea para más información</div>
      <img class="qr-image" src="${qrImageSrc}" alt="QR GMO Lavanderia" />
    </div>
    <div class="divider"></div>
    <div class="footer">
      <div class="footer-line strong">¡Gracias por tu ${data.type === 'income' ? 'compra' : 'pago'}!</div>
      <div class="footer-line">${data.company.website}</div>
      <div class="footer-line">${data.company.name}</div>
      <div class="footer-line">RFC: ${data.company.rfc}</div>
      <div class="footer-line">${data.company.address}</div>
    </div>`;
}

export function generatePrintHTML(data: UnifiedReceiptData, options: PrintOptions = {}): string {
  const width = options.width || '58mm';
  const isUltraCompact = width === '46mm';

  return `
<!DOCTYPE html>
<html>
<head>
  <title>Recibo - ${data.type === 'income' ? 'Ingreso' : 'Egreso'}</title>
  ${generateCompactPrintStyles(width, isUltraCompact)}
</head>
<body>
  <div class="receipt-container">
    ${generateCompactHeader(data, isUltraCompact)}
    ${generateCompactClientInfo(data)}
    ${generateCompactProducts(data)}
    ${generateCompactTotals(data)}
    ${generateCompactPayment(data)}
    ${generateCompactFooter(data)}
  </div>
</body>
</html>`;
}

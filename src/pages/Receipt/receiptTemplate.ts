/* =========================
   RECEIPT STYLES
========================= */
const RECEIPT_STYLES = `
<style>
  html, body {
    margin: 0;
    padding: 0;
    width: 58mm;
    font-family: Arial, sans-serif !important;
    font-size: 6px !important;
    color: #000 !important;
    background: white;
    line-height: 1.1;
  }

  * {
    color: #000 !important;
    -webkit-font-smoothing: none !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  .receipt-container {
    width: 48mm;
    max-width: 48mm;
    margin: 0 auto;
    padding: 1mm 0;
    box-sizing: border-box;
  }

  .receipt-title {
    font-size: 9px !important;
    font-weight: 900 !important;
    text-align: center;
    border-bottom: 1px dashed #000;
    padding-bottom: 2px;
    margin-bottom: 4px;
  }

  .receipt-section {
    margin-bottom: 4px;
  }

  .receipt-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 1px;
    padding: 0px 0;
    font-size: 6px !important;
    font-weight: 700 !important;
    letter-spacing: 0.1px;
  }

  .receipt-label,
  .receipt-value {
    font-weight: 900 !important;
  }

  .receipt-value {
    text-align: right;
  }

  .receipt-total {
    border-top: 1px solid #000;
    border-bottom: 1px solid #000;
    padding: 2px 0;
    font-size: 8px !important;
    margin: 3px 0;
  }

  .receipt-products {
    margin: 4px 0;
  }

  .receipt-qr {
    text-align: center;
    margin: 4px 0;
    padding: 4px 0;
    border-top: 1px dashed #000;
    border-bottom: 1px dashed #000;
  }

  .qr-code {
    font-family: monospace;
    font-size: 4px;
    line-height: 0.7;
    white-space: pre;
    margin: 2px 0;
  }

  .receipt-footer {
    text-align: center;
    font-size: 6px !important;
    margin-top: 4px;
    padding-top: 2px;
    border-top: 1px dashed #000;
    font-weight: 700 !important;
  }

  @page {
    size: 58mm auto;
    margin: 0;
  }
</style>
`;

/* =========================
   HEADER (DATE / TIME)
========================= */
const RECEIPT_HEADER = `
<div class="receipt-title">RECIBO</div>

<div class="receipt-section">
  <div class="receipt-row">
    <span class="receipt-label">Fecha:</span>
    <span class="receipt-value" id="receipt-date"></span>
  </div>
  <div class="receipt-row">
    <span class="receipt-label">Hora:</span>
    <span class="receipt-value" id="receipt-time"></span>
  </div>
</div>
`;

/* =========================
   CLIENT & USER
========================= */
const RECEIPT_CLIENT = `
<div class="receipt-section">
  <div class="receipt-row">
    <span class="receipt-label">Cliente:</span>
    <span class="receipt-value" id="client-name"></span>
  </div>
  <div class="receipt-row">
    <span class="receipt-label">Usuario:</span>
    <span class="receipt-value" id="user-name"></span>
  </div>
</div>
`;

/* =========================
   PRODUCTS (DYNAMIC)
========================= */
const RECEIPT_PRODUCTS = `
<div class="receipt-products" id="products-list"></div>
`;

/* =========================
   TOTALS
========================= */
const RECEIPT_TOTALS = `
<div class="receipt-section">
  <div class="receipt-row">
    <span class="receipt-label">Subtotal:</span>
    <span class="receipt-value" id="receipt-subtotal"></span>
  </div>
  <div class="receipt-row">
    <span class="receipt-label">IVA:</span>
    <span class="receipt-value" id="receipt-iva"></span>
  </div>
  <div class="receipt-row receipt-total">
    <span class="receipt-label">TOTAL:</span>
    <span class="receipt-value" id="receipt-total"></span>
  </div>
</div>
`;

/* =========================
   PAYMENT
========================= */
const RECEIPT_PAYMENT = `
<div class="receipt-section">
  <div class="receipt-row">
    <span class="receipt-label">Pago:</span>
    <span class="receipt-value" id="payment-method"></span>
  </div>
  <div id="cash-details"></div>
</div>
`;

/* =========================
   QR CODE
========================= */
const RECEIPT_QR = `
<div class="receipt-qr">
  <div class="qr-code" id="qr-code">
    █▀▀▀▀▀█ ▀ █▀▀▀▀▀█<br/>
    █ ███ █ █ █ ███ █<br/>
    █ ▀▀▀ █ ███ █ ▀▀▀ █<br/>
    ▀▀▀▀▀▀▀ █▄█ ▀▀▀▀▀▀▀<br/>
    █▀█▀▀▀█ █ ▀ █▀█▀▀▀█<br/>
    █ █ ▀ █ █▄█ █ █ ▀ █<br/>
    █ ▀▀▀ █ ▀ ▀ █ ▀▀▀ █<br/>
    ▀▀▀▀▀▀▀ ▀ ▀ ▀▀▀▀▀▀▀
  </div>
  <div style="font-size: 4px; margin-top: 2px;">
    Escanea para validar
  </div>
</div>
`;

/* =========================
   FOOTER
========================= */
const RECEIPT_FOOTER = `
<div class="receipt-footer">
  ¡Gracias por tu compra!<br/>
  https://www.gmolavanderia.com/
</div>
`;

/* =========================
   FINAL TEMPLATE
========================= */
export const RECEIPT_TEMPLATE = `
<!DOCTYPE html>
<html>
<head>
  <title>Recibo</title>
  ${RECEIPT_STYLES}
</head>
<body>
  <div class="receipt-container">
    ${RECEIPT_HEADER}
    ${RECEIPT_CLIENT}
    ${RECEIPT_PRODUCTS}
    ${RECEIPT_TOTALS}
    ${RECEIPT_PAYMENT}
    ${RECEIPT_QR}
    ${RECEIPT_FOOTER}
  </div>
</body>
</html>
`;
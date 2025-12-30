/* =========================
   RECEIPT STYLES (58mm FIT)
========================= */
const RECEIPT_STYLES = `
<style>
  html, body {
    margin: 0;
    padding: 0;
    width: 46mm;
    font-family: Arial, sans-serif !important;
    font-size: 9px !important;
    color: #000 !important;
    background: white;
    line-height: 1.05;
  }

  * {
    box-sizing: border-box;
    color: #000 !important;
    -webkit-font-smoothing: none !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  /* Narrower than paper to avoid clipping */
  .receipt-container {
    width: 46mm;
    max-width: 46mm;
    margin: 0 auto;
    padding: 0.5mm 0;
  }

  .receipt-title {
    font-size: 12px !important;
    font-weight: 900 !important;
    text-align: center;
    border-bottom: 1px dashed #000;
    padding-bottom: 2px;
    margin-bottom: 3px;
  }

  .receipt-sub-title {
    font-size: 10px !important;
    font-weight: 900 !important;
    text-align: center;
    border-bottom: 1px dashed #000;
    padding-bottom: 2px;
    margin-bottom: 3px;
  }

  .receipt-section {
    margin-bottom: 2px;
  }

  /* FIXED COLUMNS — NO OVERFLOW */
  .receipt-row {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 1mm;
    margin-bottom: 0.5px;
    padding: 0;
    white-space: nowrap;
  }

  .receipt-label {
    width: 58%;
    font-weight: 900 !important;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .receipt-value {
    width: 42%;
    font-weight: 900 !important;
    text-align: right;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .receipt-products {
    margin: 3px 0;
  }

  .receipt-total {
    border-top: 1px solid #000;
    border-bottom: 1px solid #000;
    padding: 1px 0;
    font-size: 9px !important;
    margin: 2px 0;
  }

  .receipt-qr {
    text-align: center;
    margin: 3px 0;
    padding: 3px 0;
    border-top: 1px dashed #000;
    border-bottom: 1px dashed #000;
  }

  .qr-code {
    font-family: monospace;
    font-size: 3px;
    line-height: 0.65;
    white-space: pre;
    margin: 1px 0;
  }

  .receipt-footer {
    text-align: center;
    font-size: 7px !important;
    margin-top: 3px;
    padding-top: 2px;
    border-top: 1px dashed #000;
    font-weight: 700 !important;
  }

  .template-id {
    font-size: 6px;
    margin-top: 2px;
  }

  @page {
    size: 58mm auto;
    margin: 0;
  }
</style>
`;

/* =========================
   HEADER
========================= */
const RECEIPT_HEADER = `
<div class="receipt-title">Lavanderia GMO</div>

<div class="receipt-sub-title">RECIBO</div>

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
   CLIENT / USER
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
   QR
========================= */
const RECEIPT_QR = `
<div class="receipt-qr">
  <div class="qr-code" id="qr-code">
    █▀▀▀▀▀█ ▀ █▀▀▀▀█<br/>
    █ ███ █ █ ███ █<br/>
    █ ▀▀▀ █ █ ▀▀▀ █<br/>
    ▀▀▀▀▀▀▀ ▀ ▀▀▀▀▀
  </div>
  <div style="font-size: 5px;">Escanea para validar</div>
</div>
`;

/* =========================
   FOOTER
========================= */
const RECEIPT_FOOTER = `
<div class="receipt-footer">
  ¡Gracias por tu compra!<br/>
  https://www.gmolavanderia.com/
  <div class="template-id">TEMPLATE_ID: GMO-58MM-FIT-v5</div>
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
   
    ${RECEIPT_FOOTER}
  </div>
</body>
</html>
`;

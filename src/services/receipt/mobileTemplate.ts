import { UnifiedReceiptData } from '../../types/receipt';
import { getPaymentMethodText } from './normalizers';

const DEFAULT_LOGO_URL = '';
const GMO_QR_URL = 'https://imageprofile.blob.core.windows.net/profile/qr_gmolavanderia.png';
const GMO_PROMOS_URL = 'https://www.gmolavanderia.com';
const GMO_CONTACT_URL = 'https://wa.me/526624737005';
const GMO_SERVICES_URL = 'https://www.gmolavanderia.com';

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '<')
    .replaceAll('>', '>')
    .replaceAll('"', '"')
    .replaceAll("'", '&#39;');
}

function currency(value: unknown): string {
  const amount = Number(value ?? 0);
  return `$${amount.toFixed(2)}`;
}

function normalizeClientName(name: string | undefined): string {
  const cleaned = String(name ?? '').trim();
  if (!cleaned) return 'Mostrador';
  const lower = cleaned.toLowerCase();
  if (lower === 'publico en general' || lower === 'público en general') return 'Mostrador';
  return cleaned;
}

function buildOptionsBlock(options: any[] | undefined): string {
  if (!options || options.length === 0) return '';

  const ciclo = options.find((opt: any) =>
    String(opt?.optionName ?? opt?.name ?? '').toLowerCase().includes('ciclo')
  );
  const cicloLine = ciclo?.choiceName
    ? `<div class="meta-row"><span class="meta-label">Ciclo:</span> <span>${escapeHtml(ciclo.choiceName)}</span></div>`
    : '';

  const optionLines = options
    .filter((opt: any) => !String(opt?.optionName ?? '').toLowerCase().includes('ciclo'))
    .map((opt: any) => {
      const optionName = escapeHtml(opt?.optionName ?? 'Opción');
      const choiceName = escapeHtml(opt?.choiceName ?? '');
      const qty = Number(opt?.quantity ?? 1);
      return `<div class="meta-row"><span class="meta-label">${optionName}:</span> <span>${qty} × ${choiceName}</span></div>`;
    })
    .join('');

  return `${cicloLine}${optionLines}`;
}

function buildPiecesBlock(pieces: any): string {
  if (!pieces) return '';
  const p = Number(pieces?.pantalones ?? 0);
  const pr = Number(pieces?.prendas ?? 0);
  const o = Number(pieces?.otros ?? 0);

  return `
    <div class="meta-group">
      <div class="meta-row"><span class="meta-label">Piezas:</span></div>
      <div class="pieces-grid">
        <span>P:${p}</span>
        <span>Pr:${pr}</span>
        <span>O:${o}</span>
      </div>
    </div>`;
}

function buildProductsSection(data: UnifiedReceiptData): string {
  const rows = data.products
    .map((product) => {
      const productName = escapeHtml(product.name);
      const qty = Number(product.quantity ?? 1);
      const unitPrice = currency(product.unitPrice);
      const lineSubtotal = currency(product.subtotal);
      const optionsBlock = buildOptionsBlock(product.options);
      const piecesBlock = buildPiecesBlock(product.pieces);

      return `
        <article class="line-item">
          <div class="line-top">
            <div class="product-name">${productName}</div>
            <div class="line-subtotal">${lineSubtotal}</div>
          </div>
          <div class="line-pricing">${qty} × ${unitPrice}</div>
          ${optionsBlock ? `<div class="meta-group">${optionsBlock}</div>` : ''}
          ${piecesBlock}
          <div class="line-total-row">
            <span>Line Total</span>
            <strong>${lineSubtotal}</strong>
          </div>
        </article>`;
    })
    .join('');

  return `
    <section class="section">
      <h2 class="section-title">Productos / Servicios</h2>
      ${rows || '<div class="muted">Sin productos</div>'}
    </section>`;
}

function buildPaymentSection(data: UnifiedReceiptData): string {
  const method = getPaymentMethodText(data.payment.method);
  const isCash = data.payment.method === 'efectivo';
  const amountReceived = Number(
    data.payment.cashPaid ?? data.payment.amountReceived ?? data.totals.amountReceived ?? 0
  );
  const change = Number(data.payment.change ?? data.payment.cashReturn ?? data.totals.change ?? 0);

  return `
    <section class="section">
      <h2 class="section-title">Pago</h2>
      <div class="kv-row"><span>Método</span><strong>${escapeHtml(method)}</strong></div>
      ${
        isCash
          ? `
      <div class="kv-row"><span>Recibido</span><strong>${currency(amountReceived)}</strong></div>
      <div class="kv-row"><span>Cambio</span><strong>${currency(change)}</strong></div>
      `
          : ''
      }
    </section>`;
}

export function generateMobileReceiptHTML(data: UnifiedReceiptData): string {
  const companyName = escapeHtml(data.company?.name || 'Lavandería GMO');
  const branch = '';
  const receiptNumber = escapeHtml(data.id || '-');
  const dateTime = escapeHtml(`${data.date || ''} ${data.time || ''}`.trim());

  const clientName = escapeHtml(normalizeClientName(data.client?.name));
  const clientPhone = escapeHtml(data.client?.phone || 'Desconocido');
  const email = String(data.client?.email ?? '').trim();

  const subtotal = Number(data.totals?.subtotal ?? 0);
  const iva = Number(data.totals?.iva ?? 0);
  const discount = Number(data.totals?.discount ?? 0);
  const originalTotal = Number(data.totals?.originalTotal ?? subtotal + iva);
  const finalTotal = Number(data.totals?.total ?? subtotal + iva - discount);

  const incomeId = escapeHtml(data.id ?? '-');
  const ticketNumber = '';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>Recibo ${receiptNumber}</title>
  <style>
    :root {
      --primary: #1976d2;
      --primary-dark: #1259a8;
      --success: #16a34a;
      --text: #111827;
      --muted: #6b7280;
      --border: #e5e7eb;
      --bg: #f8fafc;
      --card: #ffffff;
      --shadow: 0 8px 24px rgba(17, 24, 39, 0.08);
      --radius: 14px;
    }

    * { box-sizing: border-box; }

    html, body {
      margin: 0;
      padding: 0;
      background: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      font-size: 15px;
      line-height: 1.45;
      -webkit-text-size-adjust: 100%;
      text-size-adjust: 100%;
      color-scheme: light;
    }

    body {
      min-height: 100dvh;
      padding: 12px;
    }

    .receipt-card {
      width: 100%;
      max-width: 420px;
      margin: 0 auto;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      box-shadow: var(--shadow);
      overflow: hidden;
    }

    .section {
      padding: 16px;
      border-top: 1px solid var(--border);
    }

    .section:first-child {
      border-top: none;
    }

    .section-title {
      margin: 0 0 12px;
      font-size: 16px;
      line-height: 1.25;
      font-weight: 700;
      color: var(--text);
    }

    .header {
      text-align: center;
      padding: 18px 16px;
    }

    .logo-wrap {
      margin-bottom: 10px;
    }

    .logo {
      width: 64px;
      height: 64px;
      object-fit: contain;
      border-radius: 12px;
      border: 1px solid var(--border);
      background: #fff;
    }

    .company-name {
      margin: 0;
      font-size: 24px;
      line-height: 1.15;
      font-weight: 800;
      letter-spacing: -0.01em;
    }

    .branch {
      margin: 6px 0 0;
      color: var(--muted);
      font-size: 14px;
    }

    .receipt-meta {
      margin-top: 10px;
      font-size: 14px;
      color: var(--text);
    }

    .kv-row {
      display: flex;
      gap: 12px;
      justify-content: space-between;
      align-items: flex-start;
      margin: 8px 0;
    }

    .kv-row span:first-child {
      color: var(--muted);
      flex: 0 0 auto;
    }

    .kv-row strong {
      text-align: right;
      word-break: break-word;
    }

    .line-item {
      padding: 12px 0;
      border-top: 1px dashed var(--border);
    }

    .line-item:first-of-type {
      border-top: none;
      padding-top: 0;
    }

    .line-top {
      display: flex;
      gap: 10px;
      justify-content: space-between;
      align-items: flex-start;
    }

    .product-name {
      font-weight: 700;
      font-size: 15px;
      line-height: 1.35;
      overflow-wrap: anywhere;
      word-break: break-word;
      flex: 1 1 auto;
      min-width: 0;
    }

    .line-subtotal {
      font-weight: 700;
      white-space: nowrap;
      flex: 0 0 auto;
    }

    .line-pricing {
      margin-top: 4px;
      color: var(--muted);
      font-size: 14px;
    }

    .meta-group {
      margin-top: 8px;
      padding: 8px 10px;
      background: #f9fafb;
      border: 1px solid var(--border);
      border-radius: 10px;
    }

    .meta-row {
      margin: 2px 0;
      font-size: 13px;
      overflow-wrap: anywhere;
    }

    .meta-label {
      color: var(--muted);
      font-weight: 600;
    }

    .pieces-grid {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      font-size: 13px;
      margin-top: 4px;
    }

    .line-total-row {
      margin-top: 8px;
      display: flex;
      justify-content: space-between;
      gap: 10px;
      font-size: 13px;
      color: var(--muted);
    }

    .totals .kv-row {
      margin: 10px 0;
    }

    .grand-total {
      margin-top: 8px;
      padding-top: 10px;
      border-top: 1px solid var(--border);
      font-size: 23px;
      font-weight: 800;
      letter-spacing: -0.01em;
    }

    .grand-total span {
      color: var(--text) !important;
    }

    .meta-small {
      font-size: 12px;
      color: var(--muted);
      line-height: 1.4;
    }

    .qr-wrap {
      text-align: center;
    }

    .qr-img {
      width: min(180px, 62vw);
      height: auto;
      border: 1px solid var(--border);
      border-radius: 12px;
      background: #fff;
      padding: 6px;
    }

    .qr-label {
      margin-top: 8px;
      font-size: 13px;
      color: var(--muted);
    }

    .actions {
      display: grid;
      gap: 10px;
    }

    .btn {
      display: block;
      width: 100%;
      min-height: 44px;
      padding: 12px 14px;
      border-radius: 12px;
      border: 1px solid transparent;
      background: var(--primary);
      color: #fff !important;
      text-decoration: none;
      font-weight: 700;
      font-size: 15px;
      text-align: center;
      line-height: 1.2;
    }

    .btn.secondary {
      background: #fff;
      color: var(--primary) !important;
      border-color: var(--primary);
    }

    .btn:active {
      background: var(--primary-dark);
    }

    .footer {
      text-align: center;
      font-size: 14px;
    }

    .footer strong {
      display: block;
      margin-bottom: 6px;
      font-size: 16px;
    }

    .muted { color: var(--muted); }

    @media (min-width: 768px) {
      body { padding: 18px; }
      .section-title { font-size: 17px; }
    }

    @media print {
      body {
        background: #fff;
        padding: 0;
      }
      .receipt-card {
        box-shadow: none;
        border-radius: 0;
        border: none;
        max-width: 100%;
      }
      .btn {
        border: 1px solid #d1d5db;
      }
    }
  </style>
</head>
<body>
  <main class="receipt-card">
    <header class="header section">
      ${
        DEFAULT_LOGO_URL
          ? `<div class="logo-wrap"><img class="logo" src="${escapeHtml(DEFAULT_LOGO_URL)}" alt="Logo"></div>`
          : ''
      }
      <h1 class="company-name">${companyName}</h1>
      ${branch ? `<p class="branch">${escapeHtml(branch)}</p>` : ''}
      <div class="receipt-meta">
        <div>Recibo #${receiptNumber}</div>
        <div>${dateTime}</div>
      </div>
    </header>

    <section class="section">
      <h2 class="section-title">Cliente</h2>
      <div class="kv-row"><span>Nombre</span><strong>${clientName}</strong></div>
      <div class="kv-row"><span>Teléfono</span><strong>${clientPhone}</strong></div>
      ${email ? `<div class="kv-row"><span>Email</span><strong>${escapeHtml(email)}</strong></div>` : ''}
    </section>

    ${buildProductsSection(data)}

    <section class="section totals">
      <h2 class="section-title">Totales</h2>
      <div class="kv-row"><span>Subtotal</span><strong>${currency(subtotal)}</strong></div>
      <div class="kv-row"><span>IVA</span><strong>${currency(iva)}</strong></div>
      ${
        discount > 0
          ? `<div class="kv-row"><span>Descuento</span><strong>- ${currency(discount)}</strong></div>
             <div class="kv-row"><span>Total original</span><strong>${currency(originalTotal)}</strong></div>`
          : ''
      }
      <div class="kv-row grand-total"><span>TOTAL</span><strong>${currency(finalTotal)}</strong></div>
    </section>

    ${buildPaymentSection(data)}

    <section class="section">
      <h2 class="section-title">Metadatos</h2>
      <div class="meta-small">incomeId: ${incomeId}</div>
      ${ticketNumber ? `<div class="meta-small">ticketNumber: ${escapeHtml(ticketNumber)}</div>` : ''}
    </section>

    <section class="section qr-wrap">
      <img class="qr-img" src="${escapeHtml(GMO_QR_URL)}" alt="Código QR GMO">
      <div class="qr-label">Escanea para conocer promociones y servicios GMO</div>
    </section>

    <section class="section">
      <h2 class="section-title">Acciones</h2>
      <div class="actions">
        <a class="btn" href="${GMO_PROMOS_URL}" target="_blank" rel="noopener noreferrer">Ver Promociones</a>
        <a class="btn secondary" href="${GMO_CONTACT_URL}" target="_blank" rel="noopener noreferrer">Contactar a GMO Laundry</a>
        <a class="btn" href="${GMO_SERVICES_URL}" target="_blank" rel="noopener noreferrer">Ver Servicios</a>
      </div>
    </section>

    <footer class="section footer">
      <strong>¡Gracias por tu compra!</strong>
      <div>${companyName}</div>
      ${data.company?.rfc ? `<div>RFC: ${escapeHtml(data.company.rfc)}</div>` : ''}
      ${data.company?.address ? `<div>${escapeHtml(data.company.address)}</div>` : ''}
    </footer>
  </main>
</body>
</html>`;
}

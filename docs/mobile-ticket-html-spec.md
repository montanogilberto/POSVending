# Mobile Ticket HTML Spec (SMS / WhatsApp)

## Purpose

Define a **mobile-first HTML ticket** that can be generated after checkout, saved as a URL, and sent through **WhatsApp** and **SMS**.  
The page must open cleanly on smartphones, be readable without zoom, and include all key receipt information.

---

## 1) End-to-End Flow (Expected)

```text
Checkout
  ↓
fetchTicket()
  ↓
Build ticket HTML (mobile version)
  ↓
saveTicketHtml()
  ↓
one_ticket_tracking(action='save')
  ↓
sendTicketWhatsapp()
  ↓
one_ticket_tracking(action='whatsapp')
  ↓
sendTicketSms()
  ↓
one_ticket_tracking(action='sms')
  ↓
physical print
  ↓
one_ticket_tracking(action='print')
```

### Integration points currently used
- `saveTicketHtml(payload)`
- `postOneTicketTracking({ action: 'save' | 'whatsapp' | 'sms' | 'print' })`
- `sendTicketWhatsapp(...)`
- `sendTicketSms(...)`
- Print execution through `ReceiptService.printReceipt(...)`

---

## 2) Data Contract: Required Ticket Information

The mobile HTML must display these sections consistently.

## 2.1 Business / Header
- Company/store name
- Branch/location (if available)
- Date/time
- Ticket / income ID
- Optional logo

## 2.2 Client
- Client name (or “Mostrador / Desconocido”)
- Phone
- Email (optional)

## 2.3 Payment
- Payment method (`efectivo`, `tarjeta`, `transferencia`)
- Amount received (if cash)
- Change (if cash)

## 2.4 Products / Lines
For each line item:
- Product name
- Quantity
- Unit price (if available)
- Subtotal
- Selected options (cycle/options/add-ons)
- Pieces detail (if applicable)

## 2.5 Totals
- Subtotal
- IVA (if applicable)
- Discount (if promo applied)
- Final total
- Optional original total (when discount exists)

## 2.6 Metadata
- `incomeId`
- `companyId`
- Optional tracking metadata if needed for diagnostics

---

## 3) Mobile-First UX Requirements

The HTML ticket is for smartphone link opening (WhatsApp/SMS), so prioritize phone readability.

- Viewport meta tag required:
  - `width=device-width, initial-scale=1, viewport-fit=cover`
- Content max width:
  - `max-width: 420px`
- Base font:
  - `14px–16px`, line-height `1.4+`
- Headings:
  - clear section separation with spacing
- Tap targets:
  - minimum `44px` height for interactive elements
- Layout:
  - single-column, no horizontal scrolling
- Colors:
  - high contrast for sunlight conditions
- Print-safe and screen-safe styling
- Avoid heavy JS; HTML should render quickly on low-end devices

---

## 4) Recommended HTML Structure

```html
<!doctype html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>Recibo #{{incomeId}}</title>
  <style>
    /* mobile-first css */
  </style>
</head>
<body>
  <main class="ticket">
    <header class="ticket-header">
      <h1>{{companyName}}</h1>
      <p>Recibo #{{incomeId}}</p>
      <p>{{paymentDate}}</p>
    </header>

    <section class="client">
      <h2>Cliente</h2>
      <p>{{clientName}}</p>
      <p>{{clientPhone}}</p>
    </section>

    <section class="items">
      <h2>Detalle</h2>
      <!-- repeat lines -->
      <article class="line">
        <div class="line-title">{{productName}}</div>
        <div class="line-meta">{{qty}} x {{unitPrice}}</div>
        <div class="line-subtotal">{{subtotal}}</div>
      </article>
    </section>

    <section class="totals">
      <div>Subtotal: {{subtotal}}</div>
      <div>IVA: {{iva}}</div>
      <div>Descuento: {{discount}}</div>
      <div class="grand-total">Total: {{total}}</div>
    </section>

    <section class="payment">
      <h2>Pago</h2>
      <p>Método: {{paymentMethod}}</p>
      <p>Recibido: {{amountReceived}}</p>
      <p>Cambio: {{change}}</p>
    </section>
  </main>
</body>
</html>
```

---

## 5) Recommended CSS Baseline (Phone Focus)

```css
:root {
  --bg: #ffffff;
  --text: #111111;
  --muted: #5f6368;
  --line: #e5e7eb;
  --accent: #0a7cff;
}

* { box-sizing: border-box; }
html, body {
  margin: 0;
  padding: 0;
  background: var(--bg);
  color: var(--text);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}
.ticket {
  width: 100%;
  max-width: 420px;
  margin: 0 auto;
  padding: 16px;
}
.ticket-header, .client, .items, .totals, .payment {
  border-bottom: 1px solid var(--line);
  padding: 12px 0;
}
h1 {
  margin: 0 0 6px;
  font-size: 20px;
}
h2 {
  margin: 0 0 8px;
  font-size: 15px;
}
.line {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 6px 10px;
  padding: 8px 0;
}
.line-meta {
  color: var(--muted);
  font-size: 13px;
}
.grand-total {
  font-weight: 700;
  font-size: 18px;
}
```

---

## 6) WhatsApp / SMS Delivery Rules

- Channel message should stay short and clear:
  - `message: "Aquí está su recibo:"`
  - `receiptUrl: "<https://.../receipt_xxxx.html>"`
- URL must be publicly reachable on smartphone browsers.
- URL should open directly to full receipt content without login.
- If phone is unavailable:
  - skip channel sending
  - keep tracking status and user feedback explicit

---

## 7) Tracking Rules by Action

Each action must call `one_ticket_tracking` with consistent identifiers:

- `action: 'save'` after HTML URL persistence success
- `action: 'whatsapp'` after WhatsApp send result
- `action: 'sms'` after SMS send result
- `action: 'print'` after physical print attempt

Recommended payload minimum fields:
- `incomeId`
- `companyId`
- `fileName`
- `containerName`
- `receiptUrl` (when available)
- `phone` (when available)
- `channelResponse` (for whatsapp/sms action when returned)

---

## 8) Error Handling and Fallbacks

## 8.1 HTML Generation
- If generated HTML is empty/invalid, do not send.
- Show explicit status: “No se pudo generar el HTML del recibo”.

## 8.2 Save URL
- If save succeeds but URL missing, treat as partial failure and log response details.

## 8.3 Channel Sending
- WhatsApp can retry with alternate path parameter strategies (incomeId/phone formats).
- If URL missing, skip channel sends and mark reason.
- If phone missing, skip channel sends and mark reason.

## 8.4 Print
- Physical print must still be attempted and tracked independently.

---

## 9) Validation Checklist (Smartphone)

- [ ] Opens correctly on iOS Safari and Android Chrome
- [ ] No horizontal scrolling on 360px width
- [ ] All text readable without zoom
- [ ] Total/payment clearly visible
- [ ] Product options and pieces readable
- [ ] URL opens from WhatsApp app webview
- [ ] URL opens from SMS app webview
- [ ] Dark mode still readable (or enforce light mode safely)
- [ ] Save/send/track statuses reflected in UI summary

---

## 10) Implementation Notes for This Codebase

- Current print/send pipeline is centralized in:
  - `src/pages/Receipt/useReceiptPrint.ts`
- Cart flow now routes receipt print action through that same hook from:
  - `src/pages/Receipt/ReceiptDisplay.tsx`
- The mobile HTML should be generated from the same normalized `UnifiedReceiptData` used for printing to keep content parity between:
  - printed receipt
  - smartphone URL receipt

---

## 11) Suggested Next Increment

1. Add a dedicated “mobile template” generator in `src/services/receipt/` (separate from thermal print styling).
2. Save that HTML via `saveTicketHtml`.
3. Keep thermal print HTML independent to avoid style conflicts.
4. Add automated smoke test for:
   - HTML generation validity
   - non-empty URL return
   - channel payload shape

# Ticket Workflow (Print + WhatsApp + SMS)

This document describes the current ticket workflow implemented in the app, including how the **SMS** and **WhatsApp** messages include a link (`receiptUrl`) so the customer can open the ticket.

## 1) Entry Point in UI

- File: `src/pages/Receipt/components/ReceiptActions.tsx`
- User action: click **Imprimir**
- Behavior:
  - Calls `onPrint`
  - `onPrint` is provided by `useReceiptPrint` (`handlePrint`)

## 2) Main Orchestration Hook

- File: `src/pages/Receipt/useReceiptPrint.ts`
- Main function: `handlePrint`

### High-level sequence

1. Validate that `receiptData` exists.
2. Build required identifiers and phone values:
   - `incomeId`, `companyId`, `branchId`
   - `clientPhone` (normalized to `+` + digits)
3. Build filename: `receipt_<incomeId>.html` (or timestamp fallback)
4. Validate existing ticket tracking (`action: "validate"`):
   - If `receiptUrl` already exists, reuse it.
   - If not, generate and save new receipt HTML.
5. If a `receiptUrl` is available and phone exists:
   - Send **WhatsApp** first
   - Send **SMS** second
6. Track each successful/attempted step in `one_ticket_tracking`.
7. In `finally`, always trigger physical print and track `action: "print"`.

---

## 3) Receipt URL Generation / Reuse Logic

### 3.1 Validate existing tracked ticket
Request:
- API: `postOneTicketTracking`
- Action: `validate`

If response includes `tickets[0].receiptUrl`, the flow:
- Reuses existing `receiptUrl`
- Skips HTML generation/upload
- Shows toast: `Recibo ya existente, se omitió generación`

### 3.2 Generate and save HTML when URL does not exist
- Generate HTML with:
  - `ReceiptService.generatePrintHTML(receiptData, { width: '46mm', thermal: true })`
- Validate HTML format (must start with `<!doctype html>`)
- Save with:
  - API: `saveTicketHtml`
  - Endpoint: `/api/tickets/receipt-html`
- On success:
  - Capture `receiptUrl`
  - Track with action: `save`

---

## 4) WhatsApp and SMS Link Flow

When both conditions are true:
- `receiptUrl` exists
- `clientPhone` exists

The message text is created as:

```text
Gracias por su compra. Aquí está su recibo: <receiptUrl>
```

That means both channels deliver a direct link so the customer can open the ticket.

### 4.1 WhatsApp send
- API function: `sendTicketWhatsapp(phoneOrTicketId, payload)`
- Endpoint pattern: `/api/tickets/{pathParam}/send-whatsapp`
- Payload:
  - `phone`
  - `message` (contains receipt link)
  - `receiptUrl`

Fallback retries used by current implementation:
1. Try with `incomeId` in path param.
2. If fail, retry with `clientPhone` (`+digits`) in path param.
3. If fail, retry with digits-only phone in path param.

On success:
- Toast: `WhatsApp enviado correctamente`
- Tracking action: `whatsapp`

On failure:
- Toast: `No se pudo enviar WhatsApp`

### 4.2 SMS send
- API function: `sendTicketSms(ticketId, payload)`
- Endpoint pattern: `/api/tickets/{ticketId}/send-sms`
- Payload:
  - `phone`
  - `message` (contains receipt link)
  - `receiptUrl`

On success:
- Toast: `SMS enviado correctamente`
- Tracking action: `sms`

On failure:
- Toast: `No se pudo enviar SMS`

---

## 5) Tracking Actions Used

From `src/api/ticketApi.ts`:

```ts
type TicketTrackingAction = 'validate' | 'save' | 'whatsapp' | 'sms' | 'print';
```

The workflow uses these actions:
- `validate`: check if receipt already exists
- `save`: receipt HTML saved and URL generated
- `whatsapp`: WhatsApp sent successfully
- `sms`: SMS sent successfully
- `print`: print action tracked in `finally`

---

## 6) Preconditions / Edge Cases

1. If `incomeId <= 0`:
   - Save/track/send flow is skipped (no valid ticket identity)
2. If `receiptUrl` exists but no client phone:
   - Toast: `Recibo guardado. Cliente sin teléfono para envío`
   - WhatsApp/SMS are skipped
3. If no `receiptUrl`:
   - Channel sending is skipped
4. Physical print is still triggered in `finally` even if network steps fail

---

## 7) API References

- File: `src/api/ticketApi.ts`
- Related functions:
  - `saveTicketHtml(payload)`
  - `sendTicketWhatsapp(phoneOrTicketId, payload)`
  - `sendTicketSms(ticketId, payload)`
  - `postOneTicketTracking(payload)`

---

## 8) Practical Result

Current implementation already applies both channels to open the ticket:
- **WhatsApp** receives a message with the ticket URL.
- **SMS** receives a message with the same ticket URL.

So the customer can open the ticket link directly from either app.

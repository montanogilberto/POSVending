# TODO - Fix Receipt Payment Amounts

## Task
Fix the printed receipt to show correct "Monto Recibido" and "Cambio" values from the API response.

## Issue
- Printed receipt shows "Monto Recibido: $180.00" but API returns `amountReceived: 200`
- Printed receipt doesn't show "Cambio" but API returns `change: 20`

## Root Cause
In `ReceiptService.ts`, the `adaptTicketToUnifiedReceipt` method incorrectly maps payment values:
- `amountReceived: ticket.totals.total` (should be `ticket.totals.amountReceived`)
- `change: 0` (should be `ticket.totals.change`)

## Steps Completed
1. [x] Fix `ReceiptService.ts` - Update `adaptTicketToUnifiedReceipt` method
   - [x] Change `amountReceived: ticket.totals.total` → `amountReceived: ticket.totals.amountReceived`
   - [x] Change `change: 0` → `change: ticket.totals.change`

## Files to Edit
- `src/services/ReceiptService.ts`

## Testing
- Print a receipt and verify:
  - "Monto Recibido" shows correct amount from API
  - "Cambio" displays correctly when applicable


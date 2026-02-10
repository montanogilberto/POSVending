# TODO: Fix Pieces on Printed Ticket

## Issues Identified from Feedback

### 1. Pieces Not Printing on Ticket
The backend returns pieces as a JSON string `"pieces": "{\"pantalones\": 5, \"prendas\": 6, \"otros\": 0}"` that needs to be parsed.

### 2. Payment Fields Duplicated
The ticket showed wrong values:
- Showed: `Cambio: $200.00`, `Efectivo Pagado: $200.00`, `Devolución: $200.00`
- Should be: `Cambio: $40`, `Monto Recibido: $200`, `Devolución: $40`

## Files Updated

### 1. src/api/ticketApi.ts ✅
- Added `pieces` field to `Ticket.products` interface (as string for backward compatibility)

### 2. src/pages/Receipt/ReceiptDisplay.tsx ✅
- Parse pieces JSON string before passing to ReceiptService
- Use `adaptTicketToUnifiedReceipt()` for proper transformation
- Use backend payment values from `ticket.totals.amountReceived` and `ticket.totals.change`

### 3. src/services/ReceiptService.ts ✅
- Updated `adaptTicketToUnifiedReceipt()` to parse pieces JSON string
- Updated `generateCompactProducts()` to include pieces in thermal print
- Updated `generateProducts()` to include pieces row with styling
- Use correct payment values from backend totals

### 4. src/components/UnifiedReceipt.tsx ✅
- Added pieces display row in products section
- Shows "Piezas: P:X Pr:X O:X" for Servicio Completo products
- Styled with light background and purple border

## Expected Ticket Output for Servicio Completo

```
PRODUCTOS / SERVICIOS
┌─────────────────────────────────────┐
│ SERVICIO                            │
│ Servicio Completo                   │
├─────────────────────────────────────┤
│ Producto          Cant    Precio    │
│ Ciclo: Basico     1       $160.00   │
│ Piezas: P:5 Pr:6 O:0               │
└─────────────────────────────────────┘

TOTALES
Subtotal: $160.00
IVA: $0.00
TOTAL: $160.00

MÉTODO DE PAGO
Método: Efectivo
Monto Recibido: $200.00
Cambio: $40.00
Efectivo Pagado: $200.00
Devolución: $40.00
```

## Testing Checklist
- [x] Regular products without pieces print correctly
- [x] Servicio Completo with pieces prints pieces line
- [x] Cash payment shows correct change amount ($40 not $200)
- [x] Payment fields don't duplicate values


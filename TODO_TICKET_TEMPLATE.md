# Ticket Template Update - TODO

## Objective
Add the following to the receipt template:
1. Change "¡Gracias por **su** compra!" to "¡Gracias por **tu** compra!"
2. Add TEMPLATE_ID: GMO-58MM-FIT-v5 at the bottom of the receipt

## Changes Required

### 1. ReceiptService.ts
- [ ] Update `generateFooter()` to use "tu" instead of "su"
- [ ] Add TEMPLATE_ID line after the footer content

### 2. UnifiedReceipt.tsx
- [ ] Update the thank you message to use "tu" instead of "su"

## Implementation Steps

### Step 1: Update ReceiptService.ts
Location: `/Users/apple12/PycharmProjects/POSVendingV2/POSVending/src/services/ReceiptService.ts`

Changes needed:
1. In `generateFooter()` method (around line 340-360):
   - Change `¡Gracias por su ${data.type === 'income' ? 'compra' : 'pago'}!` to `¡Gracias por tu ${data.type === 'income' ? 'compra' : 'pago'}!`
   - Add `<div class="template-id">TEMPLATE_ID: GMO-58MM-FIT-v5</div>` at the end

2. Add CSS for template-id class in `generatePrintStyles()` method

### Step 2: Update UnifiedReceipt.tsx
Location: `/Users/apple12/PycharmProjects/POSVendingV2/POSVending/src/components/UnifiedReceipt.tsx`

Changes needed:
1. In the footer section, change "su" to "tu"
2. Add TEMPLATE_ID display

## Expected Output After Changes
```
Lavanderia GMO
RECIBO
Fecha: [Date]
Hora: [Time]
Cliente: [Client]
Usuario: admin
[Product Info]
Subtotal: $310.00
IVA: $49.60
TOTAL: $490.00
Pago: Efectivo
Recibido: $490.00
Cambio: $0.00
¡Gracias por tu compra!
https://www.gmolavanderia.com
TEMPLATE_ID: GMO-58MM-FIT-v5
```

## Status
- [ ] Not Started
- [ ] In Progress
- [x] Completed

## Changes Applied

### 1. ReceiptService.ts
- [x] Updated `generateFooter()` to use "tu" instead of "su"
- [x] Added TEMPLATE_ID line after the footer content
- [x] Added `.template-id` CSS style in `generatePrintStyles()`

### 2. UnifiedReceipt.tsx
- [x] Updated the thank you message to use "tu" instead of "su"
- [x] Added TEMPLATE_ID display

### 3. UnifiedReceipt.css
- [x] Added `.template-id` CSS class for the template ID display


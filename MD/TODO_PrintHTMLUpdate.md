# TODO: Update Print HTML to Match UnifiedReceipt.tsx

## Objective
Make `ReceiptService.generatePrintHTML()` include ALL sections from `UnifiedReceipt.tsx` for complete thermal receipt printing.

## Sections to Add/Update

### 1. Client Info Section ✅ COMPLETED
- [x] Add Phone
- [x] Add Email  
- [x] Add User name

### 2. Transaction Info Section ✅ COMPLETED
- [x] Add Transaction ID

### 3. Products Section ✅ COMPLETED
- [x] Match service card format with headers
- [x] Display options in table format with Quantity, Price columns
- [x] Match styling from UnifiedReceipt.tsx

### 4. Payment Section ✅ COMPLETED
- [x] Add Cash Received amount (when method is 'efectivo')
- [x] Add Change amount (when method is 'efectivo')
- [x] Match format from UnifiedReceipt.tsx

### 5. CSS Styles ✅ COMPLETED
- [x] Add service-card, service-primary-header, service-secondary-header styles
- [x] Add productos-title style
- [x] Add page-break-inside: avoid for service cards

## Files Modified
- `src/services/ReceiptService.ts` - Updated print HTML generation methods

## Summary of Changes

### generateClientInfo()
✅ Added ID field  
✅ Added Phone (when available)  
✅ Added Email (when available)  
✅ Full format uses "Fecha y Hora" label

### generateProducts()
✅ Service card structure matching UnifiedReceipt.tsx  
✅ Primary header with "Servicio" label and product name  
✅ Secondary header with Producto/Cant/Precio columns  
✅ Option rows with correct formatting  
✅ Simple products display correctly  
✅ productos-title section header

### generatePaymentInfo()
✅ "Método:" label instead of "Pago:"  
✅ "Monto Recibido:" label instead of "Recibido:"  
✅ Safe handling of undefined/null values with ??

### generatePrintStyles()
✅ Complete CSS for service card elements  
✅ Ultra-compact responsive sizing  
✅ Print media query with page-break rules  
✅ Backward compatibility styles preserved

## Testing Checklist
- [ ] Print receipts at 46mm width
- [ ] Verify all sections appear:
  - ✅ Header (Company Name, RECIBO - INGRESO/EGRESO)
  - ✅ Transaction Info (Date, Time, ID)
  - ✅ Client Info (Name, Phone, Email, User)
  - ✅ Products/Servicios (with service cards and options)
  - ✅ Totals (Subtotal, IVA=0, Total)
  - ✅ Payment (Method, Cash Received, Change)
  - ✅ Footer (Company info, RFC, Address)

## Implementation Status: ✅ COMPLETE
All sections now match UnifiedReceipt.tsx exactly!


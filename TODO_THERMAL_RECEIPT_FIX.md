# Thermal Receipt Improvements - TODO

## Goal
Improve readability and reduce wasted space on 46mm thermal receipts.

## Changes Required

### 1. Increase Font Sizes (33% larger)
- [x] Base font: 6px → 8px ✅
- [x] Small font: 5px → 7px ✅
- [x] Title font: 10px → 12px ✅
- [x] Total font: 9px → 11px ✅

### 2. Combine Date/Time on Single Line
- [x] Merge "Fecha:" and "Hora:" into single line ✅
- [x] Format: "Fecha: 15/01/2025 10:30" ✅

### 3. Reduce Label-Value Spacing for ALL Fields
- [x] Reduce gap between label and value ✅
- [x] All sections: Client, User, Products, Payment, Footer ✅

### 4. Compact Format for All Sections
- [x] Client info: Combine fields where possible ✅
- [x] Products: Single line format ✅
- [x] Payment: Combine related fields ✅

### 5. Reduce Vertical Spacing
- [x] Line height: 1.0 → 0.9 ✅
- [x] Margins: 1px → 0px minimum ✅
- [x] Padding: Reduce throughout ✅

### 6. Additional Improvements
- [x] Ultra-compact footer ✅
- [x] Simplified pieces display ✅

## File Modified
- `src/services/ReceiptService.ts` - `generatePrintStyles()` method
- `src/services/ReceiptService.ts` - `generateClientInfo()` method
- `src/services/ReceiptService.ts` - `generateProducts()` method
- `src/services/ReceiptService.ts` - `generatePaymentInfo()` method
- `src/services/ReceiptService.ts` - `generateFooter()` method

## Status: COMPLETED ✅
All improvements have been implemented. The thermal receipt should now have:
- 33% larger fonts for better readability
- Combined date/time on single line
- Tighter spacing between all labels and values
- Single-line product format with ciclo inline
- Ultra-compact footer


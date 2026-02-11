# Promotional Code Implementation Plan

## Overview
Implement promotion code functionality in the CartPage UI with real-time discount preview, following the backend setup already completed.

## Backend Status ✅
- `promotions` table created with support for B2G1 (2x1), PCT, FIXED types
- `promotion_targets` table for targeting specific products or ALL
- `sp_income_apply_promo` stored procedure implemented
- Income table extended with `promotionId`, `promotionCode`, `discountAmount`

## UI Implementation Status ✅ COMPLETED

### 1. Updated incomeApi.ts ✅
- Added `ApplyPromoPayload` interface
- Added `applyPromoToIncome` function for calling `sp_income_apply_promo`

### 2. Updated CartPage.tsx ✅
- Added promo code state (`promoCode`, `promoError`, `promoApplied`)
- Added `isPromoValid` memo to validate codes (currently supports "2X1")
- Added `payQty2x1` helper function for 2x1 calculations
- Added `totals` useMemo to compute promo-adjusted totals with discount preview
- Added promo code input section with validation UI
- Added discount display showing subtotal, savings, and final total
- Updated checkout to include `promotionCode` in income payload
- Added post-checkout call to `applyPromoToIncome` for authoritative promo application
- Passed `promotionCode` and `discountAmount` to ReceiptDisplay

### 3. Updated CartPage.css ✅
- Added `.promo-section` styles
- Added `.promo-input`, `.promo-badge`, `.promo-error-message` styles
- Added `.promo-discount-display` with discount breakdown
- Responsive styles for mobile and desktop

### 4. Updated ReceiptDisplay.tsx ✅
- Added `promotionCode` and `discountAmount` props
- Pass promotion info to UnifiedReceipt component
- Include promotion data in unified receipt data

### 5. Updated UnifiedReceipt.tsx ✅
- Added promotion section display with code, type, and discount
- Added discount row in totals section
- Show original total crossed out when promo applied
- Calculate final total after discount
- Added `pricetagOutline` icon import

### 6. Updated UnifiedReceipt.css ✅
- Added `.promotion-section` styles with green gradient
- Added `.discount-row` styles for totals section
- Responsive styles for mobile
- Dark mode support for promotion section

### 7. Updated receipt.ts types ✅
- Added `promotion` field to `UnifiedReceiptData`
- Added `discount` and `originalTotal` fields to `totals`

## Testing Checklist
- [ ] Enter promo code "2X1" shows discount preview
- [ ] Cart total updates correctly with 2x1 promo
- [ ] Checkout sends promo code in payload
- [ ] Backend applies promo and returns correct totals
- [ ] Receipt shows promo and discount
- [ ] Invalid promo code shows error message
- [ ] Clearing promo code resets totals

## Files Modified
1. `src/api/incomeApi.ts` - Added apply promo API function
2. `src/pages/CartPage/CartPage.tsx` - Main implementation
3. `src/pages/CartPage/CartPage.css` - Promo styles
4. `src/pages/Receipt/ReceiptDisplay.tsx` - Pass promo props
5. `src/components/UnifiedReceipt.tsx` - Display promo on receipt
6. `src/components/UnifiedReceipt.css` - Promo section styles
7. `src/types/receipt.ts` - Updated types


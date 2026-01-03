# Ticket Fixes Plan

## Issues Identified:
1. **Close button not working** - The close button in `ReceiptDisplay.tsx` may not properly clean up state
2. **No print button in ReceiptDisplay** - `ReceiptDisplay.tsx` only has a close button but no print button
3. **Quantity not right** - Need to verify the quantity calculation in the receipt

## Fixes to Implement:

### 1. Add Print Button to ReceiptDisplay.tsx
- Import print icon
- Add handlePrint function
- Add print button alongside close button

### 2. Fix Close Button Behavior in ReceiptDisplay.tsx
- Ensure proper state cleanup
- Add loading state during transition

### 3. Fix Quantity/Subtotal in ReceiptService.ts
- Update transformCartData to use correct subtotal calculation
- Ensure quantity is properly displayed

## Files to Edit:
1. `/Users/apple12/PycharmProjects/POSVendingV2/POSVending/src/pages/Receipt/ReceiptDisplay.tsx`
2. `/Users/apple12/PycharmProjects/POSVendingV2/POSVending/src/services/ReceiptService.ts`


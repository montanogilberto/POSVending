# Totals Fix Plan

## Issue
The backend returns incorrect totals in ticket data:
- `total: 130` (wrong - using options sum)
- Expected: `total: 301.6` (subtotal 260 + IVA 41.6)

## Root Cause
Backend calculates total from options sum (60 + 70 = 130) instead of using product.subtotal (260) + IVA.

## Solution
Add frontend validation/repair function to recalculate correct totals from product data.

## Steps
1. ✅ Create TODO_TOTALS_FIX.md plan
2. ✅ Implement `repairTicketTotals()` utility function
3. ✅ Apply fix in ReceiptDisplay.tsx
4. ✅ Build successful

## Files Modified
- `src/pages/Receipt/ReceiptDisplay.tsx` - Added totals repair function

## Fix Details
The `repairTicketTotals()` function:
- Recalculates subtotal from products (sum of product.subtotal)
- Recalculates IVA as 16% of corrected subtotal
- Recalculates total as subtotal + IVA
- Compares with received totals and applies corrections if discrepancy > 0.01
- Logs warnings when repairs are made for debugging
- Sets `_totalsRepaired` flag for visibility


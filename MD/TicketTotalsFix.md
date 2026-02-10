# Ticket Totals Fix Plan

## Problem
Backend returns correct totals:
- `total: 160`
- `amountReceived: 200`
- `change: 40`

But frontend "repairs" them incorrectly:
- Applies IVA 16%: `160 * 1.16 = 185.6`
- Recalculates change: `200 - 185.6 = 14.4`

## Root Cause
`repairTicketTotals()` function in `ReceiptDisplay.tsx` always applies IVA 16% and recalculates totals, even when backend already sends correct values.

## Fix Steps

### Step 1: Fix `repairTicketTotals` in `ReceiptDisplay.tsx`
- Add check: if backend `iva === 0` and `total === subtotal`, DON'T apply IVA
- Only repair if there's a real discrepancy (backend IVA is non-zero but inconsistent)
- Respect backend's existing IVA value

### Step 2: Fix `adaptTicketToUnifiedReceipt` in `ReceiptService.ts`
- Already correctly extracts `amountReceived` from `ticket.totals?.amountReceived`
- The fix in Step 1 will ensure the correct data reaches this function

## Files to Modify
1. `src/pages/Receipt/ReceiptDisplay.tsx` - Fix `repairTicketTotals` function
2. `src/services/ReceiptService.ts` - Verify `adaptTicketToUnifiedReceipt` is correct

## Test Case
Backend sends:
```json
{
  "totals": {
    "subtotal": 160,
    "iva": 0,
    "total": 160,
    "amountReceived": 200,
    "change": 40
  }
}
```

Expected output:
```json
{
  "totals": {
    "subtotal": 160,
    "iva": 0,
    "total": 160,
    "amountReceived": 200,
    "change": 40
  }
}
```


# Receipt Component Consolidation Plan

## Objective
Migrate all remaining references from the old `Receipt` component to the new `UnifiedReceipt` component to consolidate receipt functionality and enable deletion of legacy files.

## Current State
### Files Using Old Receipt System:
1. `src/pages/Receipt/ReceiptDisplay.tsx` - Uses `Receipt` component
2. `src/pages/CartPage/CartPage.tsx` - Uses `ReceiptDisplay` which uses `Receipt`
3. `src/pages/Laundry/Laundry.tsx` - Uses `Receipt` directly

### New UnifiedReceipt System:
- `src/components/UnifiedReceipt.tsx` - Modern unified component
- `src/components/UnifiedReceipt.css` - Styling
- `src/services/ReceiptService.ts` - Data transformation

## Files to Modify:
1. `src/pages/Receipt/ReceiptDisplay.tsx` - Replace `Receipt` with `UnifiedReceipt`
2. `src/pages/CartPage/CartPage.tsx` - Update to use `UnifiedReceipt` directly
3. `src/pages/Laundry/Laundry.tsx` - Replace `Receipt` with `UnifiedReceipt`

## Files to Delete After Migration:
1. `src/components/Receipt.tsx`
2. `src/components/Receipt.css`
3. `src/pages/Receipt/ReceiptDisplay.tsx` (if fully replaced)
4. `src/pages/Receipt/receiptTemplate.ts` (if unused)
5. `src/pages/Receipt/receiptUtils.ts` (if unused)
6. `src/pages/Receipt/useReceiptPrint.ts` (if unused)

## Migration Steps:

### Step 1: Update ReceiptDisplay.tsx
- Import `UnifiedReceipt` instead of `Receipt`
- Transform ticket data using `ReceiptService.transformCartData`
- Replace `<Receipt>` with `<UnifiedReceipt>`

### Step 2: Update CartPage.tsx
- Import `UnifiedReceipt` directly
- Remove `ReceiptDisplay` import
- Transform cart data and render `UnifiedReceipt` inline

### Step 3: Update Laundry.tsx
- Import `UnifiedReceipt` instead of `Receipt`
- Transform receipt data using `ReceiptService`
- Replace `<Receipt>` with `<UnifiedReceipt>`

### Step 4: Delete Legacy Files
- Remove unused Receipt files after verification

## Data Transformation:
The `ReceiptService` provides these transformation methods:
- `transformCartData()` - For cart/checkout receipts
- `transformIncomeData()` - For income receipts
- `adaptTicketToLegacyIncome()` - For ticket-to-income conversion

## Expected Result:
- Single unified receipt component (`UnifiedReceipt`)
- Consistent styling and functionality
- Reduced code duplication
- Easier maintenance

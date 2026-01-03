# Receipt Text Size Reduction Plan

## Current Font Sizes Analysis
- Body/General text: 13px
- Title: 18px
- Row text: 13px  
- Total: 16px
- Footer: 12px
- QR code text: 8px
- QR validation text: 9px

## Reduction Strategy (2x reduction target)

### Font Size Reductions:
- Body/General text: 13px → 6px (53% reduction)
- Title: 18px → 9px (50% reduction)
- Row text: 13px → 6px (53% reduction)
- Total: 16px → 8px (50% reduction)
- Footer: 12px → 6px (50% reduction)
- QR code text: 8px → 4px (50% reduction)
- QR validation text: 9px → 4px (56% reduction)

### Additional Spacing Reductions:
- Margins: Reduce by 40-50%
- Padding: Reduce by 40-50%
- Line height: Reduce from 1.3 to 1.1
- Container width padding: Reduce from 2mm to 1mm

## Expected Results:
- Text will be approximately 2x smaller
- Overall receipt will be more compact
- All functionality preserved
- Print layout maintained

## Files to Modify:
- `/src/pages/Receipt/receiptTemplate.ts` - Main styles constant

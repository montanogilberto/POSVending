# Header Buttons Size Increase Plan

## Goal: Make header action buttons bigger for better touch targets and visibility

## Changes implemented:

### 1. src/components/Header.tsx ✅
- Added `className="header-action-button"` to all IonButton components
- Added inline CSS variables for larger dimensions:
  - `--padding-start: 12px`
  - `--padding-end: 12px`
  - `minHeight: 48px`
  - `minWidth: 48px`
- Increased icon font-size to `28px` for all buttons
- Updated Cart button badge positioning:
  - `top: 2px`, `right: 2px`
  - `fontSize: 12px`
  - `minWidth: 20px`, `height: 20px`
  - Added flex centering for badge content

### 2. src/components/Header.css ✅ (NEW FILE)
- Defined `.header-action-button` class styles:
  - `border-radius: 12px`
  - `min-height: 48px`
  - `min-width: 48px`
  - `margin: 4px`
- Icon size set to `28px`
- Hover state with subtle background change
- Cart badge positioning styles

## Implementation Status:
- ✅ 1. Update Header.tsx with larger button props and inline styles
- ✅ 2. Create Header.css with custom button styles
- ⏳ 3. Test buttons are properly sized (manual verification needed)
- ⏳ 4. Verify badge positioning on Cart button (manual verification needed)


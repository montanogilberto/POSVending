# TODO: Client Section Mobile Redesign

## Goal
Fix mobile layout for Client Selector section - information-first design with full-width button, no truncation.

## Changes

### 1. CartPage.tsx - Client Section JSX
- [ ] Restructure client section layout
- [ ] Remove "SELECCIONADO" chip from inline button
- [ ] Add full-width "Cambiar cliente" button below client info
- [ ] Improve info hierarchy (title, name, contact)

### 2. CartPage.css - Mobile Responsive Styles
- [ ] Add @media (max-width: 480px) breakpoint
- [ ] Mobile client-section: stacked layout
- [ ] Mobile client-row: vertical flex direction
- [ ] Full-width change button on mobile
- [ ] Hide "SELECCIONADO" chip on mobile
- [ ] Prevent text truncation, allow wrapping
- [ ] Desktop (≥768px) unchanged

## Mobile Design Specs
```
┌─────────────────────────────┐
│ CLIENTE                     │ ← title (small, muted)
│ Juan Pérez García          │ ← name (bold, wraps)
│ 555-123-4567 • juan@email   │ ← contact (secondary)
│                             │
│ ┌─────────────────────────┐ │
│ │ CAMBIAR CLIENTE         │ │ ← full-width button
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

## Testing
- [ ] Test on iPhone SE (375px width)
- [ ] Test on iPhone 14/15 (390-430px width)
- [ ] Verify desktop layout unchanged (≥768px)
- [ ] Verify no text truncation
- [ ] Verify button is full-width and tappable

## Status: COMPLETED ✓
- JSX updated with stacked layout
- CSS mobile breakpoint added (max-width: 480px)
- Full-width "Cambiar cliente" button implemented
- Text wrapping enabled, no truncation
- Desktop layout preserved


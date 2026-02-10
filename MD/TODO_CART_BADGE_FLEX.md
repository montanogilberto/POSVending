# Cart Badge Flex Layout Implementation

## Objective
Update the cart button badge to use flex layout (badge beside icon) instead of overlay positioning.

## Tasks
- [x] Update Header.tsx - Wrap icon + badge in flex span
- [x] Update Header.css - Add flex layout styles for badge

## Changes Summary
### Header.tsx
- Wrap cart icon and badge in `<span className="icon-with-badge">`
- Remove `position: absolute` from IonBadge
- Add `className="badge-side"` to IonBadge

### Header.css
- Add `.icon-with-badge` with `display: inline-flex`, `align-items: center`, `gap: 6px`
- Add `.badge-side` with compact pill styling (min-width, height, border-radius)
- Remove absolute positioning for badge inside header buttons

## Status: Completed


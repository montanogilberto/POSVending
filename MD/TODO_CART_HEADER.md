# TODO: Add Cart Icon to All Headers

## Task
Add a cart icon with item count badge to the Header component that appears on all pages.

## Progress: [3/3] ✅ COMPLETED

### Step 1: Modify Header.tsx to add cart icon ✅
- [x] Add `cartOutline` icon import from ionicons
- [x] Add `useCart()` hook to access cart state
- [x] Add cart button with badge to the header's end slot
- [x] Navigate to `/cart` when clicked

### Step 2: Remove duplicate cart icon from CategoryPage.tsx ✅
- [x] Remove the standalone cart button that existed outside the Header component

### Step 3: Test ✅
- [x] Build completed successfully with no errors

## Files Modified
- `src/components/Header.tsx`
- `src/pages/CategoryPage/CategoryPage.tsx`

## Result
The cart icon with item count badge now appears on ALL pages that use the Header component (13 pages):
- Laundry
- CategoryPage
- CartPage
- EmailsPage
- WaterTanksPage
- IncomesPage
- ExpensesPage
- AlertsPage
- ProductListPage
- ClientsPage
- UsersPage
- ProductsManagementPage
- CategoriesPage



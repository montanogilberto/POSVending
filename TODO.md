# TODO: Add Loading Indicators for All Async Operations

## Overview
Add loading indicators using Ionic's IonLoading component for all async operations across the app modules to provide user feedback during API calls and other asynchronous actions.

## Steps to Complete

### 1. Update Core Files with Loading States
- [x] src/pages/IncomesPage.tsx: Add loading for fetchAllLaundry and fetchTicket calls
- [x] src/pages/CartPage/CartPage.tsx: Add loading for submitOrder, postIncome, loadIncomes, and fetchTicket calls
- [x] src/pages/Vending.tsx: Add loading for vending API calls
- [x] src/pages/Authentication/Login.tsx: Add loading for login API call
- [ ] src/pages/LedStatusPage.tsx: Add loading for LED status API call
- [ ] src/pages/WaterTanksPage.tsx: Add loading for fetchWaterTanks call
- [ ] src/pages/WaterTanksHistoryPage.tsx: Add loading for fetchWaterTanks call
- [ ] src/pages/MovementsPage.tsx: Add loading for all_income API call
- [ ] src/pages/CategoryPage/CategoryPage.tsx: Add loading for fetchCategories call
- [ ] src/pages/CategoryPage/CategoriesPage.tsx: Add loading for fetchCategories, deleteCategory, updateCategory, createCategory, saveImage calls
- [ ] src/pages/products/ProductListPage.tsx: Add loading for getProducts call
- [ ] src/pages/products/ProductDetailPage.tsx: Add loading for fetchCategories call
- [ ] src/pages/POS.tsx: Add loading for vending API calls
- [ ] src/pages/Authentication/CreateAccount.tsx: Add loading for user creation API call
- [ ] src/pages/ProductSelection.tsx: Add loading for by_company_products API call
- [ ] src/context/IncomeContext.tsx: Add loading for fetchAllLaundry call

### 2. Implement IonLoading Component
- [ ] Import IonLoading from '@ionic/react' in each file
- [ ] Add loading state variables (e.g., const [loading, setLoading] = useState(false);)
- [ ] Wrap async operations with setLoading(true) before and setLoading(false) after
- [ ] Add <IonLoading isOpen={loading} message="Loading..." /> to the JSX

### 3. Handle Edge Cases
- [ ] Ensure loading states are reset on errors
- [ ] Prevent multiple simultaneous operations if needed
- [ ] Add appropriate loading messages for different actions

### 4. Testing and Validation
- [ ] Test each module to ensure loading indicators appear during async operations
- [ ] Verify loading disappears after operations complete
- [ ] Check error handling with loading states

## Notes
- Use consistent loading messages across the app
- Ensure loading indicators don't interfere with user interactions
- Consider using a global loading context if many components share loading states

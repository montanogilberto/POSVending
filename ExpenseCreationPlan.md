# Expense Creation Implementation Plan

## Information Gathered

After analyzing the codebase, I found:

1. **Current Income Structure:**
   - `IncomesPage.tsx` - Complete income management page with filters, list, and receipt display
   - `incomeApi.ts` - API with POST functionality for creating income records
   - Components: `IncomesFilters.tsx`, `IncomesList.tsx`, `IncomesChart.tsx`

2. **Current Expense Structure:**
   - `ExpensesPage.tsx` - Basic page with total display only (incomplete)
   - `expensesApi.ts` - Only GET functionality, missing POST for creating expenses
   - Missing components for filters, list, and creation form

3. **API Requirements:**
   - **POST Expense Endpoint:** `https://smartloansbackend.azurewebsites.net/expense`
   - **GET Products Endpoint:** `https://smartloansbackend.azurewebsites.net/all_products`
   - Product structure with options and choices similar to income

4. **Expense Data Structure:**
   ```typescript
   {
     "expenses": [{
       "action": 1,
       "total": 430.50,
       "paymentMethod": "Tarjeta",
       "paymentDate": "2025-10-23T22:30:00",
       "userId": 1,
       "supplierId": 3,
       "companyId": 1,
       "products": [{
         "productId": 12,
         "options": {
           "productOptionId": 5,
           "choices": [
             { "productOptionChoiceId": 42 },
             { "productOptionChoiceId": 43 }
           ]
         }
       }]
     }]
   }
   ```

## Plan

### 1. Update Expenses API (`src/api/expensesApi.ts`)
- Add POST functionality for creating expenses
- Create `ExpensePayload` interface matching the API structure
- Implement `createExpense` function

### 2. Create Expense Components
- **Create `ExpensesFilters.tsx`** - Filter component for expense searches
- **Create `ExpensesList.tsx`** - Component to display expense records with timeline
- **Create `ExpenseForm.tsx`** - Form component for creating new expenses with product selection

### 3. Enhance Expenses Page (`src/pages/ExpensesPage.tsx`)
- Add state management for expense creation
- Implement product selection interface
- Add form for creating new expenses
- Integrate filters and list components
- Add expense creation workflow

### 4. Create Product Selection Interface
- Modal or page for selecting products from `/all_products` endpoint
- Product search and filter functionality
- Options and choices selection for each product
- Cart-like interface for managing selected products

### 5. Integration and Testing
- Ensure proper error handling
- Add loading states for all operations
- Implement success/error notifications
- Test the complete expense creation flow

## Dependent Files to be Edited

1. **API Files:**
   - `src/api/expensesApi.ts` - Add POST functionality

2. **Page Files:**
   - `src/pages/ExpensesPage.tsx` - Complete implementation

3. **New Component Files:**
   - `src/components/ExpensesFilters.tsx` - New file
   - `src/components/ExpensesList.tsx` - New file  
   - `src/components/ExpenseForm.tsx` - New file

4. **Existing Components (for reference):**
   - `src/components/IncomesFilters.tsx` - Reference for filters
   - `src/components/IncomesList.tsx` - Reference for list
   - `src/api/productsApi.ts` - Reference for products API

## Followup Steps

1. **Install/Setup:** No additional dependencies needed (using existing Ionic/React stack)
2. **Testing:** Test expense creation flow with sample data
3. **Validation:** Ensure API endpoints work correctly
4. **Integration:** Verify the new expense interface integrates with existing navigation

## Success Criteria

- [ ] Users can create expenses with products via POST to `/expense` endpoint
- [ ] Product selection interface similar to income interface
- [ ] Expense list displays with filtering capabilities
- [ ] Complete expense management workflow (create, view, filter)
- [ ] Proper error handling and user feedback

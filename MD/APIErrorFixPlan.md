# API Error Fix Plan

## Problem Analysis
The `by_company_products` endpoint is returning a 500 Internal Server Error with "'NoneType' object is not subscriptable". This suggests the backend is trying to access a None/null value as if it were a dictionary or list.

## Root Cause
Looking at the `fetchProductsByCompany` function in `apiUtils.ts`, the request structure might be incorrect or the API expects different parameters than what's being sent.

## Solution Plan

### 1. Enhanced Error Handling
- Add better error handling and logging to identify the exact issue
- Provide fallback data when API fails
- Add retry mechanism for temporary failures

### 2. Request Structure Validation
- Ensure the request body structure matches backend expectations
- Add validation for required parameters
- Check if companyId is being sent correctly

### 3. Fallback Mechanism
- Implement local fallback data when API fails
- Add mock data for development/testing
- Ensure the app remains functional even when API is down

### 4. User Experience Improvements
- Add better error messages for users
- Implement loading states and retry buttons
- Add offline mode indicators

## Implementation Steps
1. Update `apiUtils.ts` with enhanced error handling
2. Add fallback data for products
3. Improve the ExpenseForm component error handling
4. Add retry functionality
5. Test the changes

## Files to Modify
- `src/utils/apiUtils.ts` - Main API utilities
- `src/components/ExpenseForm.tsx` - Error handling and user feedback
- `src/data/products.ts` - Fallback data (if needed)

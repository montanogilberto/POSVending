# TODO: Fix getProducts API call and ProductListPage handling

## Tasks to Complete

- [x] Update src/data/products.ts:
  - [x] Change companyId to number 1 (not string).
  - [x] Remove the try-catch block that returns [] on error, allowing errors to propagate.
  - [x] Remove all console.log statements.
  - [x] Ensure the request body matches the expected JSON structure.

- [x] Update src/pages/products/ProductListPage.tsx:
  - [x] Add a ref-based guard in useEffect to prevent double fetches in StrictMode.
  - [x] Format product prices using Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).
  - [x] Add a type for the backend response to ensure { products: Product[] }.

- [x] Followup steps:
  - [x] Test the API call to ensure it fetches products correctly.
  - [x] Verify that the product list renders with proper error handling and price formatting.
  - [x] Center the header in App.tsx.

## New Task: Add Recent Activity Page with Movements

- [x] Create a new tsx file for MovementsPage.tsx to show all movements using the same backend.
- [x] Update Laundry.tsx to show at least 10 recent records and add a "show more" label that navigates to the new MovementsPage.
- [x] On MovementsPage, add filtering by date.
- [x] Ensure the backend API is reused for fetching movements.
- [x] Add the route to App.tsx for the new MovementsPage.

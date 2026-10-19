# Products + Cart Workflow Analysis

## Scope analyzed

- `src/pages/products/ProductListPage.tsx`
- `src/pages/products/ProductDetailPage.tsx`
- `src/pages/products/ProductsManagementPage.tsx`
- `src/pages/products/ProductsManagementPage.css` (UI styling only)
- `src/pages/CartPage/CartPage.tsx`
- `src/context/CartContext.tsx`
- `src/data/products.ts`
- `src/api/cartApi.ts`

---

## High-level workflow

1. User enters a category page and navigates into products by category.
2. `ProductListPage` receives `categoryId` route param and fetches products from backend (`getProducts(categoryId)`).
3. User taps a product card, app navigates to detail route and passes full product in `location.state`.
4. `ProductDetailPage` lets user configure options/quantities, computes price, and pushes a normalized item to cart context.
5. `CartContext` stores cart items in memory and recalculates quantity from selected choices.
6. `CartPage` reads cart context, calculates totals/promotions, selects payment method, creates order payload, submits order, then posts income and optionally applies promo to income.
7. On success, cart is cleared, receipt/ticket flow is triggered, and receipt component renders.

---

## File-by-file analysis

## 1) `src/data/products.ts`

### Responsibility
- Fetch product catalog from backend for company (hardcoded `companyId: 1`) and optional category filter.
- Normalize response into local `Product` shape.

### Endpoint used
- `POST https://smartloansbackend.azurewebsites.net/by_company_products`

### Payload
```json
{
  "products": [
    {
      "companyId": 1,
      "categoryId": 123
    }
  ]
}
```

(`categoryId` included only when provided)

### Notes
- Handles 2 response formats:
  - `data.result[0].products`
  - `data.products`
- Logs warning on unexpected structure.
- Throws on non-OK HTTP response.

---

## 2) `src/pages/products/ProductListPage.tsx`

### Responsibility
- Read `categoryId` from route params.
- Fetch products for category using `getProducts(categoryId)`.
- Render list with basic product info and display price from `details[0].salePrice`.
- Navigate to product detail:
  - `history.push(/products/:productId, { product })`

### Key state
- `products`, `loading`, `error`
- `hasFetched` ref prevents duplicate fetch execution
- popovers state (`AlertPopover`, `MailPopover`)

### Main process
1. Convert route param to number.
2. `useEffect` fetch on mount/param change.
3. Handle loading/error/empty states.
4. Render cards and navigate with product in route state.

---

## 3) `src/pages/products/ProductDetailPage.tsx`

### Responsibility
- Consume product passed in navigation state.
- Render configurable product options:
  - radio options
  - checkbox options
  - checkbox quantity selectors
- Handle special "Servicio Completo" pieces inputs.
- Validate required options.
- Compute final line price and push to cart.

### Data source
- Primary: `location.state.product`
- Fallback path tries category fetch and leaves product undefined (currently results in "Producto no encontrado").

### Key state
- `product`, `quantity`, `selectedOptions`
- `pieces` for "Servicio Completo"
- alert/toast + popover states

### Add-to-cart process
1. Validate required radio option groups.
2. Build human-readable `selectedOptionLabels`.
3. Calculate:
   - base price from `product.details[0].salePrice`
   - option extra price (`calculateOptionPrice`)
   - final price = base + extras
4. Build normalized `selectedChoices` object by option id.
5. Attach pieces label if product is "Servicio Completo".
6. Call `addToCart(...)`.
7. Navigate to `/cart`.

---

## 4) `src/context/CartContext.tsx`

### Responsibility
- Global in-memory cart store and mutations.

### API
- `addToCart(item)`
- `removeFromCart(id)`
- `clearCart()`
- `cart` array

### Important behavior
- Recomputes item quantity in `addToCart` using `calculateCartItemQuantity(selectedChoices)`.
- Generates unique line id using `${productId}-${Date.now()}`.
- No persistence layer in this file (cart resets on page reload unless other persistence exists elsewhere).

---

## 5) `src/pages/CartPage/CartPage.tsx`

### Responsibility
- Display cart summary, promotions, client selection, payment method, and checkout.
- Build payloads for order/income APIs.
- Handle success and receipt/ticket retrieval.

### Data consumed
- From cart context: `cartItems`, `removeFromCart`, `clearCart`
- From product context: `clearAllProducts`
- From income context: `loadIncomes`

### Main calculations
- Promotion support: code `2X1` only (currently)
- Totals memo computes:
  - `subtotal`
  - `discount`
  - `total`
- Cash change calculation for `Efectivo`

### Endpoints used in checkout flow
1. **Order submit**
   - via `submitOrder(orderData)`
   - endpoint in `src/api/cartApi.ts`:
   - `POST https://smartloansbackend.azurewebsites.net/orders`
2. **Income creation**
   - `postIncome(payload)` (from `incomeApi`)
3. **Promo apply**
   - `applyPromoToIncome(...)` (from `incomeApi`) if promo active
4. **Ticket fetch**
   - `fetchTicket(lastIncomeId)` (from `ticketApi`) after success toast dismiss

### Checkout process sequence
1. Validate payment method and cash amount (if cash).
2. Build `orderData` from cart lines (selections flattening included).
3. Submit order endpoint.
4. If ok:
   - Build income payload from cart items/options/pieces.
   - Create income.
   - Optionally apply promo to income.
5. Clear cart + clear products context.
6. Show success toast.
7. On toast dismiss, fetch ticket and render `ReceiptDisplay`.

---

## 6) `src/api/cartApi.ts`

### Responsibility
- Thin API function for order submission.

### Endpoint
- `POST https://smartloansbackend.azurewebsites.net/orders`

### Input
- Generic `orderData` object serialized as JSON.

---

## Navigation + data flow map

1. Category page route → product list route with `categoryId`
2. `ProductListPage` fetches products from backend
3. User taps product card → push to detail route with `{ product }`
4. `ProductDetailPage` configures selection and calls `addToCart`
5. `CartContext` stores normalized cart line
6. `CartPage` reads cart, displays and submits checkout payloads
7. Backend responses drive receipt/ticket rendering

---

## Key test checklist (manual)

1. Product list
   - valid category loads products
   - empty category shows empty message
   - API error shows error text

2. Product detail
   - opening detail from list receives `location.state.product`
   - required option validation alert appears when missing
   - option quantities affect final price
   - "Servicio Completo" pieces attach correctly to cart item

3. Cart
   - cart lines show options and prices correctly
   - remove line works
   - promo code `2X1` updates discount/total
   - payment validation:
     - requires method
     - cash must be >= total

4. Checkout + API
   - orders endpoint called with expected selections
   - income payload includes options and pieces where needed
   - promo apply executes only when promo active
   - ticket fetch happens after success toast dismiss

---

## Risks / observations

- `ProductDetailPage` fallback when `location.state` missing does not truly recover product by `productId`; product remains undefined and shows not found.
- Company id and some ids are hardcoded (`companyId: 1`, `userId: 1`, default `clientId`), may not fit multi-tenant or authenticated contexts.
- Cart context uses in-memory state only in this file.
- `item.price` semantics represent line total in several places; ensure consistency if unit price behavior changes.

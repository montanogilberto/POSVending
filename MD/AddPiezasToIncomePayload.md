# TODO: Add Piezas Support to Income Payload

## Objective
Add `pieces` field to income payload so it can be stored in database and printed on tickets for "Servicio Completo" products.

## Files to Update

### 1. src/api/incomeApi.ts
- [x] Add `pieces` optional field to `IncomePayload.products` interface
- [x] Type: `{ pantalones: number; prendas: number; otros: number }` | undefined

### 2. src/pages/CartPage/CartPage.tsx
- [x] Include `pieces` in the income payload
- [x] Use spread operator to conditionally add pieces only if it exists
- [x] Location: `handleCheckout` function, payload construction

### 3. src/types/receipt.ts
- [x] Add `pieces` field to `LegacyProduct` interface for type consistency

## Payload Structure (Final)

```json
{
  "income": [{
    "action": 1,
    "total": 210.00,
    "paymentMethod": "efectivo",
    "cashPaid": 200,
    "cashReturn": 0,
    "paymentDate": "2025-01-15T10:30:00.000Z",
    "userId": 1,
    "clientId": 2,
    "companyId": 1,
    "products": [
      {
        "productId": 1001,
        "quantity": 1,
        "options": [...]
      },
      {
        "productId": 1002,
        "quantity": 1,
        "pieces": {
          "pantalones": 2,
          "prendas": 3,
          "otros": 1
        },
        "options": [...]
      }
    ]
  }]
}
```

## Logic
- Only include `pieces` for "Servicio Completo" products
- Regular products omit the `pieces` field

## Testing
- [ ] Test with regular products (no pieces in payload)
- [ ] Test with "Servicio Completo" (pieces in payload)
- [ ] Verify receipt prints pieces correctly


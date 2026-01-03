# Backend API Structure Analysis

## API Endpoint Analysis

**Endpoint:** `https://smartloansbackend.azurewebsites.net/by_company_products`
**Method:** POST
**Purpose:** Fetch products by company and category

## Request Structure

```json
{
  "products": [
    {
      "companyId": "1",
      "categoryId": "1002"
    }
  ]
}
```

## Response Structure Analysis

### Top Level Response
```json
{
  "products": [ /* Array of product objects */ ]
}
```

### Product Object Structure
```json
{
  "id": 1002,
  "name": "Servicio de lavado",
  "description": "Servicio completo de lavado de prendas.",
  "price": 0,
  "categoryId": 1002,
  "options": [ /* Array of product options */ ]
}
```

### Product Options Structure
```json
{
  "productOptionId": 1006,
  "name": "Ciclo",
  "type": "checkbox",
  "choices": [ /* Array of choice objects */ ]
}
```

### Choice Object Structure
```json
{
  "productOptionChoiceId": 1004,
  "name": "Basico",
  "price": 40
}
```

## Key Insights

### 1. Service-Based Products
- Products are **services** (laundry services) rather than physical items
- Base `price` is typically 0, pricing comes from **options and choices**
- Each product has configurable options that affect final price

### 2. Hierarchical Pricing Structure
```
Product (Base Price: $0)
├── Option 1: "Ciclo"
│   ├── Choice 1: "Basico" (+$40)
│   ├── Choice 2: "Medio" (+$50)
│   ├── Choice 3: "Carga Alta" (+$70)
│   └── Choice 4: "Colcha Grandes" (+$100)
└── Option 2: [Another option]
    └── Choice combinations...
```

### 3. Current Products in Category 1002
1. **Servicio de lavado** (ID: 1002)
   - Options: Ciclo with 4 choices ($40-$100)
   
2. **Servicio de secado** (ID: 1003)
   - Options: Ciclo with 4 time-based choices ($60-$100)
   
3. **Servicio Completo** (ID: 1004)
   - Options: Ciclo with 4 comprehensive choices ($160-$260)

### 4. Type System
- `type: "checkbox"` - indicates multiple selections might be allowed
- This suggests **complex product configuration** is supported

## Implications for POS System

### 1. Product Configuration Required
- Products need **option selection** before adding to cart
- **Dynamic pricing** based on selected choices
- Cart items must store **selected options and choices**

### 2. Cart Data Structure Needs
```typescript
interface CartItem {
  productId: number;
  name: string;
  selectedOptions: {
    [optionId: number]: {
      choiceId: number;
      choiceName: string;
      additionalPrice: number;
    };
  };
  basePrice: number;
  finalPrice: number;
  quantity: number;
}
```

### 3. Expense Integration
For expense creation, the API structure supports:
```json
{
  "expenses": [{
    "products": [{
      "productId": 1002,
      "options": {
        "productOptionId": 1006,
        "choices": [
          { "productOptionChoiceId": 1004 }
        ]
      }
    }]
  }]
}
```

### 4. Category Mapping
- Category 1002 = Laundry Services
- This aligns with your current `CategoryPage` functionality
- **Same API can serve both income and expense workflows**

## Recommendations

### 1. Enhance Product Data Handling
- Update `Product` interface to include `options` array
- Add option selection UI in ProductDetailPage
- Implement dynamic price calculation

### 2. Cart Enhancement
- Modify cart to handle complex product configurations
- Store selected options and choices with each cart item
- Calculate final price based on base + option prices

### 3. Expense API Compatibility
- The existing expense API structure is **compatible** with this product structure
- No major changes needed to `expensesApi.ts`
- Cart items can be directly mapped to expense products

### 4. Consistent UX
- **Same product browsing** for both income and expenses
- **Same cart system** with enhanced option handling
- **Different checkout flows** (income vs expense) but same product selection

## Code Integration Points

### 1. Product List Page
```typescript
// Products already have options, just need to display them
const getProductPrice = (product: Product): number => {
  if (!product.options || product.options.length === 0) {
    return product.price;
  }
  // Return starting price or calculate based on options
  return product.price; // Base price
};
```

### 2. Product Detail Page
```typescript
// Need option selection interface
interface ProductOption {
  productOptionId: number;
  name: string;
  type: string;
  choices: {
    productOptionChoiceId: number;
    name: string;
    price: number;
  }[];
}
```

### 3. Cart Enhancement
```typescript
// Enhanced cart item with options
const addToCartWithOptions = (product: Product, selectedOptions: SelectedOptions) => {
  const finalPrice = calculateFinalPrice(product, selectedOptions);
  // Add to cart with options
};
```

## Summary

This API provides a **robust foundation** for both income and expense workflows. The hierarchical product structure with configurable options is perfect for your logistics expense implementation. The existing expense API structure is already compatible, making integration straightforward.

**Next Steps:**
1. Update product interfaces to handle options
2. Add option selection UI
3. Enhance cart to store configurations
4. Test with both income and expense flows

# Product Wizard + Payload Instructions

## Objective
Update the Product Wizard and related frontend flow so product creation always sends a valid, related payload including:

- `product` (main fields)
- `productDetails`
- `productOptions`
- `productOptionChoices`

The wizard must enforce required option/choice inputs before submit.

---

## Required UI Changes (Wizard)

### Step/Section labels
Use these labels in one wizard page:

- **Product option**
- **Product option choices**

### Required inputs
Before submit, enforce:

1. **Product option name** is required (text input)  
   - Example: `Tamaño`
2. At least **one product option choice** is required.
3. Each choice requires:
   - `name` (example: `19 lts`)
   - `price` (numeric, example: `10`)

If any required field is missing, block submit and show clear validation errors.

---

## Data Relationship Requirement

The payload must preserve relationship:

- `productDetails` belongs to the product.
- `productOptions[]` belongs to the product.
- `productOptions[].optionChoices[]` belongs to each option.

---

## Payload Rules

1. Always include:
   - `productDetails`
   - `productOptions`
   - `optionChoices` nested inside each option
2. Derive keys consistently:
   - `optionKey` from option name
   - `choiceKey` from choice name (unless manually overridden)
3. Keep backend-compatible shape and action fields.

---

## Canonical Payload (Required Sample)

```json
{
  "name": "Garrafon Agua Purificada",
  "code": "10",
  "barCode": "",
  "description": "",
  "dateOfExpire": "",
  "categoryId": 1002,
  "companyId": 1,
  "productFormId": 0,
  "manufactureId": 0,
  "productDetails": {
    "action": 1,
    "productDetailId": null,
    "stockQuantity": 0,
    "unitPrice": 0,
    "salePrice": 0
  },
  "productDescriptions": [],
  "productOptions": [
    {
      "action": 1,
      "productOptionId": null,
      "optionKey": "tamano",
      "name": "Tamaño",
      "type": "radio",
      "optionChoices": [
        {
          "action": 1,
          "productOptionChoiceId": null,
          "choiceKey": "normal",
          "name": "Normal",
          "price": 0,
          "description": ""
        }
      ]
    }
  ]
}
```

---

## Alternative Valid Choice Example

This is also valid when user enters specific size/price:

```json
{
  "choiceKey": "19_lts",
  "name": "19 lts",
  "price": 10
}
```

But the canonical default sample must remain supported:

```json
{
  "choiceKey": "normal",
  "name": "Normal",
  "price": 0
}
```

---

## Console Logging Required

Add/keep logs for troubleshooting:

- submit start
- sanitized options
- validation errors (missing option/choice)
- payload before submit
- success/error response

---

## Acceptance Criteria

1. Wizard cannot submit if:
   - no option name
   - no choices
   - invalid choice fields
2. Wizard shows section names:
   - `Product option`
   - `Product option choices`
3. Payload includes valid nested relation:
   - product → productDetails
   - product → productOptions → optionChoices
4. Product can be created and appears in products management.
5. No React key warning in products list rendering.

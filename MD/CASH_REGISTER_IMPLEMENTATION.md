# Cash Register Card Implementation

## Objective
Add a Cash Register Card to CartPage that:
- Shows box status (Abierta/Cerrada)
- Allows opening/closing the cash box
- Allows registering IN/OUT movements
- Auto-registers cash sales on checkout

## Implementation Steps

### Step 1: Create API Helper
- [x] Create `src/api/cashRegisterApi.ts`
- [x] Implement POST function for `/cashRegister` endpoint
- [x] Support actions: 1 (open), 2 (close), 3 (movement), 4 (get session), 5 (list movements)

### Step 2: Create CashRegisterCard Component
- [x] Create `src/components/CashRegisterCard.tsx`
- [x] Display status with icons
- [x] Show opening cash and system balance when open
- [x] Input for opening cash + "Abrir Caja" button when closed
- [x] Buttons for Entrada, Salida, Cerrar when open
- [x] Movement input form for IN/OUT transactions
- [x] Integrate with toast notifications

### Step 3: Add CSS Styles
- [x] Add `.cash-box` styles to `src/pages/CartPage/CartPage.css`
- [x] Match existing design language

### Step 4: Update CartPage
- [x] Add toast color state
- [x] Import CashRegisterCard component
- [x] Add component after Total section
- [x] Auto-register cash sale after checkout when paymentMethod === 'Efectivo'

## Testing
- [ ] Test cash box open/close functionality
- [ ] Test manual movement registration (IN/OUT)
- [ ] Test auto-registration on cash payment checkout
- [ ] Verify no regressions in existing cart functionality


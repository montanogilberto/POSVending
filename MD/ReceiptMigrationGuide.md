# Receipt System Migration Guide

## Overview
This guide explains how to migrate from the old receipt system to the new unified receipt system.

## New System Components

### 1. Core Infrastructure
- `src/types/receipt.ts` - Unified interfaces
- `src/services/ReceiptService.ts` - Core receipt service
- `src/components/UnifiedReceipt.tsx` - Unified receipt component
- `src/components/UnifiedReceipt.css` - Styling

### 2. Key Benefits
- **Single Source of Truth**: One component handles all receipt types
- **Consistent Data**: Unified data structure across all components
- **Easy Printing**: Optimized for thermal printers (58mm)
- **Better UX**: Improved layout and responsive design
- **Maintainable**: Centralized logic for all receipt operations

## Migration Steps

### Step 1: Update IncomesPage

**Before:**
```tsx
import Receipt from '../components/Receipt';
import { fetchTicket } from '../api/ticketApi';

// Component state
const [showReceiptModal, setShowReceiptModal] = useState(false);
const [receiptData, setReceiptData] = useState<any>(null);

// Handler
const handleShowReceipt = async (incomeId: number) => {
  const ticket = await fetchTicket(incomeId.toString());
  setReceiptData(ticket);
  setShowReceiptModal(true);
};

// Render
<IonModal isOpen={showReceiptModal}>
  {receiptData && (
    <Receipt
      transactionDate={receiptData.transactionDate}
      transactionTime={receiptData.transactionTime}
      clientName={receiptData.clientName}
      clientPhone={receiptData.clientPhone}
      clientEmail={receiptData.clientEmail}
      userName={receiptData.userName}
      products={receiptData.products}
      subtotal={receiptData.subtotal}
      iva={receiptData.iva}
      total={receiptData.total}
      paymentMethod={receiptData.paymentMethod}
      amountReceived={receiptData.amountReceived}
      change={receiptData.change}
    />
  )}
</IonModal>
```

**After:**
```tsx
import UnifiedReceipt from '../components/UnifiedReceipt';
import { ReceiptService } from '../services/ReceiptService';
import { LegacyIncomeData } from '../types/receipt';

// Component state
const [showReceiptModal, setShowReceiptModal] = useState(false);
const [unifiedReceiptData, setUnifiedReceiptData] = useState<UnifiedReceiptData | null>(null);

// Handler
const handleShowReceipt = async (incomeId: number) => {
  const ticket = await fetchTicket(incomeId.toString());
  const unifiedData = ReceiptService.transformIncomeData(ticket as LegacyIncomeData);
  setUnifiedReceiptData(unifiedData);
  setShowReceiptModal(true);
};

// Render
<IonModal isOpen={showReceiptModal} onDidDismiss={() => setShowReceiptModal(false)}>
  {unifiedReceiptData && (
    <UnifiedReceipt
      data={unifiedReceiptData}
      showModal={true}
      onClose={() => setShowReceiptModal(false)}
      options={{ width: '58mm', thermal: true }}
    />
  )}
</IonModal>
```

### Step 2: Update CartPage

**Before:**
```tsx
import Receipt from '../../components/Receipt';

// Render inline receipt
{ticketData && (
  <Receipt
    transactionDate={new Date(ticketData.paymentDate).toLocaleDateString('es-ES')}
    transactionTime={new Date(ticketData.paymentDate).toLocaleTimeString('es-ES')}
    clientName={ticketData.client.name}
    clientPhone={ticketData.client.cellphone}
    clientEmail={ticketData.client.email}
    userName={ticketData.user.name}
    products={ticketData.products.map(prod => ({ name: prod.name }))}
    subtotal={ticketData.totals.subtotal}
    iva={ticketData.totals.iva}
    total={ticketData.totals.total}
    paymentMethod={ticketData.paymentMethod === 'efectivo' ? 'Efectivo' : 'Tarjeta'}
    amountReceived={paymentMethod === 'efectivo' ? parseFloat(cashPaid) || ticketData.totals.total : ticketData.totals.total}
    change={paymentMethod === 'efectivo' ? (parseFloat(cashPaid) || 0) - ticketData.totals.total : 0}
  />
)}
```

**After:**
```tsx
import UnifiedReceipt from '../../components/UnifiedReceipt';
import { ReceiptService } from '../../services/ReceiptService';

// Transform data
const unifiedReceiptData = ticketData ? 
  ReceiptService.transformCartData(ticketData) : null;

// Render inline receipt
{unifiedReceiptData && (
  <UnifiedReceipt
    data={unifiedReceiptData}
    options={{ width: '58mm', thermal: true }}
  />
)}
```

### Step 3: Update ExpenseForm

**Add receipt functionality:**
```tsx
import UnifiedReceipt from '../components/UnifiedReceipt';
import { ReceiptService } from '../services/ReceiptService';

// Component state
const [showReceiptModal, setShowReceiptModal] = useState(false);
const [unifiedReceiptData, setUnifiedReceiptData] = useState<UnifiedReceiptData | null>(null);

// After successful expense creation
const handleExpenseSubmit = async (expenseData: any) => {
  try {
    // ... existing expense creation logic
    
    // Generate receipt data
    const receiptData = {
      id: `expense_${Date.now()}`,
      type: 'expense' as const,
      date: new Date().toLocaleDateString('es-ES'),
      time: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      client: {
        name: 'Empresa', // or appropriate client info
        phone: '',
        email: ''
      },
      user: {
        name: 'Usuario Actual', // get from context
        id: 1
      },
      company: ReceiptService.COMPANY_INFO,
      products: expenseData.products.map((prod: any) => ({
        id: prod.productId,
        name: `Producto ${prod.productId}`,
        quantity: 1,
        unitPrice: 0, // Calculate from expense data
        subtotal: 0
      })),
      totals: {
        subtotal: expenseData.total,
        iva: expenseData.total * 0.16,
        total: expenseData.total
      },
      payment: {
        method: expenseData.paymentMethod,
        amountReceived: expenseData.total,
        change: 0
      }
    };

    setUnifiedReceiptData(receiptData);
    setShowReceiptModal(true);
    
  } catch (error) {
    // ... error handling
  }
};

// Render
<IonModal isOpen={showReceiptModal}>
  {unifiedReceiptData && (
    <UnifiedReceipt
      data={unifiedReceiptData}
      showModal={true}
      onClose={() => setShowReceiptModal(false)}
      options={{ width: '58mm', thermal: true }}
    />
  )}
</IonModal>
```

## API Integration

### Update Ticket API (Optional)
If you control the ticket API, consider updating it to return the new unified format:

```typescript
// src/api/ticketApi.ts (new)
import { UnifiedReceiptData } from '../types/receipt';

export const fetchTicketUnified = async (incomeId: string): Promise<UnifiedReceiptData> => {
  // Implementation that returns unified data directly
};
```

## Benefits of Migration

1. **Reduced Code**: Eliminate duplicate receipt implementations
2. **Consistent UX**: Same receipt experience across all features
3. **Better Printing**: Optimized layouts for thermal printers
4. **Maintainability**: Single point of maintenance
5. **Future-Proof**: Easy to add new receipt types

## Testing Checklist

After migration, test:
- [ ] Receipt displays correctly in all components
- [ ] Print functionality works on desktop and mobile
- [ ] Download functionality works
- [ ] Responsive design on different screen sizes
- [ ] Dark mode support
- [ ] All data transformations work correctly
- [ ] Error handling for failed API calls

## Rollback Plan

If issues arise, the old system can be temporarily restored by:
1. Reverting component changes
2. Re-enabling the old Receipt component
3. Removing the new imports

## Next Steps

1. Start with IncomesPage migration
2. Test thoroughly before moving to other components
3. Gradually migrate CartPage and ExpenseForm
4. Remove old receipt components after successful migration
5. Update documentation and remove old files


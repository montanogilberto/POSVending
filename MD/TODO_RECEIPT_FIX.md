# Receipt Loading Issue - Fix Plan

## Problem
When releasing a receipt from Laundry/Incomes page, the ticket is null or not loading correctly.

## Analysis
The flow is:
1. `RecentActivity` → `handleShowReceipt(incomeId)` → `fetchTicket(incomeId)` → navigate with state
2. `ReceiptPage` receives state and loads receipt

## Issues Found

### Issue 1: ReceiptPage loading check returns early
The current code has:
```tsx
if (loading) {
  return (
    <IonPage>
      <IonContent>
        <IonLoading isOpen={loading} message="Cargando recibo..." />
      </IonContent>
    </IonPage>
  );
}
```

This doesn't properly show the loading state because `IonLoading` is not an overlay.

### Issue 2: TypeScript location state type might not be correct
The `useLocation` generic might not be matching the actual state structure.

## Fix Plan

1. **Fix ReceiptPage loading display** - Use IonLoading as an overlay properly
2. **Add proper loading state handling** - Ensure loading is set correctly
3. **Add console logging for debugging**

## Files to Fix
- `/src/pages/Receipt/ReceiptPage.tsx`


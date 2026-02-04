# Plan: Add "Crear Cliente" Feature to ClientSelector Modal

## Objective
Enable employees to create new clients directly from the POS "Seleccionar Cliente" modal without leaving the checkout flow.

## Files to Modify
1. `src/components/ClientSelector.tsx` - Main implementation

## Implementation Details

### Phase 1: UI Updates to ClientSelector.tsx

1. **Add "Crear cliente" button** near the search bar in the header
   - Position: Right side of the toolbar, next to "Mostrador" button
   - Icon: `add` from ionicons
   - Style: Primary button to make it prominent

2. **Add inline create client form** (collapsed by default)
   - Toggle visibility when "Crear cliente" button is clicked
   - Form fields (mirrored from ClientsPage but simplified):
     - Nombre (required)
     - Apellido (required)
     - Teléfono (required, 10+ digits)
     - Email (optional, email validation)
   - Action buttons: "Guardar" and "Cancelar"

3. **Add loading state** for create operation
   - Disable form during API call
   - Show loading spinner

### Phase 2: State Management

Add new state variables:
```typescript
const [showCreateForm, setShowCreateForm] = useState(false);
const [isCreating, setIsCreating] = useState(false);
const [newClient, setNewClient] = useState<Partial<Client>>({
  first_name: '',
  last_name: '',
  cellphone: '',
  email: '',
});
const [createErrors, setCreateErrors] = useState({
  first_name: '',
  last_name: '',
  email: { isValid: true, message: '' },
  cellphone: '',
});
const [toastMessage, setToastMessage] = useState('');
const [showToast, setShowToast] = useState(false);
```

### Phase 3: Validation Logic

Copy validation functions from ClientsPage:
- `validateEmail()` - Email format validation
- `validateCellphone()` - Phone validation (10+ digits)
- `createIsValid` - Computed validity check

### Phase 4: API Integration

Use existing `createOrUpdateClient` from `clientsApi.ts`:
```typescript
const handleSaveClient = async () => {
  if (createIsValid) {
    setIsCreating(true);
    try {
      const clientId = Date.now();
      await createOrUpdateClient({
        clients: [{
          clientId,
          first_name: newClient.first_name!,
          last_name: newClient.last_name!,
          cellphone: newClient.cellphone!,
          email: newClient.email!,
          action: "1"
        }]
      });
      // Show success and select the new client
    } catch (error) {
      // Show error
    } finally {
      setIsCreating(false);
    }
  }
};
```

### Phase 5: UX Flow

1. User opens "Seleccionar Cliente" modal
2. Searches for client → no results found
3. User clicks "Crear cliente" button
4. Form expands below the search bar
5. User fills form and clicks "Guardar"
6. On success:
   - Show success toast
   - Automatically select the new client
   - Close the modal
   - Return to checkout flow with new client selected

### UI Structure

```
<IonModal>
  <IonHeader>
    <IonToolbar>
      <IonButtons slot="start">
        <IonButton onClick={onClose}>✕</IonButton>
      </IonButtons>
      <IonTitle>Seleccionar Cliente</IonTitle>
      <IonButtons slot="end">
        <IonButton onClick={handleSelectMostrador}>🏪 Mostrador</IonButton>
        <IonButton onClick={() => setShowCreateForm(true)}>+ Crear cliente</IonButton>
      </IonButtons>
    </IonToolbar>
    <IonSearchbar ... />
    
    <!-- Collapsible Create Form -->
    {showCreateForm && (
      <div className="create-client-form">
        <IonItem>
          <IonLabel position="floating">Nombre *</IonLabel>
          <IonInput ... />
        </IonItem>
        <!-- More fields -->
        <IonButton onClick={handleSaveClient} disabled={!createIsValid}>
          Guardar
        </IonButton>
        <IonButton fill="clear" onClick={() => setShowCreateForm(false)}>
          Cancelar
        </IonButton>
      </div>
    )}
  </IonHeader>
  
  <IonContent>
    <!-- Client list (filtered by search) -->
  </IonContent>
  
  <IonFooter>
    <!-- Mostrador button -->
  </IonFooter>
</IonModal>
```

## Styling Considerations

- Keep the create form compact to minimize modal height
- Use consistent styling with existing components
- Add smooth transition for form expansion/collapse
- Ensure form is scrollable if needed

## Testing Checklist

- [ ] Form validation works correctly
- [ ] API call succeeds and client is created
- [ ] New client is automatically selected after creation
- [ ] Modal closes after successful creation
- [ ] Cancel button closes form without creating client
- [ ] Loading state prevents double submissions
- [ ] Toast messages show success/error feedback
- [ ] Search still works when form is closed
- [ ] Mostrador option still works

## Follow-up Steps

1. Import required Ionic components and icons
2. Add CSS styles for the create form
3. Test the full flow in the POS context
4. Verify mobile responsiveness


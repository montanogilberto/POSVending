import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  IonButton, IonButtons, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonChip, IonContent,
  IonFooter, IonHeader, IonIcon, IonInput, IonItem, IonLabel, IonList, IonModal, IonSearchbar,
  IonSpinner, IonTitle, IonToolbar,
} from '@ionic/react';
import {
  addOutline, checkmarkCircle, closeOutline, ellipseOutline, receiptOutline, trashOutline,
} from 'ionicons/icons';
import { getCompanyProducts } from '../../api/productsApi';
import { fmtMXN } from '../../utils/format';
import NewSupplyProductModal from './NewSupplyProductModal';
import { ExpenseItem, itemAmount, itemsTotal } from './expenseItems';
import './ExpenseItemsEditor.css';

interface CatalogProduct {
  productId: number;
  name: string;
  code: string;
  isSupply: boolean;
}

interface ExpenseItemsEditorProps {
  companyId: number;
  items: ExpenseItem[];
  onChange: (items: ExpenseItem[]) => void;
  disabled?: boolean;
  /** Highlights the card (submit attempted with the items missing/incomplete). */
  invalid?: boolean;
}

const num = (v: unknown) => {
  const n = parseFloat(String(v ?? ''));
  return Number.isFinite(n) && n > 0 ? n : 0;
};

/**
 * The "Productos" part of an inventory egreso: several products at once, each
 * with a quantity and a unit cost, a per-line amount and a totals summary.
 * The picker stays open so a whole shopping ticket can be ticked in one go,
 * and anything missing from the catalog can be created on the spot.
 */
const ExpenseItemsEditor: React.FC<ExpenseItemsEditorProps> = ({
  companyId, items, onChange, disabled, invalid,
}) => {
  const [catalog, setCatalog] = useState<CatalogProduct[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const loadCatalog = useCallback(async () => {
    if (!companyId) return;
    setLoadingCatalog(true);
    try {
      const list = await getCompanyProducts(companyId);
      setCatalog(list.map((p) => ({
        productId: p.productId,
        name: p.name,
        code: p.code ?? '',
        isSupply: !!p.isSupply,
      })));
    } catch (error) {
      console.error('[ExpenseItemsEditor] getCompanyProducts failed:', error);
      setCatalog([]);
    } finally {
      setLoadingCatalog(false);
    }
  }, [companyId]);

  useEffect(() => { loadCatalog(); }, [loadCatalog]);

  const selectedIds = useMemo(() => new Set(items.map((i) => i.productId)), [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return catalog;
    return catalog.filter((p) => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q));
  }, [catalog, search]);

  const toggleProduct = (p: CatalogProduct) => {
    if (selectedIds.has(p.productId)) {
      onChange(items.filter((i) => i.productId !== p.productId));
    } else {
      onChange([...items, { productId: p.productId, name: p.name, quantity: 1, unitCost: 0, isSupply: p.isSupply }]);
    }
  };

  const updateItem = (productId: number, patch: Partial<ExpenseItem>) =>
    onChange(items.map((i) => (i.productId === productId ? { ...i, ...patch } : i)));

  const removeItem = (productId: number) => onChange(items.filter((i) => i.productId !== productId));

  const handleCreated = (created: { productId: number; name: string; code: string }) => {
    setCatalog((prev) => [...prev, { ...created, isSupply: true }]);
    onChange([...items, { productId: created.productId, name: created.name, quantity: 1, unitCost: 0, isSupply: true }]);
    setShowCreate(false);
    setSearch('');
  };

  const units = items.reduce((sum, i) => sum + i.quantity, 0);
  const total = itemsTotal(items);

  return (
    <IonCard id="expense-field-products" className={`expense-form-card ${invalid ? 'expense-form-card--invalid' : ''}`}>
      <IonCardHeader>
        <IonCardTitle className="expense-form-card-title">
          Productos <span className="expense-required">*</span>
        </IonCardTitle>
      </IonCardHeader>
      <IonCardContent>
        {items.length === 0 ? (
          <div className="expense-form-empty">
            <IonIcon icon={receiptOutline} />
            <p>No hay productos seleccionados</p>
          </div>
        ) : (
          <>
            <IonList lines="none" className="eie-list">
              {items.map((item) => (
                <div key={item.productId} className="eie-line">
                  <div className="eie-line-head">
                    <div className="eie-line-name">
                      {item.name}
                      {item.isSupply && <IonChip className="eie-supply-chip" outline>Insumo</IonChip>}
                    </div>
                    <IonButton fill="clear" color="danger" size="small" disabled={disabled}
                      aria-label={`Quitar ${item.name}`} onClick={() => removeItem(item.productId)}>
                      <IonIcon icon={trashOutline} slot="icon-only" />
                    </IonButton>
                  </div>
                  <div className="eie-line-fields">
                    <IonInput className="eie-qty" fill="outline" label="Cantidad" labelPlacement="stacked"
                      type="number" inputmode="decimal" min="0" step="any" disabled={disabled}
                      value={item.quantity || ''}
                      onIonInput={(e) => updateItem(item.productId, { quantity: num(e.detail.value) })} />
                    <IonInput className="eie-cost" fill="outline" label="Costo unitario" labelPlacement="stacked"
                      type="number" inputmode="decimal" min="0" step="any" placeholder="0.00" disabled={disabled}
                      value={item.unitCost || ''}
                      onIonInput={(e) => updateItem(item.productId, { unitCost: num(e.detail.value) })} />
                    <div className="eie-amount">
                      <span className="eie-amount-label">Importe</span>
                      <span className="eie-amount-value">{fmtMXN(itemAmount(item))}</span>
                    </div>
                  </div>
                </div>
              ))}
            </IonList>

            <div className="eie-summary" aria-label="Resumen de la compra">
              <div className="eie-summary-row">
                <span>Productos</span><strong>{items.length}</strong>
              </div>
              <div className="eie-summary-row">
                <span>Unidades</span><strong>{Number.isInteger(units) ? units : units.toFixed(2)}</strong>
              </div>
              <div className="eie-summary-row eie-summary-total">
                <span>Total de la compra</span><strong>{fmtMXN(total)}</strong>
              </div>
            </div>
          </>
        )}

        <IonButton expand="block" fill="outline" className="ion-margin-top" disabled={disabled}
          onClick={() => setShowPicker(true)}>
          <IonIcon icon={addOutline} slot="start" />
          {items.length === 0 ? 'Agregar productos' : 'Agregar más productos'}
        </IonButton>
        <IonButton expand="block" fill="clear" size="small" disabled={disabled}
          onClick={() => setShowCreate(true)}>
          <IonIcon icon={addOutline} slot="start" />
          Crear producto nuevo
        </IonButton>
      </IonCardContent>

      <IonModal isOpen={showPicker} onDidDismiss={() => { setShowPicker(false); setSearch(''); }}>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonButton onClick={() => setShowPicker(false)} aria-label="Cerrar">
                <IonIcon icon={closeOutline} slot="icon-only" />
              </IonButton>
            </IonButtons>
            <IonTitle>Seleccionar productos</IonTitle>
          </IonToolbar>
          <IonToolbar>
            <IonSearchbar value={search} placeholder="Buscar producto o código"
              onIonInput={(e) => setSearch(e.detail.value ?? '')} />
          </IonToolbar>
        </IonHeader>
        <IonContent>
          {loadingCatalog && catalog.length === 0 ? (
            <div className="eie-picker-state"><IonSpinner name="crescent" /></div>
          ) : filtered.length === 0 ? (
            <div className="eie-picker-state">
              <p>{search ? `Sin resultados para “${search}”.` : 'Aún no hay productos.'}</p>
              <IonButton fill="outline" onClick={() => setShowCreate(true)}>
                <IonIcon icon={addOutline} slot="start" />
                Crear {search ? `“${search}”` : 'producto nuevo'}
              </IonButton>
            </div>
          ) : (
            <IonList>
              {filtered.map((p) => {
                const selected = selectedIds.has(p.productId);
                return (
                  <IonItem key={p.productId} button detail={false} onClick={() => toggleProduct(p)}>
                    <IonIcon slot="start" icon={selected ? checkmarkCircle : ellipseOutline}
                      color={selected ? 'primary' : 'medium'} />
                    <IonLabel>
                      <h3>{p.name}</h3>
                      {p.code && <p>{p.code}</p>}
                    </IonLabel>
                    {p.isSupply && <IonChip slot="end" className="eie-supply-chip" outline>Insumo</IonChip>}
                  </IonItem>
                );
              })}
            </IonList>
          )}
        </IonContent>
        <IonFooter>
          <IonToolbar>
            <div className="eie-picker-footer">
              <IonButton fill="outline" onClick={() => setShowCreate(true)}>
                <IonIcon icon={addOutline} slot="start" />
                Crear nuevo
              </IonButton>
              <IonButton onClick={() => setShowPicker(false)}>
                Listo{items.length > 0 ? ` (${items.length})` : ''}
              </IonButton>
            </div>
          </IonToolbar>
        </IonFooter>
      </IonModal>

      <NewSupplyProductModal
        isOpen={showCreate}
        companyId={companyId}
        initialName={search}
        onClose={() => setShowCreate(false)}
        onCreated={handleCreated}
      />
    </IonCard>
  );
};

export default ExpenseItemsEditor;

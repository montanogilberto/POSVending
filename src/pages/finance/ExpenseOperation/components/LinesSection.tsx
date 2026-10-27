import React from 'react';
import { IonButton, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonChip, IonIcon, IonInput, IonSelect, IonSelectOption, IonSpinner } from '@ionic/react';
import { arrowUndoOutline, globeOutline, trashOutline } from 'ionicons/icons';
import { fmtMXN } from '../../../../utils/format';
import { categoryLabel, defaultParent, lineAmount, linePieces, savedLine } from '../operationPlan';
import type { ProductCategoryItem } from '../../../../hooks/useProductCategories';
import type { CatalogOption } from '../ExpenseOperationLogic';
import type { WebProductLookup } from '../../../../api/productAgentApi';
import type { CategoryChoice, LineDecision, OperationDraft, PlanLine, WebLookupState } from '../ExpenseOperationTypes';

interface Props {
  draft: OperationDraft;
  products: CatalogOption[];
  submitAttempted: boolean;
  onDecision: (index: number, decision: LineDecision) => void;
  onUpdate: (index: number, change: Partial<Pick<PlanLine, 'quantity' | 'unitCost' | 'unitsPerPack'>>) => void;
  webLookups: Record<number, WebLookupState>;
  onLookupWeb: (line: PlanLine) => void;
  onApplyWeb: (line: PlanLine, result: WebProductLookup) => void;
  categories: ProductCategoryItem[];
}

/** Categoría › Subcategoría of a new product: pick one, or name a new subcategory (created on confirm). */
const CategoryPicker: React.FC<{
  value: CategoryChoice | undefined;
  categories: ProductCategoryItem[];
  onChange: (value: CategoryChoice) => void;
}> = ({ value, categories, onChange }) => {
  const tops = categories.filter(c => !c.parentCategoryId);
  // Each top-level category followed by its subcategories.
  const ordered = tops.flatMap(t => [t, ...categories.filter(c => c.parentCategoryId === t.categoryId)]);
  const fallback = defaultParent(categories);
  const encoded = value?.mode === 'new' ? 'new'
    : value ? `c:${value.categoryId}` : fallback ? `c:${fallback.categoryId}` : undefined;
  const pick = (v: string) => {
    if (v === 'new') return;
    if (v.startsWith('add:')) return onChange({ mode: 'new', parentId: Number(v.slice(4)), name: '' });
    onChange({ mode: 'existing', categoryId: Number(v.slice(2)) });
  };
  const newParent = value?.mode === 'new' ? categories.find(c => c.categoryId === value.parentId) : undefined;
  return (
    <>
      <IonSelect className="xo-field" fill="outline" interface="popover" labelPlacement="stacked" label="Categoría"
        value={encoded} onIonChange={e => pick(String(e.detail.value))}>
        {ordered.map(c => (
          <IonSelectOption key={c.categoryId} value={`c:${c.categoryId}`}>{categoryLabel(c, categories)}</IonSelectOption>
        ))}
        {value?.mode === 'new' && (
          <IonSelectOption value="new">{`${newParent ? `${newParent.name} › ` : ''}${value.name || 'nueva'} (nueva)`}</IonSelectOption>
        )}
        {tops.map(t => (
          <IonSelectOption key={`add${t.categoryId}`} value={`add:${t.categoryId}`}>＋ Nueva subcategoría en {t.name}</IonSelectOption>
        ))}
      </IonSelect>
      {value?.mode === 'new' && (
        <IonInput className="xo-field" fill="outline" labelPlacement="stacked" maxlength={50}
          label={`Nueva subcategoría en ${newParent?.name ?? ''}`} placeholder="Ej. Detergente"
          helperText="Se crea al confirmar el egreso."
          value={value.name} onIonInput={e => onChange({ ...value, name: String(e.detail.value ?? '') })} />
      )}
    </>
  );
};

const size = (content?: number, unit?: string) => (content && content > 0 && unit ? `${content} ${unit}` : '');
const fmtQty = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2));

const num = (v: unknown) => {
  const n = parseFloat(String(v ?? ''));
  return Number.isFinite(n) && n > 0 ? n : 0;
};

const encode = (d: LineDecision) =>
  d.mode === 'existing' ? `p:${d.productId}` : d.mode === 'new' ? 'new' : d.mode === 'skip' ? 'skip' : undefined;

/** Web search result for one line: what was found and how sure it is. Applying it is the person's call. */
const WebResult: React.FC<{ line: PlanLine; state?: WebLookupState; onLookup: () => void; onApply: (r: WebProductLookup) => void }> = ({ line, state, onLookup, onApply }) => {
  if (!state || state.status === 'loading') {
    return (
      <IonButton size="small" fill="outline" className="xo-web-btn" disabled={state?.status === 'loading'} onClick={onLookup}>
        {state?.status === 'loading'
          ? <><IonSpinner name="dots" /> Buscando en internet…</>
          : <><IonIcon icon={globeOutline} slot="start" /> Buscar en internet</>}
      </IonButton>
    );
  }
  if (state.status === 'failed') {
    return (
      <div className="xo-web xo-web--empty">
        <p>No se pudo buscar el producto. Revisa tu conexión.</p>
        <IonButton size="small" fill="clear" onClick={onLookup}>Intentar de nuevo</IonButton>
      </div>
    );
  }
  const r = state.result;
  if (!r.found) {
    return (
      <div className="xo-web xo-web--empty">
        <p>{r.issues[0] ?? 'No se encontró el producto en internet.'}</p>
        <IonButton size="small" fill="clear" onClick={onLookup}>Buscar de nuevo</IonButton>
      </div>
    );
  }
  const piece = size(r.netContent, r.unitOfMeasure);
  const applied = r.existingProduct?.id
    ? line.decision.mode === 'existing' && line.decision.productId === r.existingProduct.id
    : line.decision.mode === 'new' && line.decision.name === (r.suggestedName || r.fullName) && line.unitsPerPack === r.unitsPerPack;
  return (
    <div className="xo-web">
      <div className="xo-web-head">
        <strong>{r.suggestedName || r.fullName}</strong>
        <IonChip color={r.verified ? 'success' : 'warning'} className="xo-chip">
          {r.verified ? 'Código verificado' : 'Por descripción'}
        </IonChip>
      </div>
      <p className="xo-web-meta">
        {[r.productType && `Tipo: ${r.productType}`, r.brand, piece && `${piece} c/u`, r.unitsPerPack > 1 ? `${r.unitsPerPack} piezas por paquete` : '1 pieza',
          r.price > 0 ? `${!r.currency || r.currency === 'MXN' ? fmtMXN(r.price) : `${r.price.toFixed(2)} ${r.currency}`} en internet` : ''].filter(Boolean).join(' · ')}
      </p>
      {r.fullName && r.fullName !== r.suggestedName && <p className="xo-web-meta">{r.fullName}</p>}
      {r.issues.map(i => <p key={i} className="xo-web-issue">{i}</p>)}
      {r.sources.length > 0 && <p className="xo-web-source">Fuente: {r.sources.map(s => s.title).filter(Boolean).join(', ')}</p>}
      {applied ? (
        <p className="xo-web-applied">✓ Datos aplicados a esta línea</p>
      ) : (
        <IonButton size="small" onClick={() => onApply(r)}>
          {r.existingProduct?.id ? `Usar «${r.existingProduct.name}» de tu catálogo` : 'Usar estos datos'}
        </IonButton>
      )}
    </div>
  );
};

const LinesSection: React.FC<Props> = ({ draft, products, submitAttempted, onDecision, onUpdate, webLookups, onLookupWeb, onApplyWeb, categories }) => {
  const pick = (line: PlanLine, v: string) => {
    if (v === 'skip') return onDecision(line.index, { mode: 'skip' });
    if (v === 'new') return onDecision(line.index, line.decision.mode === 'new' ? line.decision : { mode: 'new', name: line.name.trim(), code: line.code });
    const id = Number(v.slice(2));
    const found = products.find(p => p.id === id) ?? line.candidates.find(c => c.id === id);
    if (found) onDecision(line.index, { mode: 'existing', productId: id, name: found.name });
  };

  return (
    <IonCard className="xo-card">
      <IonCardHeader>
        <IonCardTitle className="xo-card-title">Productos del ticket ({draft.lines.length})</IonCardTitle>
      </IonCardHeader>
      <IonCardContent>
        {draft.lines.map(line => {
          const skipped = line.decision.mode === 'skip';
          const undecided = line.decision.mode === 'none';
          const candidateIds = new Set(line.candidates.map(c => c.id));
          return (
            <div key={line.index} className={`xo-line ${skipped ? 'xo-line--skipped' : ''}`}>
              <div className="xo-line-head">
                <div className="xo-line-name">
                  {line.ticketName}
                  {line.needsReview && <IonChip color="warning" className="xo-chip">Revisar lectura</IonChip>}
                </div>
                {skipped ? (
                  <IonButton fill="clear" size="small" aria-label="Incluir de nuevo" onClick={() => onDecision(line.index, { mode: 'none' })}>
                    <IonIcon icon={arrowUndoOutline} slot="icon-only" />
                  </IonButton>
                ) : (
                  <IonButton fill="clear" color="danger" size="small" aria-label="Omitir línea" onClick={() => onDecision(line.index, { mode: 'skip' })}>
                    <IonIcon icon={trashOutline} slot="icon-only" />
                  </IonButton>
                )}
              </div>

              {skipped ? (
                <p className="xo-line-skipped">Se omitirá esta línea.</p>
              ) : (
                <>
                  <IonSelect
                    className={`xo-field ${submitAttempted && undecided ? 'ion-invalid ion-touched' : ''}`}
                    fill="outline" interface="popover" labelPlacement="stacked" label="Producto"
                    placeholder="Elegir o registrar producto" errorText="Elige un producto o regístralo como nuevo"
                    value={encode(line.decision)} onIonChange={e => pick(line, String(e.detail.value))}
                  >
                    {line.candidates.filter(c => c.id).map(c => (
                      <IonSelectOption key={`c${c.id}`} value={`p:${c.id}`}>{c.name} · coincidencia {Math.round(c.score * 100)}%</IonSelectOption>
                    ))}
                    {products.filter(p => !candidateIds.has(p.id)).map(p => (
                      <IonSelectOption key={p.id} value={`p:${p.id}`}>{p.name}</IonSelectOption>
                    ))}
                    <IonSelectOption value="new">＋ Registrar como producto nuevo</IonSelectOption>
                  </IonSelect>
                  {line.decision.mode === 'new' && (() => {
                    const d = line.decision;
                    const piece = size(d.netContent, d.unitOfMeasure);
                    return (
                      <>
                      <div className="xo-new-product">
                        <IonInput
                          className="xo-field" fill="outline" label="Código" labelPlacement="stacked" maxlength={50} inputmode="numeric"
                          placeholder="Opcional"
                          value={d.code} onIonInput={e => onDecision(line.index, { ...d, code: String(e.detail.value ?? '') })}
                        />
                        <IonInput
                          className="xo-field" fill="outline" label="Nombre del producto nuevo" labelPlacement="stacked" maxlength={200}
                          value={d.name} onIonInput={e => onDecision(line.index, { ...d, name: String(e.detail.value ?? '') })}
                        />
                      </div>
                      <CategoryPicker value={d.category} categories={categories}
                        onChange={category => onDecision(line.index, { ...d, category })} />
                      {piece && <p className="xo-pack-note">Contenido por pieza: <strong>{piece}</strong> (se guarda en el producto)</p>}
                      </>
                    );
                  })()}
                  {line.decision.mode !== 'existing' && (
                    <WebResult line={line} state={webLookups[line.index]}
                      onLookup={() => onLookupWeb(line)} onApply={r => onApplyWeb(line, r)} />
                  )}
                  <div className="xo-line-fields">
                    <IonInput className="xo-num" fill="outline" label="Cantidad" labelPlacement="stacked" type="number" inputmode="decimal"
                      min="0" step="any" value={line.quantity || ''} onIonInput={e => onUpdate(line.index, { quantity: num(e.detail.value) })} />
                    <IonInput className="xo-num" fill="outline" label="Costo unitario" labelPlacement="stacked" type="number" inputmode="decimal"
                      min="0" step="any" value={line.unitCost || ''} onIonInput={e => onUpdate(line.index, { unitCost: num(e.detail.value) })} />
                    <div className="xo-amount">
                      <span>Importe</span>
                      <strong>{fmtMXN(lineAmount(line))}</strong>
                      {line.discount > 0 && <span className="xo-discount">Promoción −{fmtMXN(line.discount)}</span>}
                    </div>
                  </div>
                  {/* Desglose: packs bought → pieces that enter the inventory */}
                  <div className="xo-pack-row">
                    <IonInput className="xo-num xo-pack-input" fill="outline" label="Piezas por paquete" labelPlacement="stacked"
                      type="number" inputmode="numeric" min="1" step="1" value={line.unitsPerPack}
                      onIonInput={e => onUpdate(line.index, { unitsPerPack: Math.max(Math.round(num(e.detail.value)), 1) })} />
                    <p className="xo-pack-note">
                      {line.unitsPerPack > 1
                        ? <>{fmtQty(line.quantity)} × {line.unitsPerPack} = <strong>{fmtQty(linePieces(line))} piezas</strong> a {fmtMXN(savedLine(line).unitCost)} c/u
                          {size(line.netContent, line.unitOfMeasure) && <> · {size(line.netContent, line.unitOfMeasure)} c/u</>}</>
                        : <>Entra al inventario como <strong>{fmtQty(linePieces(line))} {linePieces(line) === 1 ? 'pieza' : 'piezas'}</strong>
                          {size(line.netContent, line.unitOfMeasure) && <> de {size(line.netContent, line.unitOfMeasure)}</>}</>}
                    </p>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </IonCardContent>
    </IonCard>
  );
};

export default LinesSection;

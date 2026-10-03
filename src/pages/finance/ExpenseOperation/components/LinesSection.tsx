import React from 'react';
import { IonButton, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonChip, IonIcon, IonInput, IonSelect, IonSelectOption } from '@ionic/react';
import { arrowUndoOutline, trashOutline } from 'ionicons/icons';
import { fmtMXN } from '../../../../utils/format';
import { lineAmount } from '../operationPlan';
import type { CatalogOption } from '../ExpenseOperationLogic';
import type { LineDecision, OperationDraft, PlanLine } from '../ExpenseOperationTypes';

interface Props {
  draft: OperationDraft;
  products: CatalogOption[];
  submitAttempted: boolean;
  onDecision: (index: number, decision: LineDecision) => void;
  onUpdate: (index: number, change: Partial<Pick<PlanLine, 'quantity' | 'unitCost'>>) => void;
}

const num = (v: unknown) => {
  const n = parseFloat(String(v ?? ''));
  return Number.isFinite(n) && n > 0 ? n : 0;
};

const encode = (d: LineDecision) =>
  d.mode === 'existing' ? `p:${d.productId}` : d.mode === 'new' ? 'new' : d.mode === 'skip' ? 'skip' : undefined;

const LinesSection: React.FC<Props> = ({ draft, products, submitAttempted, onDecision, onUpdate }) => {
  const pick = (line: PlanLine, v: string) => {
    if (v === 'skip') return onDecision(line.index, { mode: 'skip' });
    if (v === 'new') return onDecision(line.index, { mode: 'new', name: line.decision.mode === 'new' ? line.decision.name : line.ticketName.trim() });
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
                  {line.decision.mode === 'new' && (
                    <IonInput
                      className="xo-field" fill="outline" label="Nombre del producto nuevo" labelPlacement="stacked" maxlength={200}
                      value={line.decision.name} onIonInput={e => onDecision(line.index, { mode: 'new', name: String(e.detail.value ?? '') })}
                    />
                  )}
                  <div className="xo-line-fields">
                    <IonInput className="xo-num" fill="outline" label="Cantidad" labelPlacement="stacked" type="number" inputmode="decimal"
                      min="0" step="any" value={line.quantity || ''} onIonInput={e => onUpdate(line.index, { quantity: num(e.detail.value) })} />
                    <IonInput className="xo-num" fill="outline" label="Costo unitario" labelPlacement="stacked" type="number" inputmode="decimal"
                      min="0" step="any" value={line.unitCost || ''} onIonInput={e => onUpdate(line.index, { unitCost: num(e.detail.value) })} />
                    <div className="xo-amount">
                      <span>Importe</span>
                      <strong>{fmtMXN(lineAmount(line))}</strong>
                    </div>
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

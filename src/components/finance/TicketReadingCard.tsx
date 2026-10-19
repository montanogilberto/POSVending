import React from 'react';
import { IonButton, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonChip, IonIcon, IonLabel, IonSpinner } from '@ionic/react';
import { addOutline, checkmarkCircleOutline, sparklesOutline, warningOutline } from 'ionicons/icons';
import type { ExpenseType } from '../../api/expensesApi';
import type { ExpenseCategorization, TicketExtraction } from '../../api/expenseAgentApi';
import { fmtMXN } from '../../utils/format';
import { lineUnitCost } from './ticketDraft';
import './TicketReadingCard.css';

export interface ExpenseReviewView {
  state: 'idle' | 'loading' | 'done' | 'failed';
  result: ExpenseCategorization | null;
}

interface TicketReadingCardProps {
  state: 'idle' | 'loading' | 'done' | 'failed';
  ticket: TicketExtraction | null;
  expenseType: ExpenseType;
  /** "Aplicar" already pressed for this photo. */
  applied: boolean;
  /** Ticket lines the user already resolved (picked a candidate or created the product). */
  resolvedLines: number[];
  disabled: boolean;
  /** Category + anomaly check, run automatically once the ticket is read. */
  review: ExpenseReviewView;
  /** Products already on the egreso, so the check can be run by hand if the ticket couldn't be read. */
  canReviewManually: boolean;
  onReview: () => void;
  onApply: () => void;
  /** Starts (or restarts) the agent's reading of the photo. */
  onAnalyze: () => void;
  onPickSupplier: (supplierId: number) => void;
  onCreateSupplier: (name: string) => void;
  onPickLineProduct: (lineIndex: number, productId: number, name: string) => void;
  onCreateLineProduct: (lineIndex: number) => void;
}

const TicketReadingCard: React.FC<TicketReadingCardProps> = ({
  state, ticket, expenseType, applied, resolvedLines, disabled, review, canReviewManually, onReview,
  onApply, onAnalyze, onPickSupplier, onCreateSupplier, onPickLineProduct, onCreateLineProduct,
}) => {
  const reviewSection = () => {
    if (review.state === 'loading') {
      return (
        <div className="trc-review trc-status">
          <IonSpinner name="dots" />
          <span>Revisando categoría…</span>
        </div>
      );
    }
    if (review.state === 'done' && review.result) {
      const { suggestedCategory, isAnomaly, anomalyReason, confidence } = review.result;
      return (
        <div className="trc-review">
          <p className="trc-note">Categoría sugerida</p>
          <div className="trc-chips">
            <IonChip color="primary">
              <IonIcon icon={sparklesOutline} />
              <IonLabel>{suggestedCategory}</IonLabel>
            </IonChip>
            {confidence > 0 && confidence < 0.5 && (
              <IonChip outline><IonLabel>Confianza baja</IonLabel></IonChip>
            )}
            {isAnomaly && (
              <IonChip color="warning">
                <IonIcon icon={warningOutline} />
                <IonLabel>{anomalyReason || 'Posible anomalía'}</IonLabel>
              </IonChip>
            )}
          </div>
        </div>
      );
    }
    if (review.state === 'failed') {
      return <p className="trc-review trc-note">No se pudo revisar la categoría con el agente.</p>;
    }
    if (canReviewManually) {
      return (
        <div className="trc-review">
          <IonButton fill="outline" size="small" onClick={onReview} disabled={disabled}>
            <IonIcon slot="start" icon={sparklesOutline} />
            Sugerir categoría
          </IonButton>
        </div>
      );
    }
    return null;
  };

  const body = () => {
    if (state === 'idle' || state === 'loading') {
      return (
        <>
          {state === 'idle' && (
            <p className="trc-note">El agente lee el ticket y sugiere proveedor, productos, fecha, método de pago y categoría.</p>
          )}
          <IonButton expand="block" onClick={onAnalyze} disabled={disabled || state === 'loading'}>
            {state === 'loading' ? (
              <><IonSpinner name="dots" />&nbsp;Leyendo el ticket…</>
            ) : (
              <><IonIcon slot="start" icon={sparklesOutline} />Analizar ticket con el agente</>
            )}
          </IonButton>
        </>
      );
    }
    if (state === 'failed' || !ticket) {
      return (
        <>
          <p className="trc-note">No se pudo leer el ticket. Captura los datos manualmente.</p>
          <IonButton fill="clear" size="small" onClick={onAnalyze} disabled={disabled}>Reintentar</IonButton>
        </>
      );
    }
    if (!ticket.isPurchaseTicket) {
      return (
        <>
          <p className="trc-note">La imagen no parece un ticket de compra. Prueba con otra foto.</p>
          <IonButton fill="clear" size="small" onClick={onAnalyze} disabled={disabled}>Leer de nuevo</IonButton>
        </>
      );
    }

    const inventory = expenseType === 'inventory';
    const supplier = ticket.supplierMatch;
    return (
      <>
        <dl className="trc-summary">
          {ticket.merchantName && (<><dt>Comercio</dt><dd>{ticket.merchantName}</dd></>)}
          {ticket.ticketDate && (<><dt>Fecha</dt><dd>{ticket.ticketDate}</dd></>)}
          {ticket.total > 0 && (<><dt>Total del ticket</dt><dd>{fmtMXN(ticket.total)}</dd></>)}
          {ticket.paymentMethod
            ? (<><dt>Método de pago</dt><dd>{ticket.paymentMethod}</dd></>)
            : ticket.paymentTypeRaw && (<><dt>Pago en el ticket</dt><dd>{ticket.paymentTypeRaw}</dd></>)}
        </dl>

        {inventory && supplier.status === 'MATCHED' && (
          <IonChip color="success" outline>
            <IonIcon icon={checkmarkCircleOutline} />
            <IonLabel>Proveedor: {supplier.name}</IonLabel>
          </IonChip>
        )}
        {inventory && supplier.status === 'AMBIGUOUS' && (
          <div className="trc-choice">
            <p className="trc-note">¿Cuál es el proveedor?</p>
            <div className="trc-chips">
              {supplier.candidates.filter(c => c.id).map(c => (
                <IonChip key={c.id} color="warning" onClick={() => onPickSupplier(c.id!)}>
                  <IonLabel>{c.name}</IonLabel>
                </IonChip>
              ))}
            </div>
          </div>
        )}
        {inventory && supplier.status === 'NEW' && ticket.merchantName && (
          <div className="trc-choice">
            <p className="trc-note">«{ticket.merchantName}» no está en tus proveedores.</p>
            <IonButton fill="outline" size="small" onClick={() => onCreateSupplier(ticket.merchantName)} disabled={disabled}>
              <IonIcon slot="start" icon={addOutline} />
              Crear proveedor
            </IonButton>
          </div>
        )}

        {inventory && ticket.lineItems.length > 0 && (
          <ul className="trc-lines">
            {ticket.lineItems.map((line, idx) => {
              const match = line.productMatch;
              const resolved = resolvedLines.includes(idx);
              return (
                <li key={`${idx}-${line.name}`} className="trc-line">
                  <div className="trc-line-head">
                    <span className="trc-line-name">{line.name}</span>
                    <span className="trc-line-amount">{fmtMXN(line.lineTotal)}</span>
                  </div>
                  <div className="trc-line-meta">
                    {line.quantity} × {fmtMXN(lineUnitCost(line))}
                    {match.status === 'MATCHED' && (
                      <IonChip color="success" outline><IonLabel>En catálogo</IonLabel></IonChip>
                    )}
                    {resolved && (
                      <IonChip color="success"><IonIcon icon={checkmarkCircleOutline} /><IonLabel>Agregado</IonLabel></IonChip>
                    )}
                  </div>
                  {!resolved && match.status === 'AMBIGUOUS' && (
                    <div className="trc-chips">
                      {match.candidates.filter(c => c.id).map(c => (
                        <IonChip key={c.id} color="warning" onClick={() => onPickLineProduct(idx, c.id!, c.name)}>
                          <IonLabel>{c.name}</IonLabel>
                        </IonChip>
                      ))}
                    </div>
                  )}
                  {!resolved && match.status === 'NEW' && (
                    <IonButton fill="clear" size="small" onClick={() => onCreateLineProduct(idx)} disabled={disabled}>
                      <IonIcon slot="start" icon={addOutline} />
                      No está en el catálogo — crear producto
                    </IonButton>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {(ticket.issues.length > 0 || ticket.notes.length > 0) && (
          <ul className="trc-issues">
            {[...ticket.issues, ...ticket.notes].map(text => (
              <li key={text}><IonIcon icon={warningOutline} />{text}</li>
            ))}
          </ul>
        )}

        {applied ? (
          <IonChip color="success"><IonIcon icon={checkmarkCircleOutline} /><IonLabel>Datos aplicados al egreso</IonLabel></IonChip>
        ) : (
          <IonButton expand="block" onClick={onApply} disabled={disabled}>
            <IonIcon slot="start" icon={sparklesOutline} />
            Aplicar al egreso
          </IonButton>
        )}
        <p className="trc-hint">Revisa los datos antes de crear el egreso: el agente solo sugiere.</p>
      </>
    );
  };

  return (
    <IonCard className="expense-form-card">
      <IonCardHeader>
        <IonCardTitle className="expense-form-card-title">Agente de egresos</IonCardTitle>
      </IonCardHeader>
      <IonCardContent>
        {body()}
        {(state === 'done' || state === 'failed') && reviewSection()}
      </IonCardContent>
    </IonCard>
  );
};

export default TicketReadingCard;

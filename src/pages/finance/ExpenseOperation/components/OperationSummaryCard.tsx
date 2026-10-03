import React from 'react';
import { IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonIcon } from '@ionic/react';
import { addCircleOutline, alertCircleOutline, checkmarkCircleOutline, receiptOutline, removeCircleOutline } from 'ionicons/icons';
import { fmtMXN, mxDate } from '../../../../utils/format';
import type { OperationDraft, OperationSummary } from '../ExpenseOperationTypes';

interface Props { draft: OperationDraft; summary: OperationSummary; }

/** The headline of the page: in plain words, everything that will be registered when the user confirms. */
const OperationSummaryCard: React.FC<Props> = ({ draft, summary }) => {
  const supplierText = summary.supplierName
    ? (summary.newSupplier ? `Se registrará el proveedor nuevo «${summary.supplierName}»` : `Se usará el proveedor «${summary.supplierName}»`)
    : 'Falta elegir el proveedor';
  const { newProducts, existingProducts, skippedLines } = summary;

  return (
    <IonCard className="xo-card xo-summary">
      <IonCardHeader>
        <IonCardTitle className="xo-card-title">Qué se va a registrar</IonCardTitle>
      </IonCardHeader>
      <IonCardContent>
        <ul className="xo-plan">
          <li className={summary.supplierName ? '' : 'xo-plan--pending'}>
            <IonIcon icon={!summary.supplierName ? alertCircleOutline : summary.newSupplier ? addCircleOutline : checkmarkCircleOutline} />
            <span>{supplierText}</span>
          </li>
          {newProducts.length > 0 && (
            <li>
              <IonIcon icon={addCircleOutline} />
              <span>
                {newProducts.length === 1 ? 'Se registrará 1 producto nuevo' : `Se registrarán ${newProducts.length} productos nuevos`}
                <small className="xo-plan-detail">{newProducts.join(' · ')}</small>
              </span>
            </li>
          )}
          {existingProducts > 0 && (
            <li>
              <IonIcon icon={checkmarkCircleOutline} />
              <span>{existingProducts === 1 ? 'Se usará 1 producto del catálogo' : `Se usarán ${existingProducts} productos del catálogo`}</span>
            </li>
          )}
          {skippedLines > 0 && (
            <li className="xo-plan--muted">
              <IonIcon icon={removeCircleOutline} />
              <span>{skippedLines === 1 ? 'Se omitirá 1 línea del ticket' : `Se omitirán ${skippedLines} líneas del ticket`}</span>
            </li>
          )}
          <li>
            <IonIcon icon={receiptOutline} />
            <span>
              Se creará 1 egreso de inventario
              <small className="xo-plan-detail">
                {summary.savedLines} {summary.savedLines === 1 ? 'línea' : 'líneas'} · {Number.isInteger(summary.units) ? summary.units : summary.units.toFixed(2)} unidades
                {draft.paymentMethod ? ` · ${draft.paymentMethod}` : ''}
                {draft.paymentDate ? ` · ${mxDate(`${draft.paymentDate}T19:00:00Z`)}` : ''}
              </small>
            </span>
            <strong className="xo-plan-total">{fmtMXN(summary.total)}</strong>
          </li>
        </ul>
      </IonCardContent>
    </IonCard>
  );
};

export default OperationSummaryCard;

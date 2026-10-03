import React from 'react';
import {
  IonButton, IonButtons, IonCard, IonCardContent, IonContent, IonFooter, IonHeader, IonIcon, IonImg,
  IonLoading, IonPage, IonSpinner, IonTitle, IonToast, IonToolbar,
} from '@ionic/react';
import { arrowBack, cameraOutline, checkmarkCircleOutline, refreshOutline, sparklesOutline, warningOutline } from 'ionicons/icons';
import EmptyState from '../../../components/ui/EmptyState';
import { fmtMXN } from '../../../utils/format';
import { useExpenseOperation } from './ExpenseOperationLogic';
import { humanizeNote } from './operationPlan';
import OperationSummaryCard from './components/OperationSummaryCard';
import SupplierSection from './components/SupplierSection';
import LinesSection from './components/LinesSection';
import TotalsSection from './components/TotalsSection';

const ExpenseOperationView: React.FC = () => {
  const vm = useExpenseOperation();
  const { draft, summary, ticket, reading, photo } = vm;
  const agentNotes = ticket ? [...ticket.issues, ...ticket.notes] : [];
  const verdictReasons = ticket?.verdict && !ticket.verdict.ready ? ticket.verdict.reasons : [];

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={vm.goBack} disabled={vm.saving} aria-label="Volver">
              <IonIcon icon={arrowBack} slot="icon-only" />
            </IonButton>
          </IonButtons>
          <IonTitle>Resumen de la operación</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="xo-content">
        <div className="xo-body">
          {!photo ? (
            <EmptyState
              className="xo-empty" icon={cameraOutline}
              text="Sube la foto de un ticket y el agente armará el desglose: proveedor, productos y totales."
            />
          ) : (
            <IonCard className="xo-card">
              <IonCardContent className="xo-ticket">
                <IonImg src={photo} className="xo-thumb" alt="Ticket" />
                <div className="xo-ticket-status">
                  {reading === 'reading' && (
                    <div className="xo-status"><IonSpinner name="dots" /><span>El agente está leyendo el ticket…</span></div>
                  )}
                  {reading === 'ready' && (
                    <div className="xo-status xo-status--ok"><IonIcon icon={sparklesOutline} /><span>{ticket?.verdict?.ready ? 'Ticket leído: todo coincide. Confirma.' : 'Ticket leído. Revisa y confirma.'}</span></div>
                  )}
                  {reading === 'failed' && (
                    <div className="xo-status xo-status--warn"><IonIcon icon={warningOutline} /><span>No se pudo leer el ticket con el agente.</span></div>
                  )}
                  {reading === 'outdated' && (
                    <div className="xo-status xo-status--warn"><IonIcon icon={warningOutline} /><span>El servicio del agente aún no está actualizado. Intenta más tarde.</span></div>
                  )}
                  {reading === 'notTicket' && (
                    <div className="xo-status xo-status--warn"><IonIcon icon={warningOutline} /><span>La imagen no parece un ticket de compra.</span></div>
                  )}
                  <div className="xo-ticket-actions">
                    <IonButton size="small" fill="outline" onClick={vm.changePhoto} disabled={vm.saving || reading === 'reading'}>
                      <IonIcon slot="start" icon={cameraOutline} />Cambiar foto
                    </IonButton>
                    {(reading === 'failed' || reading === 'notTicket' || reading === 'outdated') && (
                      <IonButton size="small" fill="clear" onClick={vm.readAgain}>
                        <IonIcon slot="start" icon={refreshOutline} />Reintentar
                      </IonButton>
                    )}
                  </div>
                </div>
              </IonCardContent>
              {(verdictReasons.length > 0 || agentNotes.length > 0) && reading === 'ready' && (
                <IonCardContent className="xo-notes">
                  {verdictReasons.map((r, i) => <p key={`v${i}`}><IonIcon icon={warningOutline} /> {r}</p>)}
                  {agentNotes.map((n, i) => <p key={i}><IonIcon icon={warningOutline} /> {humanizeNote(n)}</p>)}
                </IonCardContent>
              )}
            </IonCard>
          )}
          {!photo && (
            <IonButton expand="block" className="xo-pick" onClick={vm.changePhoto}>
              <IonIcon slot="start" icon={cameraOutline} />Subir ticket
            </IonButton>
          )}

          {draft && summary && (
            <>
              <OperationSummaryCard draft={draft} summary={summary} />
              <SupplierSection draft={draft} suppliers={vm.suppliers}
                invalid={vm.submitAttempted && draft.supplier.mode === 'none'} onChange={vm.setSupplier} />
              <LinesSection draft={draft} products={vm.products} submitAttempted={vm.submitAttempted}
                onDecision={vm.setLineDecision} onUpdate={vm.updateLine} />
              <TotalsSection draft={draft} total={vm.total} difference={vm.difference} agrees={vm.agrees}
                submitAttempted={vm.submitAttempted} onMethod={vm.setPaymentMethod} onDate={vm.setPaymentDate} />
            </>
          )}
        </div>
      </IonContent>

      {draft && (
        <IonFooter className="xo-footer">
          <div className="xo-footer-total">
            <span>Total del egreso</span>
            <strong>{fmtMXN(vm.total)}</strong>
          </div>
          {vm.missing.length > 0 ? (
            <p className="xo-footer-hint">Falta: {vm.missing.join(', ')}</p>
          ) : (
            <p className="xo-footer-hint xo-footer-hint--ok"><IonIcon icon={checkmarkCircleOutline} /> Todo listo para registrar</p>
          )}
          <IonButton expand="block" className="xo-confirm" onClick={vm.confirm} disabled={vm.saving}>
            {vm.saving ? <IonSpinner name="dots" /> : 'Confirmar y registrar'}
          </IonButton>
        </IonFooter>
      )}

      <IonLoading isOpen={vm.saving} message={vm.savingLabel} />
      <IonToast {...vm.toastProps} />
    </IonPage>
  );
};

export default ExpenseOperationView;

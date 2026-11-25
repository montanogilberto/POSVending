import React from 'react';
import { IonPage, IonContent, IonLoading, IonToast, IonList, IonItem, IonLabel, IonNote, IonButton, IonSpinner, IonAlert } from '@ionic/react';
import Header from '../../../components/layout/Header';
import { usePopovers } from '../../../hooks/usePopovers';
import { useLoanPayment } from './LoanPaymentLogic';
import { toHermosillo, fmtMXN } from '../../../utils/format';
import { helpCircleOutline } from 'ionicons/icons';
import EmptyState from '../../../components/ui/EmptyState';
import StatusBadge from '../../../components/ui/StatusBadge';
import { LOAN_PAYMENT_STATUS } from '../../../components/ui/statusMaps';

const LoanPaymentView: React.FC = () => {
  const vm = useLoanPayment();
  const pops = usePopovers();

  return (
    <IonPage>
      <Header screenTitle="Pagos de Préstamos" showBackButton={true} backButtonHref="/dashboard" {...pops.headerProps} />
      <IonContent fullscreen className="loan-payment-content">
        <IonToast {...vm.toastProps} />
        <IonLoading isOpen={vm.loading} message="Cargando..." />
        <IonLoading isOpen={vm.isResolving} message="Resolviendo escalación..." />

        {vm.items.length === 0 && !vm.loading && (
          <EmptyState icon={helpCircleOutline} text="No hay pagos de préstamos registrados." />
        )}

        <IonList className="loan-payment-list-container">
          {vm.items.map((payment) => (
            <IonItem key={payment.loanPaymentId} className="loan-payment-list-item">
              <IonLabel>
                <h2>
                  <StatusBadge status={payment.status} map={LOAN_PAYMENT_STATUS} className="loan-payment-status-chip" />
                  <IonNote className="loan-payment-type-note">{payment.paymentType}</IonNote>
                </h2>
                <p className="loan-payment-amount">{fmtMXN(payment.amountMXN)}</p>
                <p className="loan-payment-details">
                  De: Cliente {payment.payerClientId} &rarr; A: Cliente {payment.payeeClientId}
                </p>
                <p className="loan-payment-date">Declarado el: {toHermosillo(payment.declaredAt)}</p>
                <p className="loan-payment-clave">Clave de rastreo: {payment.claveRastreo}</p>
                {payment.bankFrom && <p className="loan-payment-bank">Banco origen: {payment.bankFrom}</p>}
                {payment.confirmedAt && (
                  <p className="loan-payment-confirmed">Confirmado el: {toHermosillo(payment.confirmedAt)}</p>
                )}
                {payment.rejectReason && (
                  <p className="loan-payment-reject-reason">Razón de rechazo: {payment.rejectReason}</p>
                )}
              </IonLabel>
              {payment.status === 'ESCALATED' && (
                <div slot="end" className="loan-payment-actions">
                  <IonButton
                    fill="clear"
                    color="success"
                    disabled={vm.isResolving}
                    onClick={() => vm.handleResolveEscalationPrompt(payment.loanPaymentId, 'CONFIRMED')}
                  >
                    {vm.isResolving && vm.selectedEscalatedPaymentId === payment.loanPaymentId && vm.resolutionAction === 'CONFIRMED' ? <IonSpinner name="dots" /> : 'Confirmar'}
                  </IonButton>
                  <IonButton
                    fill="clear"
                    color="danger"
                    disabled={vm.isResolving}
                    onClick={() => vm.handleResolveEscalationPrompt(payment.loanPaymentId, 'REJECTED')}
                  >
                    {vm.isResolving && vm.selectedEscalatedPaymentId === payment.loanPaymentId && vm.resolutionAction === 'REJECTED' ? <IonSpinner name="dots" /> : 'Rechazar'}
                  </IonButton>
                </div>
              )}
            </IonItem>
          ))}
        </IonList>

        <IonAlert
          isOpen={vm.showResolutionAlert}
          onDidDismiss={() => vm.setShowResolutionAlert(false)}
          header={`Resolver Escalación: ${vm.resolutionAction === 'CONFIRMED' ? 'Confirmar' : 'Rechazar'}`}
          inputs={[
            {
              name: 'resolutionNote',
              type: 'textarea',
              placeholder: 'Ingrese una nota de resolución (obligatorio)',
            },
          ]}
          buttons={[
            { text: 'Cancelar', role: 'cancel' },
            {
              text: 'Resolver',
              handler: (alertData) => {
                const note = String(alertData.resolutionNote ?? '');
                vm.handleResolveEscalation(note);
                return note.trim() !== ''; // stays open until a note is written
              },
            },
          ]}
        />

      </IonContent>
    </IonPage>
  );
};

export default LoanPaymentView;

import React, { useRef } from 'react';
import { IonPage, IonContent, IonLoading, IonToast, IonList, IonItem, IonLabel, IonChip, IonNote, IonIcon, IonButton, IonInfiniteScroll, IonInfiniteScrollContent, IonAlert, IonTextarea } from '@ionic/react';
import Header from '../../../components/layout/Header';
import { usePopovers } from '../../../hooks/usePopovers';
import { useLoanPayment } from './LoanPaymentLogic';
import { toHermosillo, fmtMXN } from '../../../utils/format';
import { helpCircleOutline, checkmarkCircleOutline, closeCircleOutline, warningOutline, informationCircleOutline } from 'ionicons/icons';
import EmptyState from '../../../components/ui/EmptyState';

const LoanPaymentView: React.FC = () => {
  const vm = useLoanPayment();
  const pops = usePopovers();

  const infiniteScrollRef = useRef<HTMLIonInfiniteScrollElement>(null);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING_CONFIRMATION': return 'warning';
      case 'CONFIRMED': return 'success';
      case 'REJECTED': return 'danger';
      case 'ESCALATED': return 'tertiary'; // Ionic's default purple color
      case 'CANCELLED': return 'medium'; // Grey
      default: return 'light';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING_CONFIRMATION': return helpCircleOutline;
      case 'CONFIRMED': return checkmarkCircleOutline;
      case 'REJECTED': return closeCircleOutline;
      case 'ESCALATED': return warningOutline;
      case 'CANCELLED': return informationCircleOutline;
      default: return helpCircleOutline;
    }
  };

  return (
    <IonPage>
      <Header screenTitle="Pagos de Préstamos" showBackButton={true} backButtonHref="/dashboard" posSupportTopic="loanPayments" {...pops.headerProps} />
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
                  <IonChip className={`loan-payment-status-chip ion-color-${getStatusColor(payment.status)}`}>
                    <IonIcon icon={getStatusIcon(payment.status)} />
                    <IonLabel>{payment.status.replace(/_/g, ' ')}</IonLabel>
                  </IonChip>
                  <IonNote className="loan-payment-type-note">{payment.paymentType}</IonNote>
                </h2>
                <p className="loan-payment-amount">{fmtMXN(payment.amountMXN)}</p>
                <p className="loan-payment-details">
                  De: Cliente {payment.payerClientId} &rarr; A: Cliente {payment.payeeClientId}
                </p>
                <p className="loan-payment-date">Declarado el: {toHermosillo(payment.declaredAt).toFormat('dd LLL yyyy, HH:mm')}</p>
                <p className="loan-payment-clave">Clave de rastreo: {payment.claveRastreo}</p>
                {payment.bankFrom && <p className="loan-payment-bank">Banco origen: {payment.bankFrom}</p>}
                {payment.confirmedAt && (
                  <p className="loan-payment-confirmed">Confirmado el: {toHermosillo(payment.confirmedAt).toFormat('dd LLL yyyy, HH:mm')}</p>
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
                    Confirmar
                  </IonButton>
                  <IonButton
                    fill="clear"
                    color="danger"
                    disabled={vm.isResolving}
                    onClick={() => vm.handleResolveEscalationPrompt(payment.loanPaymentId, 'REJECTED')}
                  >
                    Rechazar
                  </IonButton>
                </div>
              )}
            </IonItem>
          ))}
        </IonList>

        <IonInfiniteScroll
          onIonInfinite={(ev: CustomEvent<void>) => {
            vm.loadMoreItems();
            (ev.target as HTMLIonInfiniteScrollElement).complete();
          }}
          threshold="100px"
          disabled={!vm.hasMoreItems || vm.loading}
          ref={infiniteScrollRef}
        >
          <IonInfiniteScrollContent loadingText="Cargando más pagos..."></IonInfiniteScrollContent>
        </IonInfiniteScroll>

        <IonAlert
          isOpen={vm.showResolutionAlert}
          onDidDismiss={() => vm.setShowResolutionAlert(false)}
          header={`Resolver Escalación: ${vm.resolutionAction === 'CONFIRMED' ? 'Confirmar' : 'Rechazar'}`}
          inputs={[
            {
              name: 'resolutionNote',
              type: 'textarea',
              placeholder: 'Ingrese una nota de resolución (obligatorio)',
              value: vm.resolutionNote,
              attributes: { minlength: 1 }
            },
          ]}
          buttons={[
            { text: 'Cancelar', role: 'cancel' },
            {
              text: vm.isResolving ? 'Resolviendo...' : 'Resolver',
              handler: (alertData) => {
                vm.setResolutionNote(alertData.resolutionNote);
                vm.handleResolveEscalation(alertData.resolutionNote);
                return false; // Prevent alert from closing immediately
              },
              cssClass: vm.isResolving || vm.resolutionNote.trim() === '' ? 'disabled-button' : ''
            },
          ]}
        />

      </IonContent>
    </IonPage>
  );
};

export default LoanPaymentView;

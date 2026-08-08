import React from 'react';
import {
  IonButton, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonIcon,
} from '@ionic/react';
import {
  addCircleOutline, cardOutline, checkmarkCircle, documentTextOutline,
  ellipseOutline, refreshOutline,
} from 'ionicons/icons';
import NativeConnectOnboarding from '../../../../components/payments/NativeConnectOnboarding';
import { mxDate } from '../../../../utils/format';
import { LenderDashboardVM } from '../LenderDashboardLogic';

/**
 * Cuenta de pago — funds loan disbursements and receives repayments.
 * id="ld-pagos" is the scroll target for the bottom-nav "Pagos" tab (?section=pagos).
 */
const PaymentsCard: React.FC<{ vm: LenderDashboardVM }> = ({ vm }) => (
  <IonCard className="ld-card" id="ld-pagos">
    <IonCardHeader>
      <div className="ldx-card-title-row">
        <IonCardTitle>Cuenta de pago</IonCardTitle>
        <IonButton fill="clear" size="small" onClick={vm.fetchStripeStatus}>
          <IonIcon icon={refreshOutline} slot="icon-only" />
        </IonButton>
      </div>
    </IonCardHeader>
    <IonCardContent>
      {vm.stripeError && (
        <p className="ldx-payments-error">{vm.stripeError}</p>
      )}

      {vm.showStripeOnboarding ? (
        <NativeConnectOnboarding
          clientId={vm.lenderClientId}
          companyId={Number(vm.companyId)}
          email={vm.lenderEmail}
          // Identity already accepted by Stripe → skip step 1 on reload.
          startAtPayout={!!vm.stripeAccount?.identitySubmitted && !vm.stripeAccount?.hasExternalAccount}
          onProgress={(done) => { vm.fetchStripeStatus(); if (done) vm.setShowStripeOnboarding(false); }}
          // Persist the lender's edited identity so their corrections
          // survive and re-seed the form next time (not the raw OCR).
          onIdentitySaved={vm.handleIdentitySaved}
          // Seeded from the lender's captured INE + their real account
          // email/phone (see kycPrefill).
          prefill={vm.kycPrefill}
        />
      ) : !vm.stripeAccount ? (
        <div className="ldx-payments-empty">
          <IonIcon icon={cardOutline} />
          <p className="ldx-payments-empty-title">Sin cuenta bancaria registrada.</p>
          <p className="ldx-payments-empty-sub">
            Registra tu cuenta o tarjeta para fondear préstamos y recibir los pagos de tus prestatarios.
          </p>
          <IonButton shape="round" expand="block" disabled={vm.stripeLoading} onClick={vm.handleStripeKyc}>
            <IonIcon icon={addCircleOutline} slot="start" />
            {vm.stripeLoading ? 'Procesando...' : 'Registrar cuenta'}
          </IonButton>
        </div>
      ) : (
        <div>
          {/* Checklist con conector vertical — cada fila refleja el dato real
              (antes "Cuenta verificada" estaba fijo en true, y mostraba el
              connectedAccountId crudo de Stripe, ilegible para el prestamista). */}
          <div className="ldx-checklist">
            {[
              { ok: !!vm.stripeAccount.identitySubmitted, label: 'Identidad verificada' },
              { ok: !!vm.stripeAccount.hasExternalAccount, label: 'Cuenta bancaria vinculada',
                sub: vm.stripeAccount.externalAccountLast4
                  ? `${vm.stripeAccount.externalAccountBankName ?? 'Banco'} · ····${vm.stripeAccount.externalAccountLast4}`
                  : 'Pendiente' },
              { ok: !!vm.stripeAccount.tosAccepted, label: 'Términos y condiciones',
                sub: vm.stripeAccount.tosAcceptedAt
                  ? `Aceptados el ${mxDate(vm.stripeAccount.tosAcceptedAt)}`
                  : 'Pendiente' },
              { ok: !!vm.stripeAccount.payoutsEnabled, label: 'Retiros habilitados',
                sub: vm.stripeAccount.payoutsEnabled
                  ? 'Puedes recibir pagos de tus prestatarios'
                  : 'Completa los pasos anteriores para habilitarlos' },
            ].map((row, i, arr) => (
              <div key={row.label} className="ldx-check-row">
                <div className="ldx-check-rail">
                  <IonIcon icon={row.ok ? checkmarkCircle : ellipseOutline}
                    className={row.ok ? 'ldx-check-ok' : 'ldx-check-off'} />
                  {i < arr.length - 1 && <span className="ldx-check-line" />}
                </div>
                <div className="ldx-check-text">
                  <strong>{row.label}</strong>
                  {row.sub && <p>{row.sub}</p>}
                </div>
              </div>
            ))}
          </div>
          {!vm.stripeAccount.hasExternalAccount && (
            <IonButton shape="round" expand="block" disabled={vm.stripeLoading} onClick={vm.handleStripeKyc} className="ldx-payments-complete-btn">
              <IonIcon icon={documentTextOutline} slot="start" />
              {vm.stripeLoading ? 'Procesando...' : 'Completar verificación'}
            </IonButton>
          )}
        </div>
      )}
    </IonCardContent>
  </IonCard>
);

export default PaymentsCard;

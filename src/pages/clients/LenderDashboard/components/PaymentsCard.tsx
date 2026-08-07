import React from 'react';
import {
  IonBadge, IonButton, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonIcon,
} from '@ionic/react';
import {
  addCircleOutline, cardOutline, checkmarkCircle, documentTextOutline,
  ellipseOutline, refreshOutline,
} from 'ionicons/icons';
import NativeConnectOnboarding from '../../../../components/payments/NativeConnectOnboarding';
import { LenderDashboardVM } from '../LenderDashboardLogic';

/**
 * Cuenta de pago — funds loan disbursements and receives repayments.
 * id="ld-pagos" is the scroll target for the bottom-nav "Pagos" tab (?section=pagos).
 */
const PaymentsCard: React.FC<{ vm: LenderDashboardVM }> = ({ vm }) => (
  <IonCard className="ld-card" id="ld-pagos">
    <IonCardHeader>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <IonCardTitle>Cuenta de pago</IonCardTitle>
        <IonButton fill="clear" size="small" onClick={vm.fetchStripeStatus}>
          <IonIcon icon={refreshOutline} slot="icon-only" />
        </IonButton>
      </div>
    </IonCardHeader>
    <IonCardContent>
      {vm.stripeError && (
        <p style={{ color: '#dc2626', fontSize: 13, marginBottom: 10 }}>{vm.stripeError}</p>
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
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          <IonIcon icon={cardOutline} style={{ fontSize: 40, color: '#9ca3af' }} />
          <p style={{ margin: '8px 0 4px', color: '#374151' }}>Sin cuenta bancaria registrada.</p>
          <p style={{ margin: '0 0 14px', fontSize: 13, color: '#6b7280' }}>
            Registra tu cuenta o tarjeta para fondear préstamos y recibir los pagos de tus prestatarios.
          </p>
          <IonButton shape="round" expand="block" disabled={vm.stripeLoading} onClick={vm.handleStripeKyc}>
            <IonIcon icon={addCircleOutline} slot="start" />
            {vm.stripeLoading ? 'Procesando...' : 'Registrar cuenta'}
          </IonButton>
        </div>
      ) : (
        <div>
          {/* Checklist con conector vertical (mockup) */}
          <div className="ldx-checklist">
            {[
              { ok: true, label: 'Cuenta verificada', sub: vm.stripeAccount.connectedAccountId },
              { ok: !!vm.stripeAccount.hasExternalAccount, label: 'Cuenta bancaria vinculada',
                sub: vm.stripeAccount.externalAccountLast4
                  ? `${vm.stripeAccount.externalAccountBankName ?? 'Banco'} · ····${vm.stripeAccount.externalAccountLast4}`
                  : 'Pendiente' },
              { ok: !!vm.stripeAccount.chargesEnabled, label: 'Cobros habilitados' },
              { ok: !!vm.stripeAccount.payoutsEnabled, label: 'Retiros habilitados' },
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
          <div className="ldx-chips">
            <IonBadge color={vm.stripeAccount.hasExternalAccount ? 'success' : 'medium'}>Cuenta bancaria {vm.stripeAccount.hasExternalAccount ? '✓' : '✗'}</IonBadge>
            <IonBadge color={vm.stripeAccount.chargesEnabled ? 'success' : 'medium'}>Cobros {vm.stripeAccount.chargesEnabled ? '✓' : '✗'}</IonBadge>
            <IonBadge color={vm.stripeAccount.payoutsEnabled ? 'success' : 'medium'}>Retiros {vm.stripeAccount.payoutsEnabled ? '✓' : '✗'}</IonBadge>
          </div>
          {!vm.stripeAccount.hasExternalAccount && (
            <IonButton shape="round" expand="block" disabled={vm.stripeLoading} onClick={vm.handleStripeKyc} style={{ marginTop: 10 }}>
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

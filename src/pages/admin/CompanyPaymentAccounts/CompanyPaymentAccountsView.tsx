import React from 'react';
import {
  IonButton, IonCard, IonCardContent, IonContent, IonInput, IonPage, IonSelect, IonSelectOption, IonSpinner,
  IonText, IonToast,
} from '@ionic/react';
import { cardOutline } from 'ionicons/icons';
import Header from '../../../components/layout/Header';
import EmptyState from '../../../components/ui/EmptyState';
import StatusBadge from '../../../components/ui/StatusBadge';
import { COMPANY_PAYMENT_ACCOUNT_STATUS } from '../../../components/ui/statusMaps';
import { usePopovers } from '../../../hooks/usePopovers';
import { useCompanyPaymentAccounts } from './CompanyPaymentAccountsLogic';

const CompanyPaymentAccountsView: React.FC = () => {
  const vm = useCompanyPaymentAccounts();
  const pops = usePopovers();
  const { current } = vm;
  const pending = current?.accountStatus === 'PENDING_VERIFICATION';

  return (
    <IonPage>
      <Header {...pops.headerProps} screenTitle="Cuentas de cobro" showBackButton backButtonHref="/dashboard" />
      <IonContent className="ion-padding">
        {vm.loading ? (
          <div className="cpa-loading"><IonSpinner name="crescent" /><span>Cargando cuentas…</span></div>
        ) : vm.loadError ? (
          <EmptyState icon={cardOutline} text="No se pudieron cargar las cuentas."
            action={<IonButton fill="outline" onClick={vm.load}>Reintentar</IonButton>} />
        ) : (
          <>
          <IonCard className="cpa-card">
            <IonCardContent>
              <h2 className="cpa-title">Recargas por transferencia</h2>
              <p className="cpa-text">Esta es la cuenta que ven los clientes para transferir.</p>
              {vm.spei && (
                <div className="cpa-row">
                  <strong>{vm.spei.holderName}</strong>
                  <StatusBadge status={vm.spei.accountStatus} map={COMPANY_PAYMENT_ACCOUNT_STATUS} />
                  <span>{vm.spei.clabe} {vm.spei.bankName ? `· ${vm.spei.bankName}` : ''}</span>
                </div>
              )}
              {vm.spei?.accountStatus === 'PENDING_VERIFICATION' && vm.spei.createdByUserId !== vm.userId && (
                <IonButton color="success" onClick={() => vm.confirm(vm.spei!)} disabled={vm.confirmingId !== null}>
                  {vm.confirmingId ? <IonSpinner name="dots" /> : 'Confirmar CLABE'}
                </IonButton>
              )}
              {vm.spei?.accountStatus === 'PENDING_VERIFICATION' && vm.spei.createdByUserId === vm.userId && (
                <p className="cpa-text">Falta que otro administrador confirme esta CLABE.</p>
              )}
              <div className="cpa-form">
                <IonInput label="Titular" labelPlacement="stacked" fill="outline" value={vm.holderName}
                  onIonInput={(e) => vm.setHolderName(e.detail.value ?? '')} />
                <IonInput label="CLABE" labelPlacement="stacked" fill="outline" inputmode="numeric" maxlength={18}
                  value={vm.clabe} onIonInput={(e) => vm.setClabe(e.detail.value ?? '')} />
                <IonSelect label="Terminal" labelPlacement="stacked" fill="outline" value={vm.terminalId}
                  onIonChange={(e) => vm.setTerminalId(e.detail.value)}>
                  {vm.terminals.map((t) => (
                    <IonSelectOption key={t.commissionTerminalId} value={t.commissionTerminalId}>
                      {t.terminalName}
                    </IonSelectOption>
                  ))}
                </IonSelect>
                <IonButton onClick={vm.saveClabe}
                  disabled={vm.savingClabe || !vm.terminalId || !vm.holderName.trim() || vm.clabe.trim().length !== 18}>
                  {vm.savingClabe ? <IonSpinner name="dots" /> : vm.spei ? 'Cambiar CLABE' : 'Guardar CLABE'}
                </IonButton>
              </div>
            </IonCardContent>
          </IonCard>
          <IonCard className="cpa-card">
            <IonCardContent>
              <h2 className="cpa-title">Recargas con tarjeta</h2>
              <p className="cpa-text">
                {vm.onPlatform
                  ? 'El dinero de las recargas llega a la cuenta Stripe de GMO.'
                  : `El dinero de las recargas llega directo a la cuenta Stripe de ${vm.companyName || 'la compañía'}.`}
              </p>
              {current ? (
                <div className="cpa-row">
                  <strong>{current.holderName}</strong>
                  <StatusBadge status={current.accountStatus} map={COMPANY_PAYMENT_ACCOUNT_STATUS} />
                  <IonText color={current.chargesEnabled ? 'success' : 'warning'}>
                    {current.chargesEnabled ? 'Cobros habilitados' : 'Registro en Stripe pendiente'}
                  </IonText>
                </div>
              ) : (
                <p className="cpa-text">Todavía no hay una cuenta conectada.</p>
              )}
              <div className="cpa-actions">
                {vm.platformAllowed && !vm.onPlatform && (!current || !current.chargesEnabled) && (
                  <IonButton onClick={vm.choosePlatform} disabled={vm.requestingPlatform}>
                    {vm.requestingPlatform ? <IonSpinner name="dots" /> : 'Usar la cuenta Stripe de GMO'}
                  </IonButton>
                )}
                {vm.canConnect && !vm.onPlatform && (!current || !current.chargesEnabled) && (
                  <IonButton onClick={() => vm.connectStripe()} disabled={vm.connecting}>
                    {vm.connecting ? <IonSpinner name="dots" /> : current ? 'Continuar registro' : 'Conectar Stripe propia'}
                  </IonButton>
                )}
                {vm.canConnect && !vm.onPlatform && current?.accountStatus === 'ACTIVE' && current.chargesEnabled && (
                  <IonButton fill="outline" onClick={() => vm.connectStripe(true)} disabled={vm.connecting}>
                    {vm.connecting ? <IonSpinner name="dots" /> : 'Reemplazar cuenta'}
                  </IonButton>
                )}
                {pending && current?.chargesEnabled && current.createdByUserId !== vm.userId && (
                  <IonButton color="success" onClick={() => vm.confirm(current)} disabled={vm.confirmingId !== null}>
                    {vm.confirmingId ? <IonSpinner name="dots" /> : 'Confirmar cuenta'}
                  </IonButton>
                )}
              </div>
              {!vm.canConnect && !vm.platformAllowed && (!current || !current.chargesEnabled) && (
                <p className="cpa-text">Conecta Stripe desde el POS web; no se puede desde la app.</p>
              )}
              {pending && current?.chargesEnabled && current.createdByUserId === vm.userId && (
                <p className="cpa-text">Falta que otro administrador confirme esta cuenta.</p>
              )}
            </IonCardContent>
          </IonCard>
          </>
        )}
        <IonToast {...vm.toastProps} />
      </IonContent>
    </IonPage>
  );
};

export default CompanyPaymentAccountsView;

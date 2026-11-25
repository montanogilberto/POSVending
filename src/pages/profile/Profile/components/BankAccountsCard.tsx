import React from 'react';
import { IonBadge, IonButton, IonCard, IonCardContent, IonIcon, IonSpinner } from '@ionic/react';
import { cardOutline, chevronForwardOutline, walletOutline } from 'ionicons/icons';
import { ProfileVM } from '../ProfileLogic';
import { isPrimaryBankAccount } from '../../../../api/bankingApi';
import { p2pLendingRoute } from '../../../../utils/routes';

/**
 * Cuentas de pago (RFC-016 Fase 2) — la CLABE para SPEI directo es el único
 * riel; la tarjeta guardada se muestra sólo si existe (comisión, D10).
 * "Administrar" reenvía a /p2p-lending, que ya trae el modal de CLABE — no se
 * duplica esa UI aquí.
 */
const BankAccountsCard: React.FC<{ vm: ProfileVM }> = ({ vm }) => {
  // Misma regla que P2PLendingPage: sólo la Principal cuenta como cuenta
  // activa. Sin PRIMARY se cae a la más reciente pero se marca "Pendiente" —
  // una cuenta ARCHIVED llega con isVerified=1 y no debe presentarse como
  // verificada (D18).
  const primaryClabe = vm.bankAccounts.find(isPrimaryBankAccount);
  const defaultClabe = primaryClabe ?? vm.bankAccounts[0];
  const clabeIsActive = !!primaryClabe;

  return (
    <IonCard className="profile-card">
      <IonCardContent>
        <div className="profile-section-header">
          <span className="profile-section-icon profile-icon-orange">
            <IonIcon icon={walletOutline} />
          </span>
          <div className="profile-section-heading">
            <h3>Cuentas de pago</h3>
            <p>Tu CLABE para recibir y hacer pagos por SPEI</p>
          </div>
        </div>

        {vm.loadingPayments ? (
          <div className="profile-loading-row"><IonSpinner name="crescent" /></div>
        ) : (
          <>
            <div className="profile-info-row">
              <span className="profile-row-icon profile-icon-blue-soft"><IonIcon icon={walletOutline} /></span>
              <div className="profile-row-text">
                <span>Cuenta CLABE (SPEI)</span>
                <strong>
                  {defaultClabe
                    ? `${defaultClabe.bankName ?? 'Banco'} · ····${defaultClabe.clabeLast4}`
                    : 'Sin CLABE vinculada'}
                </strong>
              </div>
              {defaultClabe && (
                <IonBadge color={clabeIsActive ? 'success' : 'medium'}>
                  {clabeIsActive ? 'Verificada' : 'Pendiente'}
                </IonBadge>
              )}
            </div>

            {vm.savedCard && (
              <div className="profile-info-row">
                <span className="profile-row-icon profile-icon-green-soft"><IonIcon icon={cardOutline} /></span>
                <div className="profile-row-text">
                  <span>Tarjeta guardada</span>
                  <strong>{`${(vm.savedCard.brand ?? '').toUpperCase()} · ····${vm.savedCard.last4}`}</strong>
                </div>
              </div>
            )}

            <IonButton fill="outline" expand="block" className="profile-link-btn"
              onClick={() => vm.history.push(p2pLendingRoute(vm.clientId))}>
              Administrar CLABE
              <IonIcon icon={chevronForwardOutline} slot="end" />
            </IonButton>
          </>
        )}
      </IonCardContent>
    </IonCard>
  );
};

export default BankAccountsCard;

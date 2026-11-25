import React from 'react';
import { IonCard, IonCardContent, IonCardHeader, IonCardTitle } from '@ionic/react';
import BankAccountLink from '../../../../components/payments/BankAccountLink';
import { LenderDashboardVM } from '../LenderDashboardLogic';

/**
 * Cuenta para SPEI (RFC-016 Fase 2) — la CLABE propia del prestamista, donde
 * sus prestatarios le pagan cada cuota por SPEI directo. Ya no hay cuenta
 * conectada de Stripe ni botón de verificación: GMO Prestamos no mueve el
 * dinero, sólo guarda la CLABE y la revela a la contraparte (auditado).
 * id="ld-pagos" is the scroll target for the bottom-nav "Pagos" tab (?section=pagos).
 */
const PaymentsCard: React.FC<{ vm: LenderDashboardVM }> = ({ vm }) => {
  const holderName = vm.lenderClient
    ? `${vm.lenderClient.first_name ?? ''} ${vm.lenderClient.last_name ?? ''}`.trim()
    : '';
  return (
    <IonCard className="ld-card" id="ld-pagos">
      <IonCardHeader>
        <IonCardTitle>Cuenta para SPEI</IonCardTitle>
      </IonCardHeader>
      <IonCardContent>
        <p className="ldx-payments-empty-sub">
          Tu CLABE se guarda en GMO Prestamos y sólo se muestra a tus prestatarios
          para que te paguen cada cuota por SPEI.
        </p>
        {vm.lenderClientId && vm.companyId ? (
          <BankAccountLink
            clientId={vm.lenderClientId}
            companyId={Number(vm.companyId)}
            holderName={holderName}
          />
        ) : null}
      </IonCardContent>
    </IonCard>
  );
};

export default PaymentsCard;

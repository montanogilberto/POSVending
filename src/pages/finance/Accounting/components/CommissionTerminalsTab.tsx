import React from 'react';
import {
  IonList, IonItem, IonLabel, IonButton, IonIcon, IonBadge, IonNote,
} from '@ionic/react';
import { addOutline, banOutline, createOutline } from 'ionicons/icons';
import { CompanyPaymentAccount } from '../../../../api/companyPaymentAccountsApi';
import StatusBadge from '../../../../components/ui/StatusBadge';
import { COMPANY_PAYMENT_ACCOUNT_STATUS } from '../../../../components/ui/statusMaps';
import { AccountingVM } from '../AccountingLogic';
import CommissionTerminalFormModal from './CommissionTerminalFormModal';

interface Props {
  vm: AccountingVM;
}

const TerminalAccountLine: React.FC<{ account: CompanyPaymentAccount | null }> = ({ account }) => (
  <p>
    {account
      ? <>{account.holderName} · CLABE {account.clabe}{account.bankName ? ` · ${account.bankName}` : ''}{' '}
          <StatusBadge status={account.accountStatus} map={COMPANY_PAYMENT_ACCOUNT_STATUS} /></>
      : 'Sin cuenta para transferencias'}
  </p>
);

const CommissionTerminalsTab: React.FC<Props> = ({ vm }) => {
  return (
    <>
      <div className="accounting-toolbar">
        <h2>Terminales de Cobro</h2>
        <IonButton size="small" onClick={() => vm.setShowTerminalForm(true)}>
          <IonIcon icon={addOutline} slot="start" />
          Nueva terminal
        </IonButton>
      </div>

      <IonList inset>
        {vm.terminals.map((terminal) => (
          <IonItem key={terminal.commissionTerminalId} button onClick={() => vm.setEditingTerminal(terminal)}>
            <IonLabel>
              <h3>
                {terminal.terminalName}
                {!terminal.isActive && <IonBadge color="medium" className="accounting-inline-badge">Inactiva</IonBadge>}
              </h3>
              <p>
                <IonNote className="accounting-code">{terminal.provider}</IonNote>
                {' '}Comisión {terminal.commissionRatePct}%
                {terminal.fixedFeeAmount ? ` + $${terminal.fixedFeeAmount}` : ''}
                {terminal.paymentMethod ? ` · ${terminal.paymentMethod}` : ''}
              </p>
              <TerminalAccountLine account={vm.terminalAccount(terminal.commissionTerminalId)} />
            </IonLabel>
            <IonIcon icon={createOutline} slot="end" color="medium" />
            {terminal.isActive && (
              <IonButton
                fill="clear"
                color="danger"
                slot="end"
                onClick={(e) => { e.stopPropagation(); vm.handleDeactivateTerminal(terminal.commissionTerminalId); }}
                title="Desactivar terminal"
              >
                <IonIcon icon={banOutline} />
              </IonButton>
            )}
          </IonItem>
        ))}
        {vm.terminals.length === 0 && !vm.loading && (
          <IonItem><IonLabel color="medium">Sin terminales registradas todavía.</IonLabel></IonItem>
        )}
      </IonList>

      <CommissionTerminalFormModal
        isOpen={vm.showTerminalForm || !!vm.editingTerminal}
        terminal={vm.editingTerminal}
        account={vm.terminalAccount(vm.editingTerminal?.commissionTerminalId)}
        onSaveAccount={vm.handleSaveTerminalAccount}
        onClose={() => { vm.setShowTerminalForm(false); vm.setEditingTerminal(null); }}
        onCreate={vm.handleCreateTerminal}
        onUpdate={vm.handleUpdateTerminal}
      />
    </>
  );
};

export default CommissionTerminalsTab;

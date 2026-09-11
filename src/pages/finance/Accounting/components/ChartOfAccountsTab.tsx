import React from 'react';
import {
  IonList, IonItem, IonLabel, IonButton, IonIcon, IonBadge, IonNote,
} from '@ionic/react';
import { addOutline, banOutline, createOutline } from 'ionicons/icons';
import StatusBadge from '../../../../components/ui/StatusBadge';
import { ACCOUNT_TYPE } from '../../../../components/ui/statusMaps';
import { AccountingVM } from '../AccountingLogic';
import AccountFormModal from './AccountFormModal';

interface Props {
  vm: AccountingVM;
}

const ChartOfAccountsTab: React.FC<Props> = ({ vm }) => {
  return (
    <>
      <div className="accounting-toolbar">
        <h2>Catálogo de Cuentas</h2>
        <IonButton size="small" onClick={() => vm.setShowAccountForm(true)}>
          <IonIcon icon={addOutline} slot="start" />
          Nueva cuenta
        </IonButton>
      </div>

      <IonList inset>
        {vm.accounts.map((account) => (
          <IonItem key={account.accountId} button onClick={() => vm.setEditingAccount(account)}>
            <IonLabel>
              <h3>
                <IonNote className="accounting-code">{account.code}</IonNote> {account.name}
                {!account.isActive && <IonBadge color="medium" className="accounting-inline-badge">Inactiva</IonBadge>}
              </h3>
              <p>
                <StatusBadge status={account.accountType} map={ACCOUNT_TYPE} />
                {' '}Naturaleza {account.normalBalance === 'D' ? 'Deudora' : 'Acreedora'}
                {!account.isPostable && ' · Cuenta sumaria (no admite movimientos)'}
              </p>
            </IonLabel>
            <IonIcon icon={createOutline} slot="end" color="medium" />
            {account.isActive && (
              <IonButton
                fill="clear"
                color="danger"
                slot="end"
                onClick={(e) => { e.stopPropagation(); vm.handleDeactivateAccount(account.accountId); }}
                title="Desactivar cuenta"
              >
                <IonIcon icon={banOutline} />
              </IonButton>
            )}
          </IonItem>
        ))}
        {vm.accounts.length === 0 && !vm.loading && (
          <IonItem><IonLabel color="medium">Sin cuentas registradas todavía.</IonLabel></IonItem>
        )}
      </IonList>

      <AccountFormModal
        isOpen={vm.showAccountForm || !!vm.editingAccount}
        account={vm.editingAccount}
        onClose={() => { vm.setShowAccountForm(false); vm.setEditingAccount(null); }}
        onCreate={vm.handleCreateAccount}
        onUpdate={vm.handleUpdateAccount}
      />
    </>
  );
};

export default ChartOfAccountsTab;

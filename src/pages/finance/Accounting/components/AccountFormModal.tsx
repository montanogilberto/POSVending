import React, { useEffect, useState } from 'react';
import {
  IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent,
  IonList, IonItem, IonLabel, IonInput, IonSelect, IonSelectOption, IonCheckbox, IonSpinner,
} from '@ionic/react';
import { AccountType, ChartOfAccount, CreateAccountRequest, UpdateAccountRequest } from '../../../../api/chartOfAccountsApi';

interface Props {
  isOpen: boolean;
  account: ChartOfAccount | null;
  onClose: () => void;
  onCreate: (data: Omit<CreateAccountRequest, 'companyId'>) => Promise<void>;
  onUpdate: (data: Omit<UpdateAccountRequest, 'companyId'>) => Promise<void>;
}

const ACCOUNT_TYPES: AccountType[] = ['ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE'];

const AccountFormModal: React.FC<Props> = ({ isOpen, account, onClose, onCreate, onUpdate }) => {
  const isEditing = !!account;
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('EXPENSE');
  const [isPostable, setIsPostable] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (account) {
      setCode(account.code);
      setName(account.name);
      setAccountType(account.accountType);
      setIsPostable(account.isPostable);
      setIsActive(account.isActive);
    } else {
      setCode('');
      setName('');
      setAccountType('EXPENSE');
      setIsPostable(true);
      setIsActive(true);
    }
  }, [account, isOpen]);

  const handleSave = async () => {
    if (!name.trim() || (!isEditing && !code.trim())) return;
    setSaving(true);
    try {
      if (isEditing && account) {
        await onUpdate({ accountId: account.accountId, name, isPostable, isActive });
      } else {
        await onCreate({ code: code.trim(), name: name.trim(), accountType, isPostable });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{isEditing ? 'Editar cuenta' : 'Nueva cuenta'}</IonTitle>
          <IonButtons slot="end"><IonButton onClick={onClose}>Cerrar</IonButton></IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <IonList>
          <IonItem>
            <IonLabel position="stacked">Código</IonLabel>
            <IonInput value={code} onIonInput={(e) => setCode(e.detail.value ?? '')} disabled={isEditing} placeholder="1105" />
          </IonItem>
          <IonItem>
            <IonLabel position="stacked">Nombre</IonLabel>
            <IonInput value={name} onIonInput={(e) => setName(e.detail.value ?? '')} placeholder="Bancos" />
          </IonItem>
          <IonItem>
            <IonLabel>Tipo de cuenta</IonLabel>
            <IonSelect
              value={accountType}
              disabled={isEditing}
              onIonChange={(e) => setAccountType(e.detail.value)}
            >
              {ACCOUNT_TYPES.map((t) => <IonSelectOption key={t} value={t}>{t}</IonSelectOption>)}
            </IonSelect>
          </IonItem>
          <IonItem>
            <IonCheckbox checked={isPostable} onIonChange={(e) => setIsPostable(e.detail.checked)} labelPlacement="end">
              Admite movimientos (cuenta detalle, no sumaria)
            </IonCheckbox>
          </IonItem>
          {isEditing && (
            <IonItem>
              <IonCheckbox checked={isActive} onIonChange={(e) => setIsActive(e.detail.checked)} labelPlacement="end">
                Activa
              </IonCheckbox>
            </IonItem>
          )}
        </IonList>
        <IonButton expand="block" className="ion-margin-top" onClick={handleSave} disabled={saving}>
          {saving ? <IonSpinner name="dots" /> : (isEditing ? 'Guardar cambios' : 'Crear cuenta')}
        </IonButton>
      </IonContent>
    </IonModal>
  );
};

export default AccountFormModal;

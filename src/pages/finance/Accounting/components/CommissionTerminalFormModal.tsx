import React, { useEffect, useState } from 'react';
import {
  IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent,
  IonList, IonItem, IonLabel, IonInput, IonSelect, IonSelectOption, IonCheckbox, IonSpinner,
} from '@ionic/react';
import {
  CommissionTerminal, CreateCommissionTerminalRequest, UpdateCommissionTerminalRequest,
} from '../../../../api/commissionTerminalsApi';
import { CompanyPaymentAccount } from '../../../../api/companyPaymentAccountsApi';

interface Props {
  isOpen: boolean;
  terminal: CommissionTerminal | null;
  account: CompanyPaymentAccount | null;
  onSaveAccount: (terminalId: number, holderName: string, clabe: string) => Promise<boolean>;
  onClose: () => void;
  onCreate: (data: CreateCommissionTerminalRequest) => Promise<void>;
  onUpdate: (data: UpdateCommissionTerminalRequest) => Promise<void>;
}

const PAYMENT_METHODS = ['tarjeta', 'efectivo', 'transferencia'];

const CommissionTerminalFormModal: React.FC<Props> = ({
  isOpen, terminal, account, onSaveAccount, onClose, onCreate, onUpdate,
}) => {
  const isEditing = !!terminal;
  const [provider, setProvider] = useState('');
  const [terminalName, setTerminalName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<string>('tarjeta');
  const [commissionRatePct, setCommissionRatePct] = useState('');
  const [fixedFeeAmount, setFixedFeeAmount] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [holderName, setHolderName] = useState('');
  const [clabe, setClabe] = useState('');
  const [savingAccount, setSavingAccount] = useState(false);

  useEffect(() => {
    setHolderName(account?.holderName ?? '');
    setClabe(account?.clabe ?? '');
  }, [account, isOpen]);

  const handleSaveAccount = async () => {
    if (!terminal || savingAccount) return;
    setSavingAccount(true);
    try {
      await onSaveAccount(terminal.commissionTerminalId, holderName.trim(), clabe.trim());
    } finally {
      setSavingAccount(false);
    }
  };

  useEffect(() => {
    if (terminal) {
      setProvider(terminal.provider);
      setTerminalName(terminal.terminalName);
      setPaymentMethod(terminal.paymentMethod ?? 'tarjeta');
      setCommissionRatePct(String(terminal.commissionRatePct));
      setFixedFeeAmount(terminal.fixedFeeAmount != null ? String(terminal.fixedFeeAmount) : '');
      setIsActive(terminal.isActive);
    } else {
      setProvider('');
      setTerminalName('');
      setPaymentMethod('tarjeta');
      setCommissionRatePct('');
      setFixedFeeAmount('');
      setIsActive(true);
    }
  }, [terminal, isOpen]);

  const handleSave = async () => {
    const rate = parseFloat(commissionRatePct);
    if (!provider.trim() || !terminalName.trim() || Number.isNaN(rate)) return;
    setSaving(true);
    try {
      const fee = fixedFeeAmount.trim() === '' ? undefined : parseFloat(fixedFeeAmount);
      if (isEditing && terminal) {
        await onUpdate({
          commissionTerminalId: terminal.commissionTerminalId,
          provider: provider.trim(),
          terminalName: terminalName.trim(),
          paymentMethod,
          commissionRatePct: rate,
          fixedFeeAmount: fee,
          isActive,
        });
      } else {
        await onCreate({
          provider: provider.trim(),
          terminalName: terminalName.trim(),
          paymentMethod,
          commissionRatePct: rate,
          fixedFeeAmount: fee,
        });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{isEditing ? 'Editar terminal' : 'Nueva terminal'}</IonTitle>
          <IonButtons slot="end"><IonButton onClick={onClose}>Cerrar</IonButton></IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <IonList>
          <IonItem>
            <IonLabel position="stacked">Proveedor</IonLabel>
            <IonInput value={provider} onIonInput={(e) => setProvider(e.detail.value ?? '')} placeholder="mercadopago" />
          </IonItem>
          <IonItem>
            <IonLabel position="stacked">Nombre de la terminal</IonLabel>
            <IonInput value={terminalName} onIonInput={(e) => setTerminalName(e.detail.value ?? '')} placeholder="Terminal Mercado Pago" />
          </IonItem>
          <IonItem>
            <IonLabel>Método de pago</IonLabel>
            <IonSelect value={paymentMethod} onIonChange={(e) => setPaymentMethod(e.detail.value)}>
              {PAYMENT_METHODS.map((m) => <IonSelectOption key={m} value={m}>{m}</IonSelectOption>)}
            </IonSelect>
          </IonItem>
          <IonItem>
            <IonLabel position="stacked">Comisión (%)</IonLabel>
            <IonInput
              type="number"
              value={commissionRatePct}
              onIonInput={(e) => setCommissionRatePct(e.detail.value ?? '')}
              placeholder="4.2"
            />
          </IonItem>
          <IonItem>
            <IonLabel position="stacked">Cuota fija (opcional)</IonLabel>
            <IonInput
              type="number"
              value={fixedFeeAmount}
              onIonInput={(e) => setFixedFeeAmount(e.detail.value ?? '')}
              placeholder="0.00"
            />
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
          {saving ? <IonSpinner name="dots" /> : (isEditing ? 'Guardar cambios' : 'Crear terminal')}
        </IonButton>

        <h3>Cuenta para transferencias</h3>
        {isEditing ? (
          <>
            <IonList>
              <IonItem>
                <IonLabel position="stacked">Titular</IonLabel>
                <IonInput value={holderName} onIonInput={(e) => setHolderName(e.detail.value ?? '')} />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">CLABE</IonLabel>
                <IonInput value={clabe} inputmode="numeric" maxlength={18}
                  onIonInput={(e) => setClabe(e.detail.value ?? '')} />
              </IonItem>
              {account?.bankName && (
                <IonItem><IonLabel>Banco: {account.bankName}</IonLabel></IonItem>
              )}
            </IonList>
            <IonButton expand="block" fill="outline" onClick={handleSaveAccount}
              disabled={savingAccount || !holderName.trim() || clabe.trim().length !== 18
                || (clabe.trim() === account?.clabe && holderName.trim() === account?.holderName)}>
              {savingAccount ? <IonSpinner name="dots" /> : 'Guardar cuenta'}
            </IonButton>
          </>
        ) : (
          <p>Crea la terminal y ábrela para agregar su cuenta.</p>
        )}
      </IonContent>
    </IonModal>
  );
};

export default CommissionTerminalFormModal;

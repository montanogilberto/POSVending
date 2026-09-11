import React, { useMemo, useState } from 'react';
import {
  IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent,
  IonList, IonItem, IonLabel, IonInput, IonSelect, IonSelectOption, IonSpinner, IonIcon, IonText,
} from '@ionic/react';
import { addOutline, trashOutline } from 'ionicons/icons';
import { ChartOfAccount } from '../../../../api/chartOfAccountsApi';
import { CreateJournalEntryRequest } from '../../../../api/journalEntriesApi';
import { fmtMXN } from '../../../../utils/format';
import { NewLineDraft } from '../AccountingTypes';

interface Props {
  isOpen: boolean;
  accounts: ChartOfAccount[];
  onClose: () => void;
  onSubmit: (data: Omit<CreateJournalEntryRequest, 'companyId' | 'createdByUserId'>) => Promise<void>;
}

const emptyLine = (): NewLineDraft => ({ accountId: '', debit: '', credit: '', lineDescription: '' });
const todayIso = () => new Date().toISOString().slice(0, 10);

const JournalEntryFormModal: React.FC<Props> = ({ isOpen, accounts, onClose, onSubmit }) => {
  const [entryDate, setEntryDate] = useState(todayIso());
  const [description, setDescription] = useState('');
  const [lines, setLines] = useState<NewLineDraft[]>([emptyLine(), emptyLine()]);
  const [saving, setSaving] = useState(false);

  const totals = useMemo(() => {
    const debit = lines.reduce((sum, l) => sum + (parseFloat(l.debit) || 0), 0);
    const credit = lines.reduce((sum, l) => sum + (parseFloat(l.credit) || 0), 0);
    return { debit, credit, balanced: Math.abs(debit - credit) < 0.005 && debit > 0 };
  }, [lines]);

  const reset = () => {
    setEntryDate(todayIso());
    setDescription('');
    setLines([emptyLine(), emptyLine()]);
  };

  const updateLine = (index: number, patch: Partial<NewLineDraft>) => {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  };

  const canSave = description.trim() && totals.balanced && lines.every((l) => l.accountId !== '' && (parseFloat(l.debit) > 0 || parseFloat(l.credit) > 0));

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await onSubmit({
        entryDate,
        description: description.trim(),
        referenceType: 'manual',
        lines: lines
          .filter((l) => l.accountId !== '')
          .map((l) => ({
            accountId: l.accountId as number,
            debit: parseFloat(l.debit) || 0,
            credit: parseFloat(l.credit) || 0,
            lineDescription: l.lineDescription.trim() || undefined,
          })),
      });
      reset();
    } catch {
      // toast already shown by handlePostEntry
    } finally {
      setSaving(false);
    }
  };

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Nuevo asiento contable</IonTitle>
          <IonButtons slot="end"><IonButton onClick={onClose}>Cerrar</IonButton></IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <IonList>
          <IonItem>
            <IonLabel position="stacked">Fecha</IonLabel>
            <IonInput type="date" value={entryDate} onIonInput={(e) => setEntryDate(e.detail.value ?? todayIso())} />
          </IonItem>
          <IonItem>
            <IonLabel position="stacked">Descripción</IonLabel>
            <IonInput value={description} onIonInput={(e) => setDescription(e.detail.value ?? '')} placeholder="Ajuste manual de inventario" />
          </IonItem>
        </IonList>

        <h3 className="accounting-lines-title">Movimientos (Debe / Haber)</h3>
        {lines.map((line, index) => (
          <IonList key={index} inset className="accounting-line-row">
            <IonItem>
              <IonLabel position="stacked">Cuenta</IonLabel>
              <IonSelect
                value={line.accountId}
                placeholder="Selecciona una cuenta"
                onIonChange={(e) => updateLine(index, { accountId: e.detail.value })}
              >
                {accounts.map((a) => (
                  <IonSelectOption key={a.accountId} value={a.accountId}>{a.code} · {a.name}</IonSelectOption>
                ))}
              </IonSelect>
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Debe</IonLabel>
              <IonInput type="number" value={line.debit} onIonInput={(e) => updateLine(index, { debit: e.detail.value ?? '', credit: '' })} placeholder="0.00" />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Haber</IonLabel>
              <IonInput type="number" value={line.credit} onIonInput={(e) => updateLine(index, { credit: e.detail.value ?? '', debit: '' })} placeholder="0.00" />
            </IonItem>
            {lines.length > 2 && (
              <IonButton fill="clear" color="danger" onClick={() => setLines((prev) => prev.filter((_, i) => i !== index))}>
                <IonIcon icon={trashOutline} slot="start" /> Quitar línea
              </IonButton>
            )}
          </IonList>
        ))}

        <IonButton fill="outline" size="small" onClick={() => setLines((prev) => [...prev, emptyLine()])}>
          <IonIcon icon={addOutline} slot="start" /> Agregar línea
        </IonButton>

        <div className="accounting-totals-row">
          <IonText color={totals.balanced ? 'success' : 'danger'}>
            <strong>Debe: {fmtMXN(totals.debit)} &nbsp;·&nbsp; Haber: {fmtMXN(totals.credit)}</strong>
          </IonText>
          {!totals.balanced && <p className="accounting-imbalance-hint">Debe y Haber deben ser iguales para contabilizar.</p>}
        </div>

        <IonButton expand="block" className="ion-margin-top" onClick={handleSave} disabled={!canSave || saving}>
          {saving ? <IonSpinner name="dots" /> : 'Contabilizar asiento'}
        </IonButton>
      </IonContent>
    </IonModal>
  );
};

export default JournalEntryFormModal;

import React from 'react';
import { IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonInput, IonSelect, IonSelectOption } from '@ionic/react';
import type { Supplier } from '../../../../api/supplierApi';
import type { OperationDraft, SupplierDecision } from '../ExpenseOperationTypes';

interface Props {
  draft: OperationDraft;
  suppliers: Supplier[];
  invalid: boolean;
  onChange: (decision: SupplierDecision) => void;
}

const SupplierSection: React.FC<Props> = ({ draft, suppliers, invalid, onChange }) => {
  const { supplier, supplierCandidates, merchantName } = draft;
  const value = supplier.mode === 'existing' ? `s:${supplier.supplierId}` : supplier.mode === 'new' ? 'new' : undefined;
  const candidateIds = new Set(supplierCandidates.map(c => c.id));

  const handleChange = (v: string) => {
    if (v === 'new') { onChange({ mode: 'new', name: merchantName.trim() || (supplier.mode === 'new' ? supplier.name : '') }); return; }
    const id = Number(v.slice(2));
    const found = suppliers.find(s => s.supplierId === id);
    if (found) onChange({ mode: 'existing', supplierId: id, name: found.supplierName });
  };

  return (
    <IonCard className="xo-card">
      <IonCardHeader>
        <IonCardTitle className="xo-card-title">Proveedor</IonCardTitle>
      </IonCardHeader>
      <IonCardContent>
        {merchantName && <p className="xo-read">El ticket dice: <strong>{merchantName}</strong></p>}
        <IonSelect
          className={`xo-field ${invalid ? 'ion-invalid ion-touched' : ''}`} fill="outline" interface="popover"
          labelPlacement="stacked" placeholder="Elegir o registrar proveedor" errorText="Elige un proveedor"
          value={value} onIonChange={e => handleChange(String(e.detail.value))}
        >
          <div slot="label">Proveedor <span className="expense-required">*</span></div>
          {supplierCandidates.filter(c => c.id).map(c => (
            <IonSelectOption key={`c${c.id}`} value={`s:${c.id}`}>{c.name} · coincidencia {Math.round(c.score * 100)}%</IonSelectOption>
          ))}
          {suppliers.filter(s => !candidateIds.has(s.supplierId)).map(s => (
            <IonSelectOption key={s.supplierId} value={`s:${s.supplierId}`}>{s.supplierName}</IonSelectOption>
          ))}
          <IonSelectOption value="new">＋ Registrar como proveedor nuevo</IonSelectOption>
        </IonSelect>
        {supplier.mode === 'new' && (
          <IonInput
            className="xo-field" fill="outline" label="Nombre del proveedor nuevo" labelPlacement="stacked" maxlength={200}
            value={supplier.name} onIonInput={e => onChange({ mode: 'new', name: String(e.detail.value ?? '') })}
          />
        )}
      </IonCardContent>
    </IonCard>
  );
};

export default SupplierSection;

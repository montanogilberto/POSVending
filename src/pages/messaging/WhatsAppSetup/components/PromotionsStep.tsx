import React from 'react';
import { IonCheckbox, IonInput } from '@ionic/react';
import { pricetagOutline } from 'ionicons/icons';
import { mxDate } from '../../../../utils/format';
import type { WhatsAppSetupVM } from '../WhatsAppSetupLogic';
import CatalogSection from './CatalogSection';

/** POS coupons (sp_promotions). Today the POS only applies B2G1: compra 2, lleva 1 gratis. */
const PromotionsStep: React.FC<{ vm: WhatsAppSetupVM }> = ({ vm }) => {
  const ed = vm.promotionEditor;
  const d = ed.editing?.draft;
  const isNew = ed.editing?.id === null;

  return (
    <>
      <p className="was-muted was-intro">
        Hoy el POS aplica un tipo de promoción: <strong>compra 2 y lleva 1 gratis</strong>. El cliente da el código al pagar.
      </p>
      <CatalogSection
        items={vm.promotions}
        idOf={p => p.promotionId}
        title={p => `${p.code} — ${p.name}`}
        detail={p => [
          p.startAtUtc || p.endAtUtc
            ? `${p.startAtUtc ? mxDate(p.startAtUtc) : 'Desde hoy'} → ${p.endAtUtc ? mxDate(p.endAtUtc) : 'sin fin'}`
            : 'Sin fecha de fin',
          p.firstPurchaseOnly ? 'Sólo primera compra' : null,
          p.description,
        ].filter(Boolean).join(' · ')}
        editor={ed}
        addLabel="Agregar promoción"
        emptyIcon={pricetagOutline}
        emptyText="No hay promociones activas. El agente dirá que por ahora no hay promociones."
        form={d && (
          <div className="was-form-grid">
            <IonInput label="Código" labelPlacement="stacked" fill="outline" placeholder="2X1LUNES"
              maxlength={30} value={d.code} disabled={ed.saving || !isNew}
              helperText={isNew ? 'Sin espacios. No se puede cambiar después.' : 'El código no se puede cambiar.'}
              onIonInput={e => ed.setField('code', (e.detail.value ?? '').toUpperCase())} />
            <IonInput label="Nombre" labelPlacement="stacked" fill="outline" placeholder="Lunes de 3x2"
              maxlength={120} value={d.name} disabled={ed.saving}
              onIonInput={e => ed.setField('name', e.detail.value ?? '')} />
            <IonInput className="was-form-wide" label="Descripción (opcional)" labelPlacement="stacked" fill="outline"
              placeholder="En lavado por kilo" maxlength={255} value={d.description} disabled={ed.saving}
              onIonInput={e => ed.setField('description', e.detail.value ?? '')} />
            <IonInput label="Desde (opcional)" labelPlacement="stacked" fill="outline" type="date"
              value={d.startDate} disabled={ed.saving}
              onIonInput={e => ed.setField('startDate', e.detail.value ?? '')} />
            <IonInput label="Hasta (opcional)" labelPlacement="stacked" fill="outline" type="date"
              value={d.endDate} disabled={ed.saving}
              onIonInput={e => ed.setField('endDate', e.detail.value ?? '')} />
            <IonCheckbox className="was-form-wide" labelPlacement="end" checked={d.firstPurchaseOnly}
              disabled={ed.saving} onIonChange={e => ed.setField('firstPurchaseOnly', e.detail.checked)}>
              Sólo en la primera compra del cliente
            </IonCheckbox>
          </div>
        )}
      />
    </>
  );
};

export default PromotionsStep;

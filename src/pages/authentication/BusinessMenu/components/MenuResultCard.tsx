import React from 'react';
import { IonButton, IonChip, IonLabel } from '@ionic/react';
import { fmtMXN } from '../../../../utils/format';
import { PREVIEW_ITEMS } from '../BusinessMenuConstants';
import type { BusinessMenuVM } from '../BusinessMenuLogic';

interface Props {
  vm: BusinessMenuVM;
  moduleLabel: (id: string) => string;
}

/** What the agent understood: type, summary, a preview of items, modules added. */
const MenuResultCard: React.FC<Props> = ({ vm, moduleLabel }) => {
  const r = vm.result;
  if (!r) return null;
  const items = r.categories.flatMap(c => c.items);
  const preview = items.slice(0, PREVIEW_ITEMS);
  return (
    <div className="bm-result">
      <div className="bm-result-head">
        <strong>{r.businessType || 'Tu negocio'}</strong>
        <span>{r.itemCount} {r.itemCount === 1 ? 'producto' : 'productos'} detectados</span>
      </div>
      {r.summary && <p className="bm-result-summary">{r.summary}</p>}

      {preview.length > 0 && (
        <ul className="bm-items">
          {preview.map((it, i) => (
            <li key={`${it.name}-${i}`}>
              <span>{it.name}</span>
              <span className="bm-item-price">{it.price != null ? fmtMXN(it.price) : '—'}</span>
            </li>
          ))}
          {items.length > preview.length && <li className="bm-items-more">y {items.length - preview.length} más</li>}
        </ul>
      )}

      {r.suggestedModules.length > 0 && (
        <>
          <p className="bm-label">Agregamos a tu cuenta:</p>
          <div className="bm-modules">
            {r.suggestedModules.map(id => (
              <IonChip key={id} className="bm-module-chip"><IonLabel>{moduleLabel(id)}</IonLabel></IonChip>
            ))}
          </div>
        </>
      )}

      {r.questions.length > 0 && (
        <>
          <p className="bm-label">Para afinar tu cuenta después:</p>
          <ul className="bm-questions">
            {r.questions.map(q => <li key={q}>{q}</li>)}
          </ul>
        </>
      )}

      <IonButton fill="clear" size="small" className="bm-change" onClick={vm.clear}>Usar otro archivo</IonButton>
    </div>
  );
};

export default MenuResultCard;

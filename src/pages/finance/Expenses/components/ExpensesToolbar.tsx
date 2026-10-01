import React from 'react';
import { IonSearchbar, IonButton, IonIcon, IonBadge } from '@ionic/react';
import { filterOutline } from 'ionicons/icons';
import { ExpensesVM } from '../ExpensesLogic';

/** Search + filters toggle (/egresos/detalle). */
const ExpensesToolbar: React.FC<{ vm: ExpensesVM }> = ({ vm }) => (
  <div className="expenses-toolbar">
    <IonSearchbar
      className="expenses-toolbar-search"
      value={vm.searchText}
      onIonInput={(e) => vm.setSearchText(e.detail.value ?? '')}
      placeholder="Buscar proveedor, empleado, tipo…"
      debounce={200}
    />
    <IonButton fill="outline" className="expenses-filters-toggle" onClick={() => vm.setShowFilters(!vm.showFilters)}>
      <IonIcon slot="start" icon={filterOutline} />
      Filtros
      {vm.activeFilterCount > 0 && <IonBadge className="expenses-filters-badge">{vm.activeFilterCount}</IonBadge>}
    </IonButton>
  </div>
);

export default ExpensesToolbar;

import React from 'react';
import { IonButton, IonIcon, IonSpinner } from '@ionic/react';
import { refreshOutline } from 'ionicons/icons';
import { toHermosillo } from '../../../../utils/format';
import PeriodSegment from '../../../../components/ui/PeriodSegment';
import type { NotificationDispatchLogVM } from '../NotificationDispatchLogLogic';

/** Period (scopes the whole page) + Actualizar / última actualización. List filters live in the history section. */
const FilterBar: React.FC<{ vm: NotificationDispatchLogVM }> = ({ vm }) => (
  <div className="ndl-filterbar">
    <PeriodSegment idPrefix="ndl" value={vm.dateFilter} onChange={vm.setDateFilter}
      custom={vm.customRange} onCustomChange={vm.setCustomRange} />

    <div className="ndl-refresh">
      <IonButton fill="outline" size="small" onClick={vm.refresh} disabled={vm.loading}>
        {vm.loading ? <IonSpinner name="dots" /> : <><IonIcon slot="start" icon={refreshOutline} />Actualizar</>}
      </IonButton>
      {vm.lastUpdated && (
        <span>Última actualización<br />{toHermosillo(vm.lastUpdated.toISOString())}</span>
      )}
    </div>
  </div>
);

export default FilterBar;

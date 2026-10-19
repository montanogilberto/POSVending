import React from 'react';
import { IonButton, IonIcon, IonSpinner } from '@ionic/react';
import { addOutline, refreshOutline } from 'ionicons/icons';
import PeriodSegment from '../../../../components/ui/PeriodSegment';
import { toHermosillo } from '../../../../utils/format';
import type { PushNotificationsVM } from '../PushNotificationsLogic';

/** Period (scopes the whole page) + Actualizar / última actualización + Nueva notificación. */
const PushTopBar: React.FC<{ vm: PushNotificationsVM }> = ({ vm }) => (
  <div className="pnd-topbar">
    <PeriodSegment idPrefix="pnd" value={vm.period} onChange={vm.setPeriod}
      custom={vm.customRange} onCustomChange={vm.setCustomRange} />
    <div className="pnd-topbar-actions">
      <IonButton fill="outline" size="small" onClick={vm.refresh} disabled={vm.loading}>
        {vm.loading ? <IonSpinner name="dots" /> : <><IonIcon slot="start" icon={refreshOutline} />Actualizar</>}
      </IonButton>
      {vm.lastUpdated && <span>Última actualización<br />{toHermosillo(vm.lastUpdated.toISOString())}</span>}
      {!vm.isPhone && (
        <IonButton size="small" onClick={vm.openNew}>
          <IonIcon slot="start" icon={addOutline} />Nueva notificación
        </IonButton>
      )}
    </div>
  </div>
);

export default PushTopBar;

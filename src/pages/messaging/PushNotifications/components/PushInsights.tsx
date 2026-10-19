import React from 'react';
import { IonBadge, IonCard, IonCardContent, IonIcon, IonItem, IonLabel, IonList } from '@ionic/react';
import { alertCircleOutline, informationCircleOutline } from 'ionicons/icons';
import { fmtInt, percent, toHermosillo } from '../../../../utils/format';
import type { PushNotificationsVM } from '../PushNotificationsLogic';

/**
 * Most-sent messages (automatic reminders show up here) + what this page can and
 * cannot tell. Each message opens the list filtered to it.
 */
const PushInsights: React.FC<{ vm: PushNotificationsVM }> = ({ vm }) => (
  <div className="pnd-insights">
    <IonCard className="pnd-card">
      <IonCardContent>
        <h3 className="pnd-section-title">Mensajes más enviados</h3>
        {vm.groups.length === 0 ? (
          <p className="pnd-muted">Sin notificaciones en este periodo.</p>
        ) : (
          <IonList lines="full" className="pnd-groups">
            {vm.groups.map(g => (
              <IonItem key={g.title} button detail onClick={() => vm.showInList({ search: g.title })}>
                <IonLabel className="ion-text-wrap">
                  <h3>{g.title}</h3>
                  <p>{percent(g.read, g.count)}% leídas · última {toHermosillo(g.lastAt)}</p>
                </IonLabel>
                <IonBadge slot="end" color="primary">{fmtInt(g.count)}</IonBadge>
              </IonItem>
            ))}
          </IonList>
        )}
      </IonCardContent>
    </IonCard>

    <IonCard className="pnd-card">
      <IonCardContent>
        <h3 className="pnd-section-title">Qué significa cada estado</h3>
        <div className="pnd-note">
          <IonIcon icon={informationCircleOutline} />
          <p>
            <strong>Leída</strong> es la única confirmación de un push: la marca la app cuando el destinatario lo abre.
            Al enviar, el aviso dice para cuántos destinatarios lo aceptó Notification Hub; la entrega en cada
            teléfono no se puede ver desde aquí.
          </p>
        </div>
        {vm.unsentRole > 0 && (
          <div className="pnd-note pnd-note--warn">
            <IonIcon icon={alertCircleOutline} />
            <p>{fmtInt(vm.unsentRole)} notificaciones con destino “Rol” nunca se enviaron: el servidor aún no sabe qué usuarios tiene cada rol.</p>
          </div>
        )}
      </IonCardContent>
    </IonCard>
  </div>
);

export default PushInsights;

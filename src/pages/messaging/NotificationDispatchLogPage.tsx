import React, { useState, useCallback } from 'react';
import { useIonViewWillEnter } from '@ionic/react';
import {
  IonPage, IonToolbar,
  IonContent, IonList, IonItem, IonLabel, IonSelect, IonSelectOption,
  IonSpinner, IonToast,
} from '@ionic/react';
import { notificationsOutline } from 'ionicons/icons';
import Header from '../../components/layout/Header';
import AlertPopover from '../../components/popovers/AlertPopover';
import MailPopover from '../../components/popovers/MailPopover';
import { usePopovers } from '../../hooks/usePopovers';
import { useUser } from '../../contexts/UserContext';
import { useToast } from '../../hooks/useToast';
import { onDataChanged } from '../../utils/refreshBus';
import { mxChatDate } from '../../utils/format';
import EmptyState from '../../components/ui/EmptyState';
import StatusBadge from '../../components/ui/StatusBadge';
import { NOTIFICATION_DISPATCH_STATUS, NOTIFICATION_CHANNEL } from '../../components/ui/statusMaps';
import {
  NotificationDispatch,
  NotificationSourceType,
  getAllNotificationDispatches,
} from '../../api/notificationDispatchApi';
import './NotificationDispatchLogPage.css';

const NotificationDispatchLogPage: React.FC = () => {
  const { companyId } = useUser();
  const pops = usePopovers();
  const { showToast, toastProps } = useToast({ defaultColor: 'danger' });

  const [rows, setRows] = useState<NotificationDispatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [sourceTypeFilter, setSourceTypeFilter] = useState<NotificationSourceType | 'all'>('all');

  const load = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const data = await getAllNotificationDispatches(companyId);
      setRows(data);
    } catch (err) {
      showToast((err as Error).message || 'No se pudo cargar el historial de notificaciones');
    } finally {
      setLoading(false);
    }
  }, [companyId, showToast]);

  useIonViewWillEnter(() => {
    load();
  });

  React.useEffect(() => onDataChanged((reason) => {
    if (reason === 'notification_dispatched') load();
  }), [load]);

  const filteredRows = sourceTypeFilter === 'all'
    ? rows
    : rows.filter((r) => r.sourceType === sourceTypeFilter);

  return (
    <IonPage>
      <Header {...pops.headerProps} screenTitle="Historial de Notificaciones" />
      <AlertPopover {...pops.alertPopoverProps} />
      <MailPopover {...pops.mailPopoverProps} />

      <IonContent fullscreen className="ndl-page">
        <IonToolbar className="ndl-filter-toolbar">
          <IonSelect
            interface="popover"
            value={sourceTypeFilter}
            placeholder="Origen"
            onIonChange={(e) => setSourceTypeFilter(e.detail.value)}
          >
            <IonSelectOption value="all">Todos los orígenes</IonSelectOption>
            <IonSelectOption value="income">Ingresos</IonSelectOption>
            <IonSelectOption value="expense">Egresos</IonSelectOption>
            <IonSelectOption value="ticket">Tickets</IonSelectOption>
          </IonSelect>
        </IonToolbar>

        {loading && (
          <div className="ndl-loading">
            <IonSpinner name="dots" />
          </div>
        )}

        {!loading && filteredRows.length === 0 && (
          <EmptyState
            icon={notificationsOutline}
            text="No hay notificaciones registradas todavía."
          />
        )}

        {!loading && filteredRows.length > 0 && (
          <IonList>
            {filteredRows.map((row) => (
              <IonItem key={row.notificationDispatchId} button detail={false} className="ndl-item">
                <IonLabel>
                  <h2>{row.eventName} · {row.sourceType} #{row.sourceId}</h2>
                  <p>
                    <StatusBadge status={row.selectedChannel} map={NOTIFICATION_CHANNEL} />
                    {' '}
                    <StatusBadge status={row.status} map={NOTIFICATION_DISPATCH_STATUS} />
                    {row.fallbackReason && (
                      <span className="ndl-fallback"> · fallback: {row.fallbackReason}</span>
                    )}
                  </p>
                  <p className="ndl-date">{mxChatDate(row.created_At)}</p>
                </IonLabel>
              </IonItem>
            ))}
          </IonList>
        )}

        <IonToast {...toastProps} />
      </IonContent>
    </IonPage>
  );
};

export default NotificationDispatchLogPage;

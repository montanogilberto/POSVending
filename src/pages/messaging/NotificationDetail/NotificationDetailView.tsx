import React from 'react';
import {
  IonButton, IonCard, IonCardContent, IonContent, IonIcon, IonPage,
  IonRefresher, IonRefresherContent, IonSpinner,
} from '@ionic/react';
import { arrowForwardOutline, listOutline, notificationsOutline } from 'ionicons/icons';
import Header from '../../../components/layout/Header';
import AlertPopover from '../../../components/popovers/AlertPopover';
import MailPopover from '../../../components/popovers/MailPopover';
import EmptyState from '../../../components/ui/EmptyState';
import StatusBadge from '../../../components/ui/StatusBadge';
import { NOTIFICATION_PRIORITY, NOTIFICATION_TYPE } from '../../../components/ui/statusMaps';
import { usePopovers } from '../../../hooks/usePopovers';
import { mxChatTime, mxDate } from '../../../utils/format';
import { useNotificationDetail } from './NotificationDetailLogic';
import NotificationDataCard from './components/NotificationDataCard';

const NotificationDetailView: React.FC = () => {
  const vm = useNotificationDetail();
  const pops = usePopovers();
  const info = vm.info;

  return (
    <IonPage>
      <Header {...pops.headerProps} screenTitle="Notificación" />
      <AlertPopover {...pops.alertPopoverProps} />
      <MailPopover {...pops.mailPopoverProps} />

      <IonContent fullscreen className="ntd-page ion-padding">
        <IonRefresher slot="fixed" onIonRefresh={async (e) => { await vm.refresh(); e.detail.complete(); }}>
          <IonRefresherContent />
        </IonRefresher>

        {!info && (vm.loading
          ? <div className="ntd-loading"><IonSpinner name="crescent" /></div>
          : <EmptyState icon={notificationsOutline} text="No hay información de esta notificación." />)}

        {info && (
          <>
            <IonCard className="ntd-card">
              <IonCardContent>
                <div className="ntd-head">
                  <IonIcon icon={notificationsOutline} className="ntd-head-icon" />
                  <div className="ntd-badges">
                    {info.notificationType && <StatusBadge status={info.notificationType} map={NOTIFICATION_TYPE} />}
                    {info.priority && info.priority.toLowerCase() !== 'normal' && (
                      <StatusBadge status={info.priority} map={NOTIFICATION_PRIORITY} />
                    )}
                    {vm.loading && <IonSpinner name="dots" className="ntd-inline-spinner" />}
                  </div>
                </div>
                <h1 className="ntd-title">{info.title}</h1>
                {info.message && <p className="ntd-message">{info.message}</p>}
                {info.receivedAt && (
                  <p className="ntd-date">{mxDate(info.receivedAt)} · {mxChatTime(info.receivedAt)}</p>
                )}
                {info.pushNotificationId && <p className="ntd-folio">Folio #{info.pushNotificationId}</p>}
              </IonCardContent>
            </IonCard>

            <NotificationDataCard vm={vm} />

            {vm.relatedRoute && (
              <IonButton expand="block" className="ntd-action" onClick={vm.openRelated}>
                {vm.relatedLabel}
                <IonIcon slot="end" icon={arrowForwardOutline} />
              </IonButton>
            )}
            <IonButton expand="block" fill="outline" className="ntd-action" onClick={vm.openInbox}>
              <IonIcon slot="start" icon={listOutline} />
              Ver todas mis notificaciones
            </IonButton>
          </>
        )}
      </IonContent>
    </IonPage>
  );
};

export default NotificationDetailView;

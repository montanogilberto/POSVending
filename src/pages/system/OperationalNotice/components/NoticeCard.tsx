import React from 'react';
import { IonButton, IonCard, IonChip, IonIcon, IonLabel, IonSpinner } from '@ionic/react';
import { calendarOutline, createOutline, lockClosedOutline, stopCircleOutline, timeOutline } from 'ionicons/icons';
import StatusBadge from '../../../../components/ui/StatusBadge';
import { OPERATIONAL_NOTICE_STATE } from '../../../../components/ui/statusMaps';
import { mxDay } from '../../../../utils/format';
import type { OperationalNotice } from '../../../../api/operationalNoticeApi';
import { NOTICE_TYPE_LABEL } from '../OperationalNoticeConstants';
import type { OperationalNoticeVM } from '../OperationalNoticeLogic';

const NoticeCard: React.FC<{ notice: OperationalNotice; vm: OperationalNoticeVM }> = ({ notice, vm }) => {
  const live = notice.state === 'vigente' || notice.state === 'programado';
  const range = notice.startDate === notice.endDate
    ? mxDay(notice.startDate)
    : `${mxDay(notice.startDate)} – ${mxDay(notice.endDate)}`;
  const fromTemplate = vm.templateName(notice.templateId);

  return (
    <IonCard className={`notice-card notice-type-${notice.noticeType}${live ? '' : ' notice-card-past'}`}>
      <div className="notice-card-top">
        <div>
          <h3 className="notice-card-title">{notice.title}</h3>
          <div className="notice-card-chips">
            <IonChip className="notice-chip notice-chip-type">{NOTICE_TYPE_LABEL[notice.noticeType]}</IonChip>
            {notice.blocksReservations && (
              <IonChip className="notice-chip"><IonIcon icon={lockClosedOutline} /><IonLabel>Sin reservaciones</IonLabel></IonChip>
            )}
            {fromTemplate && <IonChip className="notice-chip">Plantilla: {fromTemplate}</IonChip>}
          </div>
        </div>
        <StatusBadge status={notice.state} map={OPERATIONAL_NOTICE_STATE} className="notice-status" />
      </div>

      <p className="notice-card-message">{notice.customerMessage}</p>

      <div className="notice-card-footer">
        <span className="notice-meta"><IonIcon icon={calendarOutline} />{range}</span>
        {notice.startTime && (
          <span className="notice-meta"><IonIcon icon={timeOutline} />{notice.startTime}–{notice.endTime}</span>
        )}
        {live && vm.canEdit && (
          <div className="notice-card-actions">
            <IonButton fill="clear" size="small" onClick={() => vm.openEdit(notice)}>
              <IonIcon icon={createOutline} slot="start" />Editar / extender
            </IonButton>
            <IonButton fill="clear" size="small" color="danger" disabled={vm.finalizingId === notice.operationalNoticeId}
              onClick={() => vm.setFinalizing(notice)}>
              {vm.finalizingId === notice.operationalNoticeId
                ? <IonSpinner name="dots" />
                : <><IonIcon icon={stopCircleOutline} slot="start" />Finalizar ahora</>}
            </IonButton>
          </div>
        )}
      </div>
    </IonCard>
  );
};

export default NoticeCard;

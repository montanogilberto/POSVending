import React from 'react';
import { IonIcon } from '@ionic/react';
import { alertCircleOutline, checkmarkDoneOutline, checkmarkOutline, timeOutline } from 'ionicons/icons';
import { WHATSAPP_DELIVERY_STATUS } from '../ui/statusMaps';
import type { WhatsAppDeliveryStatus } from '../../api/whatsappAgentApi';

const ICON: Record<WhatsAppDeliveryStatus, string> = {
  accepted: timeOutline,
  sent: checkmarkOutline,
  delivered: checkmarkDoneOutline,
  read: checkmarkDoneOutline,
  failed: alertCircleOutline,
};

/** WhatsApp-style receipt next to a sent bubble's time: 🕒 ✓ ✓✓ ✓✓(azul) ⚠️.
 *  Renders nothing without a receipt — never a fake tick. */
const DeliveryTick: React.FC<{ status?: WhatsAppDeliveryStatus | null }> = ({ status }) => {
  if (!status || !ICON[status]) return null;
  const label = WHATSAPP_DELIVERY_STATUS[status]?.label ?? status;
  return (
    <IonIcon
      icon={ICON[status]}
      className={`wac-tick wac-tick--${status}`}
      aria-label={label}
      title={label}
    />
  );
};

export default DeliveryTick;

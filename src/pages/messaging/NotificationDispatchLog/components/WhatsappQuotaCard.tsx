import React from 'react';
import { IonCard, IonCardContent, IonIcon, IonProgressBar } from '@ionic/react';
import { alertCircleOutline, logoWhatsapp } from 'ionicons/icons';
import { fmtInt } from '../../../../utils/format';
import { WHATSAPP_LOW_QUOTA_RATIO } from '../NotificationDispatchLogConstants';
import type { NotificationDispatchLogVM } from '../NotificationDispatchLogLogic';

/**
 * WhatsApp usage this month. The numbers that count come from the PROVIDER
 * (what Twilio actually carried); our own table only records acceptance, so it is
 * shown as a second line and the gap between the two is called out.
 */
const WhatsappQuotaCard: React.FC<{ vm: NotificationDispatchLogVM }> = ({ vm }) => {
  const { usage, ourWhatsapp } = vm;
  const wa = usage?.whatsapp;
  const limit = wa?.limit ?? null;
  const used = wa?.outboundMessages ?? 0;
  const ratio = limit ? Math.min(used / limit, 1) : 0;
  const exceeded = limit !== null && used > limit;
  const low = limit !== null && (limit - used) / limit <= WHATSAPP_LOW_QUOTA_RATIO;
  const color = exceeded ? 'danger' : low ? 'warning' : 'success';
  const gap = wa ? ourWhatsapp.used - wa.outboundMessages : 0;

  return (
    <IonCard className="ndl-quota">
      <IonCardContent>
        <div className="ndl-quota-head">
          <IonIcon icon={logoWhatsapp} />
          <span>Uso de WhatsApp este mes</span>
        </div>

        {wa ? (
          <>
            <div className="ndl-quota-numbers">
              <strong>{fmtInt(used)}</strong>
              <span>{limit ? ` / ${fmtInt(limit)}` : ''} enviados (según el proveedor)</span>
            </div>
            {limit ? (
              <>
                <IonProgressBar value={ratio} color={color} />
                <p className="ndl-quota-note">
                  {exceeded
                    ? `Pasaste el cupo por ${fmtInt(used - limit)} mensajes: los siguientes pueden tener costo.`
                    : `Quedan ${fmtInt(wa.remaining ?? 0)} mensajes gratis.`}
                </p>
              </>
            ) : (
              <p className="ndl-quota-note">
                Cupo gratis sin configurar en el servidor (WHATSAPP_FREE_MONTHLY_LIMIT): no se puede calcular cuántos quedan.
              </p>
            )}
            <p className="ndl-quota-note">
              Conversaciones: {fmtInt(wa.conversations)} ({fmtInt(wa.freeConversations)} gratis, {fmtInt(wa.billableConversations)} con costo)
            </p>
            {gap > 0 && (
              <p className="ndl-quota-warn">
                <IonIcon icon={alertCircleOutline} /> Nosotros registramos {fmtInt(ourWhatsapp.used)} como enviados y el proveedor
                confirma {fmtInt(wa.outboundMessages)}: {fmtInt(gap)} no llegaron a salir.
              </p>
            )}
          </>
        ) : (
          <>
            <div className="ndl-quota-numbers">
              <strong>{fmtInt(ourWhatsapp.used)}</strong>
              <span> aceptados por nuestro sistema</span>
            </div>
            <p className="ndl-quota-warn">
              <IonIcon icon={alertCircleOutline} /> No se pudo consultar al proveedor. Este número es solo lo que
              registramos nosotros y puede incluir mensajes que luego fallaron.
            </p>
          </>
        )}
      </IonCardContent>
    </IonCard>
  );
};

export default WhatsappQuotaCard;

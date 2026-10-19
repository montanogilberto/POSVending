import React from 'react';
import { IonCard, IonCardContent, IonIcon, IonProgressBar } from '@ionic/react';
import { alertCircleOutline, chatbubbleOutline, logoWhatsapp, notificationsOutline, statsChartOutline } from 'ionicons/icons';
import { fmtInt } from '../../../../utils/format';
import type { NotificationDispatchLogVM } from '../NotificationDispatchLogLogic';

/**
 * Usage this month per channel, from what each provider can actually tell us:
 * - WhatsApp (Meta): our rows, moved to confirmed/failed by Meta's status webhooks.
 * - SMS: Twilio's own count (whole account, Messages API) next to ours.
 * - Push: accepted by Notification Hub — no per-device receipt exists.
 */
const ChannelUsageCard: React.FC<{ vm: NotificationDispatchLogVM }> = ({ vm }) => {
  const { usage, channels, quota } = vm;
  const meta = channels.metaWhatsapp;
  const twilio = usage?.twilio.ok ? usage.twilio : null;
  const quotaColor = quota?.exceeded ? 'danger' : quota?.low ? 'warning' : 'success';

  return (
    <IonCard className="ndl-quota">
      <IonCardContent>
        <div className="ndl-quota-head">
          <IonIcon icon={statsChartOutline} />
          <span>Uso este mes</span>
        </div>

        <section className="ndl-usage-channel">
          <div className="ndl-usage-title ndl-usage-title--whatsapp">
            <IonIcon icon={logoWhatsapp} /> WhatsApp (Meta)
          </div>
          <div className="ndl-quota-numbers">
            <strong>{fmtInt(meta.delivered)}</strong>
            <span>{quota ? ` / ${fmtInt(quota.limit)}` : ''} entregados</span>
          </div>
          <p className="ndl-quota-note">
            {fmtInt(meta.failed)} fallidos · {fmtInt(meta.noReceipt)} sin confirmación de Meta (aún)
          </p>
          {quota ? (
            <>
              <IonProgressBar value={quota.ratio} color={quotaColor} />
              <p className="ndl-quota-note">
                {quota.exceeded
                  ? `Pasaste el cupo por ${fmtInt(quota.used - quota.limit)} mensajes: los siguientes pueden tener costo.`
                  : `Quedan ${fmtInt(quota.remaining)} mensajes gratis (cuenta entregados y sin confirmación).`}
              </p>
            </>
          ) : usage && (
            <p className="ndl-quota-note">
              Cupo gratis sin configurar en el servidor (WHATSAPP_FREE_MONTHLY_LIMIT): no se puede calcular cuántos quedan.
            </p>
          )}
          {usage?.whatsappProvider === 'none' && (
            <p className="ndl-quota-warn">
              <IonIcon icon={alertCircleOutline} /> WhatsApp no está configurado en el servidor: los avisos salen por SMS.
            </p>
          )}
          {twilio && twilio.whatsapp.total > 0 && (
            <p className="ndl-quota-warn">
              <IonIcon icon={alertCircleOutline} /> Además, Twilio intentó {fmtInt(twilio.whatsapp.total)} WhatsApp este
              mes (antes del cambio a Meta): {fmtInt(twilio.whatsapp.delivered)} entregados, {fmtInt(twilio.whatsapp.failed)} fallidos.
            </p>
          )}
        </section>

        <section className="ndl-usage-channel">
          <div className="ndl-usage-title">
            <IonIcon icon={chatbubbleOutline} /> SMS (Twilio)
          </div>
          {twilio ? (
            <>
              <div className="ndl-quota-numbers">
                <strong>{fmtInt(twilio.sms.delivered)}</strong>
                <span> entregados según Twilio</span>
              </div>
              <p className="ndl-quota-note">
                {fmtInt(twilio.sms.failed)} fallidos · {fmtInt(twilio.sms.inFlight)} en camino · cuenta completa de Twilio
                (todos los negocios). Desde este negocio: {fmtInt(channels.sms.total)} enviados.
              </p>
            </>
          ) : (
            <>
              <div className="ndl-quota-numbers">
                <strong>{fmtInt(channels.sms.total)}</strong>
                <span> enviados por nuestro sistema</span>
              </div>
              <p className="ndl-quota-warn">
                <IonIcon icon={alertCircleOutline} /> No se pudo consultar a Twilio: no hay confirmación del proveedor.
              </p>
            </>
          )}
        </section>

        <section className="ndl-usage-channel">
          <div className="ndl-usage-title">
            <IonIcon icon={notificationsOutline} /> Push
          </div>
          <div className="ndl-quota-numbers">
            <strong>{fmtInt(channels.push.total - channels.push.failed)}</strong>
            <span> aceptados por Notification Hub</span>
          </div>
          <p className="ndl-quota-note">
            El servicio de push no confirma la entrega por dispositivo: aceptado no garantiza que se haya visto.
          </p>
        </section>
      </IonCardContent>
    </IonCard>
  );
};

export default ChannelUsageCard;

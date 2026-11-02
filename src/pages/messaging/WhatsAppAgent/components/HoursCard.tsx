import React from 'react';
import { IonCard, IonCardContent, IonCardHeader, IonCardTitle } from '@ionic/react';
import { timeOutline } from 'ionicons/icons';
import EmptyState from '../../../../components/ui/EmptyState';
import { fmtInt } from '../../../../utils/format';
import type { WhatsAppAgentDashboard } from '../../../../api/whatsappAgentApi';
import { WEEKDAY_SHORT, hourLabel } from '../WhatsAppAgentConstants';

interface Props { d: WhatsAppAgentDashboard }

/** ¿Cuándo escriben? — weekday × hour heat map (Hermosillo), 5 intensity steps of one hue. */
const HoursCard: React.FC<Props> = ({ d }) => {
  if (d.hours.length === 0) {
    return (
      <IonCard className="wa-agent-card">
        <IonCardHeader><IonCardTitle>¿Cuándo escriben?</IonCardTitle></IonCardHeader>
        <IonCardContent><EmptyState icon={timeOutline} text="Sin mensajes en el periodo." /></IonCardContent>
      </IonCard>
    );
  }

  const grid = new Map(d.hours.map(h => [`${h.weekday}-${h.hour}`, h.messages]));
  const used = d.hours.map(h => h.hour);
  // Only the hours anyone wrote in (plus one either side), so the grid fits a phone.
  const first = Math.max(0, Math.min(...used) - 1);
  const last = Math.min(23, Math.max(...used) + 1);
  const hours = Array.from({ length: last - first + 1 }, (_, i) => first + i);
  const max = Math.max(...d.hours.map(h => h.messages));
  const level = (n: number) => (n === 0 ? 0 : Math.min(4, Math.ceil((n / max) * 4)));

  const byHour = hours.map(h => ({ h, n: WEEKDAY_SHORT.reduce((s, _, w) => s + (grid.get(`${w}-${h}`) ?? 0), 0) }));
  const byDay = WEEKDAY_SHORT.map((label, w) => ({ label, n: hours.reduce((s, h) => s + (grid.get(`${w}-${h}`) ?? 0), 0) }));
  const peakHour = byHour.reduce((a, b) => (b.n > a.n ? b : a));
  const peakDay = byDay.reduce((a, b) => (b.n > a.n ? b : a));

  return (
    <IonCard className="wa-agent-card">
      <IonCardHeader><IonCardTitle>¿Cuándo escriben?</IonCardTitle></IonCardHeader>
      <IonCardContent>
        <p className="wa-agent-muted wa-agent-heat-peak">
          Más mensajes: <strong>{peakDay.label}</strong> y entre <strong>{hourLabel(peakHour.h)}</strong> y{' '}
          <strong>{hourLabel((peakHour.h + 1) % 24)}</strong>.
        </p>
        <div className="wa-agent-heat-scroll">
          <table className="wa-agent-heat" aria-label="Mensajes por día y hora">
            <thead>
              <tr>
                <th />
                {hours.map(h => <th key={h} scope="col">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {WEEKDAY_SHORT.map((label, w) => (
                <tr key={label}>
                  <th scope="row">{label}</th>
                  {hours.map(h => {
                    const n = grid.get(`${w}-${h}`) ?? 0;
                    return (
                      <td key={h} className={`wa-agent-heat-l${level(n)}`}
                        title={`${label} ${hourLabel(h)}: ${fmtInt(n)} mensajes`}>
                        {n > 0 ? n : ''}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="wa-agent-muted">Hora de Hermosillo. Úsalo para saber cuándo tener a alguien pendiente del chat.</p>
      </IonCardContent>
    </IonCard>
  );
};

export default HoursCard;

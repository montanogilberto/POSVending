import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonBadge, IonButton, IonIcon, IonSpinner, IonChip, IonLabel,
} from '@ionic/react';
import { calendarOutline, checkmarkCircleOutline, closeCircleOutline, refreshOutline } from 'ionicons/icons';
import { useUser } from '../../../contexts/UserContext';
import {
  Reservation, getPOSQueue, confirmReservation, cancelReservation, completeReservation,
} from '../../../api/reservationsApi';

const SERVICE_LABEL: Record<string, string> = { lavado: '🫧 Lavado', secado: '🌀 Secado' };
const STATUS_COLOR: Record<string, string> = {
  pending: 'warning', confirmed: 'primary', completed: 'success', cancelled: 'medium',
};

function pad(n: number) { return String(n).padStart(2, '0'); }
function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

interface Props {
  pollIntervalMs?: number;
}

const ReservationsWidget: React.FC<Props> = ({ pollIntervalMs = 30_000 }) => {
  const { companyId } = useUser();
  const [items, setItems] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(false);
  const [actioning, setActioning] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const queue = await getPOSQueue(companyId);
      setItems(queue);
    } catch {
      // silently ignore — widget shouldn't crash the dashboard
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    load();
    intervalRef.current = setInterval(load, pollIntervalMs);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [load, pollIntervalMs]);

  async function handleAction(fn: () => Promise<void>) {
    await fn();
    await load();
    setActioning(null);
  }

  const today = todayIso();
  const todayItems = items.filter(r => r.reservationDate === today);
  const pendingCount = todayItems.filter(r => r.status === 'pending').length;

  return (
    <IonCard>
      <IonCardHeader style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 4 }}>
        <IonCardTitle style={{ fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <IonIcon icon={calendarOutline} />
          Reservaciones Hoy
          {pendingCount > 0 && (
            <IonBadge color="danger" style={{ marginLeft: 6 }}>{pendingCount}</IonBadge>
          )}
        </IonCardTitle>
        <IonButton fill="clear" size="small" onClick={load} disabled={loading}>
          {loading ? <IonSpinner name="lines-small" style={{ width: 16, height: 16 }} /> : <IonIcon icon={refreshOutline} />}
        </IonButton>
      </IonCardHeader>

      <IonCardContent style={{ paddingTop: 0 }}>
        {todayItems.length === 0 ? (
          <p style={{ color: 'var(--ion-color-medium)', fontSize: 14, textAlign: 'center', padding: '12px 0' }}>
            Sin reservaciones para hoy
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {todayItems.map(r => (
              <div key={r.reservationId} style={{
                border: '1px solid var(--ion-color-light-shade)',
                borderRadius: 12,
                padding: '10px 12px',
                background: r.status === 'pending' ? 'rgba(var(--ion-color-warning-rgb), 0.06)' : 'var(--ion-color-light)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ fontWeight: 700, margin: 0, fontSize: 15 }}>{r.clientName}</p>
                    <p style={{ margin: '2px 0 0', color: 'var(--ion-color-medium)', fontSize: 13 }}>
                      {SERVICE_LABEL[r.serviceType] ?? r.serviceType} · {r.timeSlot} · {r.phone}
                    </p>
                  </div>
                  <IonChip color={STATUS_COLOR[r.status] ?? 'medium'} style={{ margin: 0, height: 24, fontSize: 11 }}>
                    <IonLabel>{r.status}</IonLabel>
                  </IonChip>
                </div>

                {r.status === 'pending' && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                    <IonButton
                      size="small" color="primary" fill="solid"
                      disabled={actioning === r.reservationId}
                      onClick={() => { setActioning(r.reservationId); handleAction(() => confirmReservation(r.reservationId, companyId!)); }}
                    >
                      <IonIcon slot="start" icon={checkmarkCircleOutline} />
                      Confirmar
                    </IonButton>
                    <IonButton
                      size="small" color="danger" fill="outline"
                      disabled={actioning === r.reservationId}
                      onClick={() => { setActioning(r.reservationId); handleAction(() => cancelReservation(r.reservationId, companyId!)); }}
                    >
                      <IonIcon slot="start" icon={closeCircleOutline} />
                      Cancelar
                    </IonButton>
                  </div>
                )}

                {r.status === 'confirmed' && (
                  <div style={{ marginTop: 8 }}>
                    <IonButton
                      size="small" color="success" fill="solid"
                      disabled={actioning === r.reservationId}
                      onClick={() => { setActioning(r.reservationId); handleAction(() => completeReservation(r.reservationId, companyId!)); }}
                    >
                      <IonIcon slot="start" icon={checkmarkCircleOutline} />
                      Completar
                    </IonButton>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </IonCardContent>
    </IonCard>
  );
};

export default ReservationsWidget;

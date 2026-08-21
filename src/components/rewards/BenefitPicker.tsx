import React, { useCallback, useEffect, useState } from 'react';
import {
  IonCard, IonCardContent, IonButton, IonSpinner, IonIcon, IonBadge, IonNote, IonToast,
} from '@ionic/react';
import { ribbonOutline, checkmarkCircle, lockClosedOutline } from 'ionicons/icons';
import { useToast } from '../../hooks/useToast';
import { fmtInt } from '../../utils/format';
import { notifyDataChanged } from '../../utils/refreshBus';
import {
  getRewardBenefits, reserveRewardBenefit, getClientBenefits, benefitLabel,
  RewardError, type RewardBenefit, type ReservedBenefit,
} from '../../api/rewardBenefitsApi';
import './BenefitPicker.css';

interface BenefitPickerProps {
  companyId: number;
  clientId: number;
  /** Puntos disponibles, para pintar el encabezado. */
  balance?: number;
  onReserved?: () => void;
}

/**
 * Catálogo de beneficios canjeables con PUNTOS.
 *
 * Los puntos se ganan pagando a tiempo — no jugando. Las fichas del arcade no
 * entran aquí ni se convierten en puntos: esa separación es lo que mantiene el
 * canje fuera del terreno del permiso SEGOB, y evita que alguien endeudado
 * sienta que apostar le mejora el crédito.
 */
const BenefitPicker: React.FC<BenefitPickerProps> = ({
  companyId, clientId, balance, onReserved,
}) => {
  const { showToast, toastProps } = useToast();
  const [benefits, setBenefits] = useState<RewardBenefit[]>([]);
  const [reserved, setReserved] = useState<ReservedBenefit | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!companyId || !clientId) { setLoading(false); return; }
    try {
      const [catalog, mine] = await Promise.all([
        getRewardBenefits(companyId, clientId),
        getClientBenefits(companyId, clientId),
      ]);
      setBenefits(catalog);
      setReserved(mine.find(b => b.status === 'reserved' && !b.loanId) ?? null);
    } catch (err) {
      console.log('[BenefitPicker] no se pudo cargar', err);
    }
    setLoading(false);
  }, [companyId, clientId]);

  useEffect(() => { void load(); }, [load]);

  const reserve = async (benefit: RewardBenefit) => {
    if (busy) return;
    setBusy(benefit.benefitKey);
    try {
      await reserveRewardBenefit(companyId, clientId, benefit.benefitKey);
      showToast(`Beneficio apartado: ${benefit.name}`);
      notifyDataChanged('reward-benefit');
      await load();
      onReserved?.();
    } catch (err) {
      showToast(err instanceof RewardError ? err.message : 'No se pudo canjear', 'danger');
    }
    setBusy(null);
  };

  if (loading) {
    return <div className="bp-loading"><IonSpinner name="dots" /></div>;
  }
  if (benefits.length === 0) return null;

  return (
    <div className="bp">
      <IonToast {...toastProps} />

      <div className="bp-head">
        <IonIcon icon={ribbonOutline} />
        <span>Usa tus puntos en tu próximo préstamo</span>
        {balance !== undefined && <IonBadge color="primary">{fmtInt(balance)} pts</IonBadge>}
      </div>

      {/* Solo puede haber un beneficio apartado: mostrarlo evita que el
          jugador intente canjear otro y choque con el error del backend. */}
      {reserved ? (
        <IonCard className="bp-reserved">
          <IonCardContent>
            <IonIcon icon={checkmarkCircle} className="bp-reserved__icon" />
            <div>
              <strong>Ya tienes un beneficio apartado</strong>
              <p>{benefitLabel(reserved)} · se aplicará a tu próximo préstamo</p>
            </div>
          </IonCardContent>
        </IonCard>
      ) : (
        <div className="bp-list">
          {benefits.map(b => (
            <IonCard key={b.benefitKey} className={`bp-item${b.affordable ? '' : ' bp-item--locked'}`}>
              <IonCardContent className="bp-item__body">
                <div className="bp-item__text">
                  <strong>{b.name}</strong>
                  <p>{b.description ?? benefitLabel(b)}</p>
                </div>
                <IonButton
                  size="small"
                  fill={b.affordable ? 'solid' : 'outline'}
                  disabled={!b.affordable || !!busy}
                  onClick={() => reserve(b)}
                >
                  {busy === b.benefitKey ? <IonSpinner name="dots" /> : (
                    <>
                      {!b.affordable && <IonIcon icon={lockClosedOutline} slot="start" />}
                      {fmtInt(b.pointsCost)} pts
                    </>
                  )}
                </IonButton>
              </IonCardContent>
            </IonCard>
          ))}
        </div>
      )}

      <IonNote className="bp-note">
        Los puntos se ganan pagando tus cuotas a tiempo. Las fichas del arcade
        no son puntos y no se canjean.
      </IonNote>
    </div>
  );
};

export default BenefitPicker;

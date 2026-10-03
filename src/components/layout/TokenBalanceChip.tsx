import React from 'react';
import { IonChip, IonIcon, IonLabel, useIonAlert } from '@ionic/react';
import { flashOutline } from 'ionicons/icons';
import { useUser } from '../../contexts/UserContext';
import { useTokenBalance } from '../../hooks/useTokenBalance';
import { fmtInt, fmtTokens, mxDate } from '../../utils/format';
import './TokenBalanceChip.css';

/** Below this the chip turns amber. A ticket reading costs roughly 5K, so this is ~10 readings. */
export const LOW_TOKENS = 50_000;

/**
 * "How many AI tokens does the company have left", always visible in the POS
 * header. Hidden until the balance is known (and if it can't be read), so it
 * never shows a made-up number. Running low only warns — agent calls are not
 * blocked.
 */
const TokenBalanceChip: React.FC = () => {
  const { companyId } = useUser();
  const { balance } = useTokenBalance(companyId);
  const [presentAlert] = useIonAlert();

  if (!balance) return null;

  const state = balance.balance <= 0 ? 'empty' : balance.balance < LOW_TOKENS ? 'low' : 'ok';

  const showDetail = () => {
    const lines = [
      `Saldo: ${fmtInt(balance.balance)} tokens`,
      `Usados hoy: ${fmtInt(balance.usedToday)}`,
      `Usados este mes: ${fmtInt(balance.usedThisMonth)} (${fmtInt(balance.callsThisMonth)} consultas al agente)`,
    ];
    if (balance.lastTopupAt && balance.lastTopupTokens) {
      lines.push(`Última recarga: ${fmtInt(balance.lastTopupTokens)} el ${mxDate(balance.lastTopupAt)}`);
    }
    if (state !== 'ok') {
      lines.push(state === 'empty'
        ? 'Sin tokens: pide una recarga. El agente sigue funcionando por ahora.'
        : 'Quedan pocos tokens: conviene pedir una recarga.');
    }
    presentAlert({
      header: 'Tokens de IA de la empresa',
      message: lines.join('\n'),
      cssClass: 'token-alert',
      buttons: ['Cerrar'],
    });
  };

  return (
    <IonChip
      className={`token-chip token-chip--${state}`}
      onClick={showDetail}
      title="Tokens de IA disponibles"
      aria-label={`Tokens de IA disponibles: ${fmtInt(balance.balance)}`}
    >
      <IonIcon icon={flashOutline} />
      <IonLabel>{fmtTokens(balance.balance)}</IonLabel>
    </IonChip>
  );
};

export default TokenBalanceChip;

import { cartOutline, walletOutline, gameControllerOutline, giftOutline } from 'ionicons/icons';
import type { LoginApp } from '../../utils/loginApps';

export const LOGIN_APP_ICONS: Record<LoginApp, string> = {
  pos: cartOutline,
  smartloans: walletOutline,
  arcade: gameControllerOutline,
  rewards: giftOutline,
};

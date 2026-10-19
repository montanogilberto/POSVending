import {
  fingerPrintOutline, documentTextOutline, shieldCheckmarkOutline,
} from 'ionicons/icons';
import { API_BASE_URL } from '../../../utils/appEnv';

export { API_BASE_URL };

export const STEPS = [
  { icon: fingerPrintOutline,     label: 'Biometría' },
  { icon: documentTextOutline,    label: 'Pagaré'    },
  { icon: shieldCheckmarkOutline, label: 'Contrato'  },
];

import {
  fingerPrintOutline, documentTextOutline, shieldCheckmarkOutline,
} from 'ionicons/icons';

export const API_BASE_URL = 'https://smartloansbackend.azurewebsites.net';

export const STEPS = [
  { icon: fingerPrintOutline,     label: 'Biometría' },
  { icon: documentTextOutline,    label: 'Pagaré'    },
  { icon: shieldCheckmarkOutline, label: 'Contrato'  },
];

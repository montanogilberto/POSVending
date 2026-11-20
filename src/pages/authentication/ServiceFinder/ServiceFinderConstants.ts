import { storefrontOutline, cashOutline, sparklesOutline, gameControllerOutline } from 'ionicons/icons';
import type { FinderQuestion, ServiceId, ServiceInfo } from './ServiceFinderTypes';

export const SERVICES: Record<ServiceId, ServiceInfo> = {
  pos: {
    id: 'pos',
    label: 'POS (Punto de venta)',
    tagline: 'Vende y cobra en tu negocio',
    description: 'Ventas, caja, inventario, recibos y recompensas para tus clientes.',
    url: 'https://mango-smoke-0323ed91e.3.azurestaticapps.net',
    icon: storefrontOutline,
    supportedHere: true,
  },
  smartloans: {
    id: 'smartloans',
    label: 'SmartLoans (P2P)',
    tagline: 'Pide o da préstamos entre personas',
    description: 'Préstamos directos entre personas por SPEI, con contrato y seguimiento.',
    url: 'https://orange-sand-02bfe2210.7.azurestaticapps.net',
    icon: cashOutline,
    supportedHere: true,
  },
  factory: {
    id: 'factory',
    label: 'FactoryAI',
    tagline: 'Genera tu software con IA',
    description: 'Describe tu idea y la IA genera el código de tu app o sistema.',
    url: 'https://www.gmoecosystem.com',
    icon: sparklesOutline,
    supportedHere: false,
  },
  arcade: {
    id: 'arcade',
    label: 'Juegos Online',
    tagline: 'Juega y compite en línea',
    description: 'Mini-juegos con fichas virtuales (no canjeables por dinero).',
    url: 'https://mango-smoke-0323ed91e.3.azurestaticapps.net/arcade',
    icon: gameControllerOutline,
    supportedHere: true,
  },
};

export const SERVICE_ORDER: ServiceId[] = ['pos', 'smartloans', 'factory', 'arcade'];

/**
 * Asked in order; the finder stops early once one service leads the rest by
 * DECISIVE_LEAD points, so a clear first answer goes straight to the result.
 */
export const FINDER_QUESTIONS: FinderQuestion[] = [
  {
    id: 'goal',
    title: '¿Qué te gustaría lograr?',
    subtitle: 'Elige la opción que más se parezca a lo que buscas.',
    options: [
      { id: 'sell',     emoji: '🏪', label: 'Vender y cobrar en mi negocio',          scores: { pos: 3 } },
      { id: 'money',    emoji: '💰', label: 'Pedir o prestar dinero',                 scores: { smartloans: 3 } },
      { id: 'software', emoji: '🤖', label: 'Crear una app o software a la medida',   scores: { factory: 3 } },
      { id: 'play',     emoji: '🕹️', label: 'Jugar y divertirme en línea',            scores: { arcade: 3 } },
      { id: 'unsure',   emoji: '🤔', label: 'Todavía no lo sé',                       scores: {} },
    ],
  },
  {
    id: 'who',
    title: '¿Cuál te describe mejor?',
    subtitle: 'Así te recomiendo el servicio correcto.',
    options: [
      { id: 'business', emoji: '🧾', label: 'Tengo un negocio o trabajo en uno',               scores: { pos: 2, factory: 1 } },
      { id: 'borrower', emoji: '🙋', label: 'Necesito un préstamo',                            scores: { smartloans: 2 } },
      { id: 'lender',   emoji: '💼', label: 'Tengo dinero y quiero prestarlo',                 scores: { smartloans: 2 } },
      { id: 'builder',  emoji: '💡', label: 'Tengo una idea o proceso que quiero automatizar', scores: { factory: 2 } },
      { id: 'player',   emoji: '🎮', label: 'Busco entretenimiento',                           scores: { arcade: 2 } },
    ],
  },
  {
    id: 'need',
    title: '¿Qué es lo más importante para ti ahora?',
    subtitle: 'Última pregunta.',
    options: [
      { id: 'control', emoji: '📦', label: 'Controlar ventas, caja e inventario',        scores: { pos: 2 } },
      { id: 'spei',    emoji: '🏦', label: 'Recibir o enviar dinero de forma segura',    scores: { smartloans: 2 } },
      { id: 'codegen', emoji: '⚙️', label: 'Que la IA genere el código por mí',          scores: { factory: 2 } },
      { id: 'chips',   emoji: '🏆', label: 'Competir con fichas virtuales',              scores: { arcade: 2 } },
    ],
  },
];

export const DECISIVE_LEAD = 3;

/** `/create-account?service=arcade` skips the finder (links from each service's site). */
export const serviceFromSearch = (search: string): ServiceId | null => {
  const v = new URLSearchParams(search).get('service');
  return v && v in SERVICES ? (v as ServiceId) : null;
};

import {
  businessOutline, calendarOutline, chatbubbleEllipsesOutline, documentTextOutline, pricetagOutline, timeOutline,
} from 'ionicons/icons';
import type { DayDraft, FaqDraft, InfoDraft, InfoKey, PromotionDraft, ServiceDraft, SetupStep } from './WhatsAppSetupTypes';

export const STEPS: { id: SetupStep; icon: string; label: string; hint: string }[] = [
  { id: 'business', icon: businessOutline, label: 'Negocio',
    hint: 'Dónde están y cómo contactarlos. El agente sólo da los datos que captures aquí.' },
  { id: 'policies', icon: documentTextOutline, label: 'Precios y políticas',
    hint: 'Lo que el agente responde cuando preguntan precios, recolección o entregas.' },
  { id: 'hours', icon: timeOutline, label: 'Horarios',
    hint: 'Horario de atención por día. Con él se calculan los horarios libres para reservar.' },
  { id: 'services', icon: calendarOutline, label: 'Reservaciones',
    hint: 'Los servicios que el cliente puede reservar por WhatsApp.' },
  { id: 'promotions', icon: pricetagOutline, label: 'Promociones',
    hint: 'Los mismos códigos que aplica el POS al cobrar. El agente los menciona a los clientes.' },
  { id: 'faqs', icon: chatbubbleEllipsesOutline, label: 'Preguntas',
    hint: 'Preguntas frecuentes: el agente responde sólo con lo que diga aquí.' },
];

/** dayOfWeek 0 = lunes … 6 = domingo (sp_reservationHours). */
export const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export const BUSINESS_FIELDS: { key: InfoKey; label: string; placeholder: string; type?: 'tel' | 'email' | 'url' }[] = [
  { key: 'street', label: 'Calle y número', placeholder: 'Blvd. Kino 123, Col. Centro' },
  { key: 'city', label: 'Ciudad', placeholder: 'Hermosillo, Son.' },
  { key: 'postalCode', label: 'Código postal', placeholder: '83000' },
  { key: 'mapsUrl', label: 'Liga de Google Maps', placeholder: 'https://maps.app.goo.gl/…', type: 'url' },
  { key: 'phone', label: 'Teléfono', placeholder: '662 123 4567', type: 'tel' },
  { key: 'whatsappNumber', label: 'WhatsApp del negocio', placeholder: '662 123 4567', type: 'tel' },
  { key: 'email', label: 'Correo', placeholder: 'contacto@negocio.mx', type: 'email' },
  { key: 'websiteUrl', label: 'Página web', placeholder: 'https://negocio.mx', type: 'url' },
  { key: 'paymentMethods', label: 'Formas de pago', placeholder: 'Efectivo, tarjeta, transferencia' },
];

export const POLICY_FIELDS: { key: InfoKey; label: string; placeholder: string }[] = [
  { key: 'servicesInfo', label: 'Servicios y precios',
    placeholder: 'Lavado por kilo $25 · Edredón matrimonial $120 · Planchado por pieza $15' },
  { key: 'pickupPolicy', label: 'Recolección',
    placeholder: 'Recogemos a domicilio de lunes a viernes, mínimo 5 kg' },
  { key: 'deliveryPolicy', label: 'Entregas',
    placeholder: 'Entrega en 24 h; a domicilio con costo de $30 dentro de la ciudad' },
  { key: 'extraInfo', label: 'Otros datos',
    placeholder: 'Estacionamiento gratis · Aceptamos pedidos por DiDi' },
];

/** Every InfoKey once — the Negocio and Políticas steps together. */
export const INFO_KEYS: InfoKey[] = [...BUSINESS_FIELDS, ...POLICY_FIELDS].map(f => f.key);

export const EMPTY_INFO = Object.fromEntries(INFO_KEYS.map(k => [k, ''])) as InfoDraft;
export const DEFAULT_DAY: DayDraft = { open: false, openTime: '09:00', closeTime: '19:00' };

export const MACHINE_TYPES: { value: ServiceDraft['machineType']; label: string }[] = [
  { value: '', label: 'No usa máquinas' },
  { value: 'washer', label: 'Lavadoras' },
  { value: 'dryer', label: 'Secadoras' },
  { value: 'combo', label: 'Lavadora-secadora' },
];

export const EMPTY_SERVICE: ServiceDraft = { name: '', description: '', durationMinutes: '60', capacity: '1', machineType: '' };
export const EMPTY_PROMOTION: PromotionDraft = {
  code: '', name: '', description: '', startDate: '', endDate: '', firstPurchaseOnly: false,
};
export const EMPTY_FAQ: FaqDraft = { question: '', answer: '' };

/** The SPs' validation errors, as the owner should read them. */
export const SP_ERRORS: Record<string, string> = {
  'code already exists for this company': 'ese código ya se usó (aunque la promoción esté quitada); elige otro',
  'name is required': 'falta el nombre',
  'code and name are required': 'faltan el código o el nombre',
  'question and answer are required': 'faltan la pregunta o la respuesta',
};

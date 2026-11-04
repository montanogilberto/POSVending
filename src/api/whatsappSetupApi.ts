import { API_BASE_URL } from '../utils/appEnv';

/**
 * whatsappSetupApi — the company data the WhatsApp agent answers from
 * (LoanAgents tools/backend_api.py reads exactly these). Before this the rows
 * were seeded by SQL; the Agente WhatsApp › Configurar wizard edits them:
 *   POST /businessInfo         sp_businessInfo         (0 get · 1 upsert, only keys sent)
 *   POST /reservationHours     sp_reservationHours     (0 list · 1 set day · 3 close day)
 *   POST /reservationServices  sp_reservationServices  (0 list · 1 insert · 2 update · 3 deactivate)
 *   POST /promotions           sp_promotions           (0 list · 1 insert · 2 update · 3 deactivate)
 *   POST /businessFaqs         sp_businessFaqs         (0 list · 1 insert · 2 update · 3 deactivate)
 * The SPs report validation errors as 200 + { error } — thrown here as Error(message).
 */

export interface BusinessInfo {
  companyName?: string | null;
  address: string | null;
  street: string | null;
  city: string | null;
  postalCode: string | null;
  mapsUrl: string | null;
  phone: string | null;
  whatsappNumber: string | null;
  email: string | null;
  websiteUrl: string | null;
  paymentMethods: string | null;
  servicesInfo: string | null;
  pickupPolicy: string | null;
  deliveryPolicy: string | null;
  extraInfo: string | null;
}

/** dayOfWeek 0 = lunes … 6 = domingo; a day without a row is closed. */
export interface ReservationHour { dayOfWeek: number; openTime: string; closeTime: string }

export type ServiceMachineType = 'washer' | 'dryer' | 'combo';

export interface ReservationService {
  reservationServiceId: number;
  name: string;
  description: string | null;
  durationMinutes: number | null;
  capacity: number | null;
  machineType: ServiceMachineType | null;
  isActive: boolean;
}

export interface Promotion {
  promotionId: number;
  code: string;
  name: string;
  promoType: 'B2G1';
  description: string | null;
  isActive: boolean;
  startAtUtc: string | null;
  endAtUtc: string | null;
  productId: number | null;
  firstPurchaseOnly: boolean;
}

export interface BusinessFaq {
  faqId: number;
  branchId: number | null;
  question: string;
  answer: string;
  sortOrder: number | null;
  isActive: boolean;
}

const post = async <T>(path: string, key: string, row: Record<string, unknown>): Promise<T[]> => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ [key]: [row] }),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data || data.error) {
    console.log('[whatsappSetupApi]', path, 'action', row.action ?? 0, 'failed:', response.status, data?.error);
    throw new Error(data?.error || `Error ${response.status}`);
  }
  return (data.result?.[0]?.[key] ?? []) as T[];
};

export const whatsappSetupApi = {
  getBusinessInfo: async (companyId: number): Promise<BusinessInfo | null> =>
    (await post<BusinessInfo>('/businessInfo', 'businessInfo', { companyId }))[0] ?? null,
  /** Company-wide row (branchId null). Only the keys sent change; null clears one. */
  saveBusinessInfo: (companyId: number, fields: Partial<BusinessInfo>) =>
    post<BusinessInfo>('/businessInfo', 'businessInfo', { action: 1, companyId, ...fields }),

  listHours: (companyId: number) =>
    post<ReservationHour>('/reservationHours', 'reservationHours', { companyId }),
  setHour: (companyId: number, h: ReservationHour) =>
    post<ReservationHour>('/reservationHours', 'reservationHours', { action: 1, companyId, ...h }),
  closeDay: (companyId: number, dayOfWeek: number) =>
    post<ReservationHour>('/reservationHours', 'reservationHours', { action: 3, companyId, dayOfWeek }),

  listServices: (companyId: number) =>
    post<ReservationService>('/reservationServices', 'reservationServices', { companyId }),
  createService: (companyId: number, fields: Omit<ReservationService, 'reservationServiceId' | 'isActive'>) =>
    post<ReservationService>('/reservationServices', 'reservationServices', { action: 1, companyId, ...fields }),
  updateService: (companyId: number, reservationServiceId: number, fields: Partial<ReservationService>) =>
    post<ReservationService>('/reservationServices', 'reservationServices', { action: 2, companyId, reservationServiceId, ...fields }),
  deactivateService: (companyId: number, reservationServiceId: number) =>
    post<ReservationService>('/reservationServices', 'reservationServices', { action: 3, companyId, reservationServiceId }),

  listPromotions: (companyId: number) =>
    post<Promotion>('/promotions', 'promotions', { companyId }),
  createPromotion: (companyId: number, fields: Omit<Promotion, 'promotionId' | 'isActive' | 'productId'>) =>
    post<Promotion>('/promotions', 'promotions', { action: 1, companyId, ...fields }),
  updatePromotion: (companyId: number, promotionId: number, fields: Partial<Promotion>) =>
    post<Promotion>('/promotions', 'promotions', { action: 2, companyId, promotionId, ...fields }),
  deactivatePromotion: (companyId: number, promotionId: number) =>
    post<Promotion>('/promotions', 'promotions', { action: 3, companyId, promotionId }),

  listFaqs: (companyId: number) =>
    post<BusinessFaq>('/businessFaqs', 'businessFaqs', { companyId }),
  createFaq: (companyId: number, fields: { question: string; answer: string; sortOrder?: number | null }) =>
    post<BusinessFaq>('/businessFaqs', 'businessFaqs', { action: 1, companyId, ...fields }),
  updateFaq: (companyId: number, faqId: number, fields: Partial<BusinessFaq>) =>
    post<BusinessFaq>('/businessFaqs', 'businessFaqs', { action: 2, companyId, faqId, ...fields }),
  deactivateFaq: (companyId: number, faqId: number) =>
    post<BusinessFaq>('/businessFaqs', 'businessFaqs', { action: 3, companyId, faqId }),
};

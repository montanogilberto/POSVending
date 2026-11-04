import type { BusinessInfo, ServiceMachineType } from '../../../api/whatsappSetupApi';

export type SetupStep = 'business' | 'policies' | 'hours' | 'services' | 'promotions' | 'faqs';

/** Editable text fields of the company-wide businessInfo row ('' = not provided). */
export type InfoKey = Exclude<keyof BusinessInfo, 'companyName' | 'address'>;
export type InfoDraft = Record<InfoKey, string>;

export interface DayDraft { open: boolean; openTime: string; closeTime: string }

export interface ServiceDraft {
  name: string;
  description: string;
  durationMinutes: string;
  capacity: string;
  machineType: ServiceMachineType | '';
}

/** Dates are Hermosillo calendar days 'YYYY-MM-DD' ('' = no limit). */
export interface PromotionDraft {
  code: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  firstPurchaseOnly: boolean;
}

export interface FaqDraft { question: string; answer: string }

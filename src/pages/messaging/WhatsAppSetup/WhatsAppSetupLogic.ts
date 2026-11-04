import { useCallback, useMemo, useState } from 'react';
import { useIonViewWillEnter } from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { useUser } from '../../../contexts/UserContext';
import { useToast } from '../../../hooks/useToast';
import { notifyDataChanged } from '../../../utils/refreshBus';
import { hermosilloDayKey } from '../../../utils/period';
import {
  whatsappSetupApi, type BusinessFaq, type BusinessInfo, type Promotion, type ReservationHour, type ReservationService,
} from '../../../api/whatsappSetupApi';
import {
  BUSINESS_FIELDS, DAYS, DEFAULT_DAY, EMPTY_FAQ, EMPTY_INFO, EMPTY_PROMOTION, EMPTY_SERVICE, INFO_KEYS,
  POLICY_FIELDS, STEPS,
} from './WhatsAppSetupConstants';
import type { DayDraft, FaqDraft, InfoDraft, InfoKey, PromotionDraft, ServiceDraft } from './WhatsAppSetupTypes';
import { useCatalogEditor } from './useCatalogEditor';

const BUSINESS_KEYS = BUSINESS_FIELDS.map(f => f.key);
const POLICY_KEYS = POLICY_FIELDS.map(f => f.key);

const toInfoDraft = (info: BusinessInfo | null): InfoDraft => {
  const d = { ...EMPTY_INFO };
  if (!info) return d;
  INFO_KEYS.forEach(k => { d[k] = info[k] ?? ''; });
  // Rows seeded before street/city/postalCode existed only have the free-text address.
  if (!d.street && !d.city && !d.postalCode && info.address) d.street = info.address;
  return d;
};

const toDays = (hours: ReservationHour[]): DayDraft[] =>
  DAYS.map((_, i) => {
    const h = hours.find(x => x.dayOfWeek === i);
    return h ? { open: true, openTime: h.openTime, closeTime: h.closeTime } : { ...DEFAULT_DAY };
  });

/** Hermosillo is UTC-7 all year: day D runs from D 07:00 UTC to D+1 06:59:59 UTC. */
const dayStartUtc = (day: string) => `${day}T07:00:00`;
const dayEndUtc = (day: string) => {
  const next = new Date(`${day}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return `${next.toISOString().slice(0, 10)}T06:59:59`;
};

const intOrNull = (s: string) => (s.trim() === '' ? null : Number.parseInt(s, 10));
const textOrNull = (s: string) => (s.trim() === '' ? null : s.trim());

/** Agente WhatsApp › Configurar: the company data the WhatsApp agent answers from. */
export const useWhatsAppSetup = () => {
  const { companyId } = useUser();
  const history = useHistory();
  const { showToast, toastProps } = useToast({ defaultColor: 'success' });

  const [stepIndex, setStepIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [savingStep, setSavingStep] = useState(false);

  const [savedInfo, setSavedInfo] = useState<InfoDraft>(EMPTY_INFO);
  const [info, setInfo] = useState<InfoDraft>(EMPTY_INFO);
  const [savedDays, setSavedDays] = useState<DayDraft[]>(toDays([]));
  const [days, setDays] = useState<DayDraft[]>(toDays([]));
  const [services, setServices] = useState<ReservationService[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [faqs, setFaqs] = useState<BusinessFaq[]>([]);

  const reloadServices = useCallback(async () => {
    if (companyId) setServices(await whatsappSetupApi.listServices(companyId));
  }, [companyId]);
  const reloadPromotions = useCallback(async () => {
    if (companyId) setPromotions((await whatsappSetupApi.listPromotions(companyId)).filter(p => p.isActive));
  }, [companyId]);
  const reloadFaqs = useCallback(async () => {
    if (companyId) setFaqs((await whatsappSetupApi.listFaqs(companyId)).filter(f => f.isActive));
  }, [companyId]);

  const load = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    setLoadError(false);
    try {
      const [bi, hours] = await Promise.all([
        whatsappSetupApi.getBusinessInfo(companyId),
        whatsappSetupApi.listHours(companyId),
        reloadServices(), reloadPromotions(), reloadFaqs(),
      ]);
      const draft = toInfoDraft(bi);
      setSavedInfo(draft);
      setInfo(draft);
      setSavedDays(toDays(hours));
      setDays(toDays(hours));
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [companyId, reloadServices, reloadPromotions, reloadFaqs]);

  useIonViewWillEnter(() => { load(); });

  // ── Negocio / Precios y políticas ──────────────────────────────────────
  const setInfoField = (key: InfoKey, value: string) => setInfo(d => ({ ...d, [key]: value }));

  const saveInfo = async (keys: InfoKey[]) => {
    if (!companyId) return;
    const changed = keys.filter(k => info[k].trim() !== savedInfo[k].trim());
    if (changed.length === 0) return;
    const fields: Partial<BusinessInfo> = {};
    changed.forEach(k => { fields[k] = textOrNull(info[k]); });
    if (changed.some(k => k === 'street' || k === 'city' || k === 'postalCode')) {
      // The agent also reads the free-text address: keep it in step with the parts.
      const cp = info.postalCode.trim() ? `C.P. ${info.postalCode.trim()}` : '';
      fields.address = textOrNull([info.street, info.city, cp].map(s => s.trim()).filter(Boolean).join(', '));
    }
    await whatsappSetupApi.saveBusinessInfo(companyId, fields);
    setSavedInfo(d => ({ ...d, ...Object.fromEntries(changed.map(k => [k, info[k]])) }));
  };

  // ── Horarios ───────────────────────────────────────────────────────────
  const setDay = (i: number, patch: Partial<DayDraft>) =>
    setDays(ds => ds.map((d, j) => (j === i ? { ...d, ...patch } : d)));

  const saveHours = async () => {
    if (!companyId) return;
    const bad = days.findIndex(d => d.open && (!d.openTime || !d.closeTime || d.closeTime <= d.openTime));
    if (bad >= 0) throw new Error(`${DAYS[bad]}: la hora de cierre debe ser después de la de apertura`);
    for (let i = 0; i < days.length; i++) {
      const d = days[i];
      const s = savedDays[i];
      if (d.open && (!s.open || d.openTime !== s.openTime || d.closeTime !== s.closeTime)) {
        await whatsappSetupApi.setHour(companyId, { dayOfWeek: i, openTime: d.openTime, closeTime: d.closeTime });
      } else if (!d.open && s.open) {
        await whatsappSetupApi.closeDay(companyId, i);
      }
    }
    setSavedDays(days);
  };

  // ── Catálogos ──────────────────────────────────────────────────────────
  const serviceEditor = useCatalogEditor<ReservationService, ServiceDraft>({
    noun: 'el servicio',
    idOf: s => s.reservationServiceId,
    empty: EMPTY_SERVICE,
    toDraft: s => ({
      name: s.name, description: s.description ?? '', machineType: s.machineType ?? '',
      durationMinutes: s.durationMinutes == null ? '' : String(s.durationMinutes),
      capacity: s.capacity == null ? '' : String(s.capacity),
    }),
    validate: d => {
      if (!d.name.trim()) return 'Escribe el nombre del servicio';
      const dur = intOrNull(d.durationMinutes);
      const cap = intOrNull(d.capacity);
      if (dur != null && !(dur >= 5 && dur <= 600)) return 'La duración debe ser de 5 a 600 minutos';
      if (cap != null && !(cap >= 1 && cap <= 100)) return 'Los lugares por horario deben ser de 1 a 100';
      return null;
    },
    create: d => whatsappSetupApi.createService(companyId!, serviceFields(d)),
    update: (id, d) => whatsappSetupApi.updateService(companyId!, id, serviceFields(d)),
    remove: id => whatsappSetupApi.deactivateService(companyId!, id),
    reload: reloadServices,
    showToast,
  });

  const promotionEditor = useCatalogEditor<Promotion, PromotionDraft>({
    noun: 'la promoción',
    idOf: p => p.promotionId,
    empty: EMPTY_PROMOTION,
    toDraft: p => ({
      code: p.code, name: p.name, description: p.description ?? '', firstPurchaseOnly: !!p.firstPurchaseOnly,
      startDate: p.startAtUtc ? hermosilloDayKey(p.startAtUtc) : '',
      endDate: p.endAtUtc ? hermosilloDayKey(p.endAtUtc) : '',
    }),
    validate: d => {
      if (!/^[A-Z0-9]{2,30}$/i.test(d.code.trim())) return 'El código lleva de 2 a 30 letras o números, sin espacios';
      if (!d.name.trim()) return 'Escribe el nombre de la promoción';
      if (d.startDate && d.endDate && d.endDate < d.startDate) return 'La fecha final debe ser después de la inicial';
      return null;
    },
    create: d => whatsappSetupApi.createPromotion(companyId!, { promoType: 'B2G1', ...promotionFields(d) }),
    update: (id, d) => whatsappSetupApi.updatePromotion(companyId!, id, promotionFields(d)),
    remove: id => whatsappSetupApi.deactivatePromotion(companyId!, id),
    reload: reloadPromotions,
    showToast,
  });

  const faqEditor = useCatalogEditor<BusinessFaq, FaqDraft>({
    noun: 'la pregunta',
    idOf: f => f.faqId,
    empty: EMPTY_FAQ,
    toDraft: f => ({ question: f.question, answer: f.answer }),
    validate: d => (!d.question.trim() ? 'Escribe la pregunta' : !d.answer.trim() ? 'Escribe la respuesta' : null),
    create: d => whatsappSetupApi.createFaq(companyId!, {
      question: d.question.trim(), answer: d.answer.trim(), sortOrder: faqs.length + 1,
    }),
    update: (id, d) => whatsappSetupApi.updateFaq(companyId!, id, { question: d.question.trim(), answer: d.answer.trim() }),
    remove: id => whatsappSetupApi.deactivateFaq(companyId!, id),
    reload: reloadFaqs,
    showToast,
  });

  // ── Navegación ─────────────────────────────────────────────────────────
  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;

  const stepDone = useMemo(() => [
    BUSINESS_KEYS.some(k => savedInfo[k].trim()),
    POLICY_KEYS.some(k => savedInfo[k].trim()),
    savedDays.some(d => d.open),
    services.length > 0,
    promotions.length > 0,
    faqs.length > 0,
  ], [savedInfo, savedDays, services, promotions, faqs]);

  /** Saves the step's form (Negocio / Políticas / Horarios), then moves on. */
  const next = async () => {
    if (savingStep) return;
    setSavingStep(true);
    try {
      if (step.id === 'business') await saveInfo(BUSINESS_KEYS);
      if (step.id === 'policies') await saveInfo(POLICY_KEYS);
      if (step.id === 'hours') await saveHours();
      notifyDataChanged('whatsappSetup');
      if (isLast) {
        showToast('✓ Listo: el agente de WhatsApp ya usa estos datos');
        history.push('/whatsapp-agent');
      } else {
        setStepIndex(i => i + 1);
      }
    } catch (e) {
      showToast(`No se pudo guardar: ${e instanceof Error ? e.message : e}`, 'danger');
    } finally {
      setSavingStep(false);
    }
  };
  const back = () => setStepIndex(i => Math.max(0, i - 1));
  const goTo = (i: number) => { if (!savingStep) setStepIndex(i); };

  return {
    loading, loadError, load, toastProps,
    stepIndex, step, isLast, stepDone, savingStep, next, back, goTo,
    info, setInfoField,
    days, setDay,
    services, serviceEditor,
    promotions, promotionEditor,
    faqs, faqEditor,
  };
};

export type WhatsAppSetupVM = ReturnType<typeof useWhatsAppSetup>;

function serviceFields(d: ServiceDraft) {
  return {
    name: d.name.trim(),
    description: textOrNull(d.description),
    durationMinutes: intOrNull(d.durationMinutes),
    capacity: intOrNull(d.capacity),
    machineType: d.machineType || null,
  };
}

function promotionFields(d: PromotionDraft) {
  return {
    code: d.code.trim().toUpperCase(),
    name: d.name.trim(),
    description: textOrNull(d.description),
    startAtUtc: d.startDate ? dayStartUtc(d.startDate) : null,
    endAtUtc: d.endDate ? dayEndUtc(d.endDate) : null,
    firstPurchaseOnly: d.firstPurchaseOnly,
  };
}

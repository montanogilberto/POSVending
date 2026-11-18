import { useState } from 'react';
import { publishOperationalNotice, type NoticeType } from '../../../api/operationalNoticeApi';
import type { OperationalNoticeTemplate } from '../../../api/operationalNoticeTemplateApi';
import { addDaysISO, hermosilloTodayISO, mxLongDay } from '../../../utils/format';
import {
  DEFAULT_HORARIO, MESSAGE_MAX, TITLE_MAX, fillPlaceholders, hasPlaceholders, type VariableKey,
} from './OperationalNoticeConstants';

export type WizardStep = 1 | 2 | 3;

/**
 * "Nuevo aviso" in three steps: 1 pick a template (or start from scratch), 2 fill its
 * blanks and the dates, 3 review/edit the final text and publish. Placeholders are
 * replaced here; the backend only ever stores the final text.
 */
export const useNoticeWizard = (opts: {
  companyId: number;
  companyName: string;
  onPublished: (message: string) => void;
  onError: (message: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<WizardStep>(1);
  const [template, setTemplate] = useState<OperationalNoticeTemplate | null>(null);
  const [values, setValues] = useState<Partial<Record<VariableKey, string>>>({});
  const [reopenDate, setReopenDateRaw] = useState('');
  const [noticeType, setNoticeType] = useState<NoticeType>('cierre');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [useHours, setUseHours] = useState(false);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [blocksReservations, setBlocksReservations] = useState(true);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [publishing, setPublishing] = useState(false);

  const today = hermosilloTodayISO();
  const tomorrow = addDaysISO(today, 1);
  const variables = (template?.variables ?? []).filter((v): v is VariableKey => v !== 'nombre_empresa');

  /** Reopening on day X of a closure = the closure ends the day before (never before it starts). */
  const setReopenDate = (iso: string) => {
    setReopenDateRaw(iso);
    if (iso && noticeType === 'cierre') {
      const lastClosedDay = addDaysISO(iso, -1);
      setEndDate(lastClosedDay < startDate ? startDate : lastClosedDay);
    }
  };

  const start = (preset?: OperationalNoticeTemplate | null) => {
    setTemplate(preset ?? null);
    setStep(preset ? 2 : 1);
    setValues({ horario: DEFAULT_HORARIO });
    setNoticeType(preset?.noticeType ?? 'cierre');
    setBlocksReservations(preset ? preset.blocksReservations : true);
    setStartDate(today);
    setEndDate(today);
    setReopenDateRaw(tomorrow);
    setUseHours(false);
    setStartTime('');
    setEndTime('');
    setTitle('');
    setMessage('');
    setOpen(true);
  };

  const pickTemplate = (t: OperationalNoticeTemplate | null) => {
    setTemplate(t);
    setNoticeType(t?.noticeType ?? 'cierre');
    setBlocksReservations(t ? t.blocksReservations : true);
    setStep(2);
  };

  const setValue = (key: VariableKey, value: string) => setValues(v => ({ ...v, [key]: value }));

  const filled = (): Record<string, string> => ({
    ...values,
    nombre_empresa: opts.companyName,
    fecha_reapertura: reopenDate ? mxLongDay(reopenDate) : '',
  });

  const datesOk = !!startDate && !!endDate && endDate >= startDate && endDate >= today
    && (!useHours || (!!startTime && !!endTime && endTime > startTime));
  const step2Ok = datesOk && variables.every(v => v === 'fecha_reapertura' ? !!reopenDate : !!values[v]?.trim());

  const goToPreview = () => {
    if (!step2Ok) return;
    const vals = filled();
    setTitle(template ? fillPlaceholders(template.defaultTitle, vals).slice(0, TITLE_MAX) : title);
    setMessage(template ? fillPlaceholders(template.defaultMessage, vals).slice(0, MESSAGE_MAX) : message);
    setStep(3);
  };

  const back = () => setStep(s => (s === 3 ? 2 : 1));
  const close = () => { if (!publishing) setOpen(false); };

  const leftoverPlaceholders = hasPlaceholders(message) || hasPlaceholders(title);
  const canPublish = step === 3 && datesOk && !!title.trim() && !!message.trim() && !leftoverPlaceholders
    && message.length <= MESSAGE_MAX && !publishing;

  const publish = async () => {
    if (!canPublish) return;
    setPublishing(true);
    try {
      await publishOperationalNotice({
        companyId: opts.companyId,
        templateId: template?.operationalNoticeTemplateId ?? null,
        branchId: null,
        title: title.trim(),
        noticeType,
        customerMessage: message.trim(),
        startDate,
        endDate,
        startTime: useHours ? startTime : '',
        endTime: useHours ? endTime : '',
        blocksReservations: noticeType === 'cierre' ? blocksReservations : false,
      });
      setOpen(false);
      opts.onPublished('Aviso publicado. Los agentes ya lo usan.');
    } catch (e) {
      opts.onError((e as Error).message || 'No se pudo publicar el aviso');
    } finally {
      setPublishing(false);
    }
  };

  return {
    open, step, template, variables, values, setValue, reopenDate, setReopenDate, today, tomorrow,
    noticeType, setNoticeType, startDate, setStartDate, endDate, setEndDate, useHours, setUseHours,
    startTime, setStartTime, endTime, setEndTime, blocksReservations, setBlocksReservations,
    title, setTitle, message, setMessage, publishing, datesOk, step2Ok, leftoverPlaceholders, canPublish,
    start, pickTemplate, goToPreview, back, close, publish,
  };
};

export type NoticeWizardVM = ReturnType<typeof useNoticeWizard>;

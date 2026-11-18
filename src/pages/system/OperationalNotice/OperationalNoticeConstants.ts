import {
  alertCircleOutline, calendarOutline, checkmarkCircleOutline, constructOutline, createOutline, flashOffOutline,
  megaphoneOutline, thunderstormOutline, timeOutline, waterOutline,
} from 'ionicons/icons';
import type { NoticeState, NoticeType } from '../../../api/operationalNoticeApi';

export const NOTICE_TYPES: { value: NoticeType; label: string; hint: string }[] = [
  { value: 'cierre', label: 'Cierre', hint: 'El negocio no atiende en esas fechas.' },
  { value: 'horario_especial', label: 'Horario especial', hint: 'Abre con un horario distinto al habitual.' },
  { value: 'aviso', label: 'Aviso', hint: 'Información para clientes; el negocio sigue abierto.' },
];
export const NOTICE_TYPE_LABEL: Record<NoticeType, string> = {
  cierre: 'Cierre', horario_especial: 'Horario especial', aviso: 'Aviso',
};

/** Order of the list groups; the last one starts collapsed. */
export const STATE_GROUPS: { key: string; label: string; states: NoticeState[] }[] = [
  { key: 'vigentes', label: 'Vigentes', states: ['vigente'] },
  { key: 'programados', label: 'Programados', states: ['programado'] },
  { key: 'pasados', label: 'Vencidos y finalizados', states: ['vencido', 'finalizado'] },
];

/** Placeholders a template may use. nombre_empresa is filled from the session, never asked. */
export type VariableKey = 'nombre_empresa' | 'motivo' | 'fecha_reapertura' | 'horario' | 'servicio_afectado';
export const VARIABLES: Record<VariableKey, { label: string; placeholder: string; helper?: string }> = {
  nombre_empresa: { label: 'Nombre de la empresa', placeholder: '' },
  motivo: {
    label: 'Motivo', placeholder: 'la falta de suministro de agua',
    helper: 'Escríbelo como completaría la frase: "…debido a ___".',
  },
  fecha_reapertura: { label: 'Fecha de reapertura', placeholder: '' },
  horario: { label: 'Horario', placeholder: 'nuestro horario habitual' },
  servicio_afectado: { label: 'Servicio afectado', placeholder: 'el servicio de secado' },
};
export const ASKED_VARIABLES = (Object.keys(VARIABLES) as VariableKey[]).filter(v => v !== 'nombre_empresa');
export const DEFAULT_HORARIO = 'nuestro horario habitual';

/** Ionicons names a template may store in `icon` → icon. Unknown names fall back to a megaphone. */
export const TEMPLATE_ICONS: Record<string, string> = {
  waterOutline, constructOutline, timeOutline, thunderstormOutline, flashOffOutline, calendarOutline,
  alertCircleOutline, checkmarkCircleOutline, megaphoneOutline,
};
export const templateIcon = (name: string): string => TEMPLATE_ICONS[name] ?? megaphoneOutline;
export const SCRATCH_ICON = createOutline;

export const TITLE_MAX = 120;
export const MESSAGE_MAX = 1000;

/** Replace {placeholder} by its value; unknown or empty ones stay so the publish check catches them. */
export const fillPlaceholders = (text: string, values: Record<string, string>): string =>
  text.replace(/\{([a-z_]+)\}/g, (whole, key: string) => (values[key]?.trim() ? values[key].trim() : whole));

export const hasPlaceholders = (text: string): boolean => /\{[a-z_]+\}/.test(text);

/** Key of the template offered after finalizing a closure early. */
export const RESUMPTION_TEMPLATE_KEY = 'reanudacion';

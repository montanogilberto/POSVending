import {
  barChartOutline, cashOutline, desktopOutline, documentTextOutline, ellipsisHorizontalOutline, logoWhatsapp,
} from 'ionicons/icons';
import type { AgentArea, AgentInput } from '../../../api/agentApi';

/** `tone` picks the icon tile / chip colors in Agent.css (.agent-tone-{tone}). */
export const AREAS: { value: AgentArea; label: string; icon: string; tone: string }[] = [
  { value: 'whatsapp', label: 'WhatsApp', icon: logoWhatsapp, tone: 'whatsapp' },
  { value: 'pos_support', label: 'Soporte POS', icon: desktopOutline, tone: 'pos' },
  { value: 'loans', label: 'Préstamos', icon: cashOutline, tone: 'loans' },
  { value: 'extraction', label: 'Documentos', icon: documentTextOutline, tone: 'docs' },
  { value: 'other', label: 'Otros', icon: ellipsisHorizontalOutline, tone: 'other' },
];

export const AREA_META: Record<AgentArea, (typeof AREAS)[number]> = Object.fromEntries(
  AREAS.map(a => [a.value, a]),
) as Record<AgentArea, (typeof AREAS)[number]>;

/** Card icon: the area's, except analytics agents that only read conversations. */
export const agentIcon = (agent: { agentKey: string; area: AgentArea }): string =>
  /insight|analytic|demand/.test(agent.agentKey) ? barChartOutline : AREA_META[agent.area]?.icon ?? AREA_META.other.icon;

export type StatusFilter = 'all' | 'activo' | 'retirado';
export const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'activo', label: 'Activos' },
  { value: 'retirado', label: 'Retirados' },
];

export const AREA_LABEL: Record<AgentArea, string> = Object.fromEntries(
  AREAS.map(a => [a.value, a.label]),
) as Record<AgentArea, string>;

export const EMPTY_AGENT: AgentInput = {
  agentKey: '', name: '', description: '', area: 'whatsapp', endpoint: '', model: '', customerFacing: false,
};

/** Admin of the SmartLoans company: the only one who edits the catalog (the backend enforces it). */
export const PLATFORM_COMPANY_ID = 1008;

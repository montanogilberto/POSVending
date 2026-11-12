import type { DemandConcept } from '../../../api/demandSignalsApi';

/** Hermosillo city center: the map's starting point. */
export const HERMOSILLO_CENTER: [number, number] = [29.0729, -110.9559];
export const HERMOSILLO_ZOOM = 12;

export type ConceptFilter = 'todos' | DemandConcept;

export const CONCEPT_LABEL: Record<DemandConcept, string> = {
  autoservicio_24h: 'Autoservicio 24 h',
  lockers: 'Lockers',
  qr_gmo: 'QR GMO',
};

export const PERIOD_OPTIONS = [
  { days: 7, label: '7 días' },
  { days: 30, label: '30 días' },
  { days: 90, label: '90 días' },
] as const;

export const TIME_LABEL: Record<string, string> = {
  temprano: 'Temprano',
  dia: 'Día',
  tarde: 'Tarde',
  noche: 'Noche',
  madrugada: 'Madrugada',
  fin_de_semana: 'Fin de semana',
};

/** Zones the backend can't place on the map. */
export const UNMAPPED_ZONES = new Set(['otras zonas', 'sin ubicar']);

export const HOST_STATUSES = ['nuevo', 'contactado', 'visitado', 'aprobado', 'instalado', 'descartado'] as const;

export const HOST_STATUS_LABEL: Record<string, string> = {
  nuevo: 'Nuevo',
  contactado: 'Contactado',
  visitado: 'Visitado',
  aprobado: 'Aprobado',
  instalado: 'Instalado',
  descartado: 'Descartado',
};

export const BUSINESS_TYPE_LABEL: Record<string, string> = {
  tienda: 'Tienda', gimnasio: 'Gimnasio', farmacia: 'Farmacia', oficina: 'Oficina',
  escuela: 'Escuela', gasolinera: 'Gasolinera', restaurante: 'Restaurante', otro: 'Otro',
};

export const VISITORS_LABEL: Record<string, string> = {
  menos_50: '< 50/día', '50_200': '50–200/día', mas_200: '> 200/día', no_seguro: '—',
};

export const SPACE_LABEL: Record<string, string> = {
  interior: 'Interior', exterior: 'Exterior', estacionamiento: 'Estacionamiento', no_seguro: '—',
};

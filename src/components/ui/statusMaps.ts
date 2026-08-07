/**
 * Mapas estado→etiqueta/color — única fuente de verdad por dominio.
 * Antes cada página definía el suyo y "Aceptada" podía salir de otro color
 * según la pantalla.
 */
export interface StatusMeta {
  label: string;
  color: string; // color Ionic (primary/success/danger/warning/medium)
}

/** Conversaciones de negociación (loanConversations.status). */
export const CONVERSATION_STATUS: Record<string, StatusMeta> = {
  open:     { label: 'Abierta',   color: 'primary' },
  accepted: { label: 'Aceptada',  color: 'success' },
  rejected: { label: 'Rechazada', color: 'danger'  },
  closed:   { label: 'Cerrada',   color: 'medium'  },
};

/** Préstamos (loans.loanStatus, comparar en minúsculas). */
export const LOAN_STATUS: Record<string, StatusMeta> = {
  active:  { label: 'Activo',    color: 'success' },
  pending: { label: 'Pendiente', color: 'warning' },
  paidoff: { label: 'Pagado',    color: 'primary' },
  closed:  { label: 'Cerrado',   color: 'medium'  },
};

/** Propuestas P2P (labels; los colores viven en P2PLendingPage.css .p2p-status-*). */
export const PROPOSAL_STATUS: Record<string, { label: string }> = {
  pending:   { label: 'Pendiente' },
  accepted:  { label: 'Aceptada'  },
  rejected:  { label: 'Rechazada' },
  expired:   { label: 'Vencida'   },
  cancelled: { label: 'Cancelada' },
};

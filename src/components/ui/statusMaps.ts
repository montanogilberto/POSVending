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
  active:          { label: 'Activo',            color: 'success' },
  pending:         { label: 'Pendiente',         color: 'warning' },
  // RFC-002 no-custodio: aprobado pero esperando el SPEI del prestamista.
  pending_funding: { label: 'Por fondear',       color: 'warning' },
  overdue:         { label: 'Vencido',           color: 'danger'  },
  defaulted:       { label: 'En mora',           color: 'danger'  },
  paidoff:         { label: 'Pagado',            color: 'primary' },
  closed:          { label: 'Cerrado',           color: 'medium'  },
  cancelled:       { label: 'Cancelado',         color: 'medium'  },
};

/** Propuestas P2P (labels; los colores viven en P2PLendingPage.css .p2p-status-*). */
export const PROPOSAL_STATUS: Record<string, { label: string }> = {
  pending:   { label: 'Pendiente' },
  accepted:  { label: 'Aceptada'  },
  rejected:  { label: 'Rechazada' },
  expired:   { label: 'Vencida'   },
  cancelled: { label: 'Cancelada' },
};

/** Resultado de una ronda del arcade (arcadeRounds.outcome). */
export const ARCADE_OUTCOME: Record<string, StatusMeta> = {
  win:       { label: 'Ganada',    color: 'success' },
  blackjack: { label: 'Blackjack', color: 'success' },
  push:      { label: 'Empate',    color: 'warning' },
  lose:      { label: 'Perdida',   color: 'medium'  },
};

/** Topic tag (LoanAgents agents/whatsapp_topic TOPICS) → what the owner reads. */
export const TOPIC_LABEL: Record<string, string> = {
  precios: 'Precios',
  horarios: 'Horarios',
  ubicacion: 'Ubicación',
  servicios: 'Servicios',
  reservacion: 'Reservaciones',
  estado_pedido: 'Estado de su pedido',
  entrega_domicilio: 'Recolección / entrega',
  pagos: 'Pagos y facturas',
  puntos_promociones: 'Puntos y promociones',
  queja: 'Quejas',
  saludo: 'Solo saludo',
  confirmacion: 'Confirmaciones (sí, ok, gracias)',
  baja_alta: 'Baja / alta de mensajes',
  otro: 'Otros',
};

/** Not a request — shown apart so the real questions stand out. */
export const NON_REQUEST_TOPICS = new Set(['saludo', 'confirmacion', 'baja_alta']);

export const WEEKDAY_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

/** "3 p. m." for an hour 0–23. */
export const hourLabel = (h: number) => `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? 'a. m.' : 'p. m.'}`;

/** How a conversation ended (sp_whatsappAgentDashboard quality.outcome). Finalized = cerrada + le_sirvio. */
export const CHAT_OUTCOME: Record<string, { label: string; color: string; help: string }> = {
  cerrada:       { label: 'Cerrada bien',      color: 'success',  help: 'Dijo que no necesitaba nada más (el agente se despidió) o reservó' },
  le_sirvio:     { label: 'Le sirvió',         color: 'success',  help: 'Contestó "sí" a "¿Te funcionó la respuesta?"' },
  no_le_sirvio:  { label: 'No le sirvió',      color: 'danger',   help: 'Contestó "no" a "¿Te funcionó la respuesta?" y no se resolvió' },
  falla_agente:  { label: 'Falla del agente',  color: 'danger',   help: 'El agente no pudo responder y mandó el mensaje genérico' },
  pidio_persona: { label: 'Pidió persona',     color: 'warning',  help: 'Pidió hablar con alguien y nadie del equipo le escribió' },
  sin_cierre:    { label: 'Sin cierre',        color: 'medium',   help: 'Dejó de escribir a mitad de la conversación' },
};

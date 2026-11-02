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

export function formatClientName(name: string): string {
  if (!name) return 'Desconocido -…';
  const lowerName = name.toLowerCase().trim();
  if (
    lowerName === 'desconocido' ||
    lowerName === 'mostrador' ||
    lowerName === 'mostrador / desconocido' ||
    lowerName.includes('desconocido')
  ) {
    return 'Desconocido -…';
  }
  return name;
}

export function normalizePaymentMethod(
  method: string
): 'efectivo' | 'tarjeta' | 'transferencia' {
  const normalized = method.toLowerCase().trim();
  if (normalized.includes('efectivo') || normalized.includes('cash')) return 'efectivo';
  if (normalized.includes('tarjeta') || normalized.includes('card')) return 'tarjeta';
  return 'transferencia';
}

export function getPaymentMethodText(method: string): string {
  switch (method) {
    case 'efectivo':
      return 'Efectivo';
    case 'tarjeta':
      return 'Tarjeta';
    case 'transferencia':
      return 'Transferencia';
    default:
      return method;
  }
}

export function toEsDateTime(dateLike: string | number | Date): { date: string; time: string } {
  const date = new Date(dateLike);
  return {
    date: date.toLocaleDateString('es-ES'),
    time: date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  };
}

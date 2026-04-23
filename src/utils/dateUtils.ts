/**
 * Parse SQL datetime ("2026-04-08 22:17:53") to UTC Date
 * Returns null for invalid/null input
 */
export function parseSqlDateToUTC(paymentDate: string | null | undefined): Date | null {
  if (!paymentDate) return null;
  
  try {
    // "2026-04-08 22:17:53" → "2026-04-08T22:17:53:00Z"
    const dateStr = paymentDate.replace(' ', 'T') + ':00Z';
    const date = new Date(dateStr);
    
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

/**
 * Check if date is current month (UTC)
 */
export function isCurrentMonthUTC(date: Date): boolean {
  const now = new Date();
  return date.getUTCMonth() === now.getUTCMonth() &&
         date.getUTCFullYear() === now.getUTCFullYear();
}

/**
 * Check if date is today (UTC date-only)
 */
export function isTodayUTC(date: Date): boolean {
  const now = new Date();
  const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return date.toISOString().split('T')[0] === todayUTC.toISOString().split('T')[0];
}


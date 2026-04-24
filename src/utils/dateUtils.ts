// utils/dateUtils.ts

// Parse SQL Server datetime string safely (UTC aware)
export const parseSqlDateToUTC = (dateStr: string): Date | null => {
  if (!dateStr) return null;

  try {
    // Convert "YYYY-MM-DD HH:mm:ss.sss" → "YYYY-MM-DDTHH:mm:ss.sssZ"
    const iso = dateStr.replace(' ', 'T') + 'Z';

    const date = new Date(iso);

    if (isNaN(date.getTime())) {
      console.warn('[parseSqlDateToUTC] Invalid date:', dateStr);
      return null;
    }

    return date;
  } catch (err) {
    console.error('[parseSqlDateToUTC] Error parsing:', dateStr, err);
    return null;
  }
};

// Check if date is today (UTC)
export const isTodayUTC = (date: Date): boolean => {
  const now = new Date();

  return (
    date.getUTCFullYear() === now.getUTCFullYear() &&
    date.getUTCMonth() === now.getUTCMonth() &&
    date.getUTCDate() === now.getUTCDate()
  );
};

// Check if date is in current month (UTC)
export const isCurrentMonthUTC = (date: Date): boolean => {
  const now = new Date();

  return (
    date.getUTCFullYear() === now.getUTCFullYear() &&
    date.getUTCMonth() === now.getUTCMonth()
  );
};
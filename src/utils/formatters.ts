// Utility functions for formatting values

/**
 * Formats a number with thousand separators (commas) and 2 decimal places
 * @param amount - The number to format
 * @returns Formatted string like "14,030.00"
 */
export const formatCurrency = (amount: number): string => {
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

/**
 * Formats a number with thousand separators (commas) and no decimal places
 * @param amount - The number to format
 * @returns Formatted string like "14,030"
 */
export const formatNumber = (amount: number): string => {
  return amount.toLocaleString('en-US');
};

/**
 * Formats a date to Spanish format (DD/MM/YYYY)
 * @param date - Date object or string
 * @returns Formatted date string like "29/12/2025"
 */
export const formatDate = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('es-ES');
};

/**
 * Formats a currency amount with dollar sign and thousand separators
 * @param amount - The number to format
 * @returns Formatted string like "$14,030.00"
 */
export const formatCurrencyWithSymbol = (amount: number): string => {
  return `$${formatCurrency(amount)}`;
};

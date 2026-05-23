// Utility functions for formatting values

import { API_BASE_URL, PROFILE_IMAGE_BASE_URL } from '../api/usersApi';

export const DEFAULT_AVATAR_URL =
  'https://www.w3schools.com/howto/img_avatar.png';

/**
 * Resolves user avatar paths from login/API into a loadable image URL.
 */
export const resolveAvatarUrl = (avatarUrl?: string | null): string => {
  if (!avatarUrl?.trim()) {
    return DEFAULT_AVATAR_URL;
  }

  const url = avatarUrl.trim();

  if (
    url.startsWith('data:') ||
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('blob:')
  ) {
    return url;
  }

  if (url.startsWith('/')) {
    return `${API_BASE_URL}${url}`;
  }

  // Bare filename from dbo.users.image (e.g. nallely.jpg)
  if (/\.(jpe?g|png|gif|webp|bmp)$/i.test(url)) {
    return `${PROFILE_IMAGE_BASE_URL}${url}`;
  }

  return `${API_BASE_URL}/${url}`;
};

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

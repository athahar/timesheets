/**
 * Formatting utilities for TrackPay
 * Provides consistent, locale-aware formatting for currency, time, and dates
 */

/**
 * Format currency with locale support and tabular numerals
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

/**
 * Format time duration from hours to readable format
 */
export const formatHours = (totalHours: number): string => {
  const hours = Math.floor(totalHours);
  const minutes = Math.round((totalHours % 1) * 60);

  if (hours === 0) {
    return `${minutes}min`;
  }

  return minutes > 0 ? `${hours}hr ${minutes}min` : `${hours}hr`;
};

/**
 * Format time from minutes to readable format
 */
export const formatMinutes = (totalMinutes: number): string => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes}min`;
  }

  return minutes > 0 ? `${hours}hr ${minutes}min` : `${hours}hr`;
};

/**
 * Format timer display (HH:MM:SS) with tabular numerals
 */
export const formatTimer = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Format date for display
 */
export const formatDate = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;

  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

/**
 * Format date with time
 */
export const formatDateTime = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;

  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

/**
 * Generate a unique batch ID for payment request grouping
 */
export const generateBatchId = (): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  return `batch_${timestamp}_${random}`;
};

/**
 * Check if two dates are the same day
 */
export const isSameDay = (date1: string | Date, date2: string | Date): boolean => {
  const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
  const d2 = typeof date2 === 'string' ? new Date(date2) : date2;

  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
};

/**
 * Format relative time (e.g., "2 hours ago", "yesterday")
 */
export const formatRelativeTime = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return formatDate(d);
  }
};
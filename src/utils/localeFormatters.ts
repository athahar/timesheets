import { getCurrentLanguage } from '../i18n';

/**
 * LOCKED FORMATTING RULES per spec:
 * - Currency: USD style both languages ($1,234.56)
 * - Dates: en-US "Sep 22, 2025", es-US "22 sep 2025" (lowercase)
 * - Times: en-US "8:44–9:57 pm", es-US "8:44–9:57 p. m."
 * - Durations: en-US "1hr 13min", es-US "1 h 13 min"
 * - Tabular numerals: money/timers ONLY
 */

// Currency formatting - USD style for both languages
export const formatCurrency = (amount: number): string => {
  try {
    const locale = getCurrentLanguage();

    // Force USD style for both languages per spec
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    });

    return formatter.format(amount);
  } catch (error) {
    // Fallback formatting if there are issues
    return `$${amount.toFixed(2)}`;
  }
};

// Date formatting per locked spec
export const formatDate = (date: Date): string => {
  const locale = getCurrentLanguage();

  if (locale === 'es-US') {
    // es-US: "22 sep 2025" (month lowercase)
    const day = date.getDate();
    const month = date.toLocaleDateString('es-US', { month: 'short' }).toLowerCase();
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  } else {
    // en-US: "Sep 22, 2025"
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }
};

// Time formatting per locked spec
export const formatTime = (date: Date): string => {
  const locale = getCurrentLanguage();

  const timeStr = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  if (locale === 'es-US') {
    // es-US: "8:44 p. m." (with spaces)
    return timeStr.replace(/AM/i, 'a. m.').replace(/PM/i, 'p. m.');
  } else {
    // en-US: "8:44 pm" (lowercase, no spaces)
    return timeStr.replace(/AM/i, 'am').replace(/PM/i, 'pm');
  }
};

// Time range formatting
export const formatTimeRange = (startDate: Date, endDate: Date): string => {
  const locale = getCurrentLanguage();

  const startTime = formatTime(startDate);
  const endTime = formatTime(endDate);

  // Use en dash for both languages
  return `${startTime}–${endTime}`;
};

// Duration formatting per locked spec
export const formatDuration = (minutes: number): string => {
  const locale = getCurrentLanguage();

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (locale === 'es-US') {
    // es-US: "1 h 13 min" (with spaces)
    if (hours > 0 && mins > 0) {
      return `${hours} h ${mins} min`;
    } else if (hours > 0) {
      return `${hours} h`;
    } else {
      return `${mins} min`;
    }
  } else {
    // en-US: "1hr 13min" (no spaces)
    if (hours > 0 && mins > 0) {
      return `${hours}hr ${mins}min`;
    } else if (hours > 0) {
      return `${hours}hr`;
    } else {
      return `${mins}min`;
    }
  }
};

// Tabular numerals CSS style for money/timers only
export const getTabularNumeralStyle = () => ({
  fontVariant: ['tabular-nums'] as const,
  fontFeatureSettings: '"tnum"',
});

// Format relative time (e.g., "2 hours ago", "yesterday")
export const formatRelativeTime = (date: Date): string => {
  const locale = getCurrentLanguage();
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  // Use Intl.RelativeTimeFormat for proper localization
  const rtf = new Intl.RelativeTimeFormat(locale === 'es-US' ? 'es-US' : 'en-US', {
    numeric: 'auto',
  });

  if (diffInSeconds < 60) {
    return rtf.format(-diffInSeconds, 'second');
  } else if (diffInSeconds < 3600) {
    return rtf.format(-Math.floor(diffInSeconds / 60), 'minute');
  } else if (diffInSeconds < 86400) {
    return rtf.format(-Math.floor(diffInSeconds / 3600), 'hour');
  } else {
    return rtf.format(-Math.floor(diffInSeconds / 86400), 'day');
  }
};

// Format numbers for display (no currency)
export const formatNumber = (num: number): string => {
  const locale = getCurrentLanguage();

  // Use US formatting for both languages per spec
  return new Intl.NumberFormat('en-US').format(num);
};
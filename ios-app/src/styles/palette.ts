// TrackPay v2 Color Palette
// Single source of truth for all colors
// ChatGPT-refined flat structure for simplicity

export const palette = {
  // Brand & states
  green50:  '#ECFDF5',
  green100: '#D1FAE5',
  green500: '#22C55E',  // Primary brand
  green600: '#16A34A',  // Pressed state
  green700: '#047857',  // Pill text

  amber50:  '#FFFBEB',
  amber500: '#F59E0B',
  amber700: '#B45309',  // Warning text

  purple50: '#F3E8FF',
  purple600:'#6D28D9',  // Requested

  teal50:  '#E6FFFA',
  teal500: '#2DD4BF',  // Active
  teal700: '#0F766E',  // Active text

  red50:   '#FEF2F2',
  red500:  '#EF4444',  // Danger
  red600:  '#DC2626',  // Danger pressed

  // Neutrals (ink system)
  ink:     '#111827',
  gray600: '#4B5563',
  gray500: '#6B7280',  // Secondary text
  gray400: '#9AA1A9',  // Tertiary text
  gray300: '#D1D5DB',
  gray200: '#E6E8EB',  // Border/divider
  gray100: '#F3F4F6',
  gray50:  '#F8F9FB',

  // Surfaces
  white:   '#FFFFFF',
  black:   '#000000',

  // App surface
  appBg:   '#F7F8FA',
} as const;

export type Palette = typeof palette;

// TrackPay v2 Color Palette - Minimal Black/White Theme
// Single source of truth for all colors
// Design Philosophy: Minimal, professional, Apple Wallet-inspired aesthetic.
// Primary: Black/white/gray neutrals
// Accents: Avatar colors (teal, purple, navy)
// Semantic: Status colors (green=success, amber=warning, etc.)

export const palette = {
  // Core neutrals (PRIMARY)
  black:   '#111827',  // Primary buttons, headings
  white:   '#FFFFFF',
  gray50:  '#F7F8FA',  // App background
  gray100: '#E5E7EB',  // Borders
  gray500: '#6B7280',  // Secondary text
  gray400: '#9AA1A9',  // Tertiary text (placeholders)

  // Danger (Stop)
  red500:  '#C23548',  // Deep red/maroon from Figma
  red600:  '#A82337',  // Pressed

  // Avatar accents (used for initials backgrounds, non-semantic)
  teal500:   '#40B4A8',
  purple500: '#8B5CF6',
  navy500:   '#3B5CCC',

  // Semantic only (NOT branding) – pills, success messages
  green50:  '#ECFDF5',
  green100: '#D1FAE5',
  green500: '#22C55E',
  green600: '#16A34A',
  green700: '#047857',

  amber50:  '#FFFBEB',
  amber700: '#B45309',

  purple50: '#F3E8FF',
  purple600:'#6D28D9',

  teal50:   '#E6FFFA',
  teal700:  '#0F766E',
} as const;

export type Palette = typeof palette;

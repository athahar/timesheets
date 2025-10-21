// TrackPay v2 Theme
// ChatGPT-refined structure with clean nested button/pill objects
// Fixes: duplicates, undefined palette references, inconsistent naming

import { palette } from './palette';

export const TP = {
  color: {
    // Core surfaces
    appBg: palette.appBg,
    cardBg: palette.white,
    border: palette.gray200,
    divider: palette.gray200,

    // Text
    ink: palette.ink,
    textSecondary: palette.gray500,
    textTertiary: palette.gray400,

    // Brand
    brand: palette.green500,
    brandPressed: palette.green600,
    focusRing: 'rgba(34,197,94,0.25)',

    // Buttons (NESTED - no duplicates!)
    btn: {
      primaryBg: palette.green500,
      primaryText: palette.white,
      primaryBgPressed: palette.green600,

      secondaryBg: palette.white,
      secondaryText: palette.ink,
      secondaryBorder: palette.gray200,
      secondaryBorderPressed: palette.gray300,

      dangerBg: palette.red500,
      dangerText: palette.white,
      dangerBgPressed: palette.red600,

      disabledBg: palette.gray100,
      disabledText: palette.gray400,
      disabledBorder: palette.gray200,
    },

    // Status pills (NESTED)
    pill: {
      paidBg: palette.green50,
      paidText: palette.green700,
      dueBg: palette.amber50,
      dueText: palette.amber700,
      requestedBg: palette.purple50,
      requestedText: palette.purple600,
      activeBg: palette.teal50,
      activeText: palette.teal700,
    },

    // Semantic
    money: palette.green500,
    warnBg: palette.amber50,
    warnText: palette.amber700,
    danger: palette.red500,

    // Overlays
    modalOverlay: 'rgba(0,0,0,0.5)',
    modalBg: palette.white,
    toastBg: palette.ink,
    toastText: palette.white,

    // Error
    errorBg: palette.red50,
    errorText: palette.red600,
    errorBorder: '#FEE2E2',
  },

  radius: { card:16, button:12, pill:10, input:12 },
  spacing:{ x2:2,x4:4,x8:8,x12:12,x16:16,x20:20,x24:24,x32:32 },

  font:{ display:34, title:22, body:16, footnote:13 },
  weight:{ regular:'400', medium:'500', semibold:'600', bold:'700' },

  shadow: {
    card: {
      ios: {
        shadowColor: palette.black,
        shadowOpacity: 0.05,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 }
      },
      android: { elevation: 2 },
    },
  },

  // ---------- Legacy shim (v1 compatibility) ----------
  // Keeps old code working during migration
  colors: {
    primary: palette.green500,
    background: palette.gray50,
    card: palette.white,
    border: palette.gray200,

    money: {
      50: palette.green50,
      100: palette.green100,
      500: palette.green500,
      600: palette.green600
    },
    active: {
      50: palette.teal50,
      100:'#CCFBF1',
      500: palette.teal500,
      600:'#0D9488'
    },
    warning: {
      50: palette.amber50,
      100:'#FEF3C7',
      500: palette.amber500,
      600:'#D97706'
    },
    danger: {
      50: palette.red50,
      100:'#FEE2E2',
      500: palette.red500,
      600: palette.red600
    },

    text: {
      primary: palette.ink,
      secondary: palette.gray500,
      tertiary: palette.gray400
    },

    status: {
      paid: {
        background: palette.green50,
        border: palette.green100,
        text: palette.green500
      },
      unpaid: {
        background: palette.amber50,
        border:'#FEF3C7',
        text: palette.amber500
      },
      active: {
        background: palette.teal50,
        border:'#CCFBF1',
        text: palette.teal500
      },
      requested: {
        background: palette.purple50,
        border:'rgba(109,40,217,0.2)',
        text: palette.purple600
      },
      error: {
        background: palette.red50,
        border:'#FEE2E2',
        text: palette.red500
      },
    },
  },
} as const;

export type Theme = typeof TP;

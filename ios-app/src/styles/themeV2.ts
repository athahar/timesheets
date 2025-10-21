// TrackPay v2 Theme - Minimal Black/White Theme
// Black primary buttons, semantic color pills, clean structure

import { palette } from './palette';

export const TP = {
  color: {
    // Surfaces
    appBg: palette.gray50,
    cardBg: palette.white,
    border: palette.gray100,
    divider: palette.gray100,

    // Text
    ink: palette.black,
    textSecondary: palette.gray500,
    textTertiary: palette.gray400,

    // Buttons
    btn: {
      primaryBg: palette.black,        // ← BLACK (not green)
      primaryText: palette.white,
      primaryBgPressed: '#0B1220',

      secondaryBg: palette.white,
      secondaryText: palette.black,
      secondaryBorder: palette.black,
      secondaryBorderPressed: '#0B1220',

      dangerBg: palette.red500,        // ← Deep red/maroon
      dangerText: palette.white,
      dangerBgPressed: palette.red600,

      disabledBg: '#F3F4F6',
      disabledText: palette.gray400,
      disabledBorder: palette.gray100,
    },

    // Status pills (semantic only — unchanged)
    pill: {
      paidBg: palette.green50,    paidText: palette.green700,
      dueBg:  palette.amber50,    dueText: palette.amber700,
      requestedBg: palette.purple50, requestedText: palette.purple600,
      activeBg:    palette.teal50,    activeText: palette.teal700,
    },

    // Overlays & misc
    modalOverlay: 'rgba(0,0,0,0.5)',
    modalBg: palette.white,
    toastBg: palette.black,
    toastText: palette.white,

    // Error states
    errorBg: '#FEF2F2',
    errorText: palette.red600,
    errorBorder: '#FEE2E2',
  },

  radius:{ card:16, button:12, pill:10, input:12 },
  spacing:{ x2:2,x4:4,x8:8,x12:12,x16:16,x20:20,x24:24,x32:32 },
  font:{ display:34, title:22, body:16, footnote:13 },
  weight:{ regular:'400', medium:'500', semibold:'600', bold:'700' },

  shadow: {
    card: {
      ios: { shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } },
      android: { elevation: 2 },
    },
  },

  // Legacy shim so v1 screens continue to work
  colors: {
    primary: palette.black,                 // ← now black
    background: palette.gray50,
    card: palette.white,
    border: palette.gray100,
    text: { primary: palette.black, secondary: palette.gray500, tertiary: palette.gray400 },

    status: {
      paid: { background: palette.green50, border: palette.green100, text: palette.green500 },
      unpaid:{ background: palette.amber50, border:'#FEF3C7', text: '#F59E0B' },
      active:{ background: palette.teal50, border:'#CCFBF1', text: '#2DD4BF' },
      requested:{ background: palette.purple50, border:'rgba(109,40,217,0.2)', text: palette.purple600 },
      error:{ background: '#FEF2F2', border:'#FEE2E2', text: palette.red500 },
    },
  },
} as const;

export type Theme = typeof TP;

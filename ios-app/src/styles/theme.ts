/**
 * @deprecated Use themeV2 (TP) from './themeV2' instead
 *
 * This legacy theme is kept for v1 component compatibility during migration.
 *
 * Migration guide:
 * - Old: import { theme } from '../styles/theme'
 * - New: import { TP } from '../styles/themeV2'
 *
 * Will be removed in next major version after all components are migrated.
 */

export const palette = {
  green:'#22C55E', teal:'#2DD4BF', amber:'#F59E0B', red:'#EF4444', purple:'#6D28D9',
  ink:'#111827', gray600:'#4B5563', gray500:'#6B7280', gray400:'#9AA1A9',
  gray300:'#D1D5DB', gray200:'#E5E7EB', gray100:'#F3F4F6', gray50:'#F8F9FB',
  greenBg:'#ECFDF5', amberBg:'#FFFBEB', purpleBg:'#F3E8FF', tealBg:'#E6FFFA',
  white:'#FFFFFF', black:'#000000',
};

/**
 * @deprecated Use TP from './themeV2' instead
 */
export const theme = {
  color: {
    // Core surfaces
    appBg: '#F7F8FA',
    cardBg: '#FFFFFF',
    border: '#E6E8EB',
    divider: '#E5E7EB',

    // Text hierarchy
    text: '#111827',
    textSecondary: '#6B7280',
    textTertiary: '#9AA1A9',

    // Brand colors (keep original iOS blue for auth screens)
    accent: '#007AFF', // Original iOS blue
    accentTeal: palette.teal,
    warn: palette.amber,
    danger: palette.red,
    requested: palette.purple,
    brand: '#007AFF', // Original iOS blue
    brandPressed: '#0051D5',
    focusRing: 'rgba(0,122,255,0.25)',

    // Professional button system
    btnPrimaryBg: '#007AFF',
    btnPrimaryText: '#FFFFFF',
    btnSecondaryBg: '#FFFFFF',
    btnSecondaryText: '#111827',
    btnSecondaryBorder: '#E6E8EB',
    btnLinkText: '#10B981',

    // Money and warnings
    money: '#10B981', // Keep green for money (universal color for cash)
    warnBg: '#FFFBEB',
    warnText: '#B45309',

    // Button system - complete variants (original iOS blue)
    btnPrimaryBg: '#007AFF',
    btnPrimaryText: '#FFFFFF',
    btnDangerBg: '#EF4444',
    btnDangerText: '#FFFFFF',
    btnSecondaryBg: '#FFFFFF',
    btnSecondaryText: '#111827',
    btnSecondaryBorder: '#E5E7EB',

    // Interactive states
    btnPrimaryBgPressed: '#0051D5',
    btnDangerBgPressed: '#DC2626',
    btnSecondaryBorderPressed: '#D1D5DB',

    // Disabled states
    btnDisabledBg: '#F3F4F6',
    btnDisabledText: '#9AA1A9',
    btnDisabledBorder: '#E5E7EB',

    // Chips and pills
    chipActiveBg: '#E6FFFA',
    chipActiveText: '#0F766E',

    // Status pills
    pillPaidText:'#047857',
    pillPaidBg:'#ECFDF5',
    pillDueText:'#B45309',
    pillDueBg:'#FFFBEB',
    pillReqText:'#6D28D9',
    pillReqBg:'#F3E8FF',
    pillActiveText:'#0F766E',
    pillActiveBg:'#E6FFFA',

    // Modal and overlay
    modalOverlay: 'rgba(0, 0, 0, 0.5)',
    modalBg: '#FFFFFF',

    // Toast
    toastBg: '#111827',
    toastText: '#FFFFFF',

    // Error states
    errorBg: '#FEF2F2',
    errorText: '#DC2626',
    errorBorder: '#FEE2E2',
  },
  radius:{ card:16, button:12, pill:10, input:12 },
  space:{ x2:2,x4:4,x8:8,x12:12,x16:16,x20:20,x24:24,x32:32 },
  font:{ title:22, large:28, body:16, small:13 },

  shadow: {
    cardLight: {
      ios:  { shadowColor: palette.black, shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } },
      android: { elevation: 2 },
    },
  },

  // Legacy compatibility - map old theme properties to new palette
  colors: {
    primary: palette.green,
    background: palette.slate50,
    card: palette.white,
    border: palette.slate200,

    // Semantic tokens for backwards compatibility
    money: {
      50: palette.greenBg,
      100: '#D1FAE5',
      500: palette.green,
      600: '#059669',
    },

    active: {
      50: palette.tealBg,
      100: '#CCFBF1',
      500: palette.teal,
      600: '#0D9488',
    },

    warning: {
      50: palette.amberBg,
      100: '#FEF3C7',
      500: palette.amber,
      600: '#D97706',
    },

    danger: {
      50: '#FEF2F2',
      100: '#FEE2E2',
      500: palette.red,
      600: '#DC2626',
    },

    // Status Colors (backwards compatibility)
    success: palette.green,
    warning: palette.amber,
    error: palette.red,
    info: '#3B82F6',
    white: palette.white,

    // Text Colors
    text: {
      primary: palette.ink,
      secondary: palette.slate500,
      tertiary: palette.slate400,
    },

    // Enhanced Status Color Applications
    status: {
      paid: {
        background: palette.greenBg,
        border: '#D1FAE5',
        text: palette.green,
      },
      unpaid: {
        background: palette.amberBg,
        border: '#FEF3C7',
        text: palette.amber,
      },
      active: {
        background: palette.tealBg,
        border: '#CCFBF1',
        text: palette.teal,
      },
      requested: {
        background: palette.purpleBg,
        border: 'rgba(109, 40, 217, 0.2)',
        text: palette.purple,
      },
      error: {
        background: '#FEF2F2',
        border: '#FEE2E2',
        text: palette.red,
      },
    },
  },

  // Spacing System (8pt Grid) - backwards compatibility
  spacing: {
    xxs: 4,
    xs: 8,
    sm: 12,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },

  // Border Radius - backwards compatibility
  borderRadius: {
    small: 6,
    medium: 8,
    button: 12,
    card: 16,
    large: 16,
  },

  // Shadows & Depth - backwards compatibility
  shadows: {
    card: {
      shadowColor: palette.black,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.05,
      shadowRadius: 6,
      elevation: 2,
    },
    button: {
      shadowColor: palette.black,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
  },

  // Typography - backwards compatibility
  fontSize: {
    display: 28,
    title: 22,
    headline: 17,
    body: 16,
    callout: 15,
    footnote: 13,
    caption: 12,
  },

  fontWeight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },

  typography: {
    fontFamily: {
      primary: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
      display: 'SF Pro Display, -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
    },
  },

  // iOS-specific utilities
  ios: {
    // iOS spacing system (Apple's guidelines)
    spacing: {
      navigationBarHeight: 44,
      tabBarHeight: 49,
      toolBarHeight: 44,
      searchBarHeight: 36,
      keyboardPadding: 20,
      sectionHeaderHeight: 28,
      listRowHeight: 44,
      listRowHeightLarge: 56,

      // Standard iOS margins
      systemMargin: 16,
      readableMargin: 20,
      separatorInset: 16,

      // iOS status bar
      statusBarHeight: 20, // Will be overridden by safe area
    },

    // Safe area utilities
    safeArea: {
      // Helper for common safe area patterns
      containerWithInsets: {
        flex: 1,
        // SafeAreaView will handle the actual insets
      },

      // Keyboard-safe container
      keyboardSafe: {
        flex: 1,
        // KeyboardAvoidingView will handle behavior
      },
    },

    // iOS-specific colors (matching iOS system colors)
    systemColors: {
      blue: '#007AFF',
      green: '#34C759',
      indigo: '#5856D6',
      orange: '#FF9500',
      pink: '#FF2D92',
      purple: '#AF52DE',
      red: '#FF3B30',
      teal: '#5AC8FA',
      yellow: '#FFCC00',

      // System grays
      systemGray: '#8E8E93',
      systemGray2: '#AEAEB2',
      systemGray3: '#C7C7CC',
      systemGray4: '#D1D1D6',
      systemGray5: '#E5E5EA',
      systemGray6: '#F2F2F7',

      // Label colors
      label: '#000000',
      secondaryLabel: '#3C3C4399',
      tertiaryLabel: '#3C3C434C',
      quaternaryLabel: '#3C3C432D',

      // Background colors
      systemBackground: '#FFFFFF',
      secondarySystemBackground: '#F2F2F7',
      tertiarySystemBackground: '#FFFFFF',

      // Grouped background colors
      systemGroupedBackground: '#F2F2F7',
      secondarySystemGroupedBackground: '#FFFFFF',
      tertiarySystemGroupedBackground: '#F2F2F7',

      // Separator colors
      separator: '#3C3C4349',
      opaqueSeparator: '#C6C6C8',
    },

    // Common iOS layout patterns
    layout: {
      // Standard list item
      listItem: {
        minHeight: 44,
        paddingHorizontal: 16,
        paddingVertical: 12,
      },

      // Form input
      formInput: {
        minHeight: 44,
        paddingHorizontal: 16,
        borderRadius: 10,
      },

      // Navigation button
      navButton: {
        minHeight: 44,
        minWidth: 44,
        paddingHorizontal: 16,
      },

      // Action sheet button
      actionButton: {
        minHeight: 56,
        paddingHorizontal: 20,
      },
    },

    // Animation durations (iOS standard)
    animation: {
      standard: 300,
      quick: 200,
      slow: 500,
      keyboard: 250,
    },
  },
} as const;

export type Theme = typeof theme;
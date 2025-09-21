export const theme = {
  colors: {
    primary: '#007AFF',
    success: '#34C759',
    warning: '#FF9500',
    danger: '#FF3B30',
    background: '#F9FAFB', // Soft neutral off-white
    backgroundAlt: '#F3F4F6', // Light gray alternative
    card: '#FFFFFF',
    text: {
      primary: '#1C1C1E', // Neutral/Dark Text
      secondary: '#8E8E93', // Subtle Gray Text
    },
    status: {
      paid: {
        background: '#E5F9EB',
        text: '#34C759',
      },
      unpaid: {
        background: '#FEF3E2',
        text: '#FF9500',
      },
      requested: {
        background: '#EBF5FF',
        text: '#007AFF',
      },
    },
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 40,
  },
  borderRadius: {
    card: 20, // rounded-2xl
    button: 999, // rounded-full (pill-shaped)
    small: 12,
  },
  shadows: {
    card: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06, // More subtle
      shadowRadius: 8,
      elevation: 4,
    },
    cardStrong: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 8,
    },
    button: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05, // Very subtle
      shadowRadius: 3,
      elevation: 2,
    },
  },
  fontSize: {
    // Large headings: 20-24px, semi-bold
    display: 28,
    title: 24,
    headline: 20,
    // Body: 16px
    body: 16,
    callout: 16,
    subhead: 15,
    // Labels: 13px, subtle gray
    footnote: 13,
    caption: 12,
    small: 11,
  },
  fontWeight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  typography: {
    // San Francisco (SF Pro) or Inter fallback
    fontFamily: {
      primary: 'SF Pro Text, Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
      display: 'SF Pro Display, Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
    },
  },
};
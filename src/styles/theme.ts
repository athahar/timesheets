export const theme = {
  colors: {
    // Primary Colors
    primary: '#007AFF',
    background: '#F8F9FA',
    card: '#FFFFFF',
    border: '#E5E7EB',

    // Status Colors (full strength)
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    info: '#3B82F6',

    // Text Colors
    text: {
      primary: '#1F2937',
      secondary: '#6B7280',
      tertiary: '#9CA3AF',
    },

    // Status Color Applications (10% background, 20% border, full text)
    status: {
      paid: {
        background: 'rgba(16, 185, 129, 0.1)', // success at 10%
        border: 'rgba(16, 185, 129, 0.2)',     // success at 20%
        text: '#10B981',                       // full success
      },
      unpaid: {
        background: 'rgba(245, 158, 11, 0.1)', // warning at 10%
        border: 'rgba(245, 158, 11, 0.2)',     // warning at 20%
        text: '#F59E0B',                       // full warning
      },
      requested: {
        background: 'rgba(59, 130, 246, 0.1)', // info at 10%
        border: 'rgba(59, 130, 246, 0.2)',     // info at 20%
        text: '#3B82F6',                       // full info
      },
      error: {
        background: 'rgba(239, 68, 68, 0.1)',  // danger at 10%
        border: 'rgba(239, 68, 68, 0.2)',      // danger at 20%
        text: '#EF4444',                       // full danger
      },
    },
  },

  // Spacing System (8pt Grid)
  spacing: {
    xxs: 4,   // 4px
    xs: 8,    // 8px
    sm: 12,   // 12px
    md: 16,   // 16px
    lg: 24,   // 24px
    xl: 32,   // 32px
    xxl: 48,  // 48px
  },

  // Border Radius
  borderRadius: {
    small: 6,   // Status pills and small interactive elements
    medium: 8,  // Buttons and form inputs
    card: 12,   // Content cards and containers
    large: 16,  // Modals and major UI elements
  },

  // Shadows & Depth
  shadows: {
    // Card Shadow: 0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)
    card: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 2,
    },
    // Button Shadow: 0 1px 2px rgba(0, 0, 0, 0.05)
    button: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
  },

  // Typography
  fontSize: {
    display: 28,    // Page titles and major headings
    title: 22,      // Section headers and important content
    headline: 17,   // Card titles and secondary headers
    body: 16,       // Main content and form labels
    callout: 15,    // Secondary content and descriptions
    footnote: 13,   // Metadata, status labels, and supporting text
  },

  fontWeight: {
    regular: '400',   // Body text and standard content
    medium: '500',    // Interactive elements and secondary emphasis
    semibold: '600',  // Section headers and primary content
    bold: '700',      // High emphasis titles and important information
  },

  typography: {
    fontFamily: {
      primary: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
      display: 'SF Pro Display, -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
    },
  },
};
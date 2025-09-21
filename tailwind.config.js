/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Apple-style color palette
        primary: '#007AFF',      // iOS blue
        success: '#34C759',      // iOS green
        warning: '#FF9500',      // iOS orange
        danger: '#FF3B30',       // iOS red
        purple: {
          50: '#F5F3FF',
          100: '#EDE9FE',
          200: '#DDD6FE',
          300: '#C4B5FD',
          400: '#A78BFA',
          500: '#8B5CF6',
        },
        background: '#E6E1F5',   // Light purple background
        card: '#FFFFFF',         // Pure white cards
        text: {
          primary: '#1D1D1F',    // Apple dark text
          secondary: '#86868B',  // Apple gray text
        },
        // Legacy colors for compatibility
        paid: '#34C759',
        unpaid: '#FF9500',
        total: '#007AFF',
      },
      fontFamily: {
        'apple': ['-apple-system', 'BlinkMacSystemFont', 'Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'],
      },
      fontSize: {
        'display': ['34px', { lineHeight: '41px', fontWeight: '700' }],
        'title': ['28px', { lineHeight: '34px', fontWeight: '700' }],
        'headline': ['17px', { lineHeight: '22px', fontWeight: '600' }],
        'body': ['17px', { lineHeight: '22px', fontWeight: '400' }],
        'callout': ['16px', { lineHeight: '21px', fontWeight: '400' }],
        'subhead': ['15px', { lineHeight: '20px', fontWeight: '400' }],
        'footnote': ['13px', { lineHeight: '18px', fontWeight: '400' }],
        'caption': ['12px', { lineHeight: '16px', fontWeight: '400' }],
      },
      boxShadow: {
        'card': '0 2px 12px rgba(0, 0, 0, 0.08)',
        'button': '0 1px 3px rgba(0, 0, 0, 0.12)',
      },
      borderRadius: {
        'card': '16px',
        'button': '12px',
      },
    },
  },
  plugins: [],
}
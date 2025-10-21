/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // TrackPay v2 Color System - Minimal Black/White Theme
        app: '#F7F8FA',
        ink: '#111827',
        gray: {
          100:'#E5E7EB',
          400:'#9AA1A9',
          500:'#6B7280'
        },
        red: {
          500:'#C23548',  // Deep maroon from Figma
          600:'#A82337'   // Pressed state
        },
        // Semantic colors only (NOT branding)
        green: {
          50:'#ECFDF5',
          100:'#D1FAE5',
          500:'#22C55E',
          600:'#16A34A',
          700:'#047857'
        },
        amber: {
          50:'#FFFBEB',
          700:'#B45309'
        },
        purple: {
          50:'#F3E8FF',
          600:'#6D28D9'
        },
        teal: {
          50:'#E6FFFA',
          700:'#0F766E'
        },
      },
      borderRadius: {
        card:'16px',
        btn:'12px',
        pill:'10px',
        input:'12px'
      },
      boxShadow: {
        card: '0 3px 6px rgba(0,0,0,0.05)',
      },
      fontSize: {
        display:['34px',{lineHeight:'40px', fontWeight:'700'}],
        title:  ['22px',{lineHeight:'28px', fontWeight:'700'}],
        body:   ['16px',{lineHeight:'24px'}],
        foot:   ['13px',{lineHeight:'18px'}],
      },
      fontFamily: {
        'apple': ['-apple-system', 'BlinkMacSystemFont', 'Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

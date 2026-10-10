/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          black: '#080808',
          card: '#111111',
          surface: '#161616',
          gold: '#C9A24D',
          'gold-metallic': '#D4AF37',
          'gold-soft': '#E0BF6A',
          text: '#FFFFFF',
          'text-secondary': '#A3A3A3',
          'text-muted': '#737373',
          border: '#292929',
          'border-light': '#383838',
        },
        success: { DEFAULT: '#22C55E', light: '#86EFAC' },
        warning: { DEFAULT: '#F59E0B', light: '#FDE68A' },
        error: { DEFAULT: '#EF4444', light: '#FCA5A5' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        lg: '0.75rem',
        md: '0.5rem',
        sm: '0.375rem',
      },
      boxShadow: {
        'gold': '0 0 15px rgba(212, 175, 55, 0.15)',
        'gold-lg': '0 0 30px rgba(212, 175, 55, 0.2)',
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
        'card-hover': '0 10px 25px -5px rgba(0, 0, 0, 0.4)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'pulse-gold': 'pulseGold 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateX(-10px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        pulseGold: {
          '0%, 100%': { boxShadow: '0 0 5px rgba(212, 175, 55, 0.2)' },
          '50%': { boxShadow: '0 0 20px rgba(212, 175, 55, 0.4)' },
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}

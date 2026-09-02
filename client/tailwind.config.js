/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0fdf4',
          100: '#dcfce7',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          accent: '#0ea5e9'
        },
        dark: {
          bg: '#0f172a',
          card: '#1e293b',
          border: '#334155',
          hover: '#2d3748'
        },
        neu: {
          base: '#e6ecf5',
          surface: '#eef3f9',
          light: '#f5f8fc',
          dark: '#131822',
          'dark-surface': '#181e2b',
          'dark-card': '#1b2230',
          'dark-border': 'rgba(255, 255, 255, 0.05)',
        }
      },
      boxShadow: {
        'neu-flat': 'var(--neu-shadow-flat)',
        'neu-raised-sm': 'var(--neu-shadow-raised-sm)',
        'neu-raised': 'var(--neu-shadow-raised)',
        'neu-raised-lg': 'var(--neu-shadow-raised-lg)',
        'neu-sunken': 'var(--neu-shadow-sunken)',
        'neu-sunken-sm': 'var(--neu-shadow-sunken-sm)',
        'neu-glow-emerald': '0 2px 8px rgba(16, 185, 129, 0.2)',
        'neu-glow-cyan': '0 2px 8px rgba(6, 182, 212, 0.2)',
        'neu-glow-amber': '0 2px 8px rgba(245, 158, 11, 0.2)',
        'neu-glow-indigo': '0 2px 8px rgba(99, 102, 241, 0.2)',
      },
      fontFamily: {
        sans: ['var(--app-font)', 'system-ui', 'sans-serif'],
        app: ['var(--app-font)', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}

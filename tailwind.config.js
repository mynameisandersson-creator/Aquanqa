/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        cold: {
          900: '#071223',
          800: '#0d1f35',
          700: '#15304d',
          500: '#3f8cff',
          300: '#8bc4ff'
        }
      },
      animation: {
        pulseScan: 'pulseScan 1.4s ease-in-out infinite',
        scanLine: 'scanLine 2.2s linear infinite',
      },
      keyframes: {
        pulseScan: {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.55' },
          '50%': { transform: 'scale(1.02)', opacity: '1' }
        },
        scanLine: {
          '0%': { top: '16%' },
          '50%': { top: '80%' },
          '100%': { top: '16%' }
        }
      }
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        cyan: {
          400: '#00F5FF',
          500: '#00E0E6',
          600: '#00C4CC'
        },
        purple: {
          400: '#A855F7',
          500: '#9333EA',
          600: '#7C3AED'
        },
        neon: {
          green: '#39FF14',
          blue: '#00F5FF',
          purple: '#A855F7'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif']
      },
      backdropBlur: {
        xs: '2px'
      }
    },
  },
  plugins: [],
};
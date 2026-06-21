/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        sewa: {
          bg0:    '#05100D',
          bg1:    '#091A15',
          bg2:    '#0D201A',
          bg3:    '#122820',
          teal:   '#408D7B',
          teal2:  '#52B09A',
          red:    '#C94444',
          redLt:  '#E86060',
          amber:  '#D47820',
          amberLt:'#F09A40',
          textHi: '#D6EDE8',
          textMd: '#5E9488',
          textLo: '#2E5048',
          border: '#1A3028',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Inter', 'sans-serif'],
        mono: ['SF Mono', 'Fira Code', 'Roboto Mono', 'monospace'],
      },
      borderRadius: { '2xl': '16px', '3xl': '24px' },
      animation: {
        'fade-in':    'fade-in 0.3s ease forwards',
        'pulse-dot':  'pulse-dot 1.2s ease-in-out infinite',
        'slide-right':'slide-in-right 0.25s ease forwards',
        'shimmer':    'shimmer 1.5s infinite',
      },
      keyframes: {
        'fade-in':       { from: { opacity:'0', transform:'translateY(8px)' }, to: { opacity:'1', transform:'translateY(0)' } },
        'pulse-dot':     { '0%,100%': { opacity:'1', transform:'scale(1)' }, '50%': { opacity:'0.4', transform:'scale(1.4)' } },
        'slide-in-right':{ from: { transform:'translateX(20px)', opacity:'0' }, to: { transform:'translateX(0)', opacity:'1' } },
        'shimmer':       { '0%': { backgroundPosition:'-200% 0' }, '100%': { backgroundPosition:'200% 0' } },
      },
    },
  },
  plugins: [],
};

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        sewa: {
          // Backgrounds — from design-system/tokens.ts colors
          bg0:       '#050F0C',
          bg1:       '#08160F',
          bg2:       '#0C1D17',
          bg3:       '#111F1A',
          bg4:       '#162821',
          bgBorder:  '#1B3028',
          // Brand
          brand:     '#408D7B',
          brandDk:   '#2E6B5E',
          brandLt:   '#52B09A',
          brandMuted:'#1A3028',
          // Text
          textHi:    '#D0ECE6',
          textMd:    '#6FA898',
          textLo:    '#3A6055',
          textInverse:'#050F0C',
          // Clinical severity
          critical:     '#E03535',
          criticalBg:   '#2A0A0A',
          criticalMuted:'#4A1515',
          urgent:       '#E08A20',
          urgentBg:     '#2A1800',
          normal:       '#1DBF73',
          normalBg:     '#0A1F14',
          // Functional
          info:      '#2A6EF2',
          infoBg:    '#0A1530',
          warning:   '#FFB74D',
          warningBg: '#1F1200',
          success:   '#1DBF73',
          // Extended
          purple:    '#8B5CF6',
          purpleBg:  '#1A0A30',
          amber:     '#F59E0B',
        },
      },
      fontFamily: {
        sans: ['IBM Plex Sans', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Inter', 'sans-serif'],
        mono: ['IBM Plex Mono', 'SF Mono', 'Fira Code', 'Roboto Mono', 'monospace'],
      },
      borderRadius: { '2xl': '16px', '3xl': '24px' },
      boxShadow: {
        'sewa-sm':    '0 1px 3px rgba(0,0,0,0.4)',
        'sewa-md':    '0 4px 16px rgba(0,0,0,0.5)',
        'sewa-lg':    '0 8px 32px rgba(0,0,0,0.6)',
        'sewa-brand': '0 0 0 1px rgba(64,141,123,0.25), 0 4px 16px rgba(64,141,123,0.2)',
        'sewa-crit':  '0 0 0 1px rgba(224,53,53,0.375), 0 4px 16px rgba(224,53,53,0.25)',
        'sewa-glow':  '0 0 20px rgba(64,141,123,0.3)',
      },
      animation: {
        'fade-in':     'fade-in 0.3s ease forwards',
        'pulse-dot':   'pulse-dot 1.2s ease-in-out infinite',
        'slide-right': 'slide-in-right 0.25s ease forwards',
        'shimmer':     'shimmer 1.5s infinite',
      },
      keyframes: {
        'fade-in':        { from: { opacity:'0', transform:'translateY(8px)' }, to: { opacity:'1', transform:'translateY(0)' } },
        'pulse-dot':      { '0%,100%': { opacity:'1', transform:'scale(1)' }, '50%': { opacity:'0.4', transform:'scale(1.4)' } },
        'slide-in-right': { from: { transform:'translateX(20px)', opacity:'0' }, to: { transform:'translateX(0)', opacity:'1' } },
        'shimmer':        { '0%': { backgroundPosition:'-200% 0' }, '100%': { backgroundPosition:'200% 0' } },
      },
    },
  },
  plugins: [],
};

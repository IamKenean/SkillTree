/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Cinzel"', 'serif'],
        body: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      colors: {
        ink: {
          900: '#070811',
          800: '#0c0e1c',
          700: '#141733',
          600: '#1c2046',
          500: '#272c5c',
        },
        accent: {
          50: '#eef9ff',
          100: '#d9f0ff',
          200: '#bce4ff',
          300: '#8dd1ff',
          400: '#56b5ff',
          500: '#2f93ff',
          600: '#1873f5',
          700: '#155de1',
          800: '#184bb6',
          900: '#1a4391',
        },
        gold: {
          400: '#ffd76b',
          500: '#f5c042',
          600: '#d9a02a',
        },
        rare: '#48b3ff',
        epic: '#b16cff',
        legendary: '#ffb547',
      },
      boxShadow: {
        glow: '0 0 30px -5px rgba(86, 181, 255, 0.6)',
        'glow-gold': '0 0 30px -5px rgba(255, 181, 71, 0.7)',
        'glow-epic': '0 0 30px -5px rgba(177, 108, 255, 0.7)',
      },
      keyframes: {
        pulseGlow: {
          '0%,100%': { boxShadow: '0 0 0 0 rgba(86,181,255,0.5)' },
          '50%': { boxShadow: '0 0 0 14px rgba(86,181,255,0)' },
        },
        unlock: {
          '0%': { transform: 'scale(0.6)', opacity: 0 },
          '60%': { transform: 'scale(1.1)', opacity: 1 },
          '100%': { transform: 'scale(1)', opacity: 1 },
        },
        starfield: {
          '0%': { backgroundPosition: '0 0' },
          '100%': { backgroundPosition: '1000px 1000px' },
        },
      },
      animation: {
        pulseGlow: 'pulseGlow 2s ease-out infinite',
        unlock: 'unlock 0.6s cubic-bezier(.2,.9,.3,1.4) both',
      },
    },
  },
  plugins: [],
};

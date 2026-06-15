import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        obsidian: {
          950: '#05030a',
          900: '#0a0612',
          800: '#120a1f',
          700: '#1a0f2e',
          600: '#241540',
          500: '#2e1a52',
        },
        violet: {
          ignite: '#7C3AED',
          glow: '#A855F7',
          ember: '#5b21b6',
          ash: '#3b1772',
        },
        fracture: {
          DEFAULT: '#c4b5fd',
          dim: '#6d5a9a',
        },
      },
      fontFamily: {
        display: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        ignite: '0 0 0 1px rgba(168, 85, 247, 0.3), 0 0 24px -4px rgba(124, 58, 237, 0.5)',
        fracture: '0 0 0 1px rgba(124, 58, 237, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.04)',
      },
      backgroundImage: {
        'obsidian-grain':
          "radial-gradient(ellipse at top, rgba(124, 58, 237, 0.08), transparent 50%), radial-gradient(ellipse at bottom, rgba(168, 85, 247, 0.06), transparent 50%)",
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        shimmer: 'shimmer 2s linear infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
};

export default config;

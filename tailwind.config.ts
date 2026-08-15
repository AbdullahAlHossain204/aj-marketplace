import type { Config } from 'tailwindcss';

// Design tokens for the AJ Marketplace brand: modern, trustworthy, clean.
// Deliberately avoids a generic "AI dashboard" purple-gradient look —
// a single confident accent (deep indigo/teal) on a neutral base.
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f9f8',
          100: '#d9f0ed',
          200: '#b3e0da',
          300: '#7fc9bf',
          400: '#45aa9d',
          500: '#1f8c7e',
          600: '#177066', // primary brand accent
          700: '#155a53',
          800: '#144843',
          900: '#123b37',
        },
        ink: {
          50: '#f7f8f8',
          100: '#eceef0',
          200: '#d5d9dd',
          300: '#aeb5bd',
          400: '#7d8792',
          500: '#5b6570',
          600: '#454e57',
          700: '#373e45',
          800: '#25292e',
          900: '#16181b',
        },
        success: '#1f8c4a',
        warning: '#b8760a',
        danger: '#c23b3b',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '0.5rem',
      },
    },
  },
  plugins: [],
};

export default config;

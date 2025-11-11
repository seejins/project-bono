import tokens from './src/theme/colors.json' assert { type: 'json' };

const { brand, status, gradients } = tokens;

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          ...brand,
        },
        status: {
          ...status,
        },
        surface: {
          DEFAULT: brand.surface,
          dark: brand.surfaceDark,
          light: brand.surfaceLight,
          border: brand.border,
        },
        text: {
          primary: brand.foreground,
          muted: brand.muted,
          soft: brand.mutedSoft,
        },
      },
      backgroundImage: {
        'brand-hero': gradients.brandHero,
        'brand-stripes': gradients.brandStripes,
      },
      boxShadow: {
        'brand-glow': '0 18px 40px -24px rgba(255, 30, 86, 0.6)',
        'brand-soft': '0 12px 30px -12px rgba(58, 134, 255, 0.35)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-slow': 'bounce 2s infinite',
      }
    },
  },
  plugins: [],
}

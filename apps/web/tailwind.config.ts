import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-display)', 'Outfit', 'system-ui', 'sans-serif'],
        sans: ['var(--font-sans)', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        obsidian: {
          950: '#040508',
          900: '#07090E',
          850: '#0B0D13',
          800: '#0E111A',
        },
        graphite: {
          900: '#0B0E14',
          800: '#0D1017',
          700: '#141923',
          600: '#1E2533',
          500: '#2A3245',
        },
        energy: {
          cyanGlow: '#38BDF8',
          electricBlue: '#2563EB',
          celestialBlue: '#4F46E5',
          etherealViolet: '#8B5CF6',
          nebulaMagenta: '#C084FC',
        },
        solar: {
          amberGold: '#F59E0B',
          solarFlare: '#FCD34D',
          horizonGold: '#D97706',
          warmGlow: 'rgba(245, 158, 11, 0.35)',
        },
      },
      letterSpacing: {
        dhavonBrand: '0.35em',
        dhavonGreeting: '0.30em',
        dhavonPhilosophy: '0.25em',
        ambientSide: '0.28em',
      },
      backdropBlur: {
        glass: '24px',
        deep: '40px',
      },
      boxShadow: {
        'glass-pod': '0 8px 32px 0 rgba(0, 0, 0, 0.45), inset 0 0 0 1px rgba(255, 255, 255, 0.08)',
        'mic-glow': '0 0 25px rgba(168, 85, 247, 0.65), 0 0 50px rgba(56, 189, 248, 0.35)',
        'plinth-glow': '0 -15px 40px -10px rgba(245, 158, 11, 0.35), 0 -2px 20px rgba(252, 211, 77, 0.5)',
        'orb-ambient': '0 0 80px rgba(56, 189, 248, 0.25), 0 0 120px rgba(139, 92, 246, 0.2)',
      },
      animation: {
        'orb-breathe': 'orbBreathe 6s ease-in-out infinite',
        'orbit-slow': 'spin 28s linear infinite',
        'orbit-medium': 'spin 22s linear infinite reverse',
        'orbit-fast': 'spin 16s linear infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        orbBreathe: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.025)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;

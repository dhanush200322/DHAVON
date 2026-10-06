/**
 * DHAVON Visual Reference Color Tokens
 * Derived from 'DHAVON Futuristic AI Observatory.png'
 */
export const colors = {
  obsidian: {
    950: '#040508', // Deepest background / cosmic void
    900: '#07090E', // Observatory floor shadow
    850: '#0B0D13', // Glass surface base
  },
  graphite: {
    800: '#0D1017', // Primary structural architectural column
    700: '#141923', // Panel and pod surface
    600: '#1E2533', // Subtle border highlight
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
    warmGlow: 'rgba(245, 158, 11, 0.35)',
    horizonGold: '#D97706',
  },
  glass: {
    standard: 'rgba(13, 16, 23, 0.55)',
    elevated: 'rgba(20, 25, 35, 0.70)',
    borderSubtle: 'rgba(255, 255, 255, 0.08)',
    borderLuminous: 'rgba(255, 255, 255, 0.16)',
    borderActive: 'rgba(56, 189, 248, 0.40)',
  },
  text: {
    pure: '#FFFFFF',
    silver: '#E2E8F0',
    muted: '#94A3B8',
    ghost: '#475569',
  },
} as const;

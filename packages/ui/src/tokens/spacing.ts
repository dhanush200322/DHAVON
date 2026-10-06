/**
 * DHAVON Spacing, Elevation & Glass Surface Tokens
 */
export const spacing = {
  radii: {
    pill: '9999px',
    pod: '2.5rem', // 40px - Command pod rounded ends
    button: '1rem',
    card: '1.25rem',
  },
  blur: {
    subtle: '8px',
    medium: '16px',
    glass: '24px',
    deep: '40px',
  },
  glows: {
    cyan: '0 0 30px rgba(56, 189, 248, 0.25)',
    violet: '0 0 35px rgba(139, 92, 246, 0.30)',
    amber: '0 0 30px rgba(245, 158, 11, 0.35)',
    podHalo: '0 8px 32px 0 rgba(0, 0, 0, 0.37), 0 0 20px rgba(139, 92, 246, 0.15)',
    micPulse: '0 0 25px rgba(168, 85, 247, 0.65)',
  },
} as const;

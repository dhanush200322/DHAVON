/**
 * DHAVON Typography Tokens
 * Elegant geometric sans-serif with wide tracking
 */
export const typography = {
  fontFamilies: {
    display: 'var(--font-display, "Outfit", sans-serif)',
    sans: 'var(--font-sans, "Inter", sans-serif)',
    mono: 'var(--font-mono, "Space Grotesk", monospace)',
  },
  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0em',
    wide: '0.05em',
    wider: '0.15em',
    widest: '0.25em',
    dhavonBrand: '0.35em', // Used for "DHAVON" logo
    dhavonGreeting: '0.30em', // Used for "D H A N U S H"
    dhavonPhilosophy: '0.25em', // Used for "THINK • PLAN • BUILD • GROW"
    ambientSide: '0.28em', // Used for "IDEAS INTO REALITY"
  },
  fontSize: {
    micro: '0.625rem', // 10px
    badge: '0.6875rem', // 11px
    caption: '0.75rem', // 12px
    subtext: '0.875rem', // 14px
    body: '1rem', // 16px
    lead: '1.25rem', // 20px
    headingSm: '1.5rem', // 24px
    headingMd: '2rem', // 32px
    headingLg: '3rem', // 48px
    greeting: '3.75rem', // 60px
  },
} as const;

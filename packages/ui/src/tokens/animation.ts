/**
 * DHAVON Animation Tokens
 * Smooth, restrained, cinematic curves
 */
export const animation = {
  durations: {
    instant: 0.15,
    fast: 0.25,
    normal: 0.4,
    slow: 0.8,
    atmospheric: 1.6,
    orbBreath: 6.0,
    orbitRevolutionSlow: 28.0,
    orbitRevolutionMedium: 22.0,
    orbitRevolutionFast: 16.0,
  },
  easings: {
    cinematic: [0.16, 1, 0.3, 1] as const, // Smooth camera deceleration
    natural: [0.25, 0.1, 0.25, 1] as const,
    spring: { type: 'spring', damping: 25, stiffness: 200 } as const,
    gentlePulse: 'easeInOut' as const,
  },
} as const;

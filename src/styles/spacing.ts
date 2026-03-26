/**
 * Centralized spacing, radius, typography, and layout tokens.
 * These mirror the CSS custom properties defined in index.css.
 */

// ─── Spacing ───
export const spacing = {
  xs: 'var(--space-xs)',   // 4px
  sm: 'var(--space-sm)',   // 8px
  md: 'var(--space-md)',   // 16px
  lg: 'var(--space-lg)',   // 24px
  xl: 'var(--space-xl)',   // 32px
} as const;

// ─── Border Radius ───
export const radius = {
  sm: 'var(--radius-sm)',    // 8px
  md: 'var(--radius-md)',    // 12px
  lg: 'var(--radius-lg)',    // 16px
  xl: 'var(--radius-xl)',    // 24px
  full: 'var(--radius-full)', // 9999px
} as const;

// ─── Typography ───
export const typography = {
  fontFamily: "var(--font-family)",
  sizes: {
    xs: '0.75rem',
    sm: '0.85rem',
    base: '1rem',
    md: '1.1rem',
    lg: '1.25rem',
    xl: '1.5rem',
    '2xl': '1.75rem',
    '3xl': '2rem',
    '4xl': '2.5rem',
  },
  weights: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
  },
} as const;

// ─── Breakpoints (raw px for JS media query usage) ───
export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
} as const;

// ─── Common layout values ───
export const layout = {
  sidebarWidth: '260px',
  sidebarCollapsed: '80px',
  maxContentWidth: '1200px',
  cardMinWidth: '280px',
  gridCardMin: '320px',
  statCardMin: '240px',
} as const;

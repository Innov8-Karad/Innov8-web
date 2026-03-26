/**
 * Centralized color palette for the Innov8 Admin Dashboard.
 * These mirror the CSS custom properties defined in index.css.
 * Use CSS variables (via `var(--...)`) in styles for theme-awareness.
 * Use raw hex values only where CSS variables aren't supported (e.g., SVG fills, JS logic).
 */

// ─── Raw Brand Colors (constant across themes) ───
export const BRAND_COLORS = {
  primary: '#e95009',
  primaryHover: '#f8c22e',
  success: '#10B981',
  error: '#EF4444',
  accentBlue: '#6366F1',
  tealAccent: '#14B8A6',
} as const;

// ─── RGB values for rgba() usage ───
export const BRAND_RGB = {
  primary: '245, 158, 11',
  success: '16, 185, 129',
  error: '239, 68, 68',
  accentBlue: '99, 102, 241',
  tealAccent: '20, 184, 166',
} as const;

// ─── Theme-aware CSS variable references ───
export const theme = {
  // Backgrounds
  bgMain: 'var(--bg-main)',
  bgCard: 'var(--bg-card)',
  bgCardAccent: 'var(--bg-card-accent)',
  inputBg: 'var(--input-bg)',
  glassBg: 'var(--glass-bg)',

  // Text
  textMain: 'var(--text-main)',
  textSecondary: 'var(--text-secondary)',

  // Borders
  borderSubtle: 'var(--border-subtle)',

  // Brand (via CSS vars)
  primary: 'var(--primary)',
  primaryRgb: 'var(--primary-rgb)',
  success: 'var(--success)',
  error: 'var(--error)',
  accentBlue: 'var(--accent-blue)',
  tealAccent: 'var(--teal-accent)',
} as const;

// ─── Semantic color mappings ───
export const STATUS_COLORS = {
  paid: theme.success,
  pending: theme.primary,
  overdue: theme.error,
  active: theme.success,
  inactive: theme.textSecondary,
} as const;

/**
 * Returns a CSS color for exam difficulty level.
 */
export function getDifficultyColor(difficulty: string): string {
  switch (difficulty) {
    case 'easy': return theme.success;
    case 'hard': return theme.error;
    default: return theme.primary;
  }
}

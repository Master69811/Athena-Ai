// Shared UI primitives — re-exported design tokens for cross-app use (web + mobile)
export const tokens = {
  colors: {
    background: '#0a0a0f',
    surface: '#111118',
    border: '#1e1e2e',
    primary: '#6366f1',
    accent: '#8b5cf6',
    success: '#10b981',
    warning: '#f59e0b',
    destructive: '#ef4444',
  },
  radius: { sm: 8, md: 12, lg: 16, xl: 20 },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
} as const;

export type DesignTokens = typeof tokens;

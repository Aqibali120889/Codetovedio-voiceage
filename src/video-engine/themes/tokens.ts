/**
 * Design Tokens for Video Engine.
 */

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceBorder: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentGlow: string;
  positive: string;
  warning: string;
  critical: string;
}

export interface ThemeTypography {
  fontHeading: string;
  fontBody: string;
  fontCode: string;
  fontSizeHero: number;
  fontSizeH1: number;
  fontSizeH2: number;
  fontSizeBody: number;
  fontSizeSmall: number;
}

export interface ThemeTokens {
  name: string;
  colors: ThemeColors;
  typography: ThemeTypography;
  borderRadius: {
    sm: number;
    md: number;
    lg: number;
    full: number;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
}

export const BASE_TOKENS: Omit<ThemeTokens, "name" | "colors"> = {
  typography: {
    fontHeading: "sans-serif",
    fontBody: "sans-serif",
    fontCode: "monospace",
    fontSizeHero: 72,
    fontSizeH1: 52,
    fontSizeH2: 38,
    fontSizeBody: 28,
    fontSizeSmall: 20,
  },
  borderRadius: {
    sm: 6,
    md: 12,
    lg: 20,
    full: 999,
  },
  spacing: {
    xs: 8,
    sm: 16,
    md: 24,
    lg: 40,
    xl: 64,
  },
};

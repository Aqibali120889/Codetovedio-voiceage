/**
 * Theme Presets for Video Engine.
 */

import { BASE_TOKENS, type ThemeTokens } from "./tokens";

export const CyberEditorialPreset: ThemeTokens = {
  ...BASE_TOKENS,
  name: "cyber_editorial",
  colors: {
    background: "#0A0A0C",
    surface: "#121318",
    surfaceBorder: "#272935",
    textPrimary: "#FFFFFF",
    textSecondary: "#A0A5B5",
    textMuted: "#606470",
    accent: "#FF5F00",
    accentGlow: "rgba(255, 95, 0, 0.25)",
    positive: "#00C853",
    warning: "#FFD600",
    critical: "#FF3B30",
  },
};

export const CinematicTechPreset: ThemeTokens = {
  ...BASE_TOKENS,
  name: "cinematic_tech",
  colors: {
    background: "#080B10",
    surface: "#0F1520",
    surfaceBorder: "#1E2A3F",
    textPrimary: "#F0F6FC",
    textSecondary: "#8B949E",
    textMuted: "#484F58",
    accent: "#0EA5E9",
    accentGlow: "rgba(14, 165, 233, 0.25)",
    positive: "#22C55E",
    warning: "#EAB308",
    critical: "#EF4444",
  },
};

export const CleanMinimalPreset: ThemeTokens = {
  ...BASE_TOKENS,
  name: "clean_minimal",
  colors: {
    background: "#0F0F11",
    surface: "#18181B",
    surfaceBorder: "#27272A",
    textPrimary: "#FAFAFA",
    textSecondary: "#A1A1AA",
    textMuted: "#71717A",
    accent: "#FFFFFF",
    accentGlow: "rgba(255, 255, 255, 0.15)",
    positive: "#10B981",
    warning: "#F59E0B",
    critical: "#F43F5E",
  },
};

export const DataJournalismPreset: ThemeTokens = {
  ...BASE_TOKENS,
  name: "data_journalism",
  colors: {
    background: "#0B1015",
    surface: "#141D26",
    surfaceBorder: "#243242",
    textPrimary: "#F8FAFC",
    textSecondary: "#94A3B8",
    textMuted: "#64748B",
    accent: "#A855F7",
    accentGlow: "rgba(168, 85, 247, 0.25)",
    positive: "#14B8A6",
    warning: "#F97316",
    critical: "#E11D48",
  },
};

export const THEME_PRESETS: Record<string, ThemeTokens> = {
  cyber_editorial: CyberEditorialPreset,
  cinematic_tech: CinematicTechPreset,
  clean_minimal: CleanMinimalPreset,
  data_journalism: DataJournalismPreset,
};

export function resolveTheme(presetName?: string): ThemeTokens {
  if (presetName && THEME_PRESETS[presetName]) {
    return THEME_PRESETS[presetName];
  }
  return CyberEditorialPreset;
}

/**
 * Shared Scene Header & Badge Component.
 */

import React from "react";
import type { ScenePurpose } from "../types";
import type { ThemeTokens } from "../themes/tokens";
import { computeAnimationStyles } from "../animations/animation-dispatcher";

import { fitTextFontSize, SAFE_TEXT_CONTAINER } from "../layout/layout-system";

export const SceneHeader: React.FC<{
  purpose: ScenePurpose;
  onScreenText?: string;
  accentColor?: string;
  sceneFrame: number;
  fps: number;
  theme: ThemeTokens;
}> = ({ purpose, onScreenText, accentColor, sceneFrame, fps, theme }) => {
  const anim = computeAnimationStyles({ enter: "fade_down", duration_seconds: 0.4 }, sceneFrame, fps);
  const col = accentColor ?? theme.colors.accent;
  const headerFontSize = onScreenText ? fitTextFontSize(onScreenText, 24, 20, 14) : 20;

  return (
    <div
      style={{
        position: "relative",
        zIndex: 10,
        marginBottom: 24,
        display: "flex",
        alignItems: "center",
        gap: "12px",
        maxWidth: "100%",
        flexWrap: "wrap",
        ...anim,
      }}
    >
      <span
        style={{
          display: "inline-block",
          padding: "4px 10px",
          borderRadius: theme.borderRadius.sm,
          fontSize: 13,
          fontWeight: 800,
          fontFamily: theme.typography.fontCode,
          letterSpacing: 2,
          textTransform: "uppercase",
          backgroundColor: `${col}22`,
          color: col,
          border: `1px solid ${col}66`,
          flexShrink: 0,
        }}
      >
        • {purpose}
      </span>
      {onScreenText && (
        <span
          style={{
            fontSize: headerFontSize,
            fontWeight: 800,
            color: theme.colors.textPrimary,
            fontFamily: theme.typography.fontCode,
            letterSpacing: 1.5,
            textTransform: "uppercase",
            lineHeight: 1.3,
            ...SAFE_TEXT_CONTAINER,
          }}
        >
          {onScreenText}
        </span>
      )}
    </div>
  );
};

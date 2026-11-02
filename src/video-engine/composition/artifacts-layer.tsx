/**
 * Artifacts Layer Component.
 *
 * Renders the full storyboard visual artifact inventory (badges, callout cards,
 * metrics, headings, rings, and annotations) according to their exact [0..100]%
 * coordinates, dimensions, layering (z-index), and timed motion choreography.
 *
 * Solves the critical bug where storyboard artifacts were previously dropped
 * and ignored by scene renderers.
 */

import React from "react";
import type { VisualElement } from "../types";
import type { ThemeTokens } from "../themes/tokens";
import { getElementRenderer } from "../registry/element-registry";
import { computeAnimationStyles } from "../animations/animation-dispatcher";

import { remapArtifactPosition } from "../layout/layout-system";

export interface ArtifactsLayerProps {
  elements?: VisualElement[];
  sceneFrame: number;
  fps: number;
  theme: ThemeTokens;
  accentColor?: string;
  onScreenText?: string;
  hasPrimarySceneRenderer?: boolean;
  sceneType?: string;
}

export const ArtifactsLayer: React.FC<ArtifactsLayerProps> = ({
  elements,
  sceneFrame,
  fps,
  theme,
  accentColor: customAccent,
  onScreenText,
  hasPrimarySceneRenderer = false,
  sceneType,
}) => {
  if (!elements || elements.length === 0) return null;

  const accentColor = customAccent || theme.colors.accent;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 40,
        overflow: "hidden",
      }}
    >
      {elements.map((el, i) => {
        // When scene has a dedicated renderer (document_reveal, cta, parallax_hero, process_flow, etc.),
        // suppress redundant primary stage cards and duplicate headings that collide with scene content
        if (hasPrimarySceneRenderer) {
          if (
            el.id.endsWith("_primary") ||
            el.id.includes("_card_elem") ||
            (el.type === "dashboard_card_elem" && sceneType !== "dashboard_mockup") ||
            (el.type === "heading" && !!onScreenText)
          ) {
            return null;
          }
        }

        // Prevent duplicate heading collisions if scene already renders the primary on_screen_text
        if (
          el.type === "heading" &&
          onScreenText &&
          el.text &&
          (el.text.trim().toLowerCase() === onScreenText.trim().toLowerCase() ||
           onScreenText.trim().toLowerCase().includes(el.text.trim().toLowerCase()))
        ) {
          return null;
        }

        const startSec = el.animation?.start_seconds ?? 0;
        const startFrame = Math.round(startSec * fps);

        // Don't render before entrance frame
        if (sceneFrame < startFrame) {
          return null;
        }

        const animStyle = computeAnimationStyles(el.animation, sceneFrame, fps, i);
        const Renderer = getElementRenderer(el.type);

        const rawPos = { x: el.position?.x ?? 10, y: el.position?.y ?? 74 };
        const rawSize = { width: el.size?.width ?? 35, height: el.size?.height ?? 10 };
        const remappedPos = remapArtifactPosition(rawPos, rawSize, hasPrimarySceneRenderer);

        // Position styles with strict boundary safety
        const posStyle: React.CSSProperties = {
          position: "absolute",
          left: `${remappedPos.x}%`,
          top: `${remappedPos.y}%`,
          maxWidth: "88%",
          maxHeight: hasPrimarySceneRenderer ? "15%" : undefined,
          zIndex: 20 + (el.layer ?? 1) * 3,
          boxSizing: "border-box",
          overflowWrap: "break-word",
          wordBreak: "break-word",
          ...animStyle,
        };

        if (Renderer) {
          return (
            <div key={el.id || `elem_${i}`} style={posStyle}>
              <Renderer
                element={el}
                sceneFrame={sceneFrame}
                fps={fps}
                theme={theme}
                index={i}
              />
            </div>
          );
        }

        // Elegant fallback for unmapped artifact types (e.g. custom text/badges)
        const visibleText = (el as any).text || (el as any).visible_text || (el as any).label;
        if (!visibleText) return null;

        return (
          <div
            key={el.id || `fallback_${i}`}
            style={{
              ...posStyle,
              backgroundColor: "rgba(10, 12, 18, 0.85)",
              border: `1px solid ${accentColor}66`,
              borderRadius: theme.borderRadius.md,
              padding: "8px 16px",
              boxShadow: `0 4px 20px rgba(0,0,0,0.5), 0 0 12px ${accentColor}22`,
              backdropFilter: "blur(12px)",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                backgroundColor: accentColor,
                boxShadow: `0 0 8px ${accentColor}`,
              }}
            />
            <span
              style={{
                color: "#FFFFFF",
                fontFamily: theme.typography.fontHeading,
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: 0.5,
              }}
            >
              {visibleText}
            </span>
          </div>
        );
      })}
    </div>
  );
};

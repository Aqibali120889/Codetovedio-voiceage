/**
 * Visual Beats Layer Component.
 *
 * Renders timed motion graphic callouts, metric bursts, and visual energy
 * pulses synchronized to narration beats within a scene.
 * Solves "low visual artifact density" by ensuring dynamic visual events
 * fire throughout the scene, not just at scene entrance.
 */

import React from "react";
import { interpolate, Easing } from "remotion";
import type { VisualBeat } from "../../types";
import type { ThemeTokens } from "../../themes/tokens";

export interface BeatsLayerProps {
  beats?: VisualBeat[];
  sceneFrame: number;
  fps: number;
  theme: ThemeTokens;
  accentColor?: string;
}

export const BeatsLayer: React.FC<BeatsLayerProps> = ({
  beats,
  sceneFrame,
  fps,
  theme,
  accentColor: customAccent,
}) => {
  if (!beats || beats.length === 0) return null;

  const defaultAccent = customAccent || theme.colors.accent;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 50,
        overflow: "hidden",
      }}
    >
      {beats.map((beat, idx) => {
        const startFrame = Math.round(beat.start_seconds * fps);
        const durationFrames = Math.round((beat.duration_seconds ?? 2.4) * fps);
        const endFrame = startFrame + durationFrames;

        if (sceneFrame < startFrame || sceneFrame > endFrame) {
          return null;
        }

        const beatAccent = beat.accent_color || defaultAccent;
        const localFrame = sceneFrame - startFrame;

        // Entrance scale & opacity
        const entranceOpacity = interpolate(
          localFrame,
          [0, 8],
          [0, 1],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
        );

        const exitOpacity = interpolate(
          sceneFrame,
          [endFrame - 10, endFrame],
          [1, 0],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
        );

        const opacity = Math.min(entranceOpacity, exitOpacity);

        const translateY = interpolate(
          localFrame,
          [0, 12],
          [-16, 0],
          {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.out(Easing.back(1.5)),
          }
        );

        const scale = interpolate(
          localFrame,
          [0, 10],
          [0.85, 1],
          {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.out(Easing.back(1.3)),
          }
        );

        // Flash ray at trigger
        const flashProgress = interpolate(localFrame, [0, 16], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const flashOpacity = interpolate(localFrame, [0, 6, 16], [0, 0.7, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        // Beat type icon mapping
        const typeIcons: Record<string, string> = {
          highlight: "✦",
          stat_pop: "▲",
          counter_start: "◈",
          text_reveal: "❯",
          image_in: "❖",
          arrow_draw: "➔",
          list_item: "▪",
          zoom_in: "⊕",
          chart_grow: "☵",
          label_appear: "🏷",
          callout: "★",
          node_activate: "⚡",
        };

        const icon = typeIcons[beat.type] || "✦";

        return (
          <React.Fragment key={beat.beat_id || idx}>
            {/* Energy flash line sweeping horizontally across screen at beat trigger */}
            {flashOpacity > 0 && (
              <div
                style={{
                  position: "absolute",
                  top: "22%",
                  left: `${flashProgress * 100 - 30}%`,
                  width: "60%",
                  height: "2px",
                  background: `linear-gradient(90deg, transparent, ${beatAccent}, #FFFFFF, ${beatAccent}, transparent)`,
                  boxShadow: `0 0 20px ${beatAccent}`,
                  opacity: flashOpacity,
                }}
              />
            )}

            {/* Floating Beat Callout Card (placed top-right, clear of header) */}
            <div
              style={{
                position: "absolute",
                top: 48,
                right: 48,
                opacity,
                transform: `translateY(${translateY}px) scale(${scale})`,
                backgroundColor: "rgba(10, 10, 14, 0.92)",
                backdropFilter: "blur(16px)",
                border: `1px solid ${beatAccent}66`,
                borderRadius: theme.borderRadius.md,
                padding: "10px 18px",
                display: "flex",
                alignItems: "center",
                gap: 12,
                boxShadow: `0 8px 32px rgba(0,0,0,0.6), 0 0 20px ${beatAccent}33`,
                maxWidth: 340,
                boxSizing: "border-box",
              }}
            >
              {/* Pulsing indicator orb */}
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: "50%",
                  backgroundColor: `${beatAccent}22`,
                  border: `1.5px solid ${beatAccent}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: beatAccent,
                  fontSize: 13,
                  fontWeight: 900,
                  flexShrink: 0,
                  boxShadow: `0 0 10px ${beatAccent}66`,
                }}
              >
                {icon}
              </div>

              {/* Text content */}
              <div style={{ minWidth: 0, flex: 1, overflow: "hidden" }}>
                <div
                  style={{
                    color: beatAccent,
                    fontFamily: theme.typography.fontCode,
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: 1.2,
                    textTransform: "uppercase",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    maxWidth: 240,
                  }}
                >
                  {beat.label || beat.type.replace(/_/g, " ")}
                </div>
                <div
                  style={{
                    color: "#FFFFFF",
                    fontFamily: theme.typography.fontHeading,
                    fontSize: 13,
                    fontWeight: 700,
                    marginTop: 2,
                    lineHeight: 1.25,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    maxWidth: 240,
                  }}
                >
                  {beat.text || beat.description}
                </div>
              </div>

              {/* Optional Value Pill */}
              {beat.value !== undefined && (
                <div
                  style={{
                    backgroundColor: `${beatAccent}33`,
                    border: `1px solid ${beatAccent}`,
                    color: "#FFFFFF",
                    padding: "3px 8px",
                    borderRadius: theme.borderRadius.sm,
                    fontFamily: theme.typography.fontCode,
                    fontSize: 13,
                    fontWeight: 800,
                    letterSpacing: 0.5,
                    flexShrink: 0,
                  }}
                >
                  {String(beat.value)}
                </div>
              )}
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};

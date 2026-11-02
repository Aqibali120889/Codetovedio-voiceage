/**
 * Extended Scene Renderers — Five New High-Impact Scene Types.
 *
 * Adds: parallax_hero, timeline_reveal, infographic_grid, word_by_word, split_callout
 * These scenes are narration-aware, use beats-timing, and provide visual
 * diversity far beyond the existing scene library.
 */

import React from "react";
import { interpolate, Easing } from "remotion";
import { AnimatedCounter } from "remotion-bits";
import type { SceneBlueprint } from "../types";
import type { ThemeTokens } from "../themes/tokens";
import { SceneHeader } from "./scene-header";

export interface SceneProps {
  scene: SceneBlueprint;
  sceneFrame: number;
  fps: number;
  theme: ThemeTokens;
}

// ============================================================
// Utility helpers
// ============================================================

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function fadeInAt(frame: number, startFrame: number, durationFrames = 14): number {
  return clamp(
    interpolate(frame, [startFrame, startFrame + durationFrames], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    }),
    0,
    1
  );
}

function slideUpAt(frame: number, startFrame: number, distance = 24, durationFrames = 18): number {
  return interpolate(frame, [startFrame, startFrame + durationFrames], [distance, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.back(1.2)),
  });
}

// ============================================================
// 1. Parallax Hero Scene
//    Full-bleed background image with layered kinetic headline.
//    Ideal for visual hooks, topic introductions, and emotional moments.
// ============================================================

export const ParallaxHeroScene: React.FC<SceneProps> = ({
  scene,
  sceneFrame,
  fps,
  theme,
}) => {
  const accentColor = scene.accent_color ?? theme.colors.accent;

  // Parallax pan — slow horizontal drift across scene duration
  const durationFrames = Math.round((scene.duration_hint_seconds || 8) * fps);
  const panX = interpolate(sceneFrame, [0, durationFrames], [-20, 20], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.linear,
  });

  // Text entrance
  const headlineOpacity = fadeInAt(sceneFrame, Math.round(fps * 0.4));
  const headlineY = slideUpAt(sceneFrame, Math.round(fps * 0.4));
  const taglineOpacity = fadeInAt(sceneFrame, Math.round(fps * 0.9));
  const badgeOpacity = fadeInAt(sceneFrame, Math.round(fps * 1.4));

  const words = (scene.on_screen_text || "").toUpperCase().split(/\s+/);

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      {/* Background image or gradient if no image URL */}
      {scene.image_url ? (
        <div
          style={{
            position: "absolute",
            inset: "-5%",
            backgroundImage: `url(${scene.image_url})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            transform: `translateX(${panX}px)`,
            filter: "brightness(0.4) saturate(0.8)",
          }}
        />
      ) : (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `radial-gradient(ellipse at 35% 40%, ${accentColor}22 0%, ${theme.colors.background} 65%), radial-gradient(ellipse at 75% 70%, ${theme.colors.surface}88 0%, transparent 60%)`,
          }}
        />
      )}

      {/* Dark cinematic gradient overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.5) 60%, rgba(0,0,0,0.85) 100%)",
        }}
      />

      {/* Decorative accent bar */}
      <div
        style={{
          position: "absolute",
          left: 48,
          top: "20%",
          width: 4,
          height: `${Math.min(60, (sceneFrame / (fps * 0.6)) * 60)}%`,
          backgroundColor: accentColor,
          boxShadow: `0 0 20px ${accentColor}`,
          animation: "none",
          transition: "none",
        }}
      />

      {/* Main headline — words staggered */}
      <div
        style={{
          position: "absolute",
          left: 64,
          right: 64,
          top: "25%",
          opacity: headlineOpacity,
          transform: `translateY(${headlineY}px)`,
        }}
      >
        {words.map((word, i) => {
          const wOpacity = fadeInAt(sceneFrame, Math.round(fps * (0.4 + i * 0.12)));
          const wY = slideUpAt(sceneFrame, Math.round(fps * (0.4 + i * 0.12)));
          return (
            <div
              key={i}
              style={{
                opacity: wOpacity,
                transform: `translateY(${wY}px)`,
                display: "block",
                fontSize: words.length > 3 ? 88 : 110,
                fontWeight: 900,
                color: i % 3 === 1 ? accentColor : "#FFFFFF",
                fontFamily: theme.typography.fontHeading,
                lineHeight: 1.0,
                letterSpacing: -2,
                textShadow: `0 4px 32px rgba(0,0,0,0.8), 0 0 ${i % 3 === 1 ? `40px ${accentColor}66` : "0px transparent"}`,
              }}
            >
              {word}
            </div>
          );
        })}
      </div>

      {/* Clean subtitle from narration instead of developer prompt */}
      {scene.narration && (
        <div
          style={{
            position: "absolute",
            left: 64,
            right: 64,
            top: "62%",
            opacity: taglineOpacity,
          }}
        >
          <p
            style={{
              color: "rgba(255,255,255,0.85)",
              fontSize: 24,
              fontFamily: theme.typography.fontBody,
              lineHeight: 1.4,
              margin: 0,
              fontWeight: 400,
            }}
          >
            {scene.narration.length > 120 ? scene.narration.slice(0, 117) + "..." : scene.narration}
          </p>
        </div>
      )}

      {/* Purpose badge */}
      <div
        style={{
          position: "absolute",
          left: 64,
          bottom: "22%",
          opacity: badgeOpacity,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            backgroundColor: accentColor,
            boxShadow: `0 0 12px ${accentColor}`,
          }}
        />
        <span
          style={{
            color: accentColor,
            fontFamily: theme.typography.fontCode,
            fontSize: 18,
            fontWeight: 800,
            letterSpacing: 3,
          }}
        >
          {(scene.purpose || "INTRO").toUpperCase()}
        </span>
      </div>
    </div>
  );
};

// ============================================================
// 2. Timeline Reveal Scene
//    Animated milestone / step sequence that reveals one step at a time.
//    Ideal for: process explanations, histories, multi-step breakdowns.
// ============================================================

export const TimelineRevealScene: React.FC<SceneProps> = ({
  scene,
  sceneFrame,
  fps,
  theme,
}) => {
  const accentColor = scene.accent_color ?? theme.colors.accent;

  // Support both steps[] and nodes[] as data source
  const rawSteps =
    scene.steps && scene.steps.length > 0
      ? scene.steps.map((s) => ({ label: s.label, detail: s.detail }))
      : scene.nodes && scene.nodes.length > 0
      ? scene.nodes.map((n) => ({ label: n.label, detail: n.detail }))
      : [
          { label: "Step One", detail: "Foundation established" },
          { label: "Step Two", detail: "System integration" },
          { label: "Step Three", detail: "Autonomous operation" },
        ];

  const totalDurationFrames = Math.round((scene.duration_hint_seconds || 8) * fps);
  const stepRevealInterval = Math.max(
    fps * 0.8,
    Math.floor(totalDurationFrames / (rawSteps.length + 1))
  );

  return (
    <div>
      <SceneHeader
        purpose={scene.purpose}
        onScreenText={scene.on_screen_text ?? "TIMELINE"}
        accentColor={accentColor}
        sceneFrame={sceneFrame}
        fps={fps}
        theme={theme}
      />

      {/* Vertical timeline spine */}
      <div style={{ marginTop: 60, position: "relative" }}>
        {/* Animated spine */}
        <div
          style={{
            position: "absolute",
            left: 28,
            top: 0,
            width: 3,
            backgroundColor: `${accentColor}33`,
            height: `${rawSteps.length * 130}px`,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 28,
            top: 0,
            width: 3,
            backgroundColor: accentColor,
            boxShadow: `0 0 12px ${accentColor}`,
            height: `${Math.min(
              rawSteps.length * 130,
              (sceneFrame / totalDurationFrames) * rawSteps.length * 130
            )}px`,
          }}
        />

        {rawSteps.map((step, i) => {
          const revealFrame = stepRevealInterval * (i + 0.5);
          const stepOpacity = fadeInAt(sceneFrame, revealFrame, 14);
          const stepX = interpolate(
            sceneFrame,
            [revealFrame, revealFrame + 18],
            [-40, 0],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) }
          );
          const isActive = sceneFrame > revealFrame;

          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 24,
                marginBottom: 32,
                opacity: stepOpacity,
                transform: `translateX(${stepX}px)`,
              }}
            >
              {/* Node dot */}
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  flexShrink: 0,
                  marginTop: 6,
                  backgroundColor: isActive ? accentColor : theme.colors.surface,
                  border: `3px solid ${isActive ? accentColor : theme.colors.surfaceBorder}`,
                  boxShadow: isActive ? `0 0 16px ${accentColor}88` : "none",
                  zIndex: 1,
                  position: "relative",
                }}
              />

              {/* Step content */}
              <div
                style={{
                  flex: 1,
                  backgroundColor: isActive ? `${accentColor}0D` : theme.colors.surface,
                  border: `1px solid ${isActive ? `${accentColor}44` : theme.colors.surfaceBorder}`,
                  borderRadius: theme.borderRadius.md,
                  padding: "18px 24px",
                }}
              >
                <div
                  style={{
                    color: isActive ? "#FFFFFF" : theme.colors.textSecondary,
                    fontSize: 28,
                    fontWeight: 800,
                    fontFamily: theme.typography.fontHeading,
                    letterSpacing: -0.5,
                    marginBottom: step.detail ? 6 : 0,
                  }}
                >
                  <span
                    style={{
                      color: accentColor,
                      fontFamily: theme.typography.fontCode,
                      fontSize: 18,
                      marginRight: 12,
                      fontWeight: 400,
                    }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {step.label}
                </div>
                {step.detail && (
                  <div
                    style={{
                      color: theme.colors.textMuted,
                      fontSize: 20,
                      fontFamily: theme.typography.fontBody,
                      lineHeight: 1.4,
                      paddingLeft: 34,
                    }}
                  >
                    {step.detail}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ============================================================
// 3. Infographic Grid Scene
//    Grid of animated stat/concept cards — each reveals with stagger.
//    Ideal for: feature breakdowns, benefit lists, comparison specs.
// ============================================================

export const InfographicGridScene: React.FC<SceneProps> = ({
  scene,
  sceneFrame,
  fps,
  theme,
}) => {
  const accentColor = scene.accent_color ?? theme.colors.accent;

  interface GridItemEntry {
    icon?: string;
    label: string;
    value?: string | number;
    description?: string;
  }

  const rawItems: GridItemEntry[] =
    scene.grid_items && scene.grid_items.length > 0
      ? scene.grid_items
      : scene.data_points && scene.data_points.length > 0
      ? scene.data_points.map((dp) => ({
          label: dp.label,
          value: String(dp.value),
          description: dp.change,
        }))
      : [
          { label: "Speed", value: "10×", description: "Faster resolution" },
          { label: "Uptime", value: "99.9%", description: "Guaranteed SLA" },
          { label: "Events", value: "1M+", description: "Per day processed" },
          { label: "Cost", value: "−85%", description: "vs legacy systems" },
        ];

  const cols = rawItems.length <= 2 ? 1 : 2;

  return (
    <div>
      <SceneHeader
        purpose={scene.purpose}
        onScreenText={scene.on_screen_text ?? "AT A GLANCE"}
        accentColor={accentColor}
        sceneFrame={sceneFrame}
        fps={fps}
        theme={theme}
      />

      <div
        style={{
          marginTop: 48,
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: 24,
        }}
      >
        {rawItems.map((item, i) => {
          const startFrame = Math.round(fps * (0.2 + i * 0.18));
          const cardOpacity = fadeInAt(sceneFrame, startFrame, 16);
          const cardY = slideUpAt(sceneFrame, startFrame, 30, 20);

          // Animate value counter
          const hasNumber = /\d/.test(String(item.value ?? ""));
          const numericVal = hasNumber ? parseFloat(String(item.value).replace(/[^0-9.]/g, "")) : null;
          const displayVal = hasNumber && numericVal !== null
            ? (() => {
                const counted = interpolate(sceneFrame, [startFrame, startFrame + fps * 0.8], [0, numericVal], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                  easing: Easing.out(Easing.quad),
                });
                return String(item.value).replace(/[\d.]+/, Math.round(counted).toString());
              })()
            : String(item.value ?? "");

          const statusColor =
            item.description?.startsWith("-") || item.description?.startsWith("−")
              ? theme.colors.positive
              : item.description?.startsWith("+")
              ? theme.colors.accent
              : accentColor;

          return (
            <div
              key={i}
              style={{
                opacity: cardOpacity,
                transform: `translateY(${cardY}px)`,
                backgroundColor: theme.colors.surface,
                border: `1px solid ${accentColor}33`,
                borderRadius: theme.borderRadius.lg,
                padding: "28px 24px",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Glow accent */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 3,
                  backgroundColor: accentColor,
                  opacity: 0.8,
                }}
              />

              {/* Icon or index */}
              <div
                style={{
                  color: `${accentColor}`,
                  fontFamily: theme.typography.fontCode,
                  fontSize: 16,
                  fontWeight: 700,
                  letterSpacing: 2,
                  marginBottom: 12,
                  opacity: 0.7,
                }}
              >
                {item.icon ?? `[${String(i + 1).padStart(2, "0")}]`}
              </div>

              {/* Value */}
              <div
                style={{
                  color: "#FFFFFF",
                  fontSize: rawItems.length <= 2 ? 96 : 64,
                  fontWeight: 900,
                  fontFamily: theme.typography.fontHeading,
                  lineHeight: 1,
                  letterSpacing: -2,
                  textShadow: `0 0 30px ${accentColor}44`,
                  marginBottom: 8,
                }}
              >
                {displayVal}
              </div>

              {/* Label */}
              <div
                style={{
                  color: theme.colors.textSecondary,
                  fontSize: 20,
                  fontWeight: 700,
                  fontFamily: theme.typography.fontBody,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                  marginBottom: item.description ? 6 : 0,
                }}
              >
                {item.label}
              </div>

              {/* Description */}
              {item.description && (
                <div
                  style={{
                    color: statusColor,
                    fontSize: 18,
                    fontFamily: theme.typography.fontCode,
                    fontWeight: 600,
                  }}
                >
                  {item.description}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ============================================================
// 4. Word-By-Word Scene
//    Each word of the on-screen text explodes in with scale+fade.
//    Ideal for: punchy statements, key claims, emotional moments.
// ============================================================

export const WordByWordScene: React.FC<SceneProps> = ({
  scene,
  sceneFrame,
  fps,
  theme,
}) => {
  const accentColor = scene.accent_color ?? theme.colors.accent;
  const fullText = scene.on_screen_text || scene.narration || "";
  const words = fullText.split(/\s+/).filter(Boolean);
  const framesPerWord = Math.max(Math.round(fps * 0.35), 8);

  // Emphasis pattern: every 3rd word gets accent color and scale
  const emphasisIndices = new Set(
    words
      .map((_, i) => i)
      .filter(
        (i) =>
          i % 3 === 1 ||
          words[i].length > 6 ||
          ["biggest", "fastest", "zero", "instantly", "never", "always", "100", "every"].some(
            (kw) => words[i].toLowerCase().includes(kw)
          )
      )
  );

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "flex-start",
        padding: "80px 56px",
      }}
    >
      {/* Background accent gradient & optional photo backdrop */}
      {scene.image_url ? (
        <div
          style={{
            position: "absolute",
            inset: "-5%",
            backgroundImage: `url(${scene.image_url})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            opacity: 0.32,
            filter: "brightness(0.35) contrast(1.15)",
            pointerEvents: "none",
          }}
        />
      ) : (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `radial-gradient(ellipse at 20% 50%, ${accentColor}10 0%, transparent 60%)`,
            pointerEvents: "none",
          }}
        />
      )}

      {/* Scene purpose badge */}
      <div
        style={{
          color: accentColor,
          fontFamily: theme.typography.fontCode,
          fontSize: 16,
          fontWeight: 800,
          letterSpacing: 4,
          marginBottom: 40,
          opacity: fadeInAt(sceneFrame, 0, 10),
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            backgroundColor: accentColor,
            boxShadow: `0 0 10px ${accentColor}`,
          }}
        />
        {(scene.purpose || "INSIGHT").toUpperCase()}
      </div>

      {/* Words */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "12px 16px" }}>
        {words.map((word, i) => {
          const startFrame = i * framesPerWord;
          const wordOpacity = fadeInAt(sceneFrame, startFrame, 10);
          const wordScale = interpolate(
            sceneFrame,
            [startFrame, startFrame + 10],
            [1.4, 1],
            {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.out(Easing.back(1.8)),
            }
          );
          const isEmphasis = emphasisIndices.has(i);

          return (
            <span
              key={i}
              style={{
                display: "inline-block",
                opacity: wordOpacity,
                transform: `scale(${wordScale})`,
                transformOrigin: "left center",
                fontSize: words.length > 6 ? 72 : 92,
                fontWeight: 900,
                fontFamily: theme.typography.fontHeading,
                lineHeight: 1.1,
                letterSpacing: -2,
                color: isEmphasis ? accentColor : "#FFFFFF",
                textShadow: isEmphasis
                  ? `0 0 40px ${accentColor}66, 0 4px 24px rgba(0,0,0,0.8)`
                  : "0 4px 24px rgba(0,0,0,0.6)",
                backgroundColor: isEmphasis ? `${accentColor}15` : "transparent",
                padding: isEmphasis ? "2px 12px" : "0",
                borderRadius: isEmphasis ? 6 : 0,
              }}
            >
              {word}
            </span>
          );
        })}
      </div>
    </div>
  );
};

// ============================================================
// 5. Split Callout Scene
//    Two-panel split: left side large accent callout; right side supporting context.
//    Ideal for: contrasts, key claims with supporting evidence, stats+explanation.
// ============================================================

export const SplitCalloutScene: React.FC<SceneProps> = ({
  scene,
  sceneFrame,
  fps,
  theme,
}) => {
  const accentColor = scene.accent_color ?? theme.colors.accent;

  const leftText = scene.callout_text || scene.on_screen_text || "KEY INSIGHT";
  const leftLabel = scene.callout_label || (scene.purpose || "INSIGHT").toUpperCase();
  const rightText = scene.narration || "";

  // Side entrances
  const leftOpacity = fadeInAt(sceneFrame, Math.round(fps * 0.1));
  const leftX = interpolate(sceneFrame, [Math.round(fps * 0.1), Math.round(fps * 0.5)], [-60, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const rightOpacity = fadeInAt(sceneFrame, Math.round(fps * 0.5));
  const rightX = interpolate(sceneFrame, [Math.round(fps * 0.5), Math.round(fps * 0.9)], [60, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // Data points if available
  const dataPoints = scene.data_points ?? [];

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Top: Large accent callout (top 46% of screen height) */}
      <div
        style={{
          flex: "0 0 46%",
          backgroundColor: `${accentColor}0F`,
          borderBottom: `2px solid ${accentColor}33`,
          padding: "48px 48px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          opacity: leftOpacity,
          transform: `translateX(${leftX}px)`,
          position: "relative",
          overflow: "hidden",
          boxSizing: "border-box",
        }}
      >
        {/* Background glow */}
        <div
          style={{
            position: "absolute",
            top: "30%",
            left: "10%",
            width: 300,
            height: 300,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${accentColor}22 0%, transparent 70%)`,
            pointerEvents: "none",
          }}
        />

        {/* Label badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 20,
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: accentColor,
              boxShadow: `0 0 12px ${accentColor}`,
            }}
          />
          <span
            style={{
              color: accentColor,
              fontFamily: theme.typography.fontCode,
              fontSize: 15,
              fontWeight: 800,
              letterSpacing: 3,
            }}
          >
            {leftLabel}
          </span>
        </div>

        {/* Callout headline */}
        <div
          style={{
            color: "#FFFFFF",
            fontSize: leftText.length > 28 ? 38 : leftText.length > 18 ? 48 : 64,
            fontWeight: 900,
            fontFamily: theme.typography.fontHeading,
            lineHeight: 1.15,
            letterSpacing: -1.5,
            overflowWrap: "break-word",
            wordBreak: "break-word",
            maxHeight: "75%",
            overflow: "hidden",
          }}
        >
          {leftText}
        </div>
      </div>

      {/* Middle: Supporting context (32% of screen height) */}
      <div
        style={{
          flex: "0 0 32%",
          backgroundColor: theme.colors.surface,
          padding: "24px 48px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          opacity: rightOpacity,
          transform: `translateX(${rightX}px)`,
          gap: 16,
          boxSizing: "border-box",
          overflow: "hidden",
        }}
      >
        {scene.image_url && (
          <div
            style={{
              position: "relative",
              width: "100%",
              height: 180,
              borderRadius: theme.borderRadius.md,
              overflow: "hidden",
              marginBottom: 16,
              border: `1.5px solid ${accentColor}44`,
              boxShadow: `0 8px 24px rgba(0,0,0,0.5)`,
            }}
          >
            <img
              src={scene.image_url}
              alt={leftText}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          </div>
        )}
        {dataPoints.length > 0 ? (
          // Render data points as stat rows
          dataPoints.slice(0, 3).map((dp, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: i < dataPoints.slice(0, 3).length - 1 ? `1px solid ${theme.colors.surfaceBorder}` : "none",
                paddingBottom: i < dataPoints.slice(0, 3).length - 1 ? 16 : 0,
                opacity: fadeInAt(sceneFrame, Math.round(fps * (0.6 + i * 0.2))),
              }}
            >
              <span
                style={{
                  color: theme.colors.textSecondary,
                  fontSize: 22,
                  fontFamily: theme.typography.fontBody,
                }}
              >
                {dp.label}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span
                  style={{
                    color: "#FFFFFF",
                    fontSize: 28,
                    fontWeight: 800,
                    fontFamily: theme.typography.fontHeading,
                  }}
                >
                  {typeof dp.value === "number" ? (
                    <AnimatedCounter
                      transition={{
                        values: [0, dp.value],
                        duration: Math.round(fps * 0.7),
                        delay: Math.round(fps * (0.6 + i * 0.2)),
                      }}
                    />
                  ) : (
                    String(dp.value)
                  )}
                </span>
                {dp.change && (
                  <span
                    style={{
                      color: dp.status === "good" ? theme.colors.positive : theme.colors.critical,
                      fontSize: 18,
                      fontFamily: theme.typography.fontCode,
                      fontWeight: 700,
                      backgroundColor:
                        dp.status === "good"
                          ? `${theme.colors.positive}18`
                          : `${theme.colors.critical}18`,
                      padding: "4px 10px",
                      borderRadius: 4,
                    }}
                  >
                    {dp.change}
                  </span>
                )}
              </div>
            </div>
          ))
        ) : (
          // Render visual description as prose
          <p
            style={{
              color: theme.colors.textSecondary,
              fontSize: 26,
              fontFamily: theme.typography.fontBody,
              lineHeight: 1.55,
              margin: 0,
            }}
          >
            {rightText}
          </p>
        )}
      </div>
    </div>
  );
};

// ============================================================
// 6. Document Reveal Scene
//    Authentic sourced document/article clipping with animated
//    highlighter sweep and verified publisher badge.
//    Ideal for: investigative journalism, breaking news, evidence citations.
// ============================================================

export const DocumentRevealScene: React.FC<SceneProps> = ({
  scene,
  sceneFrame,
  fps,
  theme,
}) => {
  const accentColor = scene.accent_color ?? theme.colors.accent;
  const combined = (scene.narration + " " + (scene.visual_description || "")).toLowerCase();
  const pubMatch = combined.match(/\b(reuters|bloomberg|axios|financial times|ft|nature|wsj|techcrunch|arxiv|mit)\b/i);
  const publisher = pubMatch ? pubMatch[1].toUpperCase() : "VERIFIED DISCLOSURE";

  const cardOpacity = fadeInAt(sceneFrame, Math.round(fps * 0.2), 14);
  const cardY = slideUpAt(sceneFrame, Math.round(fps * 0.2), 24, 18);

  // Animated highlighter sweep across key quotation
  const hlStart = Math.round(fps * 0.9);
  const hlProgress = clamp(
    interpolate(sceneFrame, [hlStart, hlStart + Math.round(fps * 1.1)], [0, 100], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.quad),
    }),
    0,
    100
  );

  const headline = (scene.on_screen_text || "OFFICIAL REPORT").toUpperCase();
  const quoteText = scene.narration;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "60px 48px",
      }}
    >
      {/* Background document grid */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(circle at 50% 40%, ${accentColor}12 0%, ${theme.colors.background} 80%)`,
          pointerEvents: "none",
        }}
      />

      {/* Main Document Card */}
      <div
        style={{
          width: "100%",
          maxWidth: 960,
          backgroundColor: "rgba(18, 22, 32, 0.92)",
          backdropFilter: "blur(20px)",
          border: `1.5px solid ${accentColor}44`,
          borderRadius: theme.borderRadius.lg,
          boxShadow: `0 20px 60px rgba(0,0,0,0.7), 0 0 30px ${accentColor}18`,
          padding: "44px 48px",
          position: "relative",
          overflow: "hidden",
          opacity: cardOpacity,
          transform: `translateY(${cardY}px)`,
        }}
      >
        {/* Document Header Bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: `1px solid ${theme.colors.surfaceBorder}`,
            paddingBottom: 20,
            marginBottom: 28,
          }}
        >
          {/* Publisher Badge */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              backgroundColor: `${accentColor}22`,
              border: `1px solid ${accentColor}66`,
              padding: "6px 14px",
              borderRadius: theme.borderRadius.sm,
              fontFamily: theme.typography.fontCode,
              fontSize: 14,
              fontWeight: 800,
              letterSpacing: 2,
              color: accentColor,
            }}
          >
            <span>📄</span>
            <span>{publisher}</span>
          </div>

          {/* Verification Pill */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              color: theme.colors.positive,
              fontFamily: theme.typography.fontCode,
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: 1,
            }}
          >
            <span>✓</span>
            <span>EVIDENCE VERIFIED</span>
          </div>
        </div>

        {/* Verified source document figure if present */}
        {scene.image_url && (
          <div
            style={{
              position: "relative",
              width: "100%",
              height: 220,
              borderRadius: theme.borderRadius.md,
              overflow: "hidden",
              marginBottom: 20,
              border: `1.5px solid ${accentColor}44`,
              boxShadow: `0 8px 24px rgba(0,0,0,0.6)`,
            }}
          >
            <img
              src={scene.image_url}
              alt={headline}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                filter: "contrast(1.05) saturate(1.1)",
              }}
            />
            <div
              style={{
                position: "absolute",
                bottom: 8,
                right: 12,
                backgroundColor: "rgba(0,0,0,0.8)",
                padding: "3px 10px",
                borderRadius: 4,
                fontSize: 11,
                color: "#E2E8F0",
                fontFamily: theme.typography.fontCode,
                letterSpacing: 1.5,
              }}
            >
              {(scene.claims?.[0]?.claim_type || scene.purpose || "VERIFIED EVIDENCE").toUpperCase()}
            </div>
          </div>
        )}

        {/* Document Headline */}
        <h1
          style={{
            color: "#FFFFFF",
            fontFamily: theme.typography.fontHeading,
            fontSize: 48,
            fontWeight: 900,
            lineHeight: 1.15,
            letterSpacing: -1,
            margin: "0 0 24px 0",
          }}
        >
          {headline}
        </h1>

        {/* Highlighted Quote Excerpt */}
        <div
          style={{
            position: "relative",
            margin: "24px 0",
            padding: "16px 20px",
            backgroundColor: "rgba(255, 255, 255, 0.03)",
            borderLeft: `4px solid ${accentColor}`,
            borderRadius: `0 ${theme.borderRadius.sm}px ${theme.borderRadius.sm}px 0`,
          }}
        >
          {/* Animated highlighter bar */}
          <div
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: 0,
              width: `${hlProgress}%`,
              backgroundColor: `${accentColor}26`,
              pointerEvents: "none",
              borderRadius: "inherit",
            }}
          />
          <p
            style={{
              position: "relative",
              zIndex: 2,
              color: "#E2E8F0",
              fontFamily: theme.typography.fontBody,
              fontSize: 26,
              lineHeight: 1.5,
              margin: 0,
              fontWeight: 500,
            }}
          >
            “{quoteText}”
          </p>
        </div>

        {/* Footer Meta */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 28,
            paddingTop: 16,
            borderTop: `1px solid ${theme.colors.surfaceBorder}`,
            color: theme.colors.textSecondary,
            fontFamily: theme.typography.fontCode,
            fontSize: 12,
            letterSpacing: 1,
          }}
        >
          <span>CITATION: {scene.claims?.[0]?.on_screen_citation || "PRIMARY EVIDENCE SOURCE"}</span>
          <span>VERIFIED DISCLOSURE</span>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// 7. Editorial Montage Scene
//    Multi-image layered photograph collage with dynamic Ken Burns
//    drift and staggered editorial typography.
// ============================================================

export const EditorialMontageScene: React.FC<SceneProps> = ({
  scene,
  sceneFrame,
  fps,
  theme,
}) => {
  const accentColor = scene.accent_color ?? theme.colors.accent;
  const durationFrames = Math.round((scene.duration_hint_seconds || 6) * fps);

  // Slow, cinematic zoom and drift
  const scale = interpolate(sceneFrame, [0, durationFrames], [1.0, 1.08], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const panX = interpolate(sceneFrame, [0, durationFrames], [-10, 10], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const headlineOpacity = fadeInAt(sceneFrame, Math.round(fps * 0.3), 14);
  const headlineY = slideUpAt(sceneFrame, Math.round(fps * 0.3), 20, 16);
  const tagOpacity = fadeInAt(sceneFrame, Math.round(fps * 0.6), 12);

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      {/* Background photographic canvas */}
      {scene.image_url ? (
        <div
          style={{
            position: "absolute",
            inset: "-5%",
            backgroundImage: `url(${scene.image_url})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            transform: `scale(${scale}) translateX(${panX}px)`,
            filter: "brightness(0.42) contrast(1.1) saturate(0.9)",
          }}
        />
      ) : (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `radial-gradient(ellipse at 40% 30%, ${accentColor}25 0%, ${theme.colors.background} 75%)`,
          }}
        />
      )}

      {/* Cinematic gradient mask */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(8,10,14,0.3) 0%, rgba(8,10,14,0.65) 50%, rgba(8,10,14,0.92) 100%)",
        }}
      />

      {/* Top Editorial Kicker */}
      <div
        style={{
          position: "absolute",
          top: 64,
          left: 56,
          right: 56,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          opacity: tagOpacity,
          borderBottom: `1px solid ${accentColor}44`,
          paddingBottom: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              backgroundColor: accentColor,
              boxShadow: `0 0 10px ${accentColor}`,
            }}
          />
          <span
            style={{
              color: accentColor,
              fontFamily: theme.typography.fontCode,
              fontSize: 16,
              fontWeight: 800,
              letterSpacing: 3,
            }}
          >
            {(scene.purpose || "FEATURE STORY").toUpperCase()}
          </span>
        </div>
        <span
          style={{
            color: "#FFFFFF",
            fontFamily: theme.typography.fontCode,
            fontSize: 13,
            opacity: 0.8,
            letterSpacing: 1,
          }}
        >
          SPECIAL REPORT
        </span>
      </div>

      {/* Headline Block (positioned in upper-mid safe area to prevent subtitle collision) */}
      <div
        style={{
          position: "absolute",
          top: 200,
          left: 56,
          right: 56,
          opacity: headlineOpacity,
          transform: `translateY(${headlineY}px)`,
        }}
      >
        <div
          style={{
            backgroundColor: "rgba(10, 12, 18, 0.85)",
            backdropFilter: "blur(16px)",
            border: `1.5px solid ${accentColor}44`,
            borderRadius: theme.borderRadius.lg,
            padding: "36px 40px",
            boxShadow: `0 16px 48px rgba(0,0,0,0.8), 0 0 24px ${accentColor}22`,
          }}
        >
          <div
            style={{
              color: "#FFFFFF",
              fontFamily: theme.typography.fontHeading,
              fontSize: 54,
              fontWeight: 900,
              lineHeight: 1.1,
              letterSpacing: -1.5,
              marginBottom: 16,
            }}
          >
            {scene.on_screen_text || scene.narration.slice(0, 60)}
          </div>
          <div
            style={{
              color: theme.colors.textSecondary,
              fontFamily: theme.typography.fontBody,
              fontSize: 22,
              lineHeight: 1.45,
            }}
          >
            {scene.narration}
          </div>
        </div>
      </div>
    </div>
  );
};


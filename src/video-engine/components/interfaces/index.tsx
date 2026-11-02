/**
 * Interface & Mockup Components for Video Engine.
 */

import React from "react";
import type {
  TerminalWindowElement,
  DashboardCardElement,
  BrowserFrameElement,
} from "../../types";
import { computeAnimationStyles } from "../../animations/animation-dispatcher";
import type { ThemeTokens } from "../../themes/tokens";
import { TypeWriter } from "remotion-bits";

interface InterfaceProps<T> {
  element: T;
  sceneFrame: number;
  fps: number;
  theme: ThemeTokens;
  index?: number;
}

export const TerminalWindowComponent: React.FC<
  InterfaceProps<TerminalWindowElement>
> = ({ element, sceneFrame, fps, theme, index = 0 }) => {
  const containerAnim = computeAnimationStyles(element.animation, sceneFrame, fps, index);

  const speed = element.typing_speed_frames ?? 16;
  const lines = element.lines || [];
  const visibleLineCount = Math.min(
    lines.length,
    Math.floor(sceneFrame / speed) + 1
  );

  return (
    <div
      style={{
        width: "100%",
        backgroundColor: "#07080A",
        border: `1px solid ${theme.colors.accent}44`,
        borderRadius: theme.borderRadius.md,
        overflow: "hidden",
        boxShadow: `0 20px 50px rgba(0,0,0,0.8), 0 0 20px ${theme.colors.accent}15`,
        fontFamily: theme.typography.fontCode,
        ...containerAnim,
      }}
    >
      {/* Terminal Titlebar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          backgroundColor: "#111318",
          borderBottom: "1px solid #1E222D",
        }}
      >
        <div style={{ display: "flex", gap: "8px" }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#FF5F56" }} />
          <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#FFBD2E" }} />
          <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#27C93F" }} />
        </div>
        <div style={{ fontSize: 13, color: theme.colors.textMuted }}>
          {element.title ?? "voiceage-core --telemetry live"}
        </div>
        <div style={{ width: 34 }} />
      </div>

      {/* Terminal Body */}
      <div
        style={{
          padding: "20px 24px",
          minHeight: "220px",
          maxHeight: "850px",
          overflow: "hidden",
          fontSize: 16,
          lineHeight: 1.6,
          boxSizing: "border-box",
        }}
      >
        {lines.slice(0, Math.min(visibleLineCount, 10)).map((line, i) => {
          const isCommand = i === 0 || line.startsWith("user@") || line.startsWith("$");
          const isError = line.includes("ERR") || line.includes("504") || line.includes("ALERT");
          const isSuccess = line.includes("200") || line.includes("OK") || line.includes("mitigated");

          const lineCol = isCommand
            ? theme.colors.positive
            : isError
            ? theme.colors.critical
            : isSuccess
            ? theme.colors.positive
            : theme.colors.textSecondary;

          return (
            <div
              key={i}
              style={{
                color: lineCol,
                marginBottom: 4,
                overflowWrap: "break-word",
                wordBreak: "break-word",
                whiteSpace: "pre-wrap",
                boxSizing: "border-box",
              }}
            >
              {isCommand && i === visibleLineCount - 1 ? (
                <TypeWriter text={line} typeSpeed={2} cursor={true} />
              ) : (
                line
              )}
            </div>
          );
        })}
        {/* Blinking cursor */}
        <span
          style={{
            display: "inline-block",
            width: 8,
            height: 16,
            backgroundColor: theme.colors.accent,
            opacity: Math.sin(sceneFrame * 0.25) > 0 ? 1 : 0,
            verticalAlign: "middle",
            marginLeft: 4,
          }}
        />
      </div>
    </div>
  );
};

export const DashboardCardComponent: React.FC<
  InterfaceProps<DashboardCardElement>
> = ({ element, sceneFrame, fps, theme, index = 0 }) => {
  const containerAnim = computeAnimationStyles(element.animation, sceneFrame, fps, index);
  const metrics = element.metrics || [];

  return (
    <div
      style={{
        padding: "24px",
        backgroundColor: theme.colors.surface,
        border: `1px solid ${theme.colors.surfaceBorder}`,
        borderRadius: theme.borderRadius.lg,
        boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
        ...containerAnim,
      }}
    >
      <div
        style={{
          fontSize: theme.typography.fontSizeSmall,
          color: theme.colors.textSecondary,
          fontFamily: theme.typography.fontCode,
          letterSpacing: 2,
          textTransform: "uppercase",
          marginBottom: 20,
        }}
      >
        {element.title || "METRICS OVERVIEW"}
      </div>

      {metrics.length > 0 ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          {metrics.map((m, i) => (
            <div
              key={i}
              style={{
                padding: "16px",
                backgroundColor: theme.colors.background,
                borderRadius: theme.borderRadius.md,
                border: `1px solid ${theme.colors.surfaceBorder}`,
              }}
            >
              <div style={{ fontSize: 14, color: theme.colors.textMuted, marginBottom: 6 }}>
                {m.label}
              </div>
              <div
                style={{
                  fontSize: theme.typography.fontSizeH2,
                  fontWeight: 900,
                  color: theme.colors.textPrimary,
                  fontFamily: theme.typography.fontHeading,
                }}
              >
                {m.value}
              </div>
              {m.change && (
                <div
                  style={{
                    fontSize: 13,
                    color: m.change.startsWith("+") ? theme.colors.positive : theme.colors.accent,
                    fontWeight: 700,
                    marginTop: 4,
                  }}
                >
                  {m.change}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
};

export const BrowserFrameComponent: React.FC<
  InterfaceProps<BrowserFrameElement>
> = ({ element, sceneFrame, fps, theme, index = 0 }) => {
  const containerAnim = computeAnimationStyles(element.animation, sceneFrame, fps, index);

  return (
    <div
      style={{
        width: "100%",
        backgroundColor: theme.colors.surface,
        border: `1px solid ${theme.colors.surfaceBorder}`,
        borderRadius: theme.borderRadius.md,
        overflow: "hidden",
        boxShadow: "0 20px 40px rgba(0,0,0,0.7)",
        ...containerAnim,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "10px 14px",
          backgroundColor: theme.colors.background,
          borderBottom: `1px solid ${theme.colors.surfaceBorder}`,
        }}
      >
        <div style={{ display: "flex", gap: "6px" }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#555" }} />
          <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#555" }} />
          <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#555" }} />
        </div>
        <div
          style={{
            flex: 1,
            backgroundColor: theme.colors.surface,
            borderRadius: 4,
            padding: "4px 10px",
            fontSize: 12,
            color: theme.colors.textMuted,
            fontFamily: theme.typography.fontCode,
          }}
        >
          {element.url ?? "https://voiceage.ai/autonomous-orchestrator"}
        </div>
      </div>
    </div>
  );
};

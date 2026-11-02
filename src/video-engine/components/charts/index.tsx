/**
 * Infographics & Chart Components for Video Engine.
 *
 * Implements deterministic SVG and HTML charts with Remotion interpolation.
 */

import React from "react";
import type {
  BarChartElement,
  LineChartElement,
  MetricCounterElement,
  ComparisonPanelElement,
} from "../../types";
import {
  computeAnimationStyles,
  computeDrawLineProgress,
} from "../../animations/animation-dispatcher";
import type { ThemeTokens } from "../../themes/tokens";
import { AnimatedCounter } from "remotion-bits";

interface ChartProps<T> {
  element: T;
  sceneFrame: number;
  fps: number;
  theme: ThemeTokens;
  index?: number;
}

export const BarChartComponent: React.FC<ChartProps<BarChartElement>> = ({
  element,
  sceneFrame,
  fps,
  theme,
  index = 0,
}) => {
  const containerAnim = computeAnimationStyles(element.animation, sceneFrame, fps, index);

  const data = element.data || [];
  const rawValues = data.map((d) => d.value);
  const maxVal = Math.max(1, element.max_value ?? (rawValues.length > 0 ? Math.max(...rawValues, 1) : 100));

  return (
    <div
      style={{
        width: "100%",
        padding: "24px",
        backgroundColor: theme.colors.surface,
        border: `1px solid ${theme.colors.surfaceBorder}`,
        borderRadius: theme.borderRadius.lg,
        boxShadow: "0 10px 40px rgba(0,0,0,0.6)",
        ...containerAnim,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
        {element.title && (
          <h3
            style={{
              margin: 0,
              fontSize: theme.typography.fontSizeH2 - 6,
              fontWeight: 800,
              color: theme.colors.textPrimary,
              fontFamily: theme.typography.fontHeading,
            }}
          >
            {element.title}
          </h3>
        )}
        {element.is_illustrative && (
          <span
            style={{
              fontSize: 14,
              color: theme.colors.textMuted,
              fontFamily: theme.typography.fontCode,
              textTransform: "uppercase",
              padding: "4px 8px",
              border: `1px solid ${theme.colors.surfaceBorder}`,
              borderRadius: 4,
            }}
          >
            Illustrative
          </span>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {data.map((point, i) => {
          const barStartFrame = Math.round(
            (element.animation?.start_seconds ?? 0) * fps + i * (fps * 0.15)
          );
          const barDurFrames = Math.max(1, Math.round(0.6 * fps));
          const progress = computeDrawLineProgress(barStartFrame, barDurFrames, sceneFrame);

          const barPercentage = Math.round((point.value / maxVal) * 100 * progress);
          const barColor =
            point.color ?? (point.status === "bad" ? theme.colors.critical : theme.colors.accent);

          return (
            <div key={i}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 6,
                  fontFamily: theme.typography.fontCode,
                  fontSize: theme.typography.fontSizeSmall,
                  color: theme.colors.textSecondary,
                }}
              >
                <span>{point.label}</span>
                <span style={{ fontWeight: 800, color: theme.colors.textPrimary }}>
                  {Math.round(point.value * progress).toLocaleString()}
                  {element.unit ? ` ${element.unit}` : ""}
                  {point.change && (
                    <span
                      style={{
                        marginLeft: 8,
                        fontSize: 14,
                        color: point.status === "bad" ? theme.colors.critical : theme.colors.positive,
                      }}
                    >
                      ({point.change})
                    </span>
                  )}
                </span>
              </div>
              <div
                style={{
                  width: "100%",
                  height: "16px",
                  backgroundColor: theme.colors.background,
                  borderRadius: theme.borderRadius.sm,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${barPercentage}%`,
                    height: "100%",
                    backgroundColor: barColor,
                    boxShadow: `0 0 12px ${barColor}88`,
                    transition: "width 0.05s linear",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const LineChartComponent: React.FC<ChartProps<LineChartElement>> = ({
  element,
  sceneFrame,
  fps,
  theme,
  index = 0,
}) => {
  const containerAnim = computeAnimationStyles(element.animation, sceneFrame, fps, index);

  const startF = Math.round((element.animation?.start_seconds ?? 0) * fps);
  const durF = Math.max(1, Math.round((element.animation?.duration_seconds ?? 1.2) * fps));
  const progress = computeDrawLineProgress(startF, durF, sceneFrame);

  const data = element.data || [];
  const values = data.map((d) => d.value);
  const maxVal = Math.max(1, ...(values.length > 0 ? values : [1]));
  const minVal = Math.min(0, ...(values.length > 0 ? values : [0]));
  const range = maxVal - minVal || 1;

  const width = 800;
  const height = 300;
  const padding = 40;

  const points = data.map((p, i) => {
    const x = padding + (i / Math.max(1, data.length - 1)) * (width - 2 * padding);
    const y = height - padding - ((p.value - minVal) / range) * (height - 2 * padding);
    return { x, y, label: p.label, value: p.value };
  });

  const pathD = points.reduce((acc, pt, i) => {
    return i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
  }, "");

  return (
    <div
      style={{
        width: "100%",
        padding: "24px",
        backgroundColor: theme.colors.surface,
        border: `1px solid ${theme.colors.surfaceBorder}`,
        borderRadius: theme.borderRadius.lg,
        ...containerAnim,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        {element.title && (
          <h3
            style={{
              margin: 0,
              fontSize: theme.typography.fontSizeH2 - 6,
              fontWeight: 800,
              color: theme.colors.textPrimary,
              fontFamily: theme.typography.fontHeading,
            }}
          >
            {element.title}
          </h3>
        )}
      </div>

      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        {/* Horizontal grid lines */}
        {[0, 0.5, 1].map((pct, i) => {
          const y = height - padding - pct * (height - 2 * padding);
          return (
            <line
              key={i}
              x1={padding}
              y1={y}
              x2={width - padding}
              y2={y}
              stroke={theme.colors.surfaceBorder}
              strokeWidth="1"
            />
          );
        })}

        {/* Drawn line */}
        <path
          d={pathD}
          fill="none"
          stroke={theme.colors.accent}
          strokeWidth="4"
          strokeDasharray="1000"
          strokeDashoffset={1000 * (1 - progress)}
        />

        {/* Node dots */}
        {points.map((pt, i) => {
          const dotRevealFrame = startF + (i / points.length) * durF;
          if (sceneFrame < dotRevealFrame) return null;
          return (
            <g key={i}>
              <circle cx={pt.x} cy={pt.y} r={6} fill={theme.colors.accent} />
              <text
                x={pt.x}
                y={pt.y - 12}
                textAnchor="middle"
                fill={theme.colors.textPrimary}
                fontSize="14"
                fontFamily={theme.typography.fontCode}
                fontWeight="700"
              >
                {pt.value}
                {element.unit ?? ""}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export const MetricCounterComponent: React.FC<ChartProps<MetricCounterElement>> = ({
  element,
  sceneFrame,
  fps,
  theme,
  index = 0,
}) => {
  const containerAnim = computeAnimationStyles(element.animation, sceneFrame, fps, index);

  const startF = Math.round((element.animation?.start_seconds ?? 0) * fps);
  const durF = Math.max(1, Math.round((element.animation?.duration_seconds ?? 1) * fps));

  const statusColor =
    element.status === "good"
      ? theme.colors.positive
      : element.status === "bad"
      ? theme.colors.critical
      : theme.colors.accent;

  return (
    <div
      style={{
        padding: "32px",
        backgroundColor: theme.colors.surface,
        border: `1px solid ${statusColor}44`,
        borderRadius: theme.borderRadius.lg,
        boxShadow: `0 0 30px ${statusColor}22`,
        textAlign: "center",
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
          marginBottom: 12,
        }}
      >
        {element.label}
      </div>

      <div
        style={{
          fontSize: theme.typography.fontSizeHero + 10,
          fontWeight: 900,
          color: theme.colors.textPrimary,
          fontFamily: theme.typography.fontHeading,
          letterSpacing: -2,
          lineHeight: 1,
        }}
      >
        <AnimatedCounter
          transition={{
            values: [element.start_value ?? 0, element.end_value],
            duration: durF,
            delay: startF,
          }}
          prefix={element.prefix}
          postfix={element.suffix}
        />
      </div>

      {element.delta && (
        <div
          style={{
            marginTop: 14,
            display: "inline-block",
            padding: "4px 12px",
            borderRadius: theme.borderRadius.full,
            fontSize: theme.typography.fontSizeSmall,
            fontWeight: 800,
            fontFamily: theme.typography.fontCode,
            backgroundColor: `${statusColor}22`,
            color: statusColor,
            border: `1px solid ${statusColor}66`,
          }}
        >
          {element.delta}
        </div>
      )}
    </div>
  );
};

export const ComparisonPanelComponent: React.FC<ChartProps<ComparisonPanelElement>> = ({
  element,
  sceneFrame,
  fps,
  theme,
  index = 0,
}) => {
  const containerAnim = computeAnimationStyles(element.animation, sceneFrame, fps, index);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "20px",
        width: "100%",
        ...containerAnim,
      }}
    >
      {/* Left (Before / Old) */}
      <div
        style={{
          padding: "24px",
          backgroundColor: `${theme.colors.critical}11`,
          border: `1px solid ${theme.colors.critical}55`,
          borderRadius: theme.borderRadius.md,
        }}
      >
        <div
          style={{
            fontSize: theme.typography.fontSizeSmall,
            fontWeight: 800,
            color: theme.colors.critical,
            fontFamily: theme.typography.fontCode,
            letterSpacing: 1,
            marginBottom: 16,
            textTransform: "uppercase",
          }}
        >
          {element.left_title}
        </div>
        <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
          {(element.left_items || []).map((it, i) => (
            <li
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                fontSize: theme.typography.fontSizeBody - 4,
                color: theme.colors.textSecondary,
                marginBottom: 12,
                fontFamily: theme.typography.fontHeading,
              }}
            >
              <span style={{ color: theme.colors.critical, fontWeight: 900 }}>✕</span>
              <span>{it}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Right (After / Solution) */}
      <div
        style={{
          padding: "24px",
          backgroundColor: `${theme.colors.positive}11`,
          border: `1px solid ${theme.colors.positive}55`,
          borderRadius: theme.borderRadius.md,
          boxShadow: `0 0 24px ${theme.colors.positive}22`,
        }}
      >
        <div
          style={{
            fontSize: theme.typography.fontSizeSmall,
            fontWeight: 800,
            color: theme.colors.positive,
            fontFamily: theme.typography.fontCode,
            letterSpacing: 1,
            marginBottom: 16,
            textTransform: "uppercase",
          }}
        >
          {element.right_title}
        </div>
        <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
          {(element.right_items || []).map((it, i) => (
            <li
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                fontSize: theme.typography.fontSizeBody - 4,
                color: theme.colors.textPrimary,
                marginBottom: 12,
                fontFamily: theme.typography.fontHeading,
                fontWeight: 600,
              }}
            >
              <span style={{ color: theme.colors.positive, fontWeight: 900 }}>✓</span>
              <span>{it}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

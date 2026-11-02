/**
 * Built-in Scene Renderers for Video Engine.
 */

import React from "react";
import { interpolate, Easing } from "remotion";
import type { SceneBlueprint } from "../types";
import type { ThemeTokens } from "../themes/tokens";
import { SceneHeader } from "./scene-header";
import { computeAnimationStyles } from "../animations/animation-dispatcher";
import { BarChartComponent, LineChartComponent, MetricCounterComponent, ComparisonPanelComponent } from "../components/charts";
import { FlowNodeComponent, ConnectorComponent } from "../components/diagrams";
import { TerminalWindowComponent, DashboardCardComponent } from "../components/interfaces";
import { KineticTextComponent, QuoteBlockComponent } from "../components/typography";

export interface SceneProps {
  scene: SceneBlueprint;
  sceneFrame: number;
  fps: number;
  theme: ThemeTokens;
}

// 1. Kinetic Typography
export const KineticTypographyScene: React.FC<SceneProps> = ({
  scene,
  sceneFrame,
  fps,
  theme,
}) => {
  const words = (scene.on_screen_text || scene.narration)
    .split(/\s+/)
    .slice(0, 8);

  const containerAnim = computeAnimationStyles(
    { enter: "fade", duration_seconds: 0.3 },
    sceneFrame,
    fps
  );

  return (
    <div style={{ ...containerAnim }}>
      <SceneHeader
        purpose={scene.purpose}
        onScreenText={scene.on_screen_text}
        accentColor={scene.accent_color}
        sceneFrame={sceneFrame}
        fps={fps}
        theme={theme}
      />
      <div style={{ marginTop: 60 }}>
        <KineticTextComponent
          element={{
            id: `${scene.id}_kinetic`,
            type: "kinetic_text",
            words,
            highlight_index: Math.min(1, words.length - 1),
          }}
          sceneFrame={sceneFrame}
          fps={fps}
          theme={theme}
        />
      </div>
    </div>
  );
};

// 2. Stat Counter
export const StatCounterScene: React.FC<SceneProps> = ({
  scene,
  sceneFrame,
  fps,
  theme,
}) => {
  const dp = scene.data_points ?? [
    { label: "Observed Baseline", value: 100, change: "Baseline", status: "neutral" },
    { label: "Verified Measurement", value: 24, change: "Empirical", status: "good" },
  ];

  return (
    <div>
      <SceneHeader
        purpose={scene.purpose}
        onScreenText={scene.on_screen_text ?? "PERFORMANCE BENCHMARK"}
        accentColor={scene.accent_color}
        sceneFrame={sceneFrame}
        fps={fps}
        theme={theme}
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 24, marginTop: 40 }}>
        {dp.map((point, i) => (
          <MetricCounterComponent
            key={i}
            element={{
              id: `${scene.id}_metric_${i}`,
              type: "metric_counter_elem",
              label: point.label,
              end_value: point.value,
              suffix: typeof point.value === "number" && point.value > 100 ? "" : "s",
              delta: point.change,
              status: point.status,
              animation: { enter: "fade_up", start_seconds: i * 0.2 },
            }}
            sceneFrame={sceneFrame}
            fps={fps}
            theme={theme}
            index={i}
          />
        ))}
      </div>
    </div>
  );
};

// 3. Bar Chart
export const BarChartScene: React.FC<SceneProps> = ({
  scene,
  sceneFrame,
  fps,
  theme,
}) => {
  const chartData = scene.chart?.points ?? scene.data_points ?? [
    { label: "Manual Analysis", value: 120, status: "bad" },
    { label: "Scripted Pipelines", value: 45, status: "neutral" },
    { label: "Autonomous Agent Core", value: 3, status: "good" },
  ];

  return (
    <div>
      <SceneHeader
        purpose={scene.purpose}
        onScreenText={scene.on_screen_text ?? "INFOGRAPHIC METRICS"}
        accentColor={scene.accent_color}
        sceneFrame={sceneFrame}
        fps={fps}
        theme={theme}
      />
      <div style={{ marginTop: 40 }}>
        <BarChartComponent
          element={{
            id: `${scene.id}_bar_chart`,
            type: "bar_chart_elem",
            title: scene.chart?.title ?? "Resolution Latency Comparison",
            unit: scene.chart?.unit ?? "sec",
            data: chartData,
            is_illustrative: scene.chart?.is_illustrative ?? true,
            animation: { enter: "scale_in", duration_seconds: 0.6 },
          }}
          sceneFrame={sceneFrame}
          fps={fps}
          theme={theme}
        />
      </div>
    </div>
  );
};

// 4. Line Chart
export const LineChartScene: React.FC<SceneProps> = ({
  scene,
  sceneFrame,
  fps,
  theme,
}) => {
  const chartData = scene.chart?.points ?? [
    { label: "Q1", value: 20 },
    { label: "Q2", value: 45 },
    { label: "Q3", value: 90 },
    { label: "Q4", value: 180 },
  ];

  return (
    <div>
      <SceneHeader
        purpose={scene.purpose}
        onScreenText={scene.on_screen_text ?? "GROWTH TIMELINE"}
        accentColor={scene.accent_color}
        sceneFrame={sceneFrame}
        fps={fps}
        theme={theme}
      />
      <div style={{ marginTop: 40 }}>
        <LineChartComponent
          element={{
            id: `${scene.id}_line_chart`,
            type: "line_chart_elem",
            title: scene.chart?.title ?? "Autonomous Action Volume",
            data: chartData,
            animation: { enter: "fade_up", duration_seconds: 0.8 },
          }}
          sceneFrame={sceneFrame}
          fps={fps}
          theme={theme}
        />
      </div>
    </div>
  );
};

// 5. System Architecture
export const SystemArchitectureScene: React.FC<SceneProps> = ({
  scene,
  sceneFrame,
  fps,
  theme,
}) => {
  const nodes = scene.nodes ?? [
    { label: "Telemetry Stream", detail: "Vectorized log ingest", status: "done" },
    { label: "Agent Reasoning Brain", detail: "LLM tool determination", status: "active" },
    { label: "Action Dispatch Webhook", detail: "Auto-remediation executor", status: "queued" },
  ];

  return (
    <div>
      <SceneHeader
        purpose={scene.purpose}
        onScreenText={scene.on_screen_text ?? "SYSTEM ARCHITECTURE"}
        accentColor={scene.accent_color}
        sceneFrame={sceneFrame}
        fps={fps}
        theme={theme}
      />
      <div style={{ marginTop: 40, display: "flex", flexDirection: "column" }}>
        {nodes.map((node, i) => (
          <React.Fragment key={i}>
            <FlowNodeComponent
              element={{
                id: `${scene.id}_node_${i}`,
                type: "flow_node_elem",
                node_id: `node_${i}`,
                label: node.label,
                detail: node.detail,
                status: node.status,
                animation: { enter: "slide_left", start_seconds: i * 0.25 },
              }}
              sceneFrame={sceneFrame}
              fps={fps}
              theme={theme}
              index={i}
            />
            {i < nodes.length - 1 && (
              <ConnectorComponent
                element={{
                  id: `${scene.id}_conn_${i}`,
                  type: "connector_elem",
                  from_id: `node_${i}`,
                  to_id: `node_${i + 1}`,
                  active: i === 0,
                  animation: { enter: "fade", start_seconds: i * 0.25 + 0.1 },
                }}
                sceneFrame={sceneFrame}
                fps={fps}
                theme={theme}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

// 6. Process Flow — Genuine sequential step pipeline with animated state progression
export const ProcessFlowScene: React.FC<SceneProps> = ({
  scene,
  sceneFrame,
  fps,
  theme,
}) => {
  const accentColor = scene.accent_color ?? theme.colors.accent;

  // Derive steps from scene.steps, scene.nodes, or narration parts
  const rawSteps =
    scene.steps && scene.steps.length > 0
      ? scene.steps
      : scene.nodes && scene.nodes.length > 0
      ? scene.nodes.map((n) => ({ label: n.label, detail: n.detail }))
      : [
          { label: "Trigger Detection", detail: "High-priority telemetry event ingested" },
          { label: "Agentic Analysis", detail: "Multi-modal model evaluates root cause" },
          { label: "Autonomous Dispatch", detail: "Remediation workflow executed" },
          { label: "Verification & Audit", detail: "Telemetry confirms baseline recovery" },
        ];

  // Active step progresses over the scene duration
  const totalSteps = rawSteps.length;
  const stepDurationFrames = Math.max(fps * 0.8, (fps * (scene.duration_hint_seconds || 5)) / totalSteps);
  const activeIndex = Math.min(
    totalSteps - 1,
    Math.floor(sceneFrame / stepDurationFrames)
  );

  return (
    <div>
      <SceneHeader
        purpose={scene.purpose}
        onScreenText={scene.on_screen_text ?? "PROCESS PIPELINE"}
        accentColor={accentColor}
        sceneFrame={sceneFrame}
        fps={fps}
        theme={theme}
      />

      {/* Progress summary banner */}
      <div
        style={{
          marginTop: 28,
          marginBottom: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 16px",
          backgroundColor: `${theme.colors.surface}cc`,
          border: `1px solid ${accentColor}33`,
          borderRadius: theme.borderRadius.sm,
          fontFamily: theme.typography.fontCode,
          fontSize: 13,
        }}
      >
        <span style={{ color: theme.colors.textSecondary }}>
          ACTIVE STAGE:{" "}
          <strong style={{ color: "#FFFFFF" }}>
            {rawSteps[activeIndex]?.label.toUpperCase()}
          </strong>
        </span>
        <span
          style={{
            backgroundColor: `${accentColor}22`,
            color: accentColor,
            padding: "2px 8px",
            borderRadius: 4,
            fontWeight: 700,
          }}
        >
          {activeIndex + 1} / {totalSteps} COMPLETED
        </span>
      </div>

      {/* Sequential Step Cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {rawSteps.map((step, idx) => {
          const stepStartFrame = idx * (fps * 0.3);
          const isDone = idx < activeIndex;
          const isActive = idx === activeIndex;
          const isQueued = idx > activeIndex;

          const cardOpacity = interpolate(
            sceneFrame,
            [stepStartFrame, stepStartFrame + 12],
            [0, 1],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          );

          const cardTranslateX = interpolate(
            sceneFrame,
            [stepStartFrame, stepStartFrame + 14],
            [-24, 0],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) }
          );

          // Pulse animation for currently active step
          const pulse = isActive
            ? 0.95 + 0.05 * Math.sin((sceneFrame / 6) * Math.PI)
            : 1;

          const statusColor = isDone
            ? theme.colors.positive
            : isActive
            ? accentColor
            : `${theme.colors.textSecondary}66`;

          return (
            <div
              key={idx}
              style={{
                opacity: cardOpacity,
                transform: `translateX(${cardTranslateX}px) scale(${pulse})`,
                display: "flex",
                alignItems: "center",
                backgroundColor: isActive
                  ? `${theme.colors.surface}`
                  : `${theme.colors.surface}88`,
                border: `1px solid ${
                  isActive ? accentColor : isDone ? `${theme.colors.positive}44` : "rgba(255,255,255,0.08)"
                }`,
                borderRadius: theme.borderRadius.md,
                padding: "16px 20px",
                boxShadow: isActive
                  ? `0 0 24px ${accentColor}33, inset 0 0 12px ${accentColor}11`
                  : "none",
                position: "relative",
                overflow: "hidden",
                transition: "all 0.2s ease",
              }}
            >
              {/* Left active indicator line */}
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: 4,
                  backgroundColor: statusColor,
                }}
              />

              {/* Step Number Circle */}
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: isDone
                    ? `${theme.colors.positive}22`
                    : isActive
                    ? `${accentColor}33`
                    : "rgba(255,255,255,0.05)",
                  border: `2px solid ${statusColor}`,
                  color: statusColor,
                  fontWeight: 900,
                  fontFamily: theme.typography.fontCode,
                  fontSize: 15,
                  marginRight: 18,
                  flexShrink: 0,
                }}
              >
                {isDone ? "✓" : String(idx + 1).padStart(2, "0")}
              </div>

              {/* Step Details */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    color: isActive ? "#FFFFFF" : isDone ? "#E0E0E0" : "#888888",
                    fontFamily: theme.typography.fontHeading,
                    fontSize: 20,
                    fontWeight: 700,
                    letterSpacing: -0.5,
                  }}
                >
                  {step.label}
                </div>
                {step.detail && (
                  <div
                    style={{
                      color: isQueued ? "#666666" : theme.colors.textSecondary,
                      fontSize: 13,
                      fontFamily: theme.typography.fontBody,
                      marginTop: 3,
                    }}
                  >
                    {step.detail}
                  </div>
                )}
              </div>

              {/* Status Pill Badge */}
              <div
                style={{
                  padding: "4px 10px",
                  borderRadius: 12,
                  fontSize: 11,
                  fontFamily: theme.typography.fontCode,
                  fontWeight: 700,
                  letterSpacing: 1,
                  backgroundColor: isDone
                    ? `${theme.colors.positive}22`
                    : isActive
                    ? `${accentColor}22`
                    : "rgba(255,255,255,0.05)",
                  color: statusColor,
                  border: `1px solid ${statusColor}44`,
                  marginLeft: 12,
                  flexShrink: 0,
                }}
              >
                {isDone ? "COMPLETE" : isActive ? "ACTIVE" : "QUEUED"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// 7. Code Terminal
export const CodeTerminalScene: React.FC<SceneProps> = ({
  scene,
  sceneFrame,
  fps,
  theme,
}) => {
  const lines = scene.terminal_lines ?? [
    "voiceage-core --monitor production --auto-heal",
    "[INGEST] Telemetry packet received from gateway-us",
    "[DETECT] Latency degradation on auth-service (p99 > 850ms)",
    "[AGENT] Invoking tool call: scale_container(replicas=6)",
    "[200 OK] Cluster stabilized in 320ms",
  ];

  return (
    <div>
      <SceneHeader
        purpose={scene.purpose}
        onScreenText={scene.on_screen_text ?? "AUTONOMOUS EXECUTION"}
        accentColor={scene.accent_color}
        sceneFrame={sceneFrame}
        fps={fps}
        theme={theme}
      />
      <div style={{ marginTop: 40 }}>
        <TerminalWindowComponent
          element={{
            id: `${scene.id}_term`,
            type: "terminal_window_elem",
            title: "voiceage-core --telemetry live",
            lines,
            typing_speed_frames: 18,
            animation: { enter: "scale_in", duration_seconds: 0.4 },
          }}
          sceneFrame={sceneFrame}
          fps={fps}
          theme={theme}
        />
      </div>
    </div>
  );
};

// 8. Comparison Grid
export const ComparisonGridScene: React.FC<SceneProps> = ({
  scene,
  sceneFrame,
  fps,
  theme,
}) => {
  const rawComp = scene.comparison as Record<string, unknown> | undefined;

  const leftTitle =
    (rawComp?.left as Record<string, unknown> | undefined)?.title as string ||
    (rawComp?.left_title as string) ||
    "PASSIVE DASHBOARDS";

  const leftItems: string[] =
    ((rawComp?.left as Record<string, unknown> | undefined)?.points as string[]) ||
    ((rawComp?.left as Record<string, unknown> | undefined)?.items as string[]) ||
    (rawComp?.left_points as string[]) ||
    ["Manual alert triage", "Human bottleneck", "Hours to resolution"];

  const rightTitle =
    (rawComp?.right as Record<string, unknown> | undefined)?.title as string ||
    (rawComp?.right_title as string) ||
    "AUTONOMOUS AGENTS";

  const rightItems: string[] =
    ((rawComp?.right as Record<string, unknown> | undefined)?.points as string[]) ||
    ((rawComp?.right as Record<string, unknown> | undefined)?.items as string[]) ||
    (rawComp?.right_points as string[]) ||
    ["Instant event ingestion", "Deterministic tool execution", "Sub-second mitigation"];

  return (
    <div>
      <SceneHeader
        purpose={scene.purpose}
        onScreenText={scene.on_screen_text ?? "OBSERVATION VS ACTION"}
        accentColor={scene.accent_color}
        sceneFrame={sceneFrame}
        fps={fps}
        theme={theme}
      />
      <div style={{ marginTop: 40 }}>
        <ComparisonPanelComponent
          element={{
            id: `${scene.id}_comparison`,
            type: "comparison_panel_elem",
            left_title: leftTitle,
            left_items: leftItems,
            right_title: rightTitle,
            right_items: rightItems,
            animation: { enter: "fade_up", duration_seconds: 0.5 },
          }}
          sceneFrame={sceneFrame}
          fps={fps}
          theme={theme}
        />
      </div>
    </div>
  );
};

// 9. Dashboard Mockup — Dynamic topic metrics derived from scene plan
export const DashboardMockupScene: React.FC<SceneProps> = ({
  scene,
  sceneFrame,
  fps,
  theme,
}) => {
  const accentColor = scene.accent_color ?? theme.colors.accent;

  // Build metrics from scene data_points, grid_items, or topic-derived narration
  const dynamicMetrics =
    scene.data_points && scene.data_points.length > 0
      ? scene.data_points.map((dp) => ({
          label: dp.label,
          value: String(dp.value),
          change: dp.change ?? "+100%",
        }))
      : scene.grid_items && scene.grid_items.length > 0
      ? scene.grid_items.map((gi) => ({
          label: gi.label,
          value: String(gi.value ?? "100"),
          change: gi.description ?? "+100%",
        }))
      : [
          { label: "Agent MTTR", value: "320ms", change: "−99.4%" },
          { label: "Success Rate", value: "99.98%", change: "+0.4% SLA" },
          { label: "Scale Capacity", value: "10,000 req/s", change: "Auto-scaled" },
          { label: "Cost Efficiency", value: "−85%", change: "vs Human Ops" },
        ];

  const title = scene.on_screen_text ?? "OPERATIONAL TELEMETRY";

  return (
    <div>
      <SceneHeader
        purpose={scene.purpose}
        onScreenText={title}
        accentColor={accentColor}
        sceneFrame={sceneFrame}
        fps={fps}
        theme={theme}
      />
      <div style={{ marginTop: 40 }}>
        <DashboardCardComponent
          element={{
            id: `${scene.id}_dash`,
            type: "dashboard_card_elem",
            title: title.toUpperCase(),
            metrics: dynamicMetrics.slice(0, 4),
            animation: { enter: "scale_in", duration_seconds: 0.5 },
          }}
          sceneFrame={sceneFrame}
          fps={fps}
          theme={theme}
        />
      </div>
    </div>
  );
};

// 10. Quote & Insight
export const QuoteInsightScene: React.FC<SceneProps> = ({
  scene,
  sceneFrame,
  fps,
  theme,
}) => {
  return (
    <div>
      <SceneHeader
        purpose={scene.purpose}
        onScreenText={scene.on_screen_text ?? "CORE THESIS"}
        accentColor={scene.accent_color}
        sceneFrame={sceneFrame}
        fps={fps}
        theme={theme}
      />
      <div style={{ marginTop: 80 }}>
        <QuoteBlockComponent
          element={{
            id: `${scene.id}_quote`,
            type: "quote_block",
            quote: scene.narration,
            author: "Voiceage Systems Directive",
            animation: { enter: "fade_up", duration_seconds: 0.6 },
          }}
          sceneFrame={sceneFrame}
          fps={fps}
          theme={theme}
        />
      </div>
    </div>
  );
};

// 11. Call to Action
export const CtaScene: React.FC<SceneProps> = ({
  scene,
  sceneFrame,
  fps,
  theme,
}) => {
  const pulse = 1 + Math.sin(sceneFrame * 0.15) * 0.03;

  return (
    <div style={{ textAlign: "center", paddingTop: 48, paddingLeft: 48, paddingRight: 48, boxSizing: "border-box" }}>
      <SceneHeader
        purpose="cta"
        accentColor={theme.colors.positive}
        sceneFrame={sceneFrame}
        fps={fps}
        theme={theme}
      />
      <div style={{ marginTop: 60 }}>
        <div
          style={{
            fontSize: (scene.on_screen_text || "").length > 24 ? 52 : theme.typography.fontSizeH1,
            fontWeight: 900,
            color: theme.colors.textPrimary,
            fontFamily: theme.typography.fontHeading,
            lineHeight: 1.2,
            marginBottom: 48,
            overflowWrap: "break-word",
            wordBreak: "break-word",
          }}
        >
          {scene.on_screen_text ?? "START AUTOMATING"}
        </div>

        <div
          style={{
            display: "inline-block",
            backgroundColor: theme.colors.accent,
            color: theme.colors.background,
            padding: "20px 48px",
            borderRadius: theme.borderRadius.full,
            fontSize: 28,
            fontWeight: 900,
            fontFamily: theme.typography.fontCode,
            letterSpacing: 2,
            boxShadow: `0 0 40px ${theme.colors.accent}88`,
            transform: `scale(${pulse})`,
          }}
        >
          {(scene.callout_text as string) || (scene.on_screen_text?.includes("VOICEAGE") ? "EXPLORE THE ARCHITECTURE →" : "FOLLOW FOR MORE →")}
        </div>
      </div>
    </div>
  );
};

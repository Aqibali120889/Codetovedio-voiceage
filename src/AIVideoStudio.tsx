/**
 * AIVideoStudio Composition — Motion-Graphics & Director Scene Architecture.
 *
 * Implements diverse, high-impact programmatic visual scene types:
 * - kinetic_typography: high-velocity stagger typography & laser scans
 * - system_architecture / process_flow: multi-tier animated node diagrams with live signal pulses
 * - code_terminal / workflow_execution: tech-noir terminal with live typing & status logs
 * - stat_counter / data_visualization: massive animated numeric counters & metric bars
 * - comparison_grid / before_after: split-screen before vs after contrasting cards
 * - quote_insight / cta: focus insight panels & pulsing call-to-action cards
 */

import React from "react";
import {
  AbsoluteFill,
  Audio,
  Sequence,
  interpolate,
  Easing,
  useCurrentFrame,
  staticFile,
} from "remotion";
import type {
  RenderManifest,
  SceneManifestEntry,
  SubtitleSegment,
  SceneNode,
  SceneDataPoint,
  SceneComparison,
} from "./pipeline/types";

// ============================================================
// Brand Design Tokens
// ============================================================
const OBSIDIAN = "#0B0B0B";
const CHARCOAL = "#141414";
const MATRIX_GRAY = "#222222";
const PURE_WHITE = "#FFFFFF";
const NEON_ORANGE = "#FF5F00";
const ETHICAL_GREEN = "#00C853";
const ACCENT_BLUE = "#0EA5E9";
const CRIT_RED = "#FF3B30";

// ============================================================
// Math & Animation Utilities
// ============================================================

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function fadeIn(frame: number, startFrame: number, durationFrames = 14): number {
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

function fadeOut(frame: number, endFrame: number, durationFrames = 12): number {
  return clamp(
    interpolate(frame, [endFrame - durationFrames, endFrame], [1, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.in(Easing.quad),
    }),
    0,
    1
  );
}

// ============================================================
// Background & Global Overlays
// ============================================================

const SceneBackground: React.FC<{
  accentColor: string;
  opacity: number;
}> = ({ accentColor, opacity }) => {
  const frame = useCurrentFrame();
  const scanY = (frame * 3) % 1920;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        opacity,
        background: `radial-gradient(circle at 50% 30%, ${accentColor}18 0%, ${OBSIDIAN} 75%)`,
      }}
    >
      {/* Blueprint grid */}
      <svg
        width="100%"
        height="100%"
        style={{ position: "absolute", inset: 0, opacity: 0.12 }}
      >
        {Array.from({ length: 44 }).map((_, i) => (
          <line
            key={`h${i}`}
            x1="0"
            y1={i * 44}
            x2="1080"
            y2={i * 44}
            stroke={MATRIX_GRAY}
            strokeWidth="1"
          />
        ))}
        {Array.from({ length: 25 }).map((_, i) => (
          <line
            key={`v${i}`}
            x1={i * 44}
            y1="0"
            x2={i * 44}
            y2="1920"
            stroke={MATRIX_GRAY}
            strokeWidth="1"
          />
        ))}
      </svg>

      {/* Moving subtle laser horizon line */}
      <div
        style={{
          position: "absolute",
          top: scanY,
          left: 0,
          right: 0,
          height: "2px",
          background: `linear-gradient(90deg, transparent, ${accentColor}44, transparent)`,
          boxShadow: `0 0 16px ${accentColor}`,
          pointerEvents: "none",
        }}
      />
    </div>
  );
};

const ScanlineOverlay: React.FC = () => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      zIndex: 900,
      pointerEvents: "none",
      background:
        "linear-gradient(rgba(18,16,16,0) 50%, rgba(0,0,0,0.28) 50%), linear-gradient(90deg, rgba(255,0,0,0.03), rgba(0,255,0,0.01), rgba(0,0,255,0.03))",
      backgroundSize: "100% 4px, 6px 100%",
      opacity: 0.65,
    }}
  />
);

const ProgressBar: React.FC<{ totalFrames: number }> = ({ totalFrames }) => {
  const frame = useCurrentFrame();
  const pct = clamp((frame / Math.max(1, totalFrames)) * 100, 0, 100);
  return (
    <div
      style={{
        position: "absolute",
        bottom: "6%",
        left: "60px",
        right: "60px",
        height: "3px",
        backgroundColor: "#1C1C1C",
        zIndex: 200,
      }}
    >
      <div
        style={{
          width: `${pct}%`,
          height: "100%",
          backgroundColor: NEON_ORANGE,
          boxShadow: `0 0 14px ${NEON_ORANGE}`,
          transition: "none",
        }}
      />
    </div>
  );
};

const BrandMark: React.FC = () => (
  <div
    style={{
      position: "absolute",
      bottom: "2.8%",
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: 100,
    }}
  >
    <p
      style={{
        color: PURE_WHITE,
        fontSize: 18,
        fontWeight: 900,
        margin: 0,
        letterSpacing: 6,
        opacity: 0.8,
        fontFamily: "monospace",
      }}
    >
      VOICEAGE <span style={{ color: NEON_ORANGE }}>SYSTEMS</span>
    </p>
  </div>
);

// ============================================================
// Scene Header & Purpose Badge
// ============================================================

const SceneHeader: React.FC<{
  text: string;
  purpose?: string;
  accentColor: string;
  opacity: number;
  slideUp: number;
}> = ({ text, purpose, accentColor, opacity, slideUp }) => {
  const badgeLabel = purpose?.toUpperCase() || "INTEL";

  return (
    <div
      style={{
        position: "absolute",
        top: "10%",
        left: "60px",
        right: "60px",
        opacity,
        transform: `translateY(${slideUp}px)`,
        display: "flex",
        alignItems: "center",
        gap: "16px",
        zIndex: 10,
      }}
    >
      <div
        style={{
          backgroundColor: `${accentColor}22`,
          border: `1px solid ${accentColor}`,
          padding: "8px 16px",
          borderRadius: "4px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <div
          style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            backgroundColor: accentColor,
            boxShadow: `0 0 8px ${accentColor}`,
          }}
        />
        <span
          style={{
            color: accentColor,
            fontFamily: "monospace",
            fontSize: 18,
            fontWeight: 800,
            letterSpacing: 3,
          }}
        >
          {badgeLabel}
        </span>
      </div>

      <span
        style={{
          color: PURE_WHITE,
          fontFamily: "monospace",
          fontSize: 22,
          fontWeight: 700,
          letterSpacing: 2,
          textTransform: "uppercase",
          opacity: 0.9,
        }}
      >
        {text}
      </span>
    </div>
  );
};

// ============================================================
// 1. Kinetic Typography Visual
// ============================================================

const KineticTypographyVisual: React.FC<{
  scene: SceneManifestEntry;
  accentColor: string;
}> = ({ scene, accentColor }) => {
  const frame = useCurrentFrame();
  const text = scene.on_screen_text || scene.visual_description;
  const words = text.split(" ");

  return (
    <div
      style={{
        position: "absolute",
        top: "22%",
        left: "60px",
        right: "60px",
        bottom: "26%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "flex-start",
        gap: "24px",
      }}
    >
      {words.map((word, i) => {
        const wordDelay = i * 6;
        const wordOpacity = fadeIn(frame, wordDelay, 10);
        const scale = interpolate(frame, [wordDelay, wordDelay + 10], [1.35, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.out(Easing.back(1.5)),
        });
        const isHighlight = i % 2 === 1;

        return (
          <div
            key={i}
            style={{
              opacity: wordOpacity,
              transform: `scale(${scale})`,
              transformOrigin: "left center",
              backgroundColor: isHighlight ? `${accentColor}1A` : "transparent",
              borderLeft: isHighlight ? `6px solid ${accentColor}` : "none",
              padding: isHighlight ? "8px 24px" : "0",
              borderRadius: "4px",
            }}
          >
            <span
              style={{
                color: isHighlight ? accentColor : PURE_WHITE,
                fontSize: 82,
                fontWeight: 900,
                fontFamily: "sans-serif",
                letterSpacing: -2,
                lineHeight: 1.05,
                textShadow: isHighlight
                  ? `0 0 30px ${accentColor}66`
                  : "0 4px 16px rgba(0,0,0,0.8)",
              }}
            >
              {word}
            </span>
          </div>
        );
      })}

      <div
        style={{
          marginTop: "30px",
          padding: "20px 28px",
          backgroundColor: CHARCOAL,
          border: `1px solid ${accentColor}33`,
          borderRadius: "8px",
          opacity: fadeIn(frame, words.length * 6 + 10, 15),
        }}
      >
        <p
          style={{
            color: "#A0A0A0",
            fontSize: 28,
            margin: 0,
            fontFamily: "monospace",
            lineHeight: 1.4,
          }}
        >
          {scene.visual_description}
        </p>
      </div>
    </div>
  );
};

// ============================================================
// 2. System Architecture / Process Flow Visual
// ============================================================

const SystemArchitectureVisual: React.FC<{
  scene: SceneManifestEntry;
  accentColor: string;
}> = ({ scene, accentColor }) => {
  const frame = useCurrentFrame();

  const defaultNodes: SceneNode[] = [
    { label: "TELEMETRY INGEST", detail: "Real-time metrics stream", status: "done" },
    { label: "LLM REASONING CORE", detail: "Multi-turn tool orchestration", status: "active" },
    { label: "DETERMINISTIC ACTION", detail: "Sub-second API auto-heal", status: "queued" },
  ];

  const nodes = scene.nodes && scene.nodes.length > 0 ? scene.nodes : defaultNodes;

  return (
    <div
      style={{
        position: "absolute",
        top: "20%",
        left: "60px",
        right: "60px",
        bottom: "26%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        gap: "40px",
      }}
    >
      {nodes.map((node, i) => {
        const delay = i * 14;
        const nodeOpacity = fadeIn(frame, delay, 12);
        const slideX = interpolate(frame, [delay, delay + 14], [-30, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.out(Easing.cubic),
        });

        const isActive = node.status === "active";
        const isDone = node.status === "done";
        const nodeColor = isActive ? NEON_ORANGE : isDone ? ETHICAL_GREEN : MATRIX_GRAY;

        return (
          <React.Fragment key={i}>
            {/* Connected Animated Signal Line between nodes */}
            {i > 0 && (
              <svg width="40" height="36" style={{ margin: "-16px 0" }}>
                <line
                  x1="20"
                  y1="0"
                  x2="20"
                  y2="36"
                  stroke={accentColor}
                  strokeWidth="3"
                  strokeDasharray="6 4"
                  strokeDashoffset={-frame * 2}
                  opacity={nodeOpacity}
                />
              </svg>
            )}

            {/* Node Card */}
            <div
              style={{
                width: "100%",
                backgroundColor: CHARCOAL,
                border: `2px solid ${nodeColor}${isActive ? "CC" : "44"}`,
                borderRadius: "10px",
                padding: "28px 36px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                opacity: nodeOpacity,
                transform: `translateX(${slideX}px)`,
                boxShadow: isActive
                  ? `0 0 35px ${nodeColor}33, inset 0 1px 0 ${nodeColor}66`
                  : `0 8px 24px rgba(0,0,0,0.5)`,
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div
                    style={{
                      width: "12px",
                      height: "12px",
                      borderRadius: "50%",
                      backgroundColor: nodeColor,
                      boxShadow: `0 0 12px ${nodeColor}`,
                    }}
                  />
                  <h3
                    style={{
                      color: PURE_WHITE,
                      fontSize: 32,
                      fontWeight: 800,
                      margin: 0,
                      fontFamily: "monospace",
                      letterSpacing: -0.5,
                    }}
                  >
                    {node.label}
                  </h3>
                </div>
                {node.detail && (
                  <p
                    style={{
                      color: "#888",
                      fontSize: 22,
                      margin: "8px 0 0 24px",
                      fontFamily: "monospace",
                    }}
                  >
                    {node.detail}
                  </p>
                )}
              </div>

              <span
                style={{
                  color: nodeColor,
                  fontFamily: "monospace",
                  fontSize: 18,
                  fontWeight: 800,
                  backgroundColor: `${nodeColor}18`,
                  padding: "6px 14px",
                  borderRadius: "4px",
                  border: `1px solid ${nodeColor}66`,
                }}
              >
                {isActive ? "[RUNNING]" : isDone ? "[RESOLVED]" : "[STANDBY]"}
              </span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};

// ============================================================
// 3. Code Terminal Visual
// ============================================================

const CodeTerminalVisual: React.FC<{
  scene: SceneManifestEntry;
  accentColor: string;
}> = ({ scene, accentColor }) => {
  const frame = useCurrentFrame();

  const defaultLines = [
    "voiceage-core --telemetry active --auto-remediate",
    "[INGEST] Processing real-time production log stream...",
    "[INCIDENT] 504 Gateway Timeout detected on service: payments",
    "[REASONING] Invoking LLM tool: diagnose_root_cause()",
    "[ACTION] Executing tool call: scale_container_replicas(5)",
    "[200 OK] Zero human latency — latency mitigated in 620ms",
  ];

  const lines =
    scene.terminal_lines && scene.terminal_lines.length > 0
      ? scene.terminal_lines
      : defaultLines;

  // Typing effect on first command
  const firstCommand = lines[0];
  const charCount = Math.floor(frame * 2.2);
  const typedCommand = firstCommand.slice(0, charCount);
  const cursor = Math.floor(frame / 12) % 2 === 0 ? "▋" : " ";

  return (
    <div
      style={{
        position: "absolute",
        top: "20%",
        left: "50px",
        right: "50px",
        bottom: "26%",
        backgroundColor: "#0A0A0A",
        border: `1px solid ${accentColor}55`,
        borderRadius: "12px",
        overflow: "hidden",
        boxShadow: `0 0 50px rgba(0,0,0,0.8), 0 0 25px ${accentColor}18`,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Terminal Title Bar */}
      <div
        style={{
          backgroundColor: "#161616",
          padding: "16px 24px",
          display: "flex",
          alignItems: "center",
          borderBottom: "1px solid #222",
        }}
      >
        <div style={{ display: "flex", gap: "10px" }}>
          <div style={{ width: 14, height: 14, borderRadius: "50%", backgroundColor: "#FF5F56" }} />
          <div style={{ width: 14, height: 14, borderRadius: "50%", backgroundColor: "#FFBD2E" }} />
          <div style={{ width: 14, height: 14, borderRadius: "50%", backgroundColor: "#27C93F" }} />
        </div>
        <span
          style={{
            color: "#666",
            fontSize: 18,
            fontFamily: "monospace",
            margin: "0 auto",
            letterSpacing: 1,
          }}
        >
          voiceage-orchestrator — bash — 1080x1920
        </span>
      </div>

      {/* Terminal Body */}
      <div
        style={{
          padding: "32px",
          fontFamily: "monospace",
          fontSize: 23,
          lineHeight: 1.6,
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: "18px",
        }}
      >
        {/* Command Prompt */}
        <div>
          <span style={{ color: ETHICAL_GREEN }}>user@voiceage</span>
          <span style={{ color: "#666" }}>:</span>
          <span style={{ color: ACCENT_BLUE }}>~</span>
          <span style={{ color: PURE_WHITE }}>$ {typedCommand}</span>
          <span style={{ color: accentColor }}>{cursor}</span>
        </div>

        {/* Subsequent Log Output Lines */}
        {lines.slice(1).map((line, i) => {
          const lineDelay = (i + 1) * 16;
          const lineOpacity = fadeIn(frame, lineDelay, 10);
          if (frame < lineDelay) return null;

          const isAlert = line.includes("[INCIDENT]") || line.includes("[ALERT]") || line.includes("ERROR");
          const isSuccess = line.includes("[200") || line.includes("[OK]") || line.includes("SUCCESS");
          const isAction = line.includes("[ACTION]") || line.includes("[REASONING]");

          const lineColor = isAlert
            ? CRIT_RED
            : isSuccess
            ? ETHICAL_GREEN
            : isAction
            ? ACCENT_BLUE
            : "#AAA";

          return (
            <div
              key={i}
              style={{
                opacity: lineOpacity,
                color: lineColor,
                wordBreak: "break-word",
                fontWeight: isSuccess || isAlert ? 700 : 400,
              }}
            >
              {line}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ============================================================
// 4. Stat Counter & Metric Hero Visual
// ============================================================

const StatCounterVisual: React.FC<{
  scene: SceneManifestEntry;
  accentColor: string;
}> = ({ scene, accentColor }) => {
  const frame = useCurrentFrame();

  const defaultPoints: SceneDataPoint[] = [
    { label: "Passive Incident Triage", value: "45m", change: "+320%", status: "bad" },
    { label: "Autonomous AI Resolution", value: "12s", change: "-99.4%", status: "good" },
  ];

  const points =
    scene.data_points && scene.data_points.length > 0
      ? scene.data_points
      : defaultPoints;

  const heroPoint = points[0];
  const barWidth = clamp(
    interpolate(frame, [10, 60], [0, 100], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    }),
    0,
    100
  );

  return (
    <div
      style={{
        position: "absolute",
        top: "20%",
        left: "60px",
        right: "60px",
        bottom: "26%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: "40px",
      }}
    >
      {/* Big Kinetic Hero Metric Card */}
      <div
        style={{
          backgroundColor: CHARCOAL,
          border: `2px solid ${accentColor}`,
          borderRadius: "16px",
          padding: "48px 40px",
          boxShadow: `0 0 50px ${accentColor}26`,
          textAlign: "center",
        }}
      >
        <span
          style={{
            color: "#888",
            fontSize: 24,
            fontWeight: 800,
            letterSpacing: 3,
            fontFamily: "monospace",
            textTransform: "uppercase",
          }}
        >
          {heroPoint.label}
        </span>

        <h1
          style={{
            color: PURE_WHITE,
            fontSize: 130,
            fontWeight: 900,
            margin: "16px 0",
            fontFamily: "sans-serif",
            letterSpacing: -4,
            lineHeight: 1,
            textShadow: `0 0 40px ${accentColor}66`,
          }}
        >
          {heroPoint.value}
        </h1>

        {heroPoint.change && (
          <div
            style={{
              display: "inline-block",
              backgroundColor: heroPoint.status === "good" ? `${ETHICAL_GREEN}22` : `${CRIT_RED}22`,
              border: `1px solid ${heroPoint.status === "good" ? ETHICAL_GREEN : CRIT_RED}`,
              color: heroPoint.status === "good" ? ETHICAL_GREEN : CRIT_RED,
              padding: "10px 24px",
              borderRadius: "30px",
              fontSize: 28,
              fontWeight: 800,
              fontFamily: "monospace",
            }}
          >
            {heroPoint.change}
          </div>
        )}

        {/* Animated Progress Meter */}
        <div
          style={{
            height: "8px",
            backgroundColor: "#222",
            borderRadius: "4px",
            marginTop: "36px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${barWidth}%`,
              backgroundColor: accentColor,
              boxShadow: `0 0 16px ${accentColor}`,
            }}
          />
        </div>
      </div>

      {/* Secondary Point Card */}
      {points[1] && (
        <div
          style={{
            backgroundColor: "#111",
            border: "1px solid #333",
            borderRadius: "12px",
            padding: "24px 32px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            opacity: fadeIn(frame, 20, 15),
          }}
        >
          <span style={{ color: "#AAA", fontSize: 26, fontFamily: "monospace" }}>
            {points[1].label}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <span style={{ color: PURE_WHITE, fontSize: 38, fontWeight: 900, fontFamily: "monospace" }}>
              {points[1].value}
            </span>
            {points[1].change && (
              <span style={{ color: ETHICAL_GREEN, fontSize: 22, fontFamily: "monospace", fontWeight: 700 }}>
                {points[1].change}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================
// 5. Comparison Grid Visual (Before vs After)
// ============================================================

const ComparisonGridVisual: React.FC<{
  scene: SceneManifestEntry;
  accentColor: string;
}> = ({ scene, accentColor: _accentColor }) => {
  const frame = useCurrentFrame();

  const defaultComparison: SceneComparison = {
    left: {
      title: "PASSIVE DASHBOARDS",
      points: [
        "Alert fatigue and missed signals",
        "Manual CLI queries and log parsing",
        "Hours of downtime before resolution",
      ],
    },
    right: {
      title: "AUTONOMOUS AGENTS",
      points: [
        "Continuous telemetry ingestion",
        "Deterministic API tool calls",
        "Instant root-cause auto-healing",
      ],
    },
  };

  const comp = scene.comparison || defaultComparison;

  return (
    <div
      style={{
        position: "absolute",
        top: "20%",
        left: "50px",
        right: "50px",
        bottom: "26%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: "30px",
      }}
    >
      {/* Before / Problem Card */}
      <div
        style={{
          backgroundColor: "#140808",
          border: `2px solid ${CRIT_RED}55`,
          borderRadius: "14px",
          padding: "32px",
          boxShadow: "0 8px 30px rgba(0,0,0,0.6)",
          opacity: fadeIn(frame, 0, 14),
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
          <span style={{ backgroundColor: CRIT_RED, color: PURE_WHITE, padding: "4px 12px", borderRadius: "4px", fontSize: 16, fontWeight: 900, fontFamily: "monospace" }}>
            [OLD WAY]
          </span>
          <h3 style={{ color: CRIT_RED, fontSize: 28, margin: 0, fontFamily: "monospace", fontWeight: 800 }}>
            {comp.left.title}
          </h3>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {comp.left.points.map((pt, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
              <span style={{ color: CRIT_RED, fontSize: 22, fontWeight: 900 }}>✗</span>
              <span style={{ color: "#B5A0A0", fontSize: 23, fontFamily: "sans-serif", lineHeight: 1.3 }}>
                {pt}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* After / Solution Card */}
      <div
        style={{
          backgroundColor: "#07160C",
          border: `2px solid ${ETHICAL_GREEN}`,
          borderRadius: "14px",
          padding: "32px",
          boxShadow: `0 0 40px ${ETHICAL_GREEN}26`,
          opacity: fadeIn(frame, 15, 14),
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
          <span style={{ backgroundColor: ETHICAL_GREEN, color: OBSIDIAN, padding: "4px 12px", borderRadius: "4px", fontSize: 16, fontWeight: 900, fontFamily: "monospace" }}>
            [SOVEREIGN]
          </span>
          <h3 style={{ color: ETHICAL_GREEN, fontSize: 28, margin: 0, fontFamily: "monospace", fontWeight: 800 }}>
            {comp.right.title}
          </h3>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {comp.right.points.map((pt, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
              <span style={{ color: ETHICAL_GREEN, fontSize: 22, fontWeight: 900 }}>✓</span>
              <span style={{ color: PURE_WHITE, fontSize: 23, fontFamily: "sans-serif", lineHeight: 1.3, fontWeight: 600 }}>
                {pt}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ============================================================
// 6. Quote / CTA / Insight Visual
// ============================================================

const QuoteInsightVisual: React.FC<{
  scene: SceneManifestEntry;
  accentColor: string;
}> = ({ scene, accentColor }) => {
  const frame = useCurrentFrame();
  const isCta = scene.purpose === "cta" || scene.scene_type === "cta";

  return (
    <div
      style={{
        position: "absolute",
        top: "22%",
        left: "60px",
        right: "60px",
        bottom: "26%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
        gap: "36px",
      }}
    >
      <div
        style={{
          backgroundColor: CHARCOAL,
          border: `2px solid ${accentColor}`,
          borderRadius: "16px",
          padding: "54px 44px",
          boxShadow: `0 0 50px ${accentColor}26`,
          position: "relative",
          width: "100%",
        }}
      >
        <span
          style={{
            position: "absolute",
            top: "-24px",
            left: "40px",
            fontSize: 70,
            lineHeight: 1,
            color: accentColor,
            fontFamily: "Georgia, serif",
          }}
        >
          “
        </span>

        <p
          style={{
            color: PURE_WHITE,
            fontSize: 52,
            fontWeight: 900,
            lineHeight: 1.25,
            margin: "0 0 24px 0",
            fontFamily: "sans-serif",
            letterSpacing: -1,
          }}
        >
          {scene.visual_description}
        </p>

        {isCta && (
          <div
            style={{
              display: "inline-block",
              backgroundColor: NEON_ORANGE,
              color: PURE_WHITE,
              padding: "20px 48px",
              borderRadius: "40px",
              fontSize: 28,
              fontWeight: 900,
              fontFamily: "monospace",
              letterSpacing: 2,
              boxShadow: `0 0 30px ${NEON_ORANGE}88`,
              transform: `scale(${1 + Math.sin(frame * 0.15) * 0.04})`,
            }}
          >
            FOLLOW FOR MORE →
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================
// Scene Dispatcher
// ============================================================

const SceneContent: React.FC<{
  scene: SceneManifestEntry;
}> = ({ scene }) => {
  const relativeFrame = useCurrentFrame();
  const sceneDuration = scene.durationFrames;

  const opacity =
    fadeIn(relativeFrame, 0, 12) * fadeOut(relativeFrame, sceneDuration, 10);

  const slideUp = interpolate(relativeFrame, [0, 18], [24, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const accentColor =
    scene.accent_color ||
    (scene.purpose === "hook"
      ? NEON_ORANGE
      : scene.purpose === "cta"
      ? ETHICAL_GREEN
      : scene.purpose === "architecture" || scene.purpose === "demo"
      ? ACCENT_BLUE
      : scene.purpose === "problem"
      ? CRIT_RED
      : NEON_ORANGE);

  // Determine which specialized visual component to render
  const desc = (scene.visual_description || "").toLowerCase();
  const text = (scene.on_screen_text || "").toLowerCase();
  const type = (scene.scene_type || "").toLowerCase();

  // Priority 1: Exact scene_type match
  let visualMode: "kinetic" | "comparison" | "architecture" | "terminal" | "stats" | "quote" = "kinetic";

  if (type === "kinetic_typography") {
    visualMode = "kinetic";
  } else if (type === "system_architecture" || type === "process_flow" || type === "network_graph") {
    visualMode = "architecture";
  } else if (type === "code_terminal" || type === "workflow_execution" || type === "terminal") {
    visualMode = "terminal";
  } else if (type === "stat_counter" || type === "data_visualization" || type === "metric_hero") {
    visualMode = "stats";
  } else if (type === "comparison_grid" || type === "before_after") {
    visualMode = "comparison";
  } else if (type === "quote_insight" || type === "cta") {
    visualMode = "quote";
  } else {
    // Priority 2: Fallback based on data structure presence
    if (scene.terminal_lines && scene.terminal_lines.length > 0) {
      visualMode = "terminal";
    } else if (scene.comparison?.left?.title && scene.comparison?.left?.points?.length) {
      visualMode = "comparison";
    } else if (scene.nodes && scene.nodes.length > 0) {
      visualMode = "architecture";
    } else if (scene.data_points && scene.data_points.length > 0) {
      visualMode = "stats";
    } else if (desc.includes("terminal") || desc.includes("cli")) {
      visualMode = "terminal";
    } else if (desc.includes("architecture") || desc.includes("node") || desc.includes("flow")) {
      visualMode = "architecture";
    } else if (desc.includes("versus") || desc.includes("before") || text.includes("vs")) {
      visualMode = "comparison";
    } else if (desc.includes("metric") || desc.includes("counter") || desc.includes("percent")) {
      visualMode = "stats";
    } else if (scene.purpose === "hook" || scene.layout === "center_focus") {
      visualMode = "kinetic";
    } else {
      visualMode = "quote";
    }
  }

  return (
    <>
      <SceneBackground accentColor={accentColor} opacity={opacity} />

      <SceneHeader
        text={scene.on_screen_text}
        purpose={scene.purpose}
        accentColor={accentColor}
        opacity={opacity}
        slideUp={slideUp}
      />

      <div style={{ opacity }}>
        {visualMode === "terminal" ? (
          <CodeTerminalVisual scene={scene} accentColor={accentColor} />
        ) : visualMode === "comparison" ? (
          <ComparisonGridVisual scene={scene} accentColor={accentColor} />
        ) : visualMode === "architecture" ? (
          <SystemArchitectureVisual scene={scene} accentColor={accentColor} />
        ) : visualMode === "stats" ? (
          <StatCounterVisual scene={scene} accentColor={accentColor} />
        ) : visualMode === "kinetic" ? (
          <KineticTypographyVisual scene={scene} accentColor={accentColor} />
        ) : (
          <QuoteInsightVisual scene={scene} accentColor={accentColor} />
        )}
      </div>
    </>
  );
};

// ============================================================
// Subtitle Bar
// ============================================================

const SubtitleBar: React.FC<{
  segments: SubtitleSegment[];
  frame: number;
}> = ({ segments, frame }) => {
  const active = segments.find(
    (s) => frame >= s.startFrame && frame < s.endFrame
  );

  if (!active) return null;

  const opacity = clamp(
    interpolate(
      frame,
      [active.startFrame, active.startFrame + 5, active.endFrame - 5, active.endFrame],
      [0, 1, 1, 0],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    ),
    0,
    1
  );

  return (
    <div
      style={{
        position: "absolute",
        bottom: "11%",
        left: "40px",
        right: "40px",
        zIndex: 500,
        opacity,
        textAlign: "center",
      }}
    >
      <div
        style={{
          display: "inline-block",
          backgroundColor: "rgba(0,0,0,0.85)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "8px",
          padding: "16px 28px",
          maxWidth: "960px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.8)",
        }}
      >
        {active.text.split("\n").map((line, i) => (
          <p
            key={i}
            style={{
              color: PURE_WHITE,
              fontSize: 38,
              fontWeight: 700,
              margin: i === 0 ? 0 : "6px 0 0 0",
              fontFamily: "sans-serif",
              lineHeight: 1.3,
              textShadow: "0 2px 8px rgba(0,0,0,0.9)",
            }}
          >
            {line}
          </p>
        ))}
      </div>
    </div>
  );
};

// ============================================================
// Audio URL Resolution
// ============================================================

function getAudioSource(audioPath: string | null): string | null {
  if (!audioPath) return null;
  if (
    audioPath.startsWith("http://") ||
    audioPath.startsWith("https://") ||
    audioPath.startsWith("data:")
  ) {
    return audioPath;
  }
  let clean = audioPath.replace(/\\/g, "/");
  if (clean.includes("/public/")) {
    clean = clean.split("/public/")[1];
  } else if (clean.includes("/data/projects/")) {
    clean = "projects/" + clean.split("/data/projects/")[1];
  }
  clean = clean.replace(/^\/+/, "");
  try {
    return staticFile(clean);
  } catch (e) {
    console.warn("Could not resolve staticFile for:", clean, e);
    return null;
  }
}

// ============================================================
// Main Composition Export
// ============================================================

export const compositionId = "AIVideoStudio";

export type AIVideoStudioProps = {
  manifest?: RenderManifest;
  [key: string]: unknown;
};

const AIVideoStudio: React.FC<AIVideoStudioProps> = (rawProps) => {
  const raw = rawProps as Record<string, unknown>;
  const manifest: RenderManifest =
    Array.isArray(raw?.scenes) && raw.projectId !== "preview"
      ? (raw as unknown as RenderManifest)
      : (raw?.manifest as RenderManifest)?.scenes
      ? (raw.manifest as RenderManifest)
      : Array.isArray(raw?.scenes)
      ? (raw as unknown as RenderManifest)
      : (rawProps as unknown as RenderManifest);
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill
      style={{
        backgroundColor: OBSIDIAN,
        fontFamily: "monospace",
        overflow: "hidden",
      }}
    >
      <ScanlineOverlay />

      {/* Synchronized Scenes with Motion-Graphics Engine */}
      {manifest.scenes.map((scene) => {
        const audioSrc = getAudioSource(scene.audioPath);
        return (
          <Sequence
            key={scene.sceneId}
            from={scene.startFrame}
            durationInFrames={scene.durationFrames}
          >
            <SceneContent scene={scene} />
            {audioSrc && <Audio src={audioSrc} volume={1} />}
          </Sequence>
        );
      })}

      <SubtitleBar segments={manifest.subtitles} frame={frame} />
      <ProgressBar totalFrames={manifest.totalFrames} />
      <BrandMark />
    </AbsoluteFill>
  );
};

export default AIVideoStudio;

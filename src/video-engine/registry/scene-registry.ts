/**
 * Scene Renderer Registry.
 *
 * Maps supported scene types to Remotion React implementations,
 * schemas, metadata, and capability descriptors.
 */

import React from "react";
import type { SceneType, SceneBlueprint } from "../types";
import type { ThemeTokens } from "../themes/tokens";
import {
  KineticTypographyScene,
  StatCounterScene,
  BarChartScene,
  LineChartScene,
  SystemArchitectureScene,
  ProcessFlowScene,
  CodeTerminalScene,
  ComparisonGridScene,
  DashboardMockupScene,
  QuoteInsightScene,
  CtaScene,
} from "../scenes";
import { ModularElementScene } from "../scenes/modular-element-scene";
import {
  ParallaxHeroScene,
  TimelineRevealScene,
  InfographicGridScene,
  WordByWordScene,
  SplitCalloutScene,
  DocumentRevealScene,
  EditorialMontageScene,
} from "../scenes/extended-scenes";

export interface SceneRendererProps {
  scene: SceneBlueprint;
  sceneFrame: number;
  fps: number;
  theme: ThemeTokens;
}

export type SceneRenderer = React.FC<SceneRendererProps>;

export interface SceneRegistration {
  type: SceneType;
  name: string;
  description: string;
  renderer: SceneRenderer;
  requiredFields: string[];
  optionalFields: string[];
  example: Partial<SceneBlueprint>;
}

const SCENE_REGISTRY = new Map<SceneType, SceneRegistration>();

export function registerSceneRenderer(reg: SceneRegistration): void {
  if (SCENE_REGISTRY.has(reg.type)) {
    throw new Error(`Duplicate scene renderer registration for type: ${reg.type}`);
  }
  SCENE_REGISTRY.set(reg.type, reg);
}

export function getSceneRenderer(type: SceneType): SceneRenderer | undefined {
  return SCENE_REGISTRY.get(type)?.renderer;
}

export function hasSceneRenderer(type: SceneType): boolean {
  return SCENE_REGISTRY.has(type);
}

export function listRegisteredSceneTypes(): SceneRegistration[] {
  return Array.from(SCENE_REGISTRY.values());
}

// -------------------------------------------------------------
// Register All Built-in Scene Types
// -------------------------------------------------------------

registerSceneRenderer({
  type: "kinetic_typography",
  name: "Kinetic Typography",
  description: "High-impact kinetic headline words with laser scanlines and emphasis",
  renderer: KineticTypographyScene,
  requiredFields: ["id", "purpose", "scene_type", "narration", "duration_hint_seconds"],
  optionalFields: ["on_screen_text", "visual_description", "accent_color"],
  example: {
    id: "scene_001",
    purpose: "hook",
    scene_type: "kinetic_typography",
    narration: "Static dashboards are dead.",
    on_screen_text: "DASHBOARDS ARE DEAD",
    duration_hint_seconds: 5,
  },
});

registerSceneRenderer({
  type: "stat_counter",
  name: "Stat Counter",
  description: "Giant animated KPI numbers and MTTR recovery counters with delta tags",
  renderer: StatCounterScene,
  requiredFields: ["id", "purpose", "scene_type", "narration", "duration_hint_seconds"],
  optionalFields: ["data_points", "on_screen_text", "accent_color"],
  example: {
    id: "scene_002",
    purpose: "metric",
    scene_type: "stat_counter",
    narration: "Resolution drops from forty-five minutes to twelve seconds.",
    duration_hint_seconds: 5,
    data_points: [
      { label: "Legacy MTTR", value: 45, change: "+300%", status: "bad" },
      { label: "Autonomous Agent", value: 12, change: "-99%", status: "good" },
    ],
  },
});

registerSceneRenderer({
  type: "bar_chart",
  name: "Bar Chart Infographic",
  description: "Horizontal proportional animated metric bars with units and labels",
  renderer: BarChartScene,
  requiredFields: ["id", "purpose", "scene_type", "narration", "duration_hint_seconds"],
  optionalFields: ["chart", "data_points", "on_screen_text"],
  example: {
    id: "scene_003",
    purpose: "insight",
    scene_type: "bar_chart",
    narration: "Teams save over 90% of incident triage time.",
    duration_hint_seconds: 5,
    chart: {
      type: "bar",
      title: "Triage Time (minutes)",
      points: [
        { label: "Manual", value: 60, status: "bad" },
        { label: "Agent", value: 1, status: "good" },
      ],
    },
  },
});

registerSceneRenderer({
  type: "line_chart",
  name: "Line Chart Infographic",
  description: "SVG animated polyline trend graph with progressive milestone dots",
  renderer: LineChartScene,
  requiredFields: ["id", "purpose", "scene_type", "narration", "duration_hint_seconds"],
  optionalFields: ["chart", "on_screen_text"],
  example: {
    id: "scene_004",
    purpose: "context",
    scene_type: "line_chart",
    narration: "Autonomous event execution volume increases exponentially each month.",
    duration_hint_seconds: 5,
    chart: {
      type: "line",
      title: "Monthly Mitigations",
      points: [
        { label: "Jan", value: 10 },
        { label: "Feb", value: 40 },
        { label: "Mar", value: 150 },
      ],
    },
  },
});

registerSceneRenderer({
  type: "system_architecture",
  name: "System Architecture",
  description: "Multi-tier connected nodes with live active/standby status indicators",
  renderer: SystemArchitectureScene,
  requiredFields: ["id", "purpose", "scene_type", "narration", "duration_hint_seconds"],
  optionalFields: ["nodes", "on_screen_text", "accent_color"],
  example: {
    id: "scene_005",
    purpose: "architecture",
    scene_type: "system_architecture",
    narration: "Telemetry streams into the agent core, triggering instant remediation webhooks.",
    duration_hint_seconds: 6,
    nodes: [
      { label: "Telemetry Stream", detail: "Vectorized logs", status: "done" },
      { label: "Agent Core", detail: "Tool reasoning", status: "active" },
      { label: "Webhook Executor", detail: "Auto-remediation", status: "queued" },
    ],
  },
});

registerSceneRenderer({
  type: "process_flow",
  name: "Process Flow",
  description: "Sequential step-by-step workflow pipeline with progressive reveals",
  renderer: ProcessFlowScene,
  requiredFields: ["id", "purpose", "scene_type", "narration", "duration_hint_seconds"],
  optionalFields: ["nodes", "on_screen_text"],
  example: {
    id: "scene_006",
    purpose: "architecture",
    scene_type: "process_flow",
    narration: "First ingest, second analyze, third remediate.",
    duration_hint_seconds: 5,
  },
});

registerSceneRenderer({
  type: "code_terminal",
  name: "Code Terminal",
  description: "macOS/Linux terminal window with line-by-line typing and syntax coloring",
  renderer: CodeTerminalScene,
  requiredFields: ["id", "purpose", "scene_type", "narration", "duration_hint_seconds"],
  optionalFields: ["terminal_lines", "on_screen_text", "accent_color"],
  example: {
    id: "scene_007",
    purpose: "demo",
    scene_type: "code_terminal",
    narration: "The agent executes infrastructure scaling with zero human intervention.",
    duration_hint_seconds: 5,
    terminal_lines: [
      "voiceage-core --monitor cluster",
      "[ALERT] 504 Gateway Timeout detected",
      "[ACTION] dispatch: scale_replicas(count=6)",
      "[200 OK] Stabilized in 320ms",
    ],
  },
});

registerSceneRenderer({
  type: "comparison_grid",
  name: "Comparison Grid",
  description: "Split Before vs After comparison contrasting legacy vs autonomous approaches",
  renderer: ComparisonGridScene,
  requiredFields: ["id", "purpose", "scene_type", "narration", "duration_hint_seconds"],
  optionalFields: ["comparison", "on_screen_text"],
  example: {
    id: "scene_008",
    purpose: "comparison",
    scene_type: "comparison_grid",
    narration: "Dashboards demand manual triage. Agents execute fixes directly.",
    duration_hint_seconds: 6,
    comparison: {
      left: { title: "PASSIVE DASHBOARDS", points: ["Alert fatigue", "Human delay"] },
      right: { title: "AUTONOMOUS AGENTS", points: ["Zero latency", "Deterministic tools"] },
    },
  },
});

registerSceneRenderer({
  type: "dashboard_mockup",
  name: "Dashboard Mockup",
  description: "SaaS application telemetry mockup with active KPI cards",
  renderer: DashboardMockupScene,
  requiredFields: ["id", "purpose", "scene_type", "narration", "duration_hint_seconds"],
  optionalFields: ["on_screen_text", "accent_color"],
  example: {
    id: "scene_009",
    purpose: "demo",
    scene_type: "dashboard_mockup",
    narration: "Real-time telemetry provides continuous visibility across all clusters.",
    duration_hint_seconds: 5,
  },
});

registerSceneRenderer({
  type: "quote_insight",
  name: "Quote & Key Insight",
  description: "Minimalist focal quotation with author attribution and accent line",
  renderer: QuoteInsightScene,
  requiredFields: ["id", "purpose", "scene_type", "narration", "duration_hint_seconds"],
  optionalFields: ["on_screen_text"],
  example: {
    id: "scene_010",
    purpose: "insight",
    scene_type: "quote_insight",
    narration: "Stop observing. Start automating.",
    duration_hint_seconds: 4,
  },
});

registerSceneRenderer({
  type: "cta",
  name: "Call to Action",
  description: "High-retention closing card with pulsing action directive button",
  renderer: CtaScene,
  requiredFields: ["id", "purpose", "scene_type", "narration", "duration_hint_seconds"],
  optionalFields: ["on_screen_text"],
  example: {
    id: "scene_011",
    purpose: "cta",
    scene_type: "cta",
    narration: "Follow for more practical AI engineering systems.",
    duration_hint_seconds: 4,
  },
});

registerSceneRenderer({
  type: "modular_scene",
  name: "Modular Element Scene",
  description: "Flexible scene rendering any combination of registered visual elements",
  renderer: ModularElementScene,
  requiredFields: ["id", "purpose", "scene_type", "narration", "duration_hint_seconds"],
  optionalFields: ["elements", "on_screen_text"],
  example: {
    id: "scene_012",
    purpose: "context",
    scene_type: "modular_scene",
    narration: "Composable visual building blocks.",
    duration_hint_seconds: 5,
    elements: [
      { id: "e1", type: "heading", text: "Modular Scene Engine" },
      { id: "e2", type: "body_text", text: "Renders registered visual primitives." },
    ],
  },
});

// ── Extended Scene Types ──────────────────────────────────────────────────

registerSceneRenderer({
  type: "parallax_hero",
  name: "Parallax Hero",
  description:
    "Full-bleed cinematic hero with parallax image or gradient, layered kinetic headline, and purpose badge. Ideal for hooks and impactful moments.",
  renderer: ParallaxHeroScene,
  requiredFields: ["id", "purpose", "scene_type", "narration", "duration_hint_seconds"],
  optionalFields: ["on_screen_text", "visual_description", "accent_color", "image_url"],
  example: {
    id: "scene_013",
    purpose: "hook",
    scene_type: "parallax_hero",
    narration: "The future of work is autonomous.",
    on_screen_text: "AUTONOMOUS FUTURE",
    duration_hint_seconds: 7,
    accent_color: "#FF5F00",
  },
});

registerSceneRenderer({
  type: "timeline_reveal",
  name: "Timeline Reveal",
  description:
    "Animated vertical timeline that reveals steps one-by-one as the scene progresses. Supports steps[] or nodes[]. Ideal for processes, histories, milestones.",
  renderer: TimelineRevealScene,
  requiredFields: ["id", "purpose", "scene_type", "narration", "duration_hint_seconds"],
  optionalFields: ["steps", "nodes", "on_screen_text", "accent_color"],
  example: {
    id: "scene_014",
    purpose: "architecture",
    scene_type: "timeline_reveal",
    narration: "First we ingest the data, then we analyze it, then we act.",
    on_screen_text: "THREE STAGES",
    duration_hint_seconds: 8,
    steps: [
      { label: "Data Ingestion", detail: "Real-time telemetry stream" },
      { label: "LLM Analysis", detail: "Contextual root-cause reasoning" },
      { label: "Autonomous Action", detail: "Sub-second remediation" },
    ],
  },
});

registerSceneRenderer({
  type: "infographic_grid",
  name: "Infographic Grid",
  description:
    "Grid of animated stat/concept cards with staggered entrance. Supports grid_items[] or data_points[]. Ideal for feature breakdowns, benefit lists, key numbers.",
  renderer: InfographicGridScene,
  requiredFields: ["id", "purpose", "scene_type", "narration", "duration_hint_seconds"],
  optionalFields: ["grid_items", "data_points", "on_screen_text", "accent_color"],
  example: {
    id: "scene_015",
    purpose: "metric",
    scene_type: "infographic_grid",
    narration: "Here are the four numbers that prove autonomous systems win.",
    on_screen_text: "THE NUMBERS",
    duration_hint_seconds: 7,
    grid_items: [
      { label: "Speed", value: "10×", description: "Faster resolution" },
      { label: "Uptime", value: "99.9%", description: "Guaranteed SLA" },
      { label: "Events", value: "1M+", description: "Per day processed" },
      { label: "Cost", value: "−85%", description: "vs legacy systems" },
    ],
  },
});

registerSceneRenderer({
  type: "word_by_word",
  name: "Word By Word",
  description:
    "Per-word scale+fade entrance with automatic emphasis on impactful words. Ideal for punchy claims, emotional statements, key takeaways.",
  renderer: WordByWordScene,
  requiredFields: ["id", "purpose", "scene_type", "narration", "duration_hint_seconds"],
  optionalFields: ["on_screen_text", "visual_description", "accent_color"],
  example: {
    id: "scene_016",
    purpose: "insight",
    scene_type: "word_by_word",
    narration: "Stop observing. Start automating. Zero latency.",
    on_screen_text: "STOP OBSERVING START AUTOMATING ZERO LATENCY",
    duration_hint_seconds: 5,
  },
});

registerSceneRenderer({
  type: "split_callout",
  name: "Split Callout",
  description:
    "Two-panel split layout: large accent callout on top, supporting context or data points below. Ideal for contrasts, key claims with evidence, stats with explanation.",
  renderer: SplitCalloutScene,
  requiredFields: ["id", "purpose", "scene_type", "narration", "duration_hint_seconds"],
  optionalFields: [
    "callout_text",
    "callout_label",
    "visual_description",
    "data_points",
    "accent_color",
  ],
  example: {
    id: "scene_017",
    purpose: "comparison",
    scene_type: "split_callout",
    narration: "The numbers don't lie. Autonomous agents resolve incidents ninety-nine percent faster.",
    callout_text: "99% FASTER",
    callout_label: "RESOLUTION TIME",
    visual_description: "Autonomous AI agents resolve incidents in milliseconds, not hours.",
    duration_hint_seconds: 7,
    data_points: [
      { label: "Manual MTTR", value: 45, change: "45min baseline", status: "bad" },
      { label: "Autonomous MTTR", value: 320, change: "320ms (−99.4%)", status: "good" },
    ],
  },
});

registerSceneRenderer({
  type: "document_reveal",
  name: "Document Reveal",
  description:
    "Sourced investigative article clipping with animated highlighter sweep and publisher badge. Ideal for breaking news, journalism citations, and verified evidence.",
  renderer: DocumentRevealScene,
  requiredFields: ["id", "purpose", "scene_type", "narration", "duration_hint_seconds"],
  optionalFields: ["on_screen_text", "visual_description", "accent_color", "image_url"],
  example: {
    id: "scene_018",
    purpose: "context",
    scene_type: "document_reveal",
    narration: "A joint investigation confirmed that autonomous banking protocols processed over forty billion dollars in settled volume.",
    on_screen_text: "FINANCIAL TIMES DISCLOSURE",
    duration_hint_seconds: 6,
  },
});

registerSceneRenderer({
  type: "editorial_montage",
  name: "Editorial Montage",
  description:
    "Cinematic layered photograph collage with dynamic camera drift and bold editorial typography. Ideal for feature stories, investigative hooks, and major narrative developments.",
  renderer: EditorialMontageScene,
  requiredFields: ["id", "purpose", "scene_type", "narration", "duration_hint_seconds"],
  optionalFields: ["on_screen_text", "visual_description", "accent_color", "image_url"],
  example: {
    id: "scene_019",
    purpose: "hook",
    scene_type: "editorial_montage",
    narration: "Across global financial hubs, autonomous systems are taking over real-time liquidity management.",
    on_screen_text: "THE AUTONOMOUS CAPITAL SHIFT",
    duration_hint_seconds: 7,
  },
});



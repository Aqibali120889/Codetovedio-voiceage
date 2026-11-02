/**
 * Visual Element Registry.
 *
 * Maps registered element types to React component implementations.
 */

import React from "react";
import type { ElementType, VisualElement } from "../types";
import type { ThemeTokens } from "../themes/tokens";

// Import typography components
import {
  HeadingComponent,
  BodyTextComponent,
  KineticTextComponent,
  HighlightedTextComponent,
  QuoteBlockComponent,
  NumberDisplayComponent,
  LabelComponent,
  CodeBlockVisualComponent,
  CaptionTextComponent,
} from "../components/typography";

// Import primitives
import {
  RectangleComponent,
  CircleComponent,
  LineArrowComponent,
  DividerComponent,
  ProgressIndicatorComponent,
  GridComponent,
  BadgeComponent,
} from "../components/primitives";

// Import charts
import {
  BarChartComponent,
  LineChartComponent,
  MetricCounterComponent,
  ComparisonPanelComponent,
} from "../components/charts";

// Import diagrams
import {
  FlowNodeComponent,
  ConnectorComponent,
  ArchitectureTierComponent,
} from "../components/diagrams";

// Import interfaces
import {
  TerminalWindowComponent,
  DashboardCardComponent,
  BrowserFrameComponent,
} from "../components/interfaces";

// Import backgrounds
import {
  SolidBgComponent,
  GradientBgComponent,
  GridBgComponent,
  ParticlesBgComponent,
  GlowBgComponent,
} from "../components/backgrounds";

export type ElementRendererProps<T extends VisualElement = VisualElement> = {
  element: T;
  sceneFrame: number;
  fps: number;
  theme: ThemeTokens;
  index?: number;
};

export type ElementRenderer<T extends VisualElement = VisualElement> =
  React.FC<ElementRendererProps<T>>;

export interface ElementRegistration {
  type: ElementType;
  category: "typography" | "primitives" | "charts" | "diagrams" | "interfaces" | "backgrounds";
  name: string;
  description: string;
  renderer: ElementRenderer<any>;
}

const ELEMENT_REGISTRY = new Map<ElementType, ElementRegistration>();

export function registerElementRenderer<T extends VisualElement>(
  registration: ElementRegistration
): void {
  if (ELEMENT_REGISTRY.has(registration.type)) {
    throw new Error(`Duplicate element renderer registration for type: ${registration.type}`);
  }
  ELEMENT_REGISTRY.set(registration.type, registration);
}

export function getElementRenderer(type: ElementType): ElementRenderer<any> | undefined {
  return ELEMENT_REGISTRY.get(type)?.renderer;
}

export function hasElementRenderer(type: ElementType): boolean {
  return ELEMENT_REGISTRY.has(type);
}

export function listRegisteredElementTypes(): ElementRegistration[] {
  return Array.from(ELEMENT_REGISTRY.values());
}

// -------------------------------------------------------------
// Register All Built-in Elements
// -------------------------------------------------------------

// Typography
registerElementRenderer({
  type: "heading",
  category: "typography",
  name: "Heading",
  description: "Bold title or section header with configurable levels (H1/H2/H3)",
  renderer: HeadingComponent,
});

registerElementRenderer({
  type: "body_text",
  category: "typography",
  name: "Body Text",
  description: "Standard descriptive body paragraph",
  renderer: BodyTextComponent,
});

registerElementRenderer({
  type: "kinetic_text",
  category: "typography",
  name: "Kinetic Text",
  description: "Staggered high-velocity words with focal highlighting",
  renderer: KineticTextComponent,
});

registerElementRenderer({
  type: "highlighted_text",
  category: "typography",
  name: "Highlighted Text",
  description: "Paragraph with targeted neon keyword underline or highlight",
  renderer: HighlightedTextComponent,
});

registerElementRenderer({
  type: "quote_block",
  category: "typography",
  name: "Quote Block",
  description: "Statement quote with author attribution badge",
  renderer: QuoteBlockComponent,
});

registerElementRenderer({
  type: "number_display",
  category: "typography",
  name: "Number Display",
  description: "Animated count-up number with optional prefix and suffix",
  renderer: NumberDisplayComponent,
});

registerElementRenderer({
  type: "label",
  category: "typography",
  name: "Label",
  description: "Small tag pill or outline badge",
  renderer: LabelComponent,
});

registerElementRenderer({
  type: "code_block",
  category: "typography",
  name: "Code Block",
  description: "Formatted monospace code snippet",
  renderer: CodeBlockVisualComponent,
});

registerElementRenderer({
  type: "caption_text",
  category: "typography",
  name: "Caption Text",
  description: "Muted footnote or caption text",
  renderer: CaptionTextComponent,
});

// Primitives
registerElementRenderer({
  type: "rectangle",
  category: "primitives",
  name: "Rectangle",
  description: "Card container or accent bar",
  renderer: RectangleComponent,
});

registerElementRenderer({
  type: "circle",
  category: "primitives",
  name: "Circle",
  description: "Circular indicator or avatar placeholder",
  renderer: CircleComponent,
});

registerElementRenderer({
  type: "line_arrow",
  category: "primitives",
  name: "Line Arrow",
  description: "Directional vector connector with animated draw",
  renderer: LineArrowComponent,
});

registerElementRenderer({
  type: "divider",
  category: "primitives",
  name: "Divider",
  description: "Subtle separating hairline line",
  renderer: DividerComponent,
});

registerElementRenderer({
  type: "progress_indicator",
  category: "primitives",
  name: "Progress Indicator",
  description: "Horizontal animated progress bar",
  renderer: ProgressIndicatorComponent,
});

registerElementRenderer({
  type: "grid",
  category: "primitives",
  name: "Grid",
  description: "Blueprint coordinate grid lines",
  renderer: GridComponent,
});

registerElementRenderer({
  type: "badge",
  category: "primitives",
  name: "Badge",
  description: "Status badge with variant colors (success/error/warning/info)",
  renderer: BadgeComponent,
});

// Charts
registerElementRenderer({
  type: "bar_chart_elem",
  category: "charts",
  name: "Bar Chart",
  description: "Horizontal proportional comparison bars with animated fill",
  renderer: BarChartComponent,
});

registerElementRenderer({
  type: "line_chart_elem",
  category: "charts",
  name: "Line Chart",
  description: "SVG animated polyline trend with progressive nodes",
  renderer: LineChartComponent,
});

registerElementRenderer({
  type: "metric_counter_elem",
  category: "charts",
  name: "Metric Counter",
  description: "Hero count-up KPI metric card with status delta",
  renderer: MetricCounterComponent,
});

registerElementRenderer({
  type: "comparison_panel_elem",
  category: "charts",
  name: "Comparison Panel",
  description: "Split Before vs After comparison card",
  renderer: ComparisonPanelComponent,
});

// Diagrams
registerElementRenderer({
  type: "flow_node_elem",
  category: "diagrams",
  name: "Flow Node",
  description: "Architecture flow node with live status",
  renderer: FlowNodeComponent,
});

registerElementRenderer({
  type: "connector_elem",
  category: "diagrams",
  name: "Connector",
  description: "Vertical signal line between flow nodes",
  renderer: ConnectorComponent,
});

registerElementRenderer({
  type: "architecture_tier_elem",
  category: "diagrams",
  name: "Architecture Tier",
  description: "Tiered layer with multi-node cluster grouping",
  renderer: ArchitectureTierComponent,
});

// Interfaces
registerElementRenderer({
  type: "terminal_window_elem",
  category: "interfaces",
  name: "Terminal Window",
  description: "Dark-mode terminal with streaming typed commands",
  renderer: TerminalWindowComponent,
});

registerElementRenderer({
  type: "dashboard_card_elem",
  category: "interfaces",
  name: "Dashboard Card",
  description: "SaaS dashboard card with multi-metric grids",
  renderer: DashboardCardComponent,
});

registerElementRenderer({
  type: "browser_frame_elem",
  category: "interfaces",
  name: "Browser Frame",
  description: "Minimal browser frame with URL bar",
  renderer: BrowserFrameComponent,
});

// Backgrounds
registerElementRenderer({
  type: "solid_bg",
  category: "backgrounds",
  name: "Solid Background",
  description: "Uniform color background fill",
  renderer: SolidBgComponent,
});

registerElementRenderer({
  type: "gradient_bg",
  category: "backgrounds",
  name: "Gradient Background",
  description: "Dual-tone linear gradient background",
  renderer: GradientBgComponent,
});

registerElementRenderer({
  type: "grid_bg",
  category: "backgrounds",
  name: "Grid Background",
  description: "Subtle matrix grid pattern",
  renderer: GridBgComponent,
});

registerElementRenderer({
  type: "particles_bg",
  category: "backgrounds",
  name: "Particles Background",
  description: "Deterministic drifting particle field",
  renderer: ParticlesBgComponent,
});

registerElementRenderer({
  type: "glow_bg",
  category: "backgrounds",
  name: "Glow Background",
  description: "Radial ambient neon glow spot",
  renderer: GlowBgComponent,
});

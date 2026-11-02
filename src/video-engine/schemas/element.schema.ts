/**
 * Visual Element Zod Schemas.
 *
 * Validates individual renderable visual elements with discriminated unions.
 */

import { z } from "zod";
import {
  HexColorSchema,
  ElementPositionSchema,
  ElementSizeSchema,
  ElementAnimationConfigSchema,
} from "./common.schema";

const BaseElementFields = {
  id: z.string().min(1),
  position: ElementPositionSchema.optional(),
  size: ElementSizeSchema.optional(),
  layer: z.number().int().optional(),
  animation: ElementAnimationConfigSchema.optional(),
  opacity: z.number().min(0).max(1).optional(),
  accent_color: HexColorSchema.optional(),
};

// Typography
export const HeadingElementSchema = z.object({
  ...BaseElementFields,
  type: z.literal("heading"),
  text: z.string().min(1),
  level: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
  color: HexColorSchema.optional(),
});

export const BodyTextElementSchema = z.object({
  ...BaseElementFields,
  type: z.literal("body_text"),
  text: z.string().min(1),
  color: HexColorSchema.optional(),
});

export const KineticTextElementSchema = z.object({
  ...BaseElementFields,
  type: z.literal("kinetic_text"),
  words: z.array(z.string().min(1)).min(1),
  highlight_index: z.number().int().min(0).optional(),
});

export const HighlightedTextElementSchema = z.object({
  ...BaseElementFields,
  type: z.literal("highlighted_text"),
  text: z.string().min(1),
  highlight: z.string().min(1),
  highlight_color: HexColorSchema.optional(),
});

export const QuoteBlockElementSchema = z.object({
  ...BaseElementFields,
  type: z.literal("quote_block"),
  quote: z.string().min(1),
  author: z.string().optional(),
});

export const NumberDisplayElementSchema = z.object({
  ...BaseElementFields,
  type: z.literal("number_display"),
  value: z.number(),
  suffix: z.string().optional(),
  prefix: z.string().optional(),
  label: z.string().optional(),
});

export const LabelElementSchema = z.object({
  ...BaseElementFields,
  type: z.literal("label"),
  text: z.string().min(1),
  variant: z.enum(["pill", "badge", "outline"]).optional(),
});

export const CodeBlockElementSchema = z.object({
  ...BaseElementFields,
  type: z.literal("code_block"),
  code: z.string().min(1),
  language: z.string().optional(),
});

export const CaptionTextElementSchema = z.object({
  ...BaseElementFields,
  type: z.literal("caption_text"),
  text: z.string().min(1),
});

// Primitives
export const RectangleElementSchema = z.object({
  ...BaseElementFields,
  type: z.literal("rectangle"),
  border_radius: z.number().min(0).optional(),
  fill: HexColorSchema.optional(),
  stroke: HexColorSchema.optional(),
  stroke_width: z.number().min(0).optional(),
});

export const CircleElementSchema = z.object({
  ...BaseElementFields,
  type: z.literal("circle"),
  radius: z.number().positive().optional(),
  fill: HexColorSchema.optional(),
  stroke: HexColorSchema.optional(),
});

export const LineArrowElementSchema = z.object({
  ...BaseElementFields,
  type: z.literal("line_arrow"),
  x1: z.number(),
  y1: z.number(),
  x2: z.number(),
  y2: z.number(),
  stroke_width: z.number().positive().optional(),
  stroke: HexColorSchema.optional(),
  arrow_end: z.boolean().optional(),
});

export const DividerElementSchema = z.object({
  ...BaseElementFields,
  type: z.literal("divider"),
  orientation: z.enum(["horizontal", "vertical"]).optional(),
  color: HexColorSchema.optional(),
});

export const ProgressIndicatorElementSchema = z.object({
  ...BaseElementFields,
  type: z.literal("progress_indicator"),
  progress: z.number().min(0).max(100),
  color: HexColorSchema.optional(),
});

export const GridElementSchema = z.object({
  ...BaseElementFields,
  type: z.literal("grid"),
  columns: z.number().int().positive().optional(),
  rows: z.number().int().positive().optional(),
  cell_size: z.number().positive().optional(),
  stroke: HexColorSchema.optional(),
});

export const BadgeElementSchema = z.object({
  ...BaseElementFields,
  type: z.literal("badge"),
  text: z.string().min(1),
  variant: z.enum(["success", "warning", "error", "info", "brand"]).optional(),
});

// Charts
export const ChartDataPointSchema = z.object({
  label: z.string().min(1),
  value: z.number(),
  color: HexColorSchema.optional(),
  change: z.string().optional(),
  status: z.enum(["good", "bad", "neutral"]).optional(),
});

export const BarChartElementSchema = z.object({
  ...BaseElementFields,
  type: z.literal("bar_chart_elem"),
  title: z.string().optional(),
  data: z.array(ChartDataPointSchema).min(1),
  max_value: z.number().positive().optional(),
  unit: z.string().optional(),
  is_illustrative: z.boolean().optional(),
});

export const LineChartElementSchema = z.object({
  ...BaseElementFields,
  type: z.literal("line_chart_elem"),
  title: z.string().optional(),
  data: z.array(ChartDataPointSchema).min(2),
  unit: z.string().optional(),
  is_illustrative: z.boolean().optional(),
});

export const MetricCounterElementSchema = z.object({
  ...BaseElementFields,
  type: z.literal("metric_counter_elem"),
  label: z.string().min(1),
  start_value: z.number().optional(),
  end_value: z.number(),
  suffix: z.string().optional(),
  prefix: z.string().optional(),
  delta: z.string().optional(),
  status: z.enum(["good", "bad", "neutral"]).optional(),
});

export const ComparisonPanelElementSchema = z.object({
  ...BaseElementFields,
  type: z.literal("comparison_panel_elem"),
  left_title: z.string().min(1),
  left_items: z.array(z.string()),
  right_title: z.string().min(1),
  right_items: z.array(z.string()),
});

// Diagrams
export const FlowNodeElementSchema = z.object({
  ...BaseElementFields,
  type: z.literal("flow_node_elem"),
  node_id: z.string().min(1),
  label: z.string().min(1),
  detail: z.string().optional(),
  status: z.enum(["done", "active", "queued", "error"]).optional(),
});

export const ConnectorElementSchema = z.object({
  ...BaseElementFields,
  type: z.literal("connector_elem"),
  from_id: z.string().min(1),
  to_id: z.string().min(1),
  label: z.string().optional(),
  active: z.boolean().optional(),
});

export const ArchitectureTierElementSchema = z.object({
  ...BaseElementFields,
  type: z.literal("architecture_tier_elem"),
  tier_name: z.string().min(1),
  nodes: z.array(
    z.object({
      label: z.string().min(1),
      detail: z.string().optional(),
      status: z.enum(["done", "active", "queued"]).optional(),
    })
  ),
});

// Interfaces
export const TerminalWindowElementSchema = z.object({
  ...BaseElementFields,
  type: z.literal("terminal_window_elem"),
  title: z.string().optional(),
  lines: z.array(z.string()),
  typing_speed_frames: z.number().int().positive().optional(),
});

export const DashboardCardElementSchema = z.object({
  ...BaseElementFields,
  type: z.literal("dashboard_card_elem"),
  title: z.string().min(1),
  metrics: z.array(
    z.object({
      label: z.string().min(1),
      value: z.string().min(1),
      change: z.string().optional(),
    })
  ),
});

export const BrowserFrameElementSchema = z.object({
  ...BaseElementFields,
  type: z.literal("browser_frame_elem"),
  url: z.string().optional(),
  title: z.string().optional(),
});

// Backgrounds
export const SolidBgElementSchema = z.object({
  ...BaseElementFields,
  type: z.literal("solid_bg"),
  color: HexColorSchema,
});

export const GradientBgElementSchema = z.object({
  ...BaseElementFields,
  type: z.literal("gradient_bg"),
  colors: z.tuple([HexColorSchema, HexColorSchema]),
  angle: z.number().optional(),
});

export const GridBgElementSchema = z.object({
  ...BaseElementFields,
  type: z.literal("grid_bg"),
  grid_color: HexColorSchema.optional(),
  spacing: z.number().positive().optional(),
});

export const ParticlesBgElementSchema = z.object({
  ...BaseElementFields,
  type: z.literal("particles_bg"),
  count: z.number().int().positive().optional(),
  color: HexColorSchema.optional(),
});

export const GlowBgElementSchema = z.object({
  ...BaseElementFields,
  type: z.literal("glow_bg"),
  glow_color: HexColorSchema,
  radius: z.number().positive().optional(),
});

export const VisualElementSchema = z.discriminatedUnion("type", [
  HeadingElementSchema,
  BodyTextElementSchema,
  KineticTextElementSchema,
  HighlightedTextElementSchema,
  QuoteBlockElementSchema,
  NumberDisplayElementSchema,
  LabelElementSchema,
  CodeBlockElementSchema,
  CaptionTextElementSchema,
  RectangleElementSchema,
  CircleElementSchema,
  LineArrowElementSchema,
  DividerElementSchema,
  ProgressIndicatorElementSchema,
  GridElementSchema,
  BadgeElementSchema,
  BarChartElementSchema,
  LineChartElementSchema,
  MetricCounterElementSchema,
  ComparisonPanelElementSchema,
  FlowNodeElementSchema,
  ConnectorElementSchema,
  ArchitectureTierElementSchema,
  TerminalWindowElementSchema,
  DashboardCardElementSchema,
  BrowserFrameElementSchema,
  SolidBgElementSchema,
  GradientBgElementSchema,
  GridBgElementSchema,
  ParticlesBgElementSchema,
  GlowBgElementSchema,
]);

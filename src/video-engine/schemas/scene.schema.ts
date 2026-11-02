/**
 * Scene Blueprint Zod Schema.
 */

import { z } from "zod";
import {
  HexColorSchema,
  ScenePurposeSchema,
  TransitionTypeSchema,
} from "./common.schema";
import {
  VisualElementSchema,
  ChartDataPointSchema,
} from "./element.schema";

export const SceneTypeSchema = z.enum([
  "kinetic_typography",
  "stat_counter",
  "bar_chart",
  "line_chart",
  "system_architecture",
  "process_flow",
  "code_terminal",
  "comparison_grid",
  "dashboard_mockup",
  "quote_insight",
  "cta",
  "modular_scene",
]);

export const SceneBackgroundConfigSchema = z.object({
  type: z.enum(["solid", "gradient", "grid", "matrix"]),
  color: HexColorSchema.optional(),
  accent_glow: HexColorSchema.optional(),
});

export const SceneCompositionLayoutSchema = z.object({
  layout: z.enum([
    "center_focus",
    "split_horizontal",
    "metric_hero",
    "card_grid",
    "terminal",
    "full_canvas",
  ]),
  safe_margin_percent: z.number().min(0).max(30).optional(),
});

export const SceneTransitionOutSchema = z.object({
  type: TransitionTypeSchema,
  duration_seconds: z.number().min(0).max(5).optional(),
});

export const SceneBlueprintSchema = z.object({
  id: z.string().min(1),
  purpose: ScenePurposeSchema,
  scene_type: SceneTypeSchema,
  narration: z.string().min(1),
  audio_path: z.string().nullable().optional(),
  visual_description: z.string().optional(),
  on_screen_text: z.string().optional(),
  duration_hint_seconds: z.number().positive(),
  background: SceneBackgroundConfigSchema.optional(),
  composition: SceneCompositionLayoutSchema.optional(),
  accent_color: HexColorSchema.optional(),
  elements: z.array(VisualElementSchema).optional(),
  transition_out: SceneTransitionOutSchema.optional(),

  // Specialized visual payloads
  nodes: z
    .array(
      z.object({
        label: z.string().min(1),
        detail: z.string().optional(),
        status: z.enum(["done", "active", "queued"]).optional(),
      })
    )
    .optional(),
  data_points: z.array(ChartDataPointSchema).optional(),
  terminal_lines: z.array(z.string()).optional(),
  comparison: z
    .object({
      left: z.object({
        title: z.string(),
        points: z.array(z.string()),
      }),
      right: z.object({
        title: z.string(),
        points: z.array(z.string()),
      }),
    })
    .optional(),
  chart: z
    .object({
      type: z.enum(["bar", "line"]),
      title: z.string().optional(),
      unit: z.string().optional(),
      points: z.array(ChartDataPointSchema),
      is_illustrative: z.boolean().optional(),
    })
    .optional(),
});

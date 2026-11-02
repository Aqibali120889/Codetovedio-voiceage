/**
 * Common Zod Schemas for Video Engine.
 */

import { z } from "zod";

export const HexColorSchema = z
  .string()
  .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/, {
    message: "Must be a valid hex color string (e.g. #FF5F00, #111827)",
  });

export const AspectRatioSchema = z.enum(["16:9", "9:16", "1:1"]);

export const AnimationTypeSchema = z.enum([
  "fade",
  "fade_up",
  "fade_down",
  "slide_left",
  "slide_right",
  "scale_in",
  "stagger",
  "count_up",
  "draw_line",
  "progress_fill",
  "reveal",
  "highlight",
]);

export const TransitionTypeSchema = z.enum(["cut", "fade", "slide"]);

export const ScenePurposeSchema = z.enum([
  "hook",
  "problem",
  "context",
  "insight",
  "architecture",
  "comparison",
  "demo",
  "metric",
  "recap",
  "cta",
]);

export const ElementPositionSchema = z.object({
  x: z.number().optional(),
  y: z.number().optional(),
  anchor: z.enum(["center", "top-left", "top-right", "bottom-center"]).optional(),
});

export const ElementSizeSchema = z.object({
  width: z.union([z.number(), z.string()]).optional(),
  height: z.union([z.number(), z.string()]).optional(),
});

export const ElementAnimationConfigSchema = z.object({
  enter: AnimationTypeSchema.optional(),
  start_seconds: z.number().min(0).optional(),
  duration_seconds: z.number().positive().optional(),
  exit: AnimationTypeSchema.optional(),
  exit_seconds: z.number().min(0).optional(),
  stagger_delay: z.number().min(0).optional(),
  easing: z.enum(["cubic", "quad", "linear", "spring"]).optional(),
});

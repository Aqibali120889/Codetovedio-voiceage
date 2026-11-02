/**
 * Storyboard Zod Validation Schemas.
 * Provides runtime schema validation for production-ready motion graphics storyboards.
 */

import { z } from "zod";
import type { StoryboardDocument } from "./storyboard-types";

export const HexColorSchema = z.string().refine(
  (val) =>
    /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3}|[A-Fa-f0-9]{8})$/.test(val) ||
    /^rgba?\([^)]+\)$/.test(val) ||
    /^hsla?\([^)]+\)$/.test(val),
  { message: "Must be a valid hex, rgb, or rgba color" }
);

export const CanvasDimensionsSchema = z.object({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

export const StoryboardColorPaletteSchema = z.object({
  background: HexColorSchema,
  surface: HexColorSchema,
  primary: HexColorSchema,
  accent: HexColorSchema,
  accent_glow: HexColorSchema,
  text_primary: HexColorSchema,
  text_secondary: HexColorSchema,
  border: HexColorSchema,
  positive: HexColorSchema,
  warning: HexColorSchema,
  critical: HexColorSchema,
});

export const StoryboardTypographySchema = z.object({
  font_heading: z.string().min(1),
  font_body: z.string().min(1),
  font_code: z.string().min(1),
  font_headline_size: z.number().positive(),
  font_body_size: z.number().positive(),
  font_code_size: z.number().positive(),
});

export const StoryboardBackgroundTreatmentSchema = z.object({
  type: z.enum(["solid", "gradient", "grid", "matrix", "particles"]),
  primary_color: HexColorSchema,
  secondary_color: HexColorSchema.optional(),
  accent_glow: HexColorSchema.optional(),
  scanline: z.boolean(),
});

export const StoryboardMotionDesignSchema = z.object({
  default_ease: z.string().min(1),
  entrance_duration_frames: z.number().int().positive(),
  hold_dynamics: z.enum(["subtle_drift", "pulse", "floating", "static"]),
  exit_duration_frames: z.number().int().nonnegative(),
});

export const StoryboardCaptionSpecSchema = z.object({
  style_preset: z.enum(["bottom_pill", "center_kinetic", "minimal_sub"]),
  font_size: z.number().positive(),
  bottom_margin_percent: z.number().min(0).max(100),
  max_lines: z.number().int().positive(),
  max_chars_per_line: z.number().int().positive(),
  safe_area_box: z.object({
    top: z.number().min(0).max(1),
    bottom: z.number().min(0).max(1),
    left: z.number().min(0).max(1),
    right: z.number().min(0).max(1),
  }),
});

export const StoryboardAudioCueSchema = z.object({
  time_seconds: z.number().nonnegative(),
  frame: z.number().int().nonnegative(),
  cue_type: z.enum(["beat_drop", "riser", "hit", "whoosh", "data_beep"]),
  intensity: z.number().min(0).max(1),
  description: z.string().min(1),
});

export const StoryboardAccessibilitySchema = z.object({
  min_contrast_ratio: z.number().positive(),
  text_safe_area: z.boolean(),
  no_rapid_flashing: z.boolean(),
});

export const GlobalStoryboardSpecSchema = z.object({
  video_title: z.string().min(1),
  topic: z.string().min(1),
  dimensions: CanvasDimensionsSchema,
  aspect_ratio: z.enum(["9:16", "16:9", "1:1"]),
  fps: z.number().int().positive(),
  total_narration: z.string().min(1),
  target_duration_seconds: z.number().positive(),
  target_total_frames: z.number().int().positive(),
  visual_style: z.string().min(1),
  color_palette: StoryboardColorPaletteSchema,
  typography: StoryboardTypographySchema,
  background_treatment: StoryboardBackgroundTreatmentSchema,
  motion_design: StoryboardMotionDesignSchema,
  caption_spec: StoryboardCaptionSpecSchema,
  default_transition: z.object({
    type: z.enum(["cut", "fade", "slide_left", "wipe"]),
    duration_frames: z.number().int().nonnegative(),
  }),
  audio_cues: z.array(StoryboardAudioCueSchema),
  accessibility: StoryboardAccessibilitySchema,
});

export const NormalizedPositionSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  anchor: z.enum(["top_left", "center", "bottom_center", "top_center"]),
});

export const NormalizedSizeSchema = z.object({
  width: z.number().min(0).max(1),
  height: z.number().min(0).max(1),
});

export const StoryboardAssetStrategySchema = z.object({
  strategy: z.enum(["pixabay", "svg", "react", "local", "procedural"]),
  query: z.string().optional(),
  media_type: z.enum(["photo", "illustration", "vector"]).optional(),
  fallback_query: z.string().optional(),
  local_path: z.string().optional(),
  generator_spec: z.record(z.string(), z.unknown()).optional(),
});

export const StoryboardArtifactStyleSchema = z.object({
  fill_color: z.string().optional(),
  stroke_color: z.string().optional(),
  stroke_width: z.number().optional(),
  border_radius: z.number().optional(),
  opacity: z.number().min(0).max(1).optional(),
  shadow: z.string().optional(),
  font_family: z.string().optional(),
  font_size: z.number().optional(),
  font_weight: z.union([z.number(), z.string()]).optional(),
  text_align: z.enum(["left", "center", "right"]).optional(),
  letter_spacing: z.number().optional(),
});

export const StoryboardAnimationKeyframeSchema = z.object({
  type: z.enum([
    "fade",
    "slide_up",
    "slide_down",
    "slide_left",
    "slide_right",
    "scale_in",
    "scale_out",
    "pop_in",
    "draw_path",
    "stagger_words",
    "none",
  ]),
  start_frame: z.number().int().nonnegative(),
  duration_frames: z.number().int().nonnegative(),
  easing: z.string().min(1),
  distance: z.number().optional(),
});

export const StoryboardHoldAnimationSchema = z.object({
  type: z.enum(["subtle_drift", "pulse_glow", "scanline", "none"]),
  speed: z.number().optional(),
  intensity: z.number().optional(),
});

export const StoryboardArtifactFallbackSchema = z.object({
  on_error: z.enum(["render_placeholder", "skip", "render_text_only"]),
  placeholder_text: z.string().optional(),
});

export const StoryboardArtifactSchema = z.object({
  artifact_id: z.string().min(1),
  artifact_type: z.enum([
    "heading",
    "kinetic_text",
    "body_text",
    "quote_block",
    "stat_counter",
    "dashboard_card",
    "flow_node",
    "connector_arrow",
    "code_terminal_window",
    "timeline_step",
    "infographic_card",
    "bar_chart",
    "line_chart",
    "comparison_column",
    "label_callout",
    "icon_badge",
    "image_cutout",
    "browser_window",
    "svg_illustration",
    "emphasis_ring",
    "laser_scanline",
  ]),
  purpose: z.string().min(1),
  visible_text: z.string().optional(),
  visible_data: z.record(z.string(), z.unknown()).optional(),
  source_evidence_id: z.string().optional(),
  asset_strategy: StoryboardAssetStrategySchema,
  visual_style: StoryboardArtifactStyleSchema,
  position: NormalizedPositionSchema,
  size: NormalizedSizeSchema,
  layer: z.number().int(),
  entry_animation: StoryboardAnimationKeyframeSchema,
  hold_animation: StoryboardHoldAnimationSchema.optional(),
  exit_animation: StoryboardAnimationKeyframeSchema.optional(),
  start_frame: z.number().int().nonnegative(),
  end_frame: z.number().int().positive(),
  duration_frames: z.number().int().positive(),
  dependencies: z.array(z.string()),
  accessibility: z.object({
    is_essential: z.boolean(),
    safe_area_compliant: z.boolean(),
  }),
  fallback_behavior: StoryboardArtifactFallbackSchema,
  renderer_component: z.string().min(1),
  component_props: z.record(z.string(), z.unknown()),
});

export const StoryboardBeatUpdateSchema = z.object({
  artifact_id: z.string().min(1),
  updated_state: z.record(z.string(), z.unknown()),
  transition_description: z.string().min(1),
});

export const StoryboardBeatSchema = z.object({
  beat_id: z.string().min(1),
  beat_index: z.number().int().nonnegative(),
  start_seconds: z.number().nonnegative(),
  end_seconds: z.number().positive(),
  start_frame: z.number().int().nonnegative(),
  end_frame: z.number().int().positive(),
  narration_fragment: z.string().min(1),
  narrative_goal: z.string().min(1),
  artifacts_introduced: z.array(z.string()),
  artifacts_updated: z.array(StoryboardBeatUpdateSchema),
  artifacts_removed: z.array(z.string()).optional(),
  motion_instructions: z.string().min(1),
  focal_point: z.object({
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
    description: z.string().min(1),
  }),
  caption_ref: z.string().optional(),
  sound_cue: z
    .object({
      type: z.string(),
      frame: z.number().int().nonnegative(),
    })
    .optional(),
});

export const StoryboardCaptionRefSchema = z.object({
  caption_id: z.string().min(1),
  text: z.string().min(1),
  start_frame: z.number().int().nonnegative(),
  end_frame: z.number().int().positive(),
});

export const StoryboardSceneSchema = z.object({
  scene_id: z.string().min(1),
  scene_index: z.number().int().nonnegative(),
  purpose: z.enum([
    "hook",
    "problem",
    "context",
    "architecture",
    "mechanism",
    "comparison",
    "demo",
    "metric",
    "recap",
    "cta",
    "insight",
  ]),
  narrative_contribution: z.string().min(1),
  narration: z.string().min(1),
  source_evidence_ids: z.array(z.string()),
  start_seconds: z.number().nonnegative(),
  end_seconds: z.number().positive(),
  duration_seconds: z.number().positive(),
  start_frame: z.number().int().nonnegative(),
  end_frame: z.number().int().positive(),
  duration_frames: z.number().int().positive(),
  transition_in: z.object({
    type: z.enum(["cut", "fade", "slide_left", "zoom_in"]),
    duration_frames: z.number().int().nonnegative(),
  }),
  transition_out: z.object({
    type: z.enum(["cut", "fade", "slide_left", "zoom_in"]),
    duration_frames: z.number().int().nonnegative(),
  }),
  visual_hierarchy: z.object({
    primary_focus: z.string().min(1),
    secondary_focus: z.string().optional(),
    reading_order: z.array(z.string()),
  }),
  background: z.object({
    type: z.enum(["solid", "gradient", "grid", "matrix"]),
    color: HexColorSchema,
    accent_glow: HexColorSchema.optional(),
  }),
  layout_strategy: z.enum([
    "center_focus",
    "split_horizontal",
    "metric_hero",
    "card_grid",
    "terminal",
    "full_canvas",
    "multi_panel_flow",
  ]),
  artifacts: z.array(StoryboardArtifactSchema).min(1),
  beats: z.array(StoryboardBeatSchema).min(1),
  caption_refs: z.array(StoryboardCaptionRefSchema),
  audio_cues: z.array(StoryboardAudioCueSchema).optional(),
  asset_dependencies: z.array(
    z.object({
      asset_id: z.string().min(1),
      required: z.boolean(),
      strategy: z.enum(["pixabay", "svg", "react", "local", "procedural"]),
    })
  ),
  renderer_component: z.string().min(1),
  validation_constraints: z.object({
    min_meaningful_beats: z.number().int().positive(),
    max_static_interval_seconds: z.number().positive(),
  }),
});

export const StoryboardStatsSchema = z.object({
  total_scenes: z.number().int().positive(),
  total_artifacts: z.number().int().positive(),
  total_beats: z.number().int().positive(),
  average_beats_per_scene: z.number().positive(),
  average_artifacts_per_scene: z.number().positive(),
  max_unanimated_interval_seconds: z.number().nonnegative(),
  verified_evidence_citations_count: z.number().int().nonnegative(),
});

export const StoryboardDocumentSchema = z.object({
  storyboard_id: z.string().min(1),
  script_id: z.string().min(1),
  research_brief_id: z.string().optional(),
  created_at: z.string().min(1),
  global_spec: GlobalStoryboardSpecSchema,
  scenes: z.array(StoryboardSceneSchema).min(1),
  stats: StoryboardStatsSchema,
});

export interface StoryboardValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  data?: StoryboardDocument;
}

export function validateStoryboardDocument(data: unknown): StoryboardValidationResult {
  const parsed = StoryboardDocumentSchema.safeParse(data);
  if (!parsed.success) {
    return {
      valid: false,
      errors: parsed.error.issues.map(
        (issue) => `${issue.path.join(".")}: ${issue.message}`
      ),
      warnings: [],
    };
  }

  return {
    valid: true,
    data: parsed.data as StoryboardDocument,
    errors: [],
    warnings: [],
  };
}

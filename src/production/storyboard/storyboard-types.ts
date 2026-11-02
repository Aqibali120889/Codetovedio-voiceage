/**
 * Motion Graphics Storyboard Data Model.
 *
 * Defines the canonical specification for production-ready, frame-accurate,
 * narration-synchronized, artifact-rich storyboards for the Remotion video engine.
 */

import type { ScenePurpose, AspectRatio } from "../../video-engine/types";

// ============================================================
// 1. Global Production Specification
// ============================================================

export interface CanvasDimensions {
  width: number;
  height: number;
}

export interface StoryboardColorPalette {
  background: string;
  surface: string;
  primary: string;
  accent: string;
  accent_glow: string;
  text_primary: string;
  text_secondary: string;
  border: string;
  positive: string;
  warning: string;
  critical: string;
}

export interface StoryboardTypography {
  font_heading: string;
  font_body: string;
  font_code: string;
  font_headline_size: number;
  font_body_size: number;
  font_code_size: number;
}

export interface StoryboardBackgroundTreatment {
  type: "solid" | "gradient" | "grid" | "matrix" | "particles";
  primary_color: string;
  secondary_color?: string;
  accent_glow?: string;
  scanline: boolean;
}

export interface StoryboardMotionDesign {
  default_ease: string;
  entrance_duration_frames: number;
  hold_dynamics: "subtle_drift" | "pulse" | "floating" | "static";
  exit_duration_frames: number;
}

export interface StoryboardCaptionSpec {
  style_preset: "bottom_pill" | "center_kinetic" | "minimal_sub";
  font_size: number;
  bottom_margin_percent: number;
  max_lines: number;
  max_chars_per_line: number;
  safe_area_box: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}

export interface StoryboardAudioCue {
  time_seconds: number;
  frame: number;
  cue_type: "beat_drop" | "riser" | "hit" | "whoosh" | "data_beep";
  intensity: number;
  description: string;
}

export interface StoryboardAccessibility {
  min_contrast_ratio: number;
  text_safe_area: boolean;
  no_rapid_flashing: boolean;
}

export interface GlobalStoryboardSpec {
  video_title: string;
  topic: string;
  dimensions: CanvasDimensions;
  aspect_ratio: AspectRatio;
  fps: number;
  total_narration: string;
  target_duration_seconds: number;
  target_total_frames: number;
  visual_style: string;
  color_palette: StoryboardColorPalette;
  typography: StoryboardTypography;
  background_treatment: StoryboardBackgroundTreatment;
  motion_design: StoryboardMotionDesign;
  caption_spec: StoryboardCaptionSpec;
  default_transition: {
    type: "cut" | "fade" | "slide_left" | "wipe";
    duration_frames: number;
  };
  audio_cues: StoryboardAudioCue[];
  accessibility: StoryboardAccessibility;
}

// ============================================================
// 2. Artifact Specification
// ============================================================

export type StoryboardArtifactType =
  | "heading"
  | "kinetic_text"
  | "body_text"
  | "quote_block"
  | "stat_counter"
  | "dashboard_card"
  | "flow_node"
  | "connector_arrow"
  | "code_terminal_window"
  | "timeline_step"
  | "infographic_card"
  | "bar_chart"
  | "line_chart"
  | "comparison_column"
  | "label_callout"
  | "icon_badge"
  | "image_cutout"
  | "browser_window"
  | "svg_illustration"
  | "emphasis_ring"
  | "laser_scanline";

export interface NormalizedPosition {
  /** Normalized X coordinate between 0.0 (left) and 1.0 (right) */
  x: number;
  /** Normalized Y coordinate between 0.0 (top) and 1.0 (bottom) */
  y: number;
  /** Anchor origin for position calculation */
  anchor: "top_left" | "center" | "bottom_center" | "top_center";
}

export interface NormalizedSize {
  /** Normalized width as percentage of canvas (0.0 to 1.0) */
  width: number;
  /** Normalized height as percentage of canvas (0.0 to 1.0) */
  height: number;
}

export interface StoryboardAssetStrategy {
  strategy: "pixabay" | "svg" | "react" | "local" | "procedural";
  query?: string;
  media_type?: "photo" | "illustration" | "vector";
  fallback_query?: string;
  local_path?: string;
  generator_spec?: Record<string, unknown>;
}

export interface StoryboardArtifactStyle {
  fill_color?: string;
  stroke_color?: string;
  stroke_width?: number;
  border_radius?: number;
  opacity?: number;
  shadow?: string;
  font_family?: string;
  font_size?: number;
  font_weight?: number | string;
  text_align?: "left" | "center" | "right";
  letter_spacing?: number;
}

export interface StoryboardAnimationKeyframe {
  type:
    | "fade"
    | "slide_up"
    | "slide_down"
    | "slide_left"
    | "slide_right"
    | "scale_in"
    | "scale_out"
    | "pop_in"
    | "draw_path"
    | "stagger_words"
    | "none";
  start_frame: number;
  duration_frames: number;
  easing: string;
  distance?: number;
}

export interface StoryboardHoldAnimation {
  type: "subtle_drift" | "pulse_glow" | "scanline" | "none";
  speed?: number;
  intensity?: number;
}

export interface StoryboardArtifactFallback {
  on_error: "render_placeholder" | "skip" | "render_text_only";
  placeholder_text?: string;
}

export interface StoryboardArtifact {
  artifact_id: string;
  artifact_type: StoryboardArtifactType;
  purpose: string;
  visible_text?: string;
  visible_data?: Record<string, unknown>;
  source_evidence_id?: string;
  asset_strategy: StoryboardAssetStrategy;
  visual_style: StoryboardArtifactStyle;
  position: NormalizedPosition;
  size: NormalizedSize;
  layer: number;
  entry_animation: StoryboardAnimationKeyframe;
  hold_animation?: StoryboardHoldAnimation;
  exit_animation?: StoryboardAnimationKeyframe;
  start_frame: number;
  end_frame: number;
  duration_frames: number;
  dependencies: string[];
  accessibility: {
    is_essential: boolean;
    safe_area_compliant: boolean;
  };
  fallback_behavior: StoryboardArtifactFallback;
  renderer_component: string;
  component_props: Record<string, unknown>;
}

// ============================================================
// 3. Timed Visual Beat Sequence
// ============================================================

export interface StoryboardBeatUpdate {
  artifact_id: string;
  updated_state: Record<string, unknown>;
  transition_description: string;
}

export interface StoryboardBeat {
  beat_id: string;
  beat_index: number;
  start_seconds: number;
  end_seconds: number;
  start_frame: number;
  end_frame: number;
  narration_fragment: string;
  narrative_goal: string;
  artifacts_introduced: string[];
  artifacts_updated: StoryboardBeatUpdate[];
  artifacts_removed?: string[];
  motion_instructions: string;
  focal_point: {
    x: number;
    y: number;
    description: string;
  };
  caption_ref?: string;
  sound_cue?: {
    type: string;
    frame: number;
  };
}

// ============================================================
// 4. Detailed Scene Specification
// ============================================================

export interface StoryboardCaptionRef {
  caption_id: string;
  text: string;
  start_frame: number;
  end_frame: number;
}

export interface StoryboardScene {
  scene_id: string;
  scene_index: number;
  purpose: ScenePurpose;
  narrative_contribution: string;
  narration: string;
  source_evidence_ids: string[];
  start_seconds: number;
  end_seconds: number;
  duration_seconds: number;
  start_frame: number;
  end_frame: number;
  duration_frames: number;
  transition_in: {
    type: "cut" | "fade" | "slide_left" | "zoom_in";
    duration_frames: number;
  };
  transition_out: {
    type: "cut" | "fade" | "slide_left" | "zoom_in";
    duration_frames: number;
  };
  visual_hierarchy: {
    primary_focus: string;
    secondary_focus?: string;
    reading_order: string[];
  };
  background: {
    type: "solid" | "gradient" | "grid" | "matrix";
    color: string;
    accent_glow?: string;
  };
  layout_strategy:
    | "center_focus"
    | "split_horizontal"
    | "metric_hero"
    | "card_grid"
    | "terminal"
    | "full_canvas"
    | "multi_panel_flow";
  artifacts: StoryboardArtifact[];
  beats: StoryboardBeat[];
  caption_refs: StoryboardCaptionRef[];
  audio_cues?: StoryboardAudioCue[];
  asset_dependencies: Array<{
    asset_id: string;
    required: boolean;
    strategy: "pixabay" | "svg" | "react" | "local" | "procedural";
  }>;
  renderer_component: string;
  validation_constraints: {
    min_meaningful_beats: number;
    max_static_interval_seconds: number;
  };
}

// ============================================================
// 5. Complete Storyboard Document
// ============================================================

export interface StoryboardStats {
  total_scenes: number;
  total_artifacts: number;
  total_beats: number;
  average_beats_per_scene: number;
  average_artifacts_per_scene: number;
  max_unanimated_interval_seconds: number;
  verified_evidence_citations_count: number;
}

export interface StoryboardDocument {
  storyboard_id: string;
  script_id: string;
  research_brief_id?: string;
  created_at: string;
  global_spec: GlobalStoryboardSpec;
  scenes: StoryboardScene[];
  stats: StoryboardStats;
}

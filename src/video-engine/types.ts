/**
 * Scene Renderer Registry & Video Engine — Core TypeScript Definitions.
 *
 * Implements strict, discriminated types for Video Blueprints, Scenes,
 * Visual Elements, Animations, Transitions, and Capability Manifests.
 */

export type AspectRatio = "16:9" | "9:16" | "1:1";

export type AnimationType =
  | "fade"
  | "fade_up"
  | "fade_down"
  | "slide_left"
  | "slide_right"
  | "scale_in"
  | "stagger"
  | "count_up"
  | "draw_line"
  | "progress_fill"
  | "reveal"
  | "highlight";

export type TransitionType = "cut" | "fade" | "slide";

export type ScenePurpose =
  | "hook"
  | "problem"
  | "context"
  | "insight"
  | "architecture"
  | "comparison"
  | "demo"
  | "metric"
  | "recap"
  | "cta";

export type SceneType =
  | "kinetic_typography"
  | "stat_counter"
  | "bar_chart"
  | "line_chart"
  | "system_architecture"
  | "process_flow"
  | "code_terminal"
  | "comparison_grid"
  | "dashboard_mockup"
  | "quote_insight"
  | "cta"
  | "modular_scene"
  | "parallax_hero"
  | "timeline_reveal"
  | "infographic_grid"
  | "word_by_word"
  | "split_callout"
  | "document_reveal"
  | "editorial_montage";

export type ElementType =
  // Typography
  | "heading"
  | "body_text"
  | "kinetic_text"
  | "highlighted_text"
  | "quote_block"
  | "number_display"
  | "label"
  | "code_block"
  | "caption_text"
  // Primitives
  | "rectangle"
  | "circle"
  | "line_arrow"
  | "divider"
  | "progress_indicator"
  | "grid"
  | "badge"
  // Charts & Infographics
  | "bar_chart_elem"
  | "line_chart_elem"
  | "metric_counter_elem"
  | "comparison_panel_elem"
  // Diagrams
  | "flow_node_elem"
  | "connector_elem"
  | "architecture_tier_elem"
  // Interfaces
  | "terminal_window_elem"
  | "dashboard_card_elem"
  | "browser_frame_elem"
  // Backgrounds
  | "solid_bg"
  | "gradient_bg"
  | "grid_bg"
  | "particles_bg"
  | "glow_bg";

// ============================================================
// Animation Configuration
// ============================================================

export interface ElementAnimationConfig {
  enter?: AnimationType;
  start_seconds?: number;
  duration_seconds?: number;
  exit?: AnimationType;
  exit_seconds?: number;
  stagger_delay?: number;
  easing?: "cubic" | "quad" | "linear" | "spring";
}

// ============================================================
// Layout & Positioning
// ============================================================

export interface ElementPosition {
  x?: number; // Normalized (0-100%) or absolute pixel
  y?: number;
  anchor?: "center" | "top-left" | "top-right" | "bottom-center";
}

export interface ElementSize {
  width?: number | string;
  height?: number | string;
}

// ============================================================
// Visual Element Discriminated Union
// ============================================================

export interface BaseVisualElement {
  id: string;
  type: ElementType;
  position?: ElementPosition;
  size?: ElementSize;
  layer?: number;
  animation?: ElementAnimationConfig;
  opacity?: number;
  accent_color?: string;
}

export interface HeadingElement extends BaseVisualElement {
  type: "heading";
  text: string;
  level?: 1 | 2 | 3;
  color?: string;
}

export interface BodyTextElement extends BaseVisualElement {
  type: "body_text";
  text: string;
  color?: string;
}

export interface KineticTextElement extends BaseVisualElement {
  type: "kinetic_text";
  words: string[];
  highlight_index?: number;
}

export interface HighlightedTextElement extends BaseVisualElement {
  type: "highlighted_text";
  text: string;
  highlight: string;
  highlight_color?: string;
}

export interface QuoteBlockElement extends BaseVisualElement {
  type: "quote_block";
  quote: string;
  author?: string;
}

export interface NumberDisplayElement extends BaseVisualElement {
  type: "number_display";
  value: number;
  suffix?: string;
  prefix?: string;
  label?: string;
}

export interface LabelElement extends BaseVisualElement {
  type: "label";
  text: string;
  variant?: "pill" | "badge" | "outline";
}

export interface CodeBlockElement extends BaseVisualElement {
  type: "code_block";
  code: string;
  language?: string;
}

export interface CaptionTextElement extends BaseVisualElement {
  type: "caption_text";
  text: string;
}

export interface RectangleElement extends BaseVisualElement {
  type: "rectangle";
  border_radius?: number;
  fill?: string;
  stroke?: string;
  stroke_width?: number;
}

export interface CircleElement extends BaseVisualElement {
  type: "circle";
  radius?: number;
  fill?: string;
  stroke?: string;
}

export interface LineArrowElement extends BaseVisualElement {
  type: "line_arrow";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  stroke_width?: number;
  stroke?: string;
  arrow_end?: boolean;
}

export interface DividerElement extends BaseVisualElement {
  type: "divider";
  orientation?: "horizontal" | "vertical";
  color?: string;
}

export interface ProgressIndicatorElement extends BaseVisualElement {
  type: "progress_indicator";
  progress: number; // 0 to 100
  color?: string;
}

export interface GridElement extends BaseVisualElement {
  type: "grid";
  columns?: number;
  rows?: number;
  cell_size?: number;
  stroke?: string;
}

export interface BadgeElement extends BaseVisualElement {
  type: "badge";
  text: string;
  variant?: "success" | "warning" | "error" | "info" | "brand";
}

export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
  change?: string;
  status?: "good" | "bad" | "neutral";
}

export interface BarChartElement extends BaseVisualElement {
  type: "bar_chart_elem";
  title?: string;
  data: ChartDataPoint[];
  max_value?: number;
  unit?: string;
  is_illustrative?: boolean;
}

export interface LineChartElement extends BaseVisualElement {
  type: "line_chart_elem";
  title?: string;
  data: ChartDataPoint[];
  unit?: string;
  is_illustrative?: boolean;
}

export interface MetricCounterElement extends BaseVisualElement {
  type: "metric_counter_elem";
  label: string;
  start_value?: number;
  end_value: number;
  suffix?: string;
  prefix?: string;
  delta?: string;
  status?: "good" | "bad" | "neutral";
}

export interface ComparisonPanelElement extends BaseVisualElement {
  type: "comparison_panel_elem";
  left_title: string;
  left_items: string[];
  right_title: string;
  right_items: string[];
}

export interface FlowNodeElement extends BaseVisualElement {
  type: "flow_node_elem";
  node_id: string;
  label: string;
  detail?: string;
  status?: "done" | "active" | "queued" | "error";
}

export interface ConnectorElement extends BaseVisualElement {
  type: "connector_elem";
  from_id: string;
  to_id: string;
  label?: string;
  active?: boolean;
}

export interface ArchitectureTierElement extends BaseVisualElement {
  type: "architecture_tier_elem";
  tier_name: string;
  nodes: { label: string; detail?: string; status?: "done" | "active" | "queued" }[];
}

export interface TerminalWindowElement extends BaseVisualElement {
  type: "terminal_window_elem";
  title?: string;
  lines: string[];
  typing_speed_frames?: number;
}

export interface DashboardCardElement extends BaseVisualElement {
  type: "dashboard_card_elem";
  title: string;
  metrics: { label: string; value: string; change?: string }[];
}

export interface BrowserFrameElement extends BaseVisualElement {
  type: "browser_frame_elem";
  url?: string;
  title?: string;
}

export interface SolidBgElement extends BaseVisualElement {
  type: "solid_bg";
  color: string;
}

export interface GradientBgElement extends BaseVisualElement {
  type: "gradient_bg";
  colors: [string, string];
  angle?: number;
}

export interface GridBgElement extends BaseVisualElement {
  type: "grid_bg";
  grid_color?: string;
  spacing?: number;
}

export interface ParticlesBgElement extends BaseVisualElement {
  type: "particles_bg";
  count?: number;
  color?: string;
}

export interface GlowBgElement extends BaseVisualElement {
  type: "glow_bg";
  glow_color: string;
  radius?: number;
}

export type VisualElement =
  | HeadingElement
  | BodyTextElement
  | KineticTextElement
  | HighlightedTextElement
  | QuoteBlockElement
  | NumberDisplayElement
  | LabelElement
  | CodeBlockElement
  | CaptionTextElement
  | RectangleElement
  | CircleElement
  | LineArrowElement
  | DividerElement
  | ProgressIndicatorElement
  | GridElement
  | BadgeElement
  | BarChartElement
  | LineChartElement
  | MetricCounterElement
  | ComparisonPanelElement
  | FlowNodeElement
  | ConnectorElement
  | ArchitectureTierElement
  | TerminalWindowElement
  | DashboardCardElement
  | BrowserFrameElement
  | SolidBgElement
  | GradientBgElement
  | GridBgElement
  | ParticlesBgElement
  | GlowBgElement;

// ============================================================
// Scene Configuration
// ============================================================

export interface SceneBackgroundConfig {
  type: "solid" | "gradient" | "grid" | "matrix";
  color?: string;
  accent_glow?: string;
}

export interface SceneCompositionLayout {
  layout: "center_focus" | "split_horizontal" | "metric_hero" | "card_grid" | "terminal" | "full_canvas";
  safe_margin_percent?: number;
}

export interface SceneTransitionOut {
  type: TransitionType;
  duration_seconds?: number;
}

// ============================================================
// Visual Beats — timed sub-events within a scene
// ============================================================

export type BeatType =
  | "text_reveal"
  | "highlight"
  | "counter_start"
  | "image_in"
  | "arrow_draw"
  | "list_item"
  | "zoom_in"
  | "stat_pop"
  | "chart_grow"
  | "label_appear"
  | "callout"
  | "node_activate";

export interface VisualBeat {
  /** Unique ID within the scene */
  beat_id: string;
  /** When this beat fires, in seconds relative to the scene start */
  start_seconds: number;
  /** Duration of the beat animation in seconds */
  duration_seconds?: number;
  /** What kind of visual event this is */
  type: BeatType;
  /** Human-readable description for debugging / QA */
  description: string;
  /** Content payload — varies by beat type */
  text?: string;
  value?: number | string;
  label?: string;
  image_url?: string;
  accent_color?: string;
  node_index?: number;
}

// ============================================================
// Timeline step for process flows (ordered sequence)
// ============================================================

export interface ProcessStep {
  label: string;
  detail?: string;
  icon?: string;
  duration_hint?: number;
}

export interface SceneBlueprint {
  id: string;
  purpose: ScenePurpose;
  scene_type: SceneType;
  narration: string;
  audio_path?: string | null;
  visual_description?: string;
  on_screen_text?: string;
  duration_hint_seconds: number;
  background?: SceneBackgroundConfig;
  composition?: SceneCompositionLayout;
  accent_color?: string;
  elements?: VisualElement[];
  transition_out?: SceneTransitionOut;

  // Domain-specific payloads directly supported by built-in scene renderers
  nodes?: { label: string; detail?: string; status?: "done" | "active" | "queued" }[];
  data_points?: ChartDataPoint[];
  terminal_lines?: string[];
  comparison?: {
    left: { title: string; points: string[] };
    right: { title: string; points: string[] };
  };
  chart?: {
    type: "bar" | "line";
    title?: string;
    unit?: string;
    points: ChartDataPoint[];
    is_illustrative?: boolean;
  };

  // Narration-aware beat system — timed sub-events within a scene
  beats?: VisualBeat[];

  // Sequential process steps (for timeline_reveal and process_flow)
  steps?: ProcessStep[];

  // Hero image URL for parallax_hero scenes (Pixabay or local)
  image_url?: string;

  // Generation seed for deterministic reproducibility
  generation_seed?: number;

  // Split callout specific fields
  callout_text?: string;
  callout_label?: string;

  // Infographic grid items
  grid_items?: { icon?: string; label: string; value?: string; description?: string }[];

  // Supporting claims and citations for document/evidence inspection
  claims?: Array<{
    claim_id?: string;
    claim_type?: string;
    on_screen_citation?: string;
    spoken_text?: string;
    verification_status?: string;
  }>;
}

// ============================================================
// Video Blueprint
// ============================================================

export interface BrandTokens {
  primary_color: string;
  accent_color: string;
  font_token?: string;
  secondary_color?: string;
}

export interface SubtitleBlueprintConfig {
  enabled: boolean;
  source?: "measured_audio_timing" | "estimated_timing";
  style_token?: string;
}

export interface AudioBlueprintConfig {
  voice_name?: string;
  language?: string;
  speech_rate?: number;
  background_music?: boolean;
  background_music_volume?: number;
}

export interface RenderBlueprintConfig {
  output_format: "mp4" | "webm";
  codec?: "h264" | "h265";
}

export interface VideoBlueprint {
  title: string;
  topic?: string;
  audience?: string;
  platform?: string;
  aspect_ratio: AspectRatio;
  width: number;
  height: number;
  fps: number;
  target_duration_seconds: number;
  visual_style?: string;
  theme_preset?: "cyber_editorial" | "cinematic_tech" | "clean_minimal" | "data_journalism";
  brand: BrandTokens;
  scenes: SceneBlueprint[];
  subtitles?: SubtitleBlueprintConfig | Array<unknown>;
  subtitle_segments?: Array<unknown>;
  generation_seed?: number;
  audio?: AudioBlueprintConfig;
  render?: RenderBlueprintConfig;
  editing_plan?: any;
}

// ============================================================
// Timeline Engine Structures
// ============================================================

export interface TimelineScene extends SceneBlueprint {
  startFrame: number;
  endFrame: number;
  durationFrames: number;
  transitionOverlapFrames: number;
  measuredAudioDurationSeconds?: number;
}

export interface TimelineBlueprint extends Omit<VideoBlueprint, "scenes"> {
  totalFrames: number;
  totalDurationSeconds: number;
  scenes: TimelineScene[];
}

// ============================================================
// Capability Manifest
// ============================================================

export interface CapabilityManifest {
  version: string;
  supported_scene_types: {
    type: SceneType;
    name: string;
    description: string;
    required_fields: string[];
    optional_fields: string[];
    example: Partial<SceneBlueprint>;
  }[];
  supported_element_types: {
    type: ElementType;
    category: "typography" | "primitives" | "charts" | "diagrams" | "interfaces" | "backgrounds";
    description: string;
  }[];
  supported_animations: {
    name: AnimationType;
    description: string;
  }[];
  supported_transitions: {
    name: TransitionType;
    description: string;
  }[];
  theme_presets: string[];
  max_elements_per_scene: number;
  supported_aspect_ratios: AspectRatio[];
  constraints: string[];
}

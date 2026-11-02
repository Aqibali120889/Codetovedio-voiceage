/**
 * Core shared types for the AI Video Creation pipeline.
 * These types cross API and module boundaries — keep them strict.
 */

// ============================================================
// Script Schema
// ============================================================

export interface SceneDataPoint {
  label: string;
  value: string | number;
  change?: string;
  status?: "good" | "bad" | "neutral";
}

export interface SceneNode {
  label: string;
  detail?: string;
  status?: "active" | "queued" | "done";
}

export interface SceneComparison {
  left: { title: string; points: string[] };
  right: { title: string; points: string[] };
}

export interface SceneSchema {
  /** Stable scene identifier, e.g. "scene_001" */
  id: string;
  /** Functional role of this scene */
  purpose: string;
  /** Supported scene motion-graphics type */
  scene_type?:
    | "kinetic_typography"
    | "stat_counter"
    | "system_architecture"
    | "code_terminal"
    | "comparison_grid"
    | "process_flow"
    | "data_visualization"
    | "quote_insight"
    | "minimalist_headline"
    | "cta"
    | string;
  /** The narration text for this scene — will be synthesised to speech */
  narration: string;
  /** Description of the visual content for this scene */
  visual_description: string;
  /** Short on-screen text/headline */
  on_screen_text: string;
  /** Estimated scene duration in seconds — overridden by actual audio duration */
  duration_hint_seconds: number;
  /** Composition layout hint */
  layout?: "center_focus" | "split_horizontal" | "terminal" | "card_grid" | "metric_hero" | string;
  /** High-level visual concept description */
  visual_concept?: string;
  /** Data points for stat counters and charts */
  data_points?: SceneDataPoint[];
  /** Diagram nodes for architecture / flow diagrams */
  nodes?: SceneNode[];
  /** Code or CLI lines for terminal mockups */
  terminal_lines?: string[];
  /** Side-by-side comparison data */
  comparison?: SceneComparison;
  /** Optional scene accent color override */
  accent_color?: string;
  /** Raw elements list if supplied */
  elements?: unknown[];
}

export interface ScriptSchema {
  title: string;
  topic: string;
  language: string;
  target_duration_seconds: number;
  estimated_word_count: number;
  scenes: SceneSchema[];
  /** Full narration in speaking order — must equal concatenation of scene narrations */
  full_narration: string;
  call_to_action: string;
  /** ISO 8601 timestamp of when this script was generated */
  generated_at?: string;
  /** "topic" = AI-generated, "user" = supplied by user */
  source?: "topic" | "user";
}

// ============================================================
// Topic Request
// ============================================================

export interface TopicRequest {
  topic: string;
  audience?: string;
  /** e.g. "YouTube Shorts", "LinkedIn", "Instagram Reels", "YouTube" */
  platform?: string;
  target_duration_seconds?: number;
  /** e.g. "educational", "bold", "conversational", "urgent" */
  tone?: string;
  language?: string;
  call_to_action?: string;
  brand_context?: string;
}

export interface TopicRequestDefaults {
  audience: string;
  platform: string;
  target_duration_seconds: number;
  tone: string;
  language: string;
}

// ============================================================
// Audio / TTS
// ============================================================

export interface AudioMetadata {
  path: string;
  durationSeconds: number;
  format: string;
  sampleRate: number;
  channels: number;
  sizeBytes: number;
  model: string;
  generatedAt: string;
}

export interface TtsResult {
  sceneId: string;
  audio: AudioMetadata;
  status: "success" | "error";
  error?: string;
}

// ============================================================
// Subtitles
// ============================================================

export interface SubtitleSegment {
  index: number;
  /** Seconds from video start */
  startSeconds: number;
  endSeconds: number;
  /** Remotion frame numbers */
  startFrame: number;
  endFrame: number;
  text: string;
  sceneId: string;
}

export interface SubtitleResult {
  segments: SubtitleSegment[];
  totalDurationSeconds: number;
  fps: number;
  srtPath: string;
  vttPath: string;
}

// ============================================================
// Remotion Manifest
// ============================================================

export interface SceneManifestEntry {
  sceneId: string;
  narration: string;
  visual_description: string;
  on_screen_text: string;
  audioPath: string | null;
  startFrame: number;
  endFrame: number;
  durationFrames: number;
  purpose?: string;
  scene_type?: string;
  layout?: string;
  visual_concept?: string;
  data_points?: SceneDataPoint[];
  nodes?: SceneNode[];
  terminal_lines?: string[];
  comparison?: SceneComparison;
  accent_color?: string;
}

export interface RenderManifest {
  projectId: string;
  compositionId: string;
  fps: number;
  width: number;
  height: number;
  totalFrames: number;
  totalDurationSeconds: number;
  scenes: SceneManifestEntry[];
  subtitles: SubtitleSegment[];
  scriptPath: string;
  generatedAt: string;
}

// ============================================================
// Pipeline Result
// ============================================================

export type PipelineStage =
  | "validate_request"
  | "generate_script"
  | "validate_script"
  | "generate_narration"
  | "measure_audio"
  | "generate_subtitles"
  | "create_manifest"
  | "render_video";

export interface PipelineError {
  stage: PipelineStage;
  message: string;
  recoverable: boolean;
}

export interface PipelineResult {
  projectId: string;
  status: "success" | "partial" | "error";
  completedStages: PipelineStage[];
  error?: PipelineError;
  outputDir: string;
  scriptPath?: string;
  manifestPath?: string;
  renderPath?: string;
  durationSeconds?: number;
}

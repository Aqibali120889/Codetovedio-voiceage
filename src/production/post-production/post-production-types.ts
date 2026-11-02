/**
 * Post-Production Director & Editing Plan Types.
 *
 * Defines the frame-accurate editing event model, motion presets,
 * transition presets, sound design cues, and pacing metrics.
 */

export type MotionPresetType =
  | "headlineImpact"
  | "smoothReveal"
  | "staggeredEntrance"
  | "diagramBuild"
  | "nodeHighlight"
  | "cameraPushIn"
  | "cameraPullOut"
  | "focusPan"
  | "captionEmphasis"
  | "evidenceReveal"
  | "chartBuild"
  | "imageParallax"
  | "transitionWhoosh"
  | "closingResolve";

export type TransitionPresetType =
  | "cut"
  | "directional_wipe"
  | "zoom_punch"
  | "smooth_dissolve"
  | "blur_slide"
  | "mask_reveal";

export type SoundEffectId =
  | "whoosh_soft"
  | "sweep_transition"
  | "impact_subtle"
  | "hit_cinematic"
  | "ui_click"
  | "digital_confirm"
  | "riser_short"
  | "tech_ambient"
  | "reverse_swell"
  | "accent_clean";

export type EditingEventType =
  | "camera_move"
  | "artifact_focus"
  | "motion_graphic"
  | "transition"
  | "sound_effect"
  | "caption_emphasis"
  | "visual_insert";

export interface EditingEvent {
  eventId: string;
  sceneId: string;
  narrationSegmentId?: string;
  startFrame: number;
  durationFrames: number;
  eventType: EditingEventType;
  motionPreset?: MotionPresetType;
  targetArtifactId?: string;
  transitionPreset?: TransitionPresetType;
  soundEffectId?: SoundEffectId;
  intensity: number; // 0.1 - 1.0
  priority: number; // 1 (highest) - 5 (lowest)
  reason: string;
  validationStatus: "validated" | "repaired";
}

export interface SoundEffectCue {
  soundEffectId: SoundEffectId;
  timestamp_seconds: number;
  frame: number;
  volume: number; // 0.0 - 1.0
  reason: string;
  sceneId: string;
}

export interface PacingMetrics {
  average_beat_interval_seconds: number;
  total_visual_changes: number;
  sound_events_count: number;
  camera_moves_count: number;
  motion_graphics_count: number;
}

export interface PostProductionPlan {
  planId: string;
  jobId?: string;
  projectId?: string;
  totalFrames: number;
  fps: number;
  events: EditingEvent[];
  sound_cues: SoundEffectCue[];
  pacing: PacingMetrics;
  validation_status?: "valid" | "repaired";
  created_at: string;
}

/**
 * Milestone 3: End-to-End AI Video Production Pipeline Types.
 *
 * Defines the canonical production data model, artifact lineage,
 * job state machine, claim-level evidence linkages, and QA metrics.
 */

import type { VideoBlueprint } from "../video-engine/types";
import type { StoryboardDocument } from "./storyboard/storyboard-types";
import type { SoundEffectCue, PostProductionPlan } from "./post-production/post-production-types";

// ============================================================
// 1. Production Job State Machine
// ============================================================

export type ProductionJobStage =
  | "queued"
  | "loading_research"
  | "generating_script"
  | "validating_script"
  | "validating_editorial"
  | "planning_storyboard"
  | "validating_storyboard"
  | "planning_scenes"
  | "validating_scene_plan"
  | "generating_narration"
  | "measuring_audio"
  | "generating_captions"
  | "preparing_visual_assets"
  | "directing_post_production"
  | "assembling_composition"
  | "rendering_video"
  | "validating_render"
  | "completed"
  | "failed"
  | "cancelled"
  | "needs_review"
  | "partial";

export type ProductionJobStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "needs_review"
  | "cancelled"
  | "partial";

export interface ProductionJobCheckpoint {
  stage: ProductionJobStage;
  completed_at: string;
  output_artifact_path?: string;
  data?: Record<string, unknown>;
}

export interface ProductionArtifactLineage {
  research_brief_id?: string;
  script_id?: string;
  storyboard_id?: string;
  scene_plan_id?: string;
  narration_id?: string;
  render_id?: string;
}

export interface ProductionJobConfig {
  topic?: string;
  audience?: string;
  brief_id?: string;
  brand_profile_id?: string;
  aspect_ratio?: "16:9" | "9:16" | "1:1";
  theme_preset?: string;
  background_music?: boolean;
  target_duration_seconds?: number;
  skip_render?: boolean;
  force_deterministic?: boolean;
  force_mock_audio?: boolean;
  resume?: boolean;
  resume_project_id?: string;
}

export interface ProductionJobArtifacts {
  brief_path?: string;
  script_path?: string;
  editorial_report_path?: string;
  storyboard_path?: string;
  blueprint_path?: string;
  narration_dir?: string;
  narration_audio_path?: string;
  srt_path?: string;
  vtt_path?: string;
  editing_plan_path?: string;
  render_path?: string;
  quality_report_path?: string;
}

export interface ProductionJob {
  job_id: string;
  project_id: string;
  created_at: string;
  updated_at: string;
  status: ProductionJobStatus;
  current_stage: ProductionJobStage;
  completed_stages: ProductionJobStage[];
  lineage: ProductionArtifactLineage;
  checkpoints: Record<string, ProductionJobCheckpoint>;
  config: ProductionJobConfig;
  artifacts: ProductionJobArtifacts;
  error?: {
    stage: ProductionJobStage;
    message: string;
    timestamp: string;
    recoverable: boolean;
  };
  warnings: string[];
}

// ============================================================
// 2. Evidence-Grounded Script & Claim Verification
// ============================================================

export type ScriptClaimType =
  | "verified_fact"
  | "statistic"
  | "reported_statement"
  | "interpretation"
  | "forecast"
  | "opinion"
  | "creative_framing";

export type ClaimVerificationStatus =
  | "verified"
  | "partially_verified"
  | "unverified"
  | "flagged";

export interface ScriptClaim {
  claim_id: string;
  spoken_text: string;
  claim_type: ScriptClaimType;
  supporting_evidence_ids: string[];
  verification_status: ClaimVerificationStatus;
  required_qualification?: string;
  on_screen_citation?: string;
  notes?: string;
}

export type NarrativeStrategy =
  | "mystery"
  | "technical_teardown"
  | "misconception_correction"
  | "investigation"
  | "before_after_comparison"
  | "mechanism_explanation"
  | "practical_demonstration"
  | "evidence_led_analysis";

export interface ScriptScene {
  scene_id: string;
  purpose: string;
  narration: string;
  visual_description: string;
  on_screen_text: string;
  claims: ScriptClaim[];
  evidence_ids?: string[];
  suggested_scene_type?: string;
  estimated_duration_seconds?: number;
}

export interface ScriptDocument {
  script_id: string;
  title: string;
  research_brief_id?: string;
  topic: string;
  target_audience: string;
  audience_understanding_level?: "beginner" | "practitioner" | "advanced_architect";
  central_thesis?: string;
  narrative_strategy?: NarrativeStrategy;
  narrative_strategy_rationale?: string;
  hook?: string;
  ending_takeaway?: string;
  technical_terms?: Array<{ term: string; explanation: string }>;
  uncertainties_and_limitations?: string[];
  estimated_spoken_duration_seconds?: number;
  target_duration_seconds: number;
  scenes: ScriptScene[];
  claims_summary: {
    total: number;
    verified: number;
    unverified: number;
    flagged: number;
  };
  created_at: string;
  updated_at?: string;
  storyboard?: StoryboardDocument;
}

// ============================================================
// 3. Branding & Visual System
// ============================================================

export interface BrandProfile {
  id: string;
  name: string;
  logo_url?: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text_primary: string;
    text_secondary: string;
  };
  typography: {
    font_heading: string;
    font_body: string;
    font_code: string;
  };
  theme_preset: string; // matches THEME_PRESETS
  watermark_text?: string;
  intro_title?: string;
  outro_cta: string;
  safe_area_padding: number;
  aspect_ratio: "16:9" | "9:16" | "1:1";
}

// ============================================================
// 4. Audio Mixing & Subtitles
// ============================================================

export interface AudioMixPlan {
  narration_audio_path: string;
  background_music_path?: string;
  music_volume: number; // 0.0 - 1.0
  ducking_enabled: boolean;
  ducking_attenuation_db: number;
  fade_in_seconds: number;
  fade_out_seconds: number;
  voice_only: boolean;
  sfx_cues?: SoundEffectCue[];
}

export interface SubtitleSegment {
  index: number;
  start_seconds: number;
  end_seconds: number;
  start_frame: number;
  end_frame: number;
  text: string;
  scene_id: string;
}

// ============================================================
// 5. Visual Asset Management
// ============================================================

export interface AssetItem {
  asset_id: string;
  type: "image" | "logo" | "icon" | "audio" | "font";
  source: "local" | "user_upload" | "retrieved" | "generated";
  path: string;
  mime_type?: string;
  attribution?: string;
  license?: string;
}

export interface AssetManifest {
  manifest_id: string;
  assets: AssetItem[];
}

// ============================================================
// 6. Automated Quality Assurance (QA)
// ============================================================

export interface QualityCheckResult {
  name: string;
  category: "file" | "stream" | "audio" | "scene" | "visual" | "editorial" | "claims";
  passed: boolean;
  severity: "critical" | "warning" | "info";
  details: string;
}

export interface QualityReport {
  report_id: string;
  job_id: string;
  project_id: string;
  rendered_at: string;
  status: "passed" | "passed_with_warnings" | "failed";
  file_metrics: {
    size_bytes: number;
    duration_seconds: number;
    container: string;
    video_codec: string;
    audio_codec: string;
    width: number;
    height: number;
    fps: number;
  };
  audio_metrics: {
    sample_rate: number;
    channels: number;
    mean_volume_db: number;
    audible: boolean;
  };
  scene_metrics: {
    total_scenes: number;
    duration_drift_seconds: number;
  };
  checks: QualityCheckResult[];
  output_path: string;
}

// ============================================================
// 7. Production Request & Options
// ============================================================

export type ProductionInput =
  | { mode: "brief_id"; briefId: string; options?: Partial<ProductionJobConfig> }
  | { mode: "topic"; topic: string; audience?: string; options?: Partial<ProductionJobConfig> }
  | { mode: "script"; script: ScriptDocument; options?: Partial<ProductionJobConfig> };

export interface ProductionExecutionResult {
  job: ProductionJob;
  success: boolean;
  storyboard?: StoryboardDocument;
  blueprint?: VideoBlueprint;
  editingPlan?: PostProductionPlan;
  qualityReport?: QualityReport;
}

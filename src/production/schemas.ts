/**
 * Milestone 3: Production Zod Schemas.
 * Enforces runtime validation on all model-generated artifacts,
 * job manifests, brand profiles, and quality reports.
 */

import { z } from "zod";

export const ScriptClaimTypeSchema = z.enum([
  "verified_fact",
  "statistic",
  "reported_statement",
  "interpretation",
  "forecast",
  "opinion",
  "creative_framing",
]);

export const ClaimVerificationStatusSchema = z.enum([
  "verified",
  "partially_verified",
  "unverified",
  "flagged",
]);

export const ScriptClaimSchema = z.object({
  claim_id: z.string().min(1),
  spoken_text: z.string().min(1),
  claim_type: ScriptClaimTypeSchema,
  supporting_evidence_ids: z.array(z.string()),
  verification_status: ClaimVerificationStatusSchema,
  required_qualification: z.string().optional(),
  on_screen_citation: z.string().optional(),
  notes: z.string().optional(),
});

export const ScriptSceneSchema = z.object({
  scene_id: z.string().min(1),
  purpose: z.string().min(1),
  narration: z.string().min(1),
  visual_description: z.string(),
  on_screen_text: z.string(),
  claims: z.array(ScriptClaimSchema).default([]),
  suggested_scene_type: z.string().optional(),
});

export const ScriptDocumentSchema = z.object({
  script_id: z.string().min(1),
  title: z.string().min(1),
  research_brief_id: z.string().optional(),
  topic: z.string().min(1),
  target_audience: z.string().min(1),
  target_duration_seconds: z.number().positive(),
  scenes: z.array(ScriptSceneSchema).min(1),
  claims_summary: z.object({
    total: z.number().int().nonnegative(),
    verified: z.number().int().nonnegative(),
    unverified: z.number().int().nonnegative(),
    flagged: z.number().int().nonnegative(),
  }),
  created_at: z.string(),
  updated_at: z.string().optional(),
});

export const BrandProfileSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  logo_url: z.string().optional(),
  colors: z.object({
    primary: z.string(),
    secondary: z.string(),
    accent: z.string(),
    background: z.string(),
    text_primary: z.string(),
    text_secondary: z.string(),
  }),
  typography: z.object({
    font_heading: z.string(),
    font_body: z.string(),
    font_code: z.string(),
  }),
  theme_preset: z.string(),
  watermark_text: z.string().optional(),
  intro_title: z.string().optional(),
  outro_cta: z.string(),
  safe_area_padding: z.number().nonnegative(),
  aspect_ratio: z.enum(["16:9", "9:16", "1:1"]),
});

export const AudioMixPlanSchema = z.object({
  narration_audio_path: z.string().min(1),
  background_music_path: z.string().optional(),
  music_volume: z.number().min(0).max(1),
  ducking_enabled: z.boolean(),
  ducking_attenuation_db: z.number(),
  fade_in_seconds: z.number().nonnegative(),
  fade_out_seconds: z.number().nonnegative(),
  voice_only: z.boolean(),
});

export const QualityCheckResultSchema = z.object({
  name: z.string(),
  category: z.enum(["file", "stream", "audio", "scene", "visual", "editorial", "claims"]),
  passed: z.boolean(),
  severity: z.enum(["critical", "warning", "info"]),
  details: z.string(),
});

export const QualityReportSchema = z.object({
  report_id: z.string().min(1),
  job_id: z.string().min(1),
  project_id: z.string().min(1),
  rendered_at: z.string(),
  status: z.enum(["passed", "passed_with_warnings", "failed"]),
  file_metrics: z.object({
    size_bytes: z.number().nonnegative(),
    duration_seconds: z.number().nonnegative(),
    container: z.string(),
    video_codec: z.string(),
    audio_codec: z.string(),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    fps: z.number().positive(),
  }),
  audio_metrics: z.object({
    sample_rate: z.number().positive(),
    channels: z.number().int().positive(),
    mean_volume_db: z.number(),
    audible: z.boolean(),
  }),
  scene_metrics: z.object({
    total_scenes: z.number().int().positive(),
    duration_drift_seconds: z.number(),
  }),
  checks: z.array(QualityCheckResultSchema),
  output_path: z.string(),
});

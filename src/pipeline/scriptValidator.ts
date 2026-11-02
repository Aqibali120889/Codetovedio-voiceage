/**
 * Script validation using zod.
 * Validates both AI-generated scripts and user-supplied scripts.
 */

import { z } from "zod";
import type { ScriptSchema, SceneSchema } from "./types";

// ============================================================
// Zod Schemas
// ============================================================

export const SceneZodSchema = z.object({
  id: z
    .string()
    .min(1)
    .regex(/^scene_\d{3}$/, "Scene ID must match scene_NNN format"),
  purpose: z.string().min(1),
  scene_type: z.string().optional(),
  narration: z.string().min(1, "Scene narration cannot be empty"),
  visual_description: z
    .string()
    .min(1, "Scene visual_description cannot be empty"),
  on_screen_text: z.string().min(1, "Scene on_screen_text cannot be empty"),
  duration_hint_seconds: z.number().positive().max(120),
  layout: z.string().optional(),
  visual_concept: z.string().optional(),
  data_points: z.array(z.any()).optional(),
  nodes: z.array(z.any()).optional(),
  terminal_lines: z.array(z.string()).optional(),
  comparison: z.any().optional(),
  accent_color: z.string().optional(),
  elements: z.array(z.any()).optional(),
});

export const ScriptZodSchema = z.object({
  title: z.string().min(1),
  topic: z.string().min(1),
  language: z.string().min(1),
  target_duration_seconds: z.number().positive().max(600),
  estimated_word_count: z.number().positive(),
  scenes: z
    .array(SceneZodSchema)
    .min(1, "Script must have at least one scene")
    .max(30, "Script must not exceed 30 scenes"),
  full_narration: z.string().min(1, "full_narration cannot be empty"),
  call_to_action: z.string(),
  generated_at: z.string().optional(),
  source: z.enum(["topic", "user"]).optional(),
});

// ============================================================
// Validation helpers
// ============================================================

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateScript(raw: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const parseResult = ScriptZodSchema.safeParse(raw);
  if (!parseResult.success) {
    for (const issue of parseResult.error.issues) {
      errors.push(`${issue.path.join(".")}: ${issue.message}`);
    }
    return { valid: false, errors, warnings };
  }

  const script = parseResult.data as ScriptSchema;

  // Cross-field validations
  const sceneIds = script.scenes.map((s) => s.id);
  const uniqueIds = new Set(sceneIds);
  if (uniqueIds.size !== sceneIds.length) {
    errors.push("Scene IDs must be unique.");
  }

  const totalHint = script.scenes.reduce(
    (acc, s) => acc + s.duration_hint_seconds,
    0
  );
  if (Math.abs(totalHint - script.target_duration_seconds) > 30) {
    warnings.push(
      `Sum of duration hints (${totalHint}s) differs from target (${script.target_duration_seconds}s) by more than 30s.`
    );
  }

  const combinedNarration = script.scenes
    .map((s) => s.narration.trim())
    .join(" ");
  if (
    script.full_narration.length > 0 &&
    Math.abs(combinedNarration.length - script.full_narration.length) >
      combinedNarration.length * 0.2
  ) {
    warnings.push(
      "full_narration length differs significantly from combined scene narrations — review for consistency."
    );
  }

  const maxNarration = script.scenes.reduce(
    (m, s) => Math.max(m, s.narration.length),
    0
  );
  if (maxNarration > 5000) {
    errors.push(
      "One or more scenes have narration exceeding 5000 characters (TTS limit)."
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/** Parse and validate a JSON string from the model or user */
export function parseAndValidateScript(
  jsonString: string
): { script: ScriptSchema; validation: ValidationResult } | { script: null; validation: ValidationResult } {
  let raw: unknown;
  try {
    raw = JSON.parse(jsonString);
  } catch (e) {
    return {
      script: null,
      validation: {
        valid: false,
        errors: [`JSON parse error: ${(e as Error).message}`],
        warnings: [],
      },
    };
  }

  const validation = validateScript(raw);
  if (!validation.valid) {
    return { script: null, validation };
  }

  return { script: raw as ScriptSchema, validation };
}

/** Generate scene IDs deterministically */
export function generateSceneId(index: number): string {
  return `scene_${String(index + 1).padStart(3, "0")}`;
}

/** Normalise user-supplied scripts by adding missing optional fields */
export function normaliseScript(
  partial: Partial<ScriptSchema> & {
    scenes: Partial<SceneSchema>[];
    full_narration: string;
    title: string;
    topic: string;
  }
): ScriptSchema {
  return {
    title: partial.title,
    topic: partial.topic,
    language: partial.language ?? "English",
    target_duration_seconds:
      partial.target_duration_seconds ??
      partial.scenes.reduce((acc, s) => acc + (s.duration_hint_seconds ?? 5), 0),
    estimated_word_count:
      partial.estimated_word_count ??
      Math.round(partial.full_narration.split(/\s+/).length),
    scenes: partial.scenes.map((s, i) => ({
      id: s.id ?? generateSceneId(i),
      purpose: s.purpose ?? "other",
      narration: s.narration ?? "",
      visual_description: s.visual_description ?? "",
      on_screen_text: s.on_screen_text ?? "",
      duration_hint_seconds: s.duration_hint_seconds ?? 5,
    })),
    full_narration: partial.full_narration,
    call_to_action: partial.call_to_action ?? "",
    generated_at: partial.generated_at ?? new Date().toISOString(),
    source: partial.source ?? "user",
  };
}

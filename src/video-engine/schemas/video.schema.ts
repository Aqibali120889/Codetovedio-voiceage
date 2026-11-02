/**
 * Video Blueprint Zod Schema.
 */

import { z } from "zod";
import { AspectRatioSchema, HexColorSchema } from "./common.schema";
import { SceneBlueprintSchema } from "./scene.schema";

export const BrandTokensSchema = z.object({
  primary_color: HexColorSchema,
  accent_color: HexColorSchema,
  font_token: z.string().optional(),
  secondary_color: HexColorSchema.optional(),
});

export const SubtitleBlueprintConfigSchema = z.object({
  enabled: z.boolean(),
  source: z.enum(["measured_audio_timing", "estimated_timing"]).optional(),
  style_token: z.string().optional(),
});

export const AudioBlueprintConfigSchema = z.object({
  voice_name: z.string().optional(),
  language: z.string().optional(),
  speech_rate: z.number().positive().optional(),
  background_music: z.boolean().optional(),
  background_music_volume: z.number().min(0).max(1).optional(),
});

export const RenderBlueprintConfigSchema = z.object({
  output_format: z.enum(["mp4", "webm"]),
  codec: z.enum(["h264", "h265"]).optional(),
});

export const VideoBlueprintSchema = z.object({
  title: z.string().min(1),
  topic: z.string().optional(),
  audience: z.string().optional(),
  platform: z.string().optional(),
  aspect_ratio: AspectRatioSchema,
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  fps: z.number().int().positive(),
  target_duration_seconds: z.number().positive(),
  visual_style: z.string().optional(),
  theme_preset: z
    .enum(["cyber_editorial", "cinematic_tech", "clean_minimal", "data_journalism"])
    .optional(),
  brand: BrandTokensSchema,
  scenes: z.array(SceneBlueprintSchema).min(1),
  subtitles: SubtitleBlueprintConfigSchema.optional(),
  audio: AudioBlueprintConfigSchema.optional(),
  render: RenderBlueprintConfigSchema.optional(),
});

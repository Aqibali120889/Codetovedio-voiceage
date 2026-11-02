/**
 * Gemini API provider wrapper.
 * Handles text generation and TTS — keeps credentials server-side.
 * All model calls go through here; retry logic is centralised here.
 */

import { GoogleGenAI } from "@google/genai";
import type { PipelineConfig } from "./config";
import type { ScriptSchema, AudioMetadata } from "./types";
import {
  parseAndValidateScript,
} from "./scriptValidator";
import {
  buildScriptGenerationPrompt,
  buildUserScriptStructuringPrompt,
  buildPromptContext,
  type PromptContext,
} from "./prompts";
import type { TopicRequest } from "./types";
import fs from "fs";
import path from "path";

// ============================================================
// Internal helpers
// ============================================================

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry<T>(
  fn: () => Promise<T>,
  config: Pick<PipelineConfig, "maxRetries" | "retryBaseDelayMs">,
  label: string
): Promise<T> {
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err as Error;
      const msg = lastError.message.toLowerCase();
      const isTransient =
        msg.includes("429") ||
        msg.includes("rate") ||
        msg.includes("quota") ||
        msg.includes("timeout") ||
        msg.includes("503") ||
        msg.includes("network");

      if (!isTransient || attempt === config.maxRetries) {
        throw lastError;
      }

      const delay = config.retryBaseDelayMs * Math.pow(2, attempt - 1);
      console.warn(
        `[geminiProvider] ${label} attempt ${attempt} failed (${lastError.message}). Retrying in ${delay}ms...`
      );
      await sleep(delay);
    }
  }
  throw lastError!;
}

// ============================================================
// Script Generation
// ============================================================

export async function generateScriptFromTopic(
  req: TopicRequest,
  config: PipelineConfig
): Promise<{ script: ScriptSchema; rawJson: string }> {
  const ctx: PromptContext = buildPromptContext(req);
  const { systemInstruction, userPrompt } = buildScriptGenerationPrompt(ctx);

  const client = new GoogleGenAI({ apiKey: config.geminiApiKey });

  console.log(
    `[geminiProvider] Generating script via ${config.textModel} for topic: "${req.topic}"`
  );

  let rawJson = "";

  await withRetry(
    async () => {
      const response = await client.models.generateContent({
        model: config.textModel,
        contents: userPrompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
        },
      });

      rawJson = response.text ?? "";
      if (!rawJson.trim()) {
        throw new Error("Model returned empty output.");
      }
    },
    config,
    "generateScript"
  );

  // Bounded retry on validation failure (max 2 attempts total)
  let lastValidationErrors: string[] = [];
  for (let attempt = 1; attempt <= 2; attempt++) {
    const { script, validation } = parseAndValidateScript(rawJson);
    if (validation.valid && script) {
      if (validation.warnings.length > 0) {
        console.warn(
          `[geminiProvider] Script warnings: ${validation.warnings.join("; ")}`
        );
      }
      return {
        script: {
          ...script,
          generated_at: new Date().toISOString(),
          source: "topic",
        },
        rawJson,
      };
    }

    lastValidationErrors = validation.errors;
    if (attempt < 2) {
      console.warn(
        `[geminiProvider] Validation attempt ${attempt} failed: ${validation.errors.join("; ")}. Retrying...`
      );

      // Second attempt: ask model to fix
      const fixPrompt = `The JSON you produced has validation errors. Fix them and return only the corrected JSON.
Errors: ${validation.errors.join("; ")}

Your previous JSON:
${rawJson}`;

      await withRetry(
        async () => {
          const client2 = new GoogleGenAI({ apiKey: config.geminiApiKey });
          const fix = await client2.models.generateContent({
            model: config.textModel,
            contents: fixPrompt,
            config: {
              responseMimeType: "application/json",
            },
          });
          rawJson = fix.text ?? "";
        },
        config,
        "fixScript"
      );
    }
  }

  throw new Error(
    `Script validation failed after 2 attempts. Errors: ${lastValidationErrors.join("; ")}`
  );
}

/** Structure a user-supplied plain-text script into the ScriptSchema */
export async function structureUserScript(
  rawScript: string,
  context: Partial<PromptContext>,
  config: PipelineConfig
): Promise<{ script: ScriptSchema; rawJson: string }> {
  const { systemInstruction, userPrompt } = buildUserScriptStructuringPrompt(
    rawScript,
    context
  );

  const client = new GoogleGenAI({ apiKey: config.geminiApiKey });

  console.log(`[geminiProvider] Structuring user script via ${config.textModel}`);

  let rawJson = "";
  await withRetry(
    async () => {
      const response = await client.models.generateContent({
        model: config.textModel,
        contents: userPrompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
        },
      });
      rawJson = response.text ?? "";
      if (!rawJson.trim()) throw new Error("Empty model output");
    },
    config,
    "structureUserScript"
  );

  const { script, validation } = parseAndValidateScript(rawJson);
  if (!validation.valid || !script) {
    throw new Error(
      `User script structuring failed validation: ${validation.errors.join("; ")}`
    );
  }

  return {
    script: { ...script, source: "user", generated_at: new Date().toISOString() },
    rawJson,
  };
}

// ============================================================
// TTS — Text-to-Speech
// ============================================================

export interface TtsOptions {
  voice?: string;
  style?: string;
}

/**
 * Generate speech for a single narration chunk.
 * Returns base64-encoded WAV audio bytes.
 */
export async function generateSpeech(
  text: string,
  outputPath: string,
  config: PipelineConfig,
  options: TtsOptions = {}
): Promise<AudioMetadata> {
  if (!text.trim()) {
    throw new Error("Cannot generate speech for empty text.");
  }

  if (text.length > config.ttsMaxCharsPerRequest) {
    throw new Error(
      `Narration text exceeds TTS limit of ${config.ttsMaxCharsPerRequest} chars (got ${text.length}).`
    );
  }

  const voice = options.voice ?? config.ttsVoice;
  const style = options.style ?? config.ttsStyle;

  const client = new GoogleGenAI({ apiKey: config.geminiApiKey });

  console.log(
    `[geminiProvider] Generating TTS via ${config.ttsModel}, voice=${voice}, style=${style}, text length=${text.length}`
  );

  let audioData = "";

  await withRetry(
    async () => {
      const response = await client.models.generateContent({
        model: config.ttsModel,
        contents: text,
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: voice,
              },
            },
          },
        },
      });

      const part = response.candidates?.[0]?.content?.parts?.[0];
      const b64Data = (part as any)?.inlineData?.data;
      if (!b64Data) {
        throw new Error("TTS model returned no audio data.");
      }

      audioData = b64Data;
    },
    config,
    "generateSpeech"
  );

  // Write WAV to disk
  const audioBuffer = Buffer.from(audioData, "base64");
  await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.promises.writeFile(outputPath, audioBuffer);

  // Measure duration using ffprobe
  const metadata = await getAudioMetadata(outputPath, config.ttsModel);
  return metadata;
}

// ============================================================
// Audio Metadata via ffprobe
// ============================================================

export async function getAudioMetadata(
  audioPath: string,
  modelId = "unknown"
): Promise<AudioMetadata> {
  await validateAudioFile(audioPath);

  const { spawn } = await import("child_process");

  return new Promise((resolve, reject) => {
    const proc = spawn("ffprobe", [
      "-v",
      "quiet",
      "-print_format",
      "json",
      "-show_streams",
      "-show_format",
      audioPath,
    ]);

    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (d: Buffer) => (stdout += d.toString()));
    proc.stderr.on("data", (d: Buffer) => (stderr += d.toString()));

    proc.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`ffprobe exited with code ${code}: ${stderr}`));
        return;
      }

      try {
        const probe = JSON.parse(stdout);
        const format = probe.format ?? {};
        const audioStream =
          (probe.streams ?? []).find(
            (s: { codec_type: string }) => s.codec_type === "audio"
          ) ?? {};

        const stat = fs.statSync(audioPath);

        resolve({
          path: audioPath,
          durationSeconds: parseFloat(format.duration ?? "0"),
          format: format.format_name ?? "wav",
          sampleRate: parseInt(audioStream.sample_rate ?? "24000", 10),
          channels: parseInt(audioStream.channels ?? "1", 10),
          sizeBytes: stat.size,
          model: modelId,
          generatedAt: new Date().toISOString(),
        });
      } catch (e) {
        reject(new Error(`ffprobe JSON parse failed: ${(e as Error).message}`));
      }
    });

    proc.on("error", (e) => {
      reject(
        new Error(
          `ffprobe spawn error: ${e.message}. Is ffprobe installed and on PATH?`
        )
      );
    });
  });
}

export async function validateAudioFile(audioPath: string): Promise<void> {
  try {
    const stat = await fs.promises.stat(audioPath);
    if (stat.size === 0) {
      throw new Error(`Audio file exists but is empty: ${audioPath}`);
    }
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(`Audio file not found: ${audioPath}`);
    }
    throw e;
  }
}

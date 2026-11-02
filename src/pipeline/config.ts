/**
 * Centralised configuration — reads environment variables.
 * All model IDs and configurable values live here.
 * Never read process.env directly outside this module.
 */

import path from "path";

// Load .env from repo root if running via ts-node or Node directly
// (Remotion Studio doesn't need it — it passes props at render time)
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("dotenv").config();
} catch {
  // dotenv is optional; in Remotion bundle context it won't be present
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v || v.trim() === "") {
    throw new Error(
      `[config] Missing required environment variable: ${name}\n` +
        `  Copy .env.example → .env and set a real value for ${name}.`
    );
  }
  return v.trim();
}

function optionalEnv(name: string, fallback: string): string {
  return (process.env[name] || fallback).trim();
}

export interface PipelineConfig {
  geminiApiKey: string;
  textModel: string;
  ttsModel: string;
  ttsVoice: string;
  ttsStyle: string;
  outputBaseDir: string;
  renderOutputDir: string;
  /** Maximum characters per TTS request (Gemini TTS limit) */
  ttsMaxCharsPerRequest: number;
  /** Maximum retry attempts for transient API errors */
  maxRetries: number;
  /** Base delay in ms for exponential backoff */
  retryBaseDelayMs: number;
  /** Request timeout in ms */
  requestTimeoutMs: number;
}

let _config: PipelineConfig | null = null;

export function getConfig(): PipelineConfig {
  if (_config) return _config;

  _config = {
    geminiApiKey: requireEnv("GEMINI_API_KEY"),
    textModel: optionalEnv("GEMINI_TEXT_MODEL", "gemini-3.8-flash"),
    ttsModel: optionalEnv("GEMINI_TTS_MODEL", "gemini-3.8-flash-tts"),
    ttsVoice: optionalEnv("GEMINI_TTS_VOICE", "Kore"),
    ttsStyle: optionalEnv("GEMINI_TTS_STYLE", "confident, clear, and engaging"),
    outputBaseDir: path.resolve(
      optionalEnv("OUTPUT_BASE_DIR", "data/projects")
    ),
    renderOutputDir: path.resolve(
      optionalEnv("RENDER_OUTPUT_DIR", "data/renders")
    ),
    ttsMaxCharsPerRequest: 5000,
    maxRetries: 3,
    retryBaseDelayMs: 1000,
    requestTimeoutMs: 120_000,
  };

  return _config;
}

/** Check credentials without throwing — returns an error string or null */
export function checkCredentials(): string | null {
  const key = process.env["GEMINI_API_KEY"];
  if (!key || key.trim() === "" || key.trim() === "your_gemini_api_key_here") {
    return "GEMINI_API_KEY is not set. Copy .env.example → .env and add your key.";
  }
  if (!key.startsWith("AIzaSy")) {
    return `GEMINI_API_KEY "${key.slice(0, 8)}..." is not a valid Google AI Studio API key (must start with "AIzaSy").`;
  }
  return null;
}

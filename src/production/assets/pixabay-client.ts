/**
 * Pixabay API Client.
 *
 * Server-side only. The API key is read from the PIXABAY_API_KEY environment
 * variable and NEVER exposed to the browser, rendered video, or client bundle.
 *
 * Documentation: https://pixabay.com/api/docs/
 *
 * Per Pixabay Terms of Service:
 * - Caching of API responses is permitted for up to 24 hours.
 * - Hotlinking images directly is allowed (no need to re-host).
 * - Attribution is required when displaying Pixabay content.
 * - Do NOT redistribute downloaded media or create a competing stock library.
 * - Do NOT use downloaded images/videos in bulk for AI training datasets.
 */

import https from "https";
import http from "http";

// ============================================================
// Types
// ============================================================

export type PixabayMediaType = "photo" | "illustration" | "vector";
export type PixabayVideoType = "all" | "film" | "animation";

export interface PixabayImage {
  id: number;
  pageURL: string;
  type: PixabayMediaType;
  tags: string;
  previewURL: string;
  webformatURL: string;
  largeImageURL: string;
  imageWidth: number;
  imageHeight: number;
  downloads: number;
  likes: number;
  user: string;
  user_id: number;
  /** Pixabay attribution requirement */
  attribution: string;
}

export interface PixabayVideo {
  id: number;
  pageURL: string;
  type: string;
  tags: string;
  videos: {
    large?: { url: string; width: number; height: number; size: number };
    medium?: { url: string; width: number; height: number; size: number };
    small?: { url: string; width: number; height: number; size: number };
    tiny?: { url: string; width: number; height: number; size: number };
  };
  views: number;
  downloads: number;
  likes: number;
  user: string;
  user_id: number;
}

export interface PixabayImageSearchParams {
  q: string;
  image_type?: PixabayMediaType | "all";
  orientation?: "all" | "horizontal" | "vertical";
  category?: string;
  safesearch?: boolean;
  order?: "popular" | "latest";
  per_page?: number;
  page?: number;
  min_width?: number;
  min_height?: number;
  colors?: string;
  editors_choice?: boolean;
}

export interface PixabayVideoSearchParams {
  q: string;
  video_type?: PixabayVideoType;
  category?: string;
  safesearch?: boolean;
  order?: "popular" | "latest";
  per_page?: number;
  page?: number;
  editors_choice?: boolean;
}

export interface PixabayImageResult {
  total: number;
  totalHits: number;
  hits: PixabayImage[];
}

export interface PixabayVideoResult {
  total: number;
  totalHits: number;
  hits: PixabayVideo[];
}

export interface PixabayClientConfig {
  apiKey: string;
  timeoutMs?: number;
  maxRetries?: number;
  retryDelayMs?: number;
}

// ============================================================
// Error types
// ============================================================

export class PixabayError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly retryable: boolean = false
  ) {
    super(message);
    this.name = "PixabayError";
  }
}

export class PixabayApiKeyMissingError extends PixabayError {
  constructor() {
    super(
      "PIXABAY_API_KEY environment variable is not set. " +
        "Obtain a free key at https://pixabay.com/api/docs/ and add it to your .env file. " +
        "The video pipeline will continue without Pixabay images.",
      undefined,
      false
    );
    this.name = "PixabayApiKeyMissingError";
  }
}

// ============================================================
// HTTP helper
// ============================================================

function httpsGet(url: string, timeoutMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const lib = parsed.protocol === "https:" ? https : http;

    const req = lib.get(url, (res) => {
      if (res.statusCode === 429) {
        reject(new PixabayError("Pixabay rate limit exceeded — please retry later.", 429, true));
        return;
      }
      if (res.statusCode === 403) {
        reject(new PixabayError("Pixabay API key rejected (403 Forbidden).", 403, false));
        return;
      }
      if (!res.statusCode || res.statusCode >= 400) {
        reject(new PixabayError(`Pixabay API returned status ${res.statusCode}.`, res.statusCode, true));
        return;
      }

      let data = "";
      res.on("data", (chunk: Buffer) => (data += chunk.toString()));
      res.on("end", () => resolve(data));
    });

    req.setTimeout(timeoutMs, () => {
      req.destroy();
      reject(new PixabayError("Pixabay API request timed out.", undefined, true));
    });

    req.on("error", (err) =>
      reject(new PixabayError(`Pixabay network error: ${err.message}`, undefined, true))
    );
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ============================================================
// Client
// ============================================================

export class PixabayClient {
  private readonly apiKey: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly retryDelayMs: number;
  private static readonly BASE_URL = "https://pixabay.com/api";

  constructor(config: PixabayClientConfig) {
    if (!config.apiKey) throw new PixabayApiKeyMissingError();
    this.apiKey = config.apiKey;
    this.timeoutMs = config.timeoutMs ?? 10000;
    this.maxRetries = config.maxRetries ?? 3;
    this.retryDelayMs = config.retryDelayMs ?? 1000;
  }

  // ── Images ──────────────────────────────────────────────────

  async searchImages(params: PixabayImageSearchParams): Promise<PixabayImageResult> {
    const qs = this.buildQueryString({
      key: this.apiKey,
      q: params.q,
      image_type: params.image_type ?? "all",
      orientation: params.orientation ?? "all",
      safesearch: "true",
      order: params.order ?? "popular",
      per_page: String(Math.min(params.per_page ?? 15, 200)),
      page: String(params.page ?? 1),
      ...(params.category ? { category: params.category } : {}),
      ...(params.min_width ? { min_width: String(params.min_width) } : {}),
      ...(params.min_height ? { min_height: String(params.min_height) } : {}),
      ...(params.colors ? { colors: params.colors } : {}),
      ...(params.editors_choice ? { editors_choice: "true" } : {}),
    });

    const url = `${PixabayClient.BASE_URL}/?${qs}`;
    const raw = await this.fetchWithRetry(url);
    return JSON.parse(raw) as PixabayImageResult;
  }

  // ── Videos ──────────────────────────────────────────────────

  async searchVideos(params: PixabayVideoSearchParams): Promise<PixabayVideoResult> {
    const qs = this.buildQueryString({
      key: this.apiKey,
      q: params.q,
      video_type: params.video_type ?? "all",
      safesearch: "true",
      order: params.order ?? "popular",
      per_page: String(Math.min(params.per_page ?? 10, 200)),
      page: String(params.page ?? 1),
      ...(params.category ? { category: params.category } : {}),
      ...(params.editors_choice ? { editors_choice: "true" } : {}),
    });

    const url = `${PixabayClient.BASE_URL}/videos/?${qs}`;
    const raw = await this.fetchWithRetry(url);
    return JSON.parse(raw) as PixabayVideoResult;
  }

  // ── Private helpers ──────────────────────────────────────────

  private buildQueryString(params: Record<string, string>): string {
    return Object.entries(params)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join("&");
  }

  private async fetchWithRetry(url: string): Promise<string> {
    // Replace API key in logs to protect secrets
    const safeUrl = url.replace(this.apiKey, "[REDACTED]");

    let lastErr: Error = new Error("Unknown error");
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await httpsGet(url, this.timeoutMs);
      } catch (err) {
        lastErr = err as Error;
        const pixErr = err as PixabayError;
        if (!pixErr.retryable || attempt === this.maxRetries) break;
        const delay = this.retryDelayMs * attempt;
        console.warn(`[Pixabay] Attempt ${attempt} failed for ${safeUrl} — retrying in ${delay}ms: ${pixErr.message}`);
        await sleep(delay);
      }
    }
    throw lastErr;
  }

  /** Verify API key is valid by making a minimal test request */
  async verifyKey(): Promise<boolean> {
    try {
      const result = await this.searchImages({ q: "nature", per_page: 3 });
      return result.totalHits > 0;
    } catch {
      return false;
    }
  }
}

// ============================================================
// Factory — creates client from env, or returns null if key missing
// ============================================================

let _clientSingleton: PixabayClient | null = null;
let _clientChecked = false;

export function getPixabayClient(): PixabayClient | null {
  if (_clientChecked) return _clientSingleton;
  _clientChecked = true;

  const apiKey = process.env.PIXABAY_API_KEY;
  if (!apiKey) {
    console.warn(
      "[Pixabay] PIXABAY_API_KEY not set — Pixabay asset retrieval disabled. " +
        "Add PIXABAY_API_KEY=<your_key> to .env to enable it."
    );
    return null;
  }

  try {
    _clientSingleton = new PixabayClient({ apiKey, timeoutMs: 10000, maxRetries: 3 });
    console.log("[Pixabay] Client initialized.");
    return _clientSingleton;
  } catch (err) {
    console.warn(`[Pixabay] Client init failed: ${(err as Error).message}`);
    return null;
  }
}

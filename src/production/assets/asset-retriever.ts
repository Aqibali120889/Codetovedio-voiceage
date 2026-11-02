/**
 * Asset Retriever.
 *
 * Converts narration concepts into Pixabay search queries, ranks results,
 * caches metadata, and returns the best matching asset URL for a scene.
 *
 * Server-side only. Never exposes API keys to browser/render.
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { getPixabayClient } from "./pixabay-client";
import type { PixabayImage } from "./pixabay-client";
import { getCuratedFallbackAsset } from "./curated-library";

// ============================================================
// Types
// ============================================================

export interface RetrievedAsset {
  /** Pixabay asset ID */
  pixabay_id?: number;
  /** Direct image URL (large format, safe for hotlinking per Pixabay TOS) */
  url: string;
  /** Pixabay page URL for attribution */
  page_url?: string;
  /** User attribution text */
  attribution?: string;
  /** Original tags */
  tags?: string;
  /** Width in pixels */
  width: number;
  /** Height in pixels */
  height: number;
  /** Media type */
  type: "photo" | "illustration" | "vector" | "local_fallback";
  /** Search query that produced this result */
  query: string;
}

export interface AssetRetrievalOptions {
  /** Preferred aspect ratio hint: 'portrait' = 9:16, 'landscape' = 16:9, 'square' = 1:1 */
  orientation?: "portrait" | "landscape" | "square";
  /** Preferred image type */
  image_type?: "photo" | "illustration" | "vector" | "any";
  /** Minimum acceptable resolution */
  min_dimension?: number;
  /** Cache directory for storing metadata (not images) */
  cacheDir?: string;
}

export interface AssetRetrievalResult {
  asset: RetrievedAsset | null;
  fallback_used: boolean;
  query_used: string;
  error?: string;
}

// ============================================================
// Query generation from narration text
// ============================================================

const STOP_WORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
  "to", "of", "and", "or", "in", "on", "at", "by", "for", "with", "about",
  "this", "that", "these", "those", "it", "its", "we", "our", "you", "your",
  "they", "their", "how", "what", "when", "where", "which", "who", "will",
  "can", "do", "does", "did", "has", "have", "had", "not", "no", "so",
  "very", "just", "also", "more", "most", "some", "all", "one", "two",
  "three", "four", "five", "every", "each", "into", "from",
]);

/**
 * Extract 2-4 meaningful keywords from a narration segment.
 * Prioritizes proper nouns, technical terms, and domain-specific vocabulary.
 */
export function extractSearchQuery(
  narration: string,
  visualDescription?: string,
  topic?: string
): string {
  const combined = [visualDescription || "", narration].join(" ");

  // Extract candidate words
  const words = combined
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOP_WORDS.has(w));

  // Score each word
  const scores = new Map<string, number>();
  for (const w of words) {
    const current = scores.get(w) ?? 0;
    // Boost domain/tech words
    const isTech =
      /\b(ai|agent|data|cloud|system|autonomous|machine|learn|robot|code|software|infra|server|model|platform|business|growth|market|finance|health|science|tech)\b/.test(w);
    scores.set(w, current + 1 + (isTech ? 1 : 0));
  }

  // Sort by score descending, pick top 3
  const top = [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([w]) => w);

  // If topic is provided, prepend first word of it
  if (topic) {
    const topicWord = topic
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .find((w) => w.length > 3 && !STOP_WORDS.has(w));
    if (topicWord && !top.includes(topicWord)) {
      top.unshift(topicWord);
      if (top.length > 3) top.pop();
    }
  }

  return top.join(" ") || "technology abstract";
}

// ============================================================
// Ranking / scoring
// ============================================================

/**
 * Score a Pixabay image based on relevance, quality, and composition fitness.
 * Higher = better.
 */
function scoreImage(
  img: PixabayImage,
  query: string,
  orientation: "portrait" | "landscape" | "square"
): number {
  let score = 0;

  // Popularity signals (capped so they don't dominate)
  score += Math.min(img.downloads / 10000, 5);
  score += Math.min(img.likes / 1000, 3);

  // Resolution bonus
  const minDim = Math.min(img.imageWidth, img.imageHeight);
  if (minDim >= 1920) score += 3;
  else if (minDim >= 1280) score += 1.5;
  else if (minDim < 640) score -= 2;

  // Aspect ratio fitness
  const ratio = img.imageWidth / img.imageHeight;
  if (orientation === "portrait") {
    // Prefer tall images (ratio < 1)
    if (ratio < 0.65) score += 3;
    else if (ratio < 1) score += 1;
    else score -= 1;
  } else if (orientation === "landscape") {
    if (ratio > 1.5) score += 3;
    else if (ratio > 1) score += 1;
    else score -= 1;
  } else {
    // Square — close to 1:1
    if (Math.abs(ratio - 1) < 0.15) score += 2;
  }

  // Tag relevance: count query word matches
  const queryWords = query.toLowerCase().split(/\s+/);
  const tags = img.tags.toLowerCase();
  const tagMatches = queryWords.filter((w) => tags.includes(w)).length;
  score += tagMatches * 2;

  // Penalty for very low-res images
  if (img.imageWidth < 800 || img.imageHeight < 800) score -= 3;

  return score;
}

// ============================================================
// Metadata cache (disk-based, JSON)
// ============================================================

interface CacheEntry {
  query: string;
  params: string;
  assets: PixabayImage[];
  cachedAt: number;
  ttlMs: number;
}

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours (per Pixabay TOS)
const CACHE_FILE_NAME = "pixabay-cache.json";

function loadCache(cacheDir: string): Map<string, CacheEntry> {
  const cacheFile = path.join(cacheDir, CACHE_FILE_NAME);
  if (!fs.existsSync(cacheFile)) return new Map();
  try {
    const raw = fs.readFileSync(cacheFile, "utf-8");
    const obj = JSON.parse(raw) as Record<string, CacheEntry>;
    const now = Date.now();
    const map = new Map<string, CacheEntry>();
    for (const [k, v] of Object.entries(obj)) {
      if (now - v.cachedAt < v.ttlMs) {
        map.set(k, v);
      }
    }
    return map;
  } catch {
    return new Map();
  }
}

function saveCache(cacheDir: string, cache: Map<string, CacheEntry>): void {
  const cacheFile = path.join(cacheDir, CACHE_FILE_NAME);
  try {
    fs.mkdirSync(cacheDir, { recursive: true });
    const obj = Object.fromEntries(cache.entries());
    fs.writeFileSync(cacheFile, JSON.stringify(obj, null, 2), "utf-8");
  } catch (err) {
    console.warn(`[AssetRetriever] Cache write failed: ${(err as Error).message}`);
  }
}

function makeCacheKey(query: string, orientation: string, image_type: string): string {
  return crypto
    .createHash("sha256")
    .update(`${query}:${orientation}:${image_type}`)
    .digest("hex")
    .slice(0, 16);
}

// ============================================================
// Main retrieval function
// ============================================================

/**
 * Retrieve the best matching image URL for a narration segment.
 * Returns null asset on failure — the pipeline continues without it.
 */
export async function retrieveBestImageAsset(
  narration: string,
  visualDescription?: string,
  topic?: string,
  options: AssetRetrievalOptions = {}
): Promise<AssetRetrievalResult> {
  const orientation = options.orientation ?? "portrait";
  const image_type = options.image_type ?? "photo";
  const cacheDir = options.cacheDir ?? path.join(process.cwd(), "tmp", "pixabay-cache");

  const query = extractSearchQuery(narration, visualDescription, topic);

  const client = getPixabayClient();
  if (!client) {
    const fallback = getCuratedFallbackAsset(query, topic);
    return {
      asset: {
        url: fallback.dataUri,
        width: 1080,
        height: 1920,
        type: "local_fallback",
        query,
        attribution: fallback.attribution,
        tags: fallback.tags.join(", "),
      },
      fallback_used: true,
      query_used: query,
      error: "PIXABAY_API_KEY not configured — using curated studio asset",
    };
  }

  // Check cache
  const cache = loadCache(cacheDir);
  const cacheKey = makeCacheKey(query, orientation, image_type);
  const cached = cache.get(cacheKey);

  let candidates: PixabayImage[];

  if (cached) {
    console.log(`[AssetRetriever] Cache hit for query: "${query}"`);
    candidates = cached.assets;
  } else {
    try {
      // Map orientation to Pixabay param
      const pixabayOrientation =
        orientation === "portrait" ? "vertical" : orientation === "landscape" ? "horizontal" : "all";
      const pixabayImageType =
        image_type === "any" ? "all" : image_type;

      const result = await client.searchImages({
        q: query,
        image_type: pixabayImageType as "photo" | "illustration" | "vector" | "all",
        orientation: pixabayOrientation as "all" | "horizontal" | "vertical",
        per_page: 15,
        safesearch: true,
        order: "popular",
        min_width: options.min_dimension ?? 720,
        min_height: options.min_dimension ?? 720,
      });

      candidates = result.hits;

      // Cache results for 24 hours (Pixabay TOS)
      cache.set(cacheKey, {
        query,
        params: `${orientation}:${image_type}`,
        assets: candidates,
        cachedAt: Date.now(),
        ttlMs: DEFAULT_TTL_MS,
      });
      saveCache(cacheDir, cache);
      console.log(`[AssetRetriever] Fetched ${candidates.length} results for "${query}"`);
    } catch (err) {
      console.warn(`[AssetRetriever] API error for "${query}": ${(err as Error).message} — using curated studio asset`);
      const fallback = getCuratedFallbackAsset(query, topic);
      return {
        asset: {
          url: fallback.dataUri,
          width: 1080,
          height: 1920,
          type: "local_fallback",
          query,
          attribution: fallback.attribution,
          tags: fallback.tags.join(", "),
        },
        fallback_used: true,
        query_used: query,
        error: (err as Error).message,
      };
    }
  }

  if (candidates.length === 0) {
    const fallback = getCuratedFallbackAsset(query, topic);
    return {
      asset: {
        url: fallback.dataUri,
        width: 1080,
        height: 1920,
        type: "local_fallback",
        query,
        attribution: fallback.attribution,
        tags: fallback.tags.join(", "),
      },
      fallback_used: true,
      query_used: query,
      error: `No Pixabay results for query: "${query}" — using curated studio asset`,
    };
  }

  // Score and rank candidates
  const scored = candidates
    .map((img) => ({ img, score: scoreImage(img, query, orientation) }))
    .sort((a, b) => b.score - a.score);

  const best = scored[0].img;

  return {
    asset: {
      pixabay_id: best.id,
      url: best.largeImageURL || best.webformatURL,
      page_url: best.pageURL,
      attribution: `Photo by ${best.user} on Pixabay`,
      tags: best.tags,
      width: best.imageWidth,
      height: best.imageHeight,
      type: best.type as "photo" | "illustration" | "vector",
      query,
    },
    fallback_used: false,
    query_used: query,
  };
}

// ============================================================
// Duplicate / repetition detection
// ============================================================

const _usedIds = new Set<number>();

/**
 * Filter out asset IDs that have been used in recent generations.
 * Pass the scored candidates and return the best non-duplicate.
 */
export function selectNonDuplicateAsset(
  candidates: PixabayImage[],
  query: string,
  orientation: "portrait" | "landscape" | "square",
  forceNew = false
): PixabayImage | null {
  if (candidates.length === 0) return null;

  const scored = candidates
    .map((img) => ({ img, score: scoreImage(img, query, orientation) }))
    .sort((a, b) => b.score - a.score);

  // Find first non-duplicate
  for (const { img } of scored) {
    if (!_usedIds.has(img.id)) {
      if (!forceNew) _usedIds.add(img.id);
      return img;
    }
  }

  // All were duplicates — return best with a warning
  const best = scored[0].img;
  console.warn(
    `[AssetRetriever] All ${candidates.length} Pixabay results for "${query}" were previously used — reusing best.`
  );
  return best;
}

/** Reset the used IDs history (call between separate generation runs) */
export function resetDuplicateHistory(): void {
  _usedIds.clear();
}

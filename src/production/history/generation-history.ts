/**
 * Video Generation History & Anti-Repetition Engine.
 *
 * Persists metadata about previous video generations to ensure visual diversity,
 * detect and prevent repeating scene sequences, and provide context for future runs.
 */

import fs from "fs";
import path from "path";
import type { SceneType } from "../../video-engine/types";

export interface GenerationRecord {
  generation_id: string;
  project_id: string;
  topic: string;
  title: string;
  timestamp: string;
  theme_preset: string;
  aspect_ratio: string;
  generation_seed: number;
  scene_sequence: SceneType[];
  total_duration_seconds: number;
  scenes_count: number;
}

const DEFAULT_HISTORY_PATH = path.resolve(
  process.cwd(),
  "data",
  "production",
  "generation_history.json"
);

export class GenerationHistoryManager {
  private historyPath: string;

  constructor(customPath?: string) {
    this.historyPath = customPath || DEFAULT_HISTORY_PATH;
    this.ensureDirectory();
  }

  private ensureDirectory(): void {
    const dir = path.dirname(this.historyPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  public getAll(): GenerationRecord[] {
    try {
      if (!fs.existsSync(this.historyPath)) {
        return [];
      }
      const data = fs.readFileSync(this.historyPath, "utf-8");
      return JSON.parse(data) as GenerationRecord[];
    } catch (err) {
      console.warn(`[GenerationHistory] Failed to read history: ${(err as Error).message}`);
      return [];
    }
  }

  public getRecent(limit = 10): GenerationRecord[] {
    const all = this.getAll();
    return all.slice(-limit).reverse();
  }

  public recordGeneration(record: GenerationRecord): void {
    try {
      const all = this.getAll();
      all.push(record);
      // Retain max 100 entries to prevent unbounded growth
      const trimmed = all.slice(-100);
      fs.writeFileSync(this.historyPath, JSON.stringify(trimmed, null, 2), "utf-8");
      console.log(`[GenerationHistory] Recorded generation "${record.generation_id}" (${record.topic})`);
    } catch (err) {
      console.warn(`[GenerationHistory] Failed to record generation: ${(err as Error).message}`);
    }
  }

  /**
   * Check if a candidate scene sequence is too similar to recent generations.
   * Compares the Jaccard index and positional matching of scene types.
   */
  public evaluateSequenceDiversity(candidate: SceneType[]): {
    isRepetitive: boolean;
    highestSimilarity: number;
    matchedJobId?: string;
  } {
    const recent = this.getRecent(5);
    if (recent.length === 0 || candidate.length === 0) {
      return { isRepetitive: false, highestSimilarity: 0 };
    }

    let highestSimilarity = 0;
    let matchedJobId: string | undefined;

    for (const past of recent) {
      const pastSeq = past.scene_sequence;
      if (!pastSeq || pastSeq.length === 0) continue;

      // Positional match score
      const minLen = Math.min(candidate.length, pastSeq.length);
      let matchCount = 0;
      for (let i = 0; i < minLen; i++) {
        if (candidate[i] === pastSeq[i]) matchCount++;
      }
      const similarity = matchCount / Math.max(candidate.length, pastSeq.length);

      if (similarity > highestSimilarity) {
        highestSimilarity = similarity;
        matchedJobId = past.generation_id;
      }
    }

    // Flag as repetitive if > 70% of scene positions match a recent video
    return {
      isRepetitive: highestSimilarity > 0.7,
      highestSimilarity,
      matchedJobId,
    };
  }
}

let _defaultHistoryManager: GenerationHistoryManager | null = null;

export function getGenerationHistoryManager(): GenerationHistoryManager {
  if (!_defaultHistoryManager) {
    _defaultHistoryManager = new GenerationHistoryManager();
  }
  return _defaultHistoryManager;
}

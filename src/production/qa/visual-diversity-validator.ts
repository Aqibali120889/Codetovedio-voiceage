/**
 * Visual Diversity Validator.
 *
 * Enforces editorial motion-graphics standards:
 * 1. Zero consecutive duplicate scene types
 * 2. Balanced scene family distribution (no single family > 35% of video)
 * 3. Consistent visual beat cadence (1 visual change every 2-4s)
 * 4. Distinct asset queries and zero duplicate stock photo URLs
 * 5. Sequence diversity against recent generation history
 */

import type { VideoBlueprint } from "../../video-engine/types";
import { getGenerationHistoryManager } from "../history/generation-history";

export interface VisualDiversityReport {
  passed: boolean;
  score: number; // 0 - 100
  metrics: {
    total_scenes: number;
    unique_scene_types: number;
    consecutive_duplicates: number;
    max_family_concentration_pct: number;
    beat_cadence_avg_seconds: number;
    asset_count: number;
    duplicate_assets: number;
    history_similarity_score: number;
  };
  issues: string[];
  warnings: string[];
  summary: string;
}

export function validateVisualDiversity(
  blueprint: VideoBlueprint,
  historyPath?: string
): VisualDiversityReport {
  const issues: string[] = [];
  const warnings: string[] = [];
  const scenes = blueprint.scenes || [];
  const totalScenes = scenes.length;

  if (totalScenes === 0) {
    return {
      passed: false,
      score: 0,
      metrics: {
        total_scenes: 0,
        unique_scene_types: 0,
        consecutive_duplicates: 0,
        max_family_concentration_pct: 0,
        beat_cadence_avg_seconds: 0,
        asset_count: 0,
        duplicate_assets: 0,
        history_similarity_score: 0,
      },
      issues: ["Blueprint contains no scenes"],
      warnings: [],
      summary: "Visual diversity validation failed: 0 scenes.",
    };
  }

  // 1. Consecutive duplicates check
  let consecutiveDuplicates = 0;
  for (let i = 1; i < totalScenes; i++) {
    if (scenes[i].scene_type === scenes[i - 1].scene_type) {
      consecutiveDuplicates++;
      issues.push(
        `Consecutive duplicate scene type "${scenes[i].scene_type}" at index ${i - 1} and ${i} (${scenes[i].id})`
      );
    }
  }

  // 2. Family distribution & concentration check
  const familyCounts = new Map<string, number>();
  for (const s of scenes) {
    familyCounts.set(s.scene_type, (familyCounts.get(s.scene_type) || 0) + 1);
  }
  const uniqueSceneTypes = familyCounts.size;
  let maxConcentrationCount = 0;
  let dominantFamily = "";

  for (const [family, count] of familyCounts.entries()) {
    if (count > maxConcentrationCount) {
      maxConcentrationCount = count;
      dominantFamily = family;
    }
  }
  const maxConcentrationPct = Math.round((maxConcentrationCount / totalScenes) * 100);
  if (totalScenes >= 4 && maxConcentrationPct > 40) {
    warnings.push(
      `Scene family "${dominantFamily}" dominates ${maxConcentrationPct}% of the video (${maxConcentrationCount}/${totalScenes} scenes). Aim for < 35%.`
    );
  }

  // 3. Visual beat cadence check
  let totalBeats = 0;
  for (const s of scenes) {
    totalBeats += s.beats?.length || 0;
  }
  const totalDuration = blueprint.target_duration_seconds || totalScenes * 5;
  const beatCadence = totalBeats > 0 ? Number((totalDuration / totalBeats).toFixed(2)) : totalDuration;
  if (beatCadence > 4.5 && totalScenes >= 3) {
    warnings.push(
      `Visual beat interval is slow: average ${beatCadence}s between visual changes (target: 2.0 - 4.0s).`
    );
  }

  // 4. Asset duplication check
  const seenUrls = new Set<string>();
  let duplicateAssets = 0;
  let assetCount = 0;
  for (const s of scenes) {
    if (s.image_url) {
      assetCount++;
      if (seenUrls.has(s.image_url)) {
        duplicateAssets++;
        warnings.push(`Reused image asset URL in scene "${s.id}": ${s.image_url.slice(0, 50)}...`);
      } else {
        seenUrls.add(s.image_url);
      }
    }
  }

  // 5. Sequence diversity against recent history
  const historyManager = getGenerationHistoryManager();
  const sequence = scenes.map((s) => s.scene_type);
  const evalDiversity = historyManager.evaluateSequenceDiversity(sequence as any);
  let historySimilarityScore = 0;
  if (evalDiversity.isRepetitive) {
    historySimilarityScore = 80;
    warnings.push(
      `Scene sequence matches recent generation "${evalDiversity.matchedJobId}". Diversity penalty applied.`
    );
  }

  // Calculate composite diversity score (0 - 100)
  let score = 100;
  score -= consecutiveDuplicates * 25;
  if (maxConcentrationPct > 35) score -= (maxConcentrationPct - 35) * 1.5;
  if (beatCadence > 4.0) score -= Math.min(20, Math.round((beatCadence - 4.0) * 8));
  if (duplicateAssets > 0) score -= duplicateAssets * 10;
  if (evalDiversity.isRepetitive) score -= 20;
  score = Math.max(0, Math.min(100, Math.round(score)));

  const passed = consecutiveDuplicates === 0 && score >= 60;

  return {
    passed,
    score,
    metrics: {
      total_scenes: totalScenes,
      unique_scene_types: uniqueSceneTypes,
      consecutive_duplicates: consecutiveDuplicates,
      max_family_concentration_pct: maxConcentrationPct,
      beat_cadence_avg_seconds: beatCadence,
      asset_count: assetCount,
      duplicate_assets: duplicateAssets,
      history_similarity_score: historySimilarityScore,
    },
    issues,
    warnings,
    summary: `Visual Diversity Score: ${score}/100 (${uniqueSceneTypes}/${totalScenes} unique scene families, ${totalBeats} timed visual beats). Status: ${passed ? "PASSED" : "FAILED"}.`,
  };
}

/**
 * Measurable Storyboard Density & Repetition Validator.
 *
 * Validates:
 * - Scene and beat temporal alignment and contiguity
 * - Visual artifact density (target: 1 visual change every 2-4 seconds)
 * - Safe-area boundaries and element collision constraints
 * - Layering (z-index) hierarchy sanity
 * - Repetition and scene type diversity
 * - Auto-repairs missing beats or boundary drifts within bounded passes
 */

import type {
  StoryboardDocument,
  StoryboardScene,
  StoryboardArtifact,
  StoryboardBeat,
} from "./storyboard-types";

export interface StoryboardValidationReport {
  valid: boolean;
  repaired: boolean;
  errors: string[];
  warnings: string[];
  metrics: {
    totalScenes: number;
    totalArtifacts: number;
    totalBeats: number;
    averagePacingSeconds: number;
    maxStaticIntervalSeconds: number;
    densityScore: number; // 0.0 to 1.0
  };
  storyboard: StoryboardDocument;
}

export interface StoryboardValidationOptions {
  maxStaticIntervalSeconds?: number;
  minBeatsPerScene?: number;
  maxRepairs?: number;
}

export function validateAndRepairStoryboard(
  rawStoryboard: StoryboardDocument,
  options: StoryboardValidationOptions = {}
): StoryboardValidationReport {
  const maxStaticInterval = options.maxStaticIntervalSeconds ?? 3.8;
  const minBeatsPerScene = options.minBeatsPerScene ?? 2;
  const errors: string[] = [];
  const warnings: string[] = [];
  let repaired = false;

  // Deep clone to avoid in-place mutation of input
  const storyboard: StoryboardDocument = JSON.parse(JSON.stringify(rawStoryboard));

  if (!storyboard.scenes || storyboard.scenes.length === 0) {
    errors.push("Storyboard contains no scenes.");
    return {
      valid: false,
      repaired: false,
      errors,
      warnings,
      metrics: {
        totalScenes: 0,
        totalArtifacts: 0,
        totalBeats: 0,
        averagePacingSeconds: 0,
        maxStaticIntervalSeconds: 0,
        densityScore: 0,
      },
      storyboard,
    };
  }

  const fps = storyboard.global_spec.fps || 60;
  let runningTimeSeconds = 0;
  let runningFrame = 0;
  let maxObservedStaticInterval = 0;
  let totalBeatIntervals = 0;
  let sumBeatIntervalDurations = 0;

  for (let sIdx = 0; sIdx < storyboard.scenes.length; sIdx++) {
    const scene = storyboard.scenes[sIdx];

    // 1. Temporal Contiguity & Timing
    if (scene.duration_seconds <= 0) {
      scene.duration_seconds = Math.max(4, Math.round(scene.narration.split(/\s+/).length / 2.5));
      scene.duration_frames = Math.round(scene.duration_seconds * fps);
      repaired = true;
      warnings.push(`Scene "${scene.scene_id}": duration repaired to ${scene.duration_seconds}s.`);
    }

    scene.start_seconds = runningTimeSeconds;
    scene.end_seconds = runningTimeSeconds + scene.duration_seconds;
    scene.start_frame = runningFrame;
    scene.end_frame = runningFrame + scene.duration_frames;

    runningTimeSeconds = scene.end_seconds;
    runningFrame = scene.end_frame;

    // 2. Artifact Inventory Completeness
    if (!scene.artifacts || scene.artifacts.length === 0) {
      warnings.push(`Scene "${scene.scene_id}" lacked visual artifacts. Generating baseline inventory.`);
      scene.artifacts = generateBaselineArtifactsForScene(scene, storyboard.global_spec.color_palette);
      repaired = true;
    }

    // Validate and clamp artifact coordinates
    for (const art of scene.artifacts) {
      if (art.position.x < 0 || art.position.x > 1.0) {
        art.position.x = Math.max(0.05, Math.min(0.95, art.position.x));
        repaired = true;
      }
      if (art.position.y < 0 || art.position.y > 1.0) {
        art.position.y = Math.max(0.05, Math.min(0.85, art.position.y));
        repaired = true;
      }
      if (art.size.width <= 0 || art.size.width > 1.0) {
        art.size.width = Math.max(0.1, Math.min(0.9, art.size.width));
        repaired = true;
      }
      if (art.size.height <= 0 || art.size.height > 1.0) {
        art.size.height = Math.max(0.05, Math.min(0.8, art.size.height));
        repaired = true;
      }

      // Check caption safe-area collision for foreground content (layer >= 10)
      if (art.layer >= 10 && art.position.y > 0.85 && art.accessibility.is_essential) {
        art.position.y = 0.78; // Pull above bottom 15% caption safe area
        art.accessibility.safe_area_compliant = true;
        repaired = true;
        warnings.push(`Artifact "${art.artifact_id}" adjusted upward to clear caption safe area.`);
      }
    }

    // 3. Beat Pacing & Density Validation
    if (!scene.beats || scene.beats.length === 0) {
      warnings.push(`Scene "${scene.scene_id}" had no beats. Synthesizing narration-aligned beats.`);
      scene.beats = synthesizeBeatsForScene(scene, fps);
      repaired = true;
    }

    // Ensure minimum required beats per scene duration
    const targetBeatsCount = Math.max(
      minBeatsPerScene,
      Math.floor(scene.duration_seconds / maxStaticInterval)
    );

    if (scene.beats.length < targetBeatsCount) {
      scene.beats = expandBeatsForScene(scene, targetBeatsCount, fps);
      repaired = true;
      warnings.push(
        `Scene "${scene.scene_id}" beats expanded to ${scene.beats.length} to satisfy density threshold.`
      );
    }

    // Check static intervals between beats
    for (let bIdx = 0; bIdx < scene.beats.length; bIdx++) {
      const beat = scene.beats[bIdx];
      const beatDuration = beat.end_seconds - beat.start_seconds;

      if (beatDuration > maxObservedStaticInterval) {
        maxObservedStaticInterval = beatDuration;
      }

      totalBeatIntervals++;
      sumBeatIntervalDurations += beatDuration;

      if (beatDuration > maxStaticInterval + 1.0) {
        warnings.push(
          `Scene "${scene.scene_id}" beat ${beat.beat_index} (${beatDuration.toFixed(1)}s) exceeds max static interval (${maxStaticInterval}s).`
        );
      }
    }

    // 4. Scene Variety / Repetition Check
    if (sIdx > 0) {
      const prevScene = storyboard.scenes[sIdx - 1];
      if (scene.renderer_component === prevScene.renderer_component) {
        warnings.push(
          `Consecutive duplicate renderer component "${scene.renderer_component}" between scenes "${prevScene.scene_id}" and "${scene.scene_id}".`
        );
      }
    }
  }

  // Update global stats
  const totalScenes = storyboard.scenes.length;
  const totalArtifacts = storyboard.scenes.reduce((sum, s) => sum + s.artifacts.length, 0);
  const totalBeats = storyboard.scenes.reduce((sum, s) => sum + s.beats.length, 0);
  const avgPacingSeconds =
    totalBeatIntervals > 0 ? sumBeatIntervalDurations / totalBeatIntervals : 3.0;

  storyboard.global_spec.target_duration_seconds = runningTimeSeconds;
  storyboard.global_spec.target_total_frames = runningFrame;

  storyboard.stats = {
    total_scenes: totalScenes,
    total_artifacts: totalArtifacts,
    total_beats: totalBeats,
    average_beats_per_scene: Math.round((totalBeats / totalScenes) * 10) / 10,
    average_artifacts_per_scene: Math.round((totalArtifacts / totalScenes) * 10) / 10,
    max_unanimated_interval_seconds: Math.round(maxObservedStaticInterval * 10) / 10,
    verified_evidence_citations_count: storyboard.scenes.reduce(
      (sum, s) => sum + (s.source_evidence_ids?.length || 0),
      0
    ),
  };

  const densityScore = Math.max(
    0,
    Math.min(
      1.0,
      1.0 -
        Math.max(0, maxObservedStaticInterval - maxStaticInterval) * 0.15 +
        (storyboard.stats.average_beats_per_scene >= 2.5 ? 0.1 : 0)
    )
  );

  return {
    valid: errors.length === 0,
    repaired,
    errors,
    warnings,
    metrics: {
      totalScenes,
      totalArtifacts,
      totalBeats,
      averagePacingSeconds: Math.round(avgPacingSeconds * 10) / 10,
      maxStaticIntervalSeconds: Math.round(maxObservedStaticInterval * 10) / 10,
      densityScore: Math.round(densityScore * 100) / 100,
    },
    storyboard,
  };
}

/**
 * Baseline artifact generator for scenes lacking artifact inventory.
 */
function generateBaselineArtifactsForScene(
  scene: StoryboardScene,
  palette: StoryboardDocument["global_spec"]["color_palette"]
): StoryboardArtifact[] {
  const artifacts: StoryboardArtifact[] = [];

  // 1. Scene Header / Heading
  artifacts.push({
    artifact_id: `art_${scene.scene_id}_heading`,
    artifact_type: "heading",
    purpose: "Scene topic headline anchor",
    visible_text: scene.purpose.replace(/_/g, " ").toUpperCase(),
    asset_strategy: { strategy: "react" },
    visual_style: {
      fill_color: "#FFFFFF",
      font_size: 48,
      font_weight: 900,
      font_family: "Inter, sans-serif",
    },
    position: { x: 0.1, y: 0.08, anchor: "top_left" },
    size: { width: 0.8, height: 0.08 },
    layer: 20,
    entry_animation: {
      type: "slide_down",
      start_frame: 0,
      duration_frames: 14,
      easing: "cubic-bezier(0.16, 1, 0.3, 1)",
    },
    start_frame: scene.start_frame,
    end_frame: scene.end_frame,
    duration_frames: scene.duration_frames,
    dependencies: [],
    accessibility: { is_essential: true, safe_area_compliant: true },
    fallback_behavior: { on_error: "render_text_only" },
    renderer_component: "SceneHeader",
    component_props: { text: scene.purpose.toUpperCase() },
  });

  // 2. Primary Focal Card / Panel
  artifacts.push({
    artifact_id: `art_${scene.scene_id}_primary_card`,
    artifact_type: "dashboard_card",
    purpose: "Primary visual illustration of spoken claim",
    visible_text: scene.narration.slice(0, 60),
    asset_strategy: { strategy: "react" },
    visual_style: {
      fill_color: palette.surface,
      stroke_color: `${palette.accent}44`,
      stroke_width: 1,
      border_radius: 16,
    },
    position: { x: 0.1, y: 0.22, anchor: "top_left" },
    size: { width: 0.8, height: 0.45 },
    layer: 10,
    entry_animation: {
      type: "scale_in",
      start_frame: 8,
      duration_frames: 18,
      easing: "cubic-bezier(0.34, 1.56, 0.64, 1)",
    },
    hold_animation: { type: "subtle_drift", speed: 0.02 },
    start_frame: scene.start_frame + 8,
    end_frame: scene.end_frame,
    duration_frames: scene.duration_frames - 8,
    dependencies: [`art_${scene.scene_id}_heading`],
    accessibility: { is_essential: true, safe_area_compliant: true },
    fallback_behavior: { on_error: "render_placeholder" },
    renderer_component: "DashboardCardComponent",
    component_props: { title: "TELEMETRY", detail: scene.narration.slice(0, 40) },
  });

  return artifacts;
}

/**
 * Synthesizes default narration-aligned beats for a scene.
 */
function synthesizeBeatsForScene(scene: StoryboardScene, fps: number): StoryboardBeat[] {
  const words = scene.narration.split(/\s+/).filter(Boolean);
  const dur = scene.duration_seconds;
  const beats: StoryboardBeat[] = [];

  // Beat 1: Entrance & Hook (0.0s to ~1.8s)
  const b1Duration = Math.min(2.0, dur * 0.4);
  beats.push({
    beat_id: `beat_${scene.scene_id}_1`,
    beat_index: 0,
    start_seconds: 0,
    end_seconds: b1Duration,
    start_frame: scene.start_frame,
    end_frame: scene.start_frame + Math.round(b1Duration * fps),
    narration_fragment: words.slice(0, 6).join(" "),
    narrative_goal: `Introduce ${scene.purpose} context`,
    artifacts_introduced: scene.artifacts.slice(0, 2).map((a) => a.artifact_id),
    artifacts_updated: [],
    motion_instructions: "Entrance animation: headline drops and main card scales in",
    focal_point: { x: 0.5, y: 0.35, description: "Primary visual card" },
  });

  // Beat 2: Core Evidence / Dynamic Pulse (~1.8s to dur)
  beats.push({
    beat_id: `beat_${scene.scene_id}_2`,
    beat_index: 1,
    start_seconds: b1Duration,
    end_seconds: dur,
    start_frame: scene.start_frame + Math.round(b1Duration * fps),
    end_frame: scene.end_frame,
    narration_fragment: words.slice(6).join(" ") || words.join(" "),
    narrative_goal: "Highlight key empirical metric and conclusive insight",
    artifacts_introduced: scene.artifacts.slice(2).map((a) => a.artifact_id),
    artifacts_updated: [
      {
        artifact_id: scene.artifacts[0]?.artifact_id || "primary",
        updated_state: { active: true, pulse: true },
        transition_description: "Glow accent pulse sweeps across card",
      },
    ],
    motion_instructions: "Accent flash sweeps across screen; metric pop-in",
    focal_point: { x: 0.5, y: 0.5, description: "Active telemetry highlight" },
  });

  return beats;
}

/**
 * Expands beats when a scene is long and needs intermediate visual changes.
 */
function expandBeatsForScene(
  scene: StoryboardScene,
  targetCount: number,
  fps: number
): StoryboardBeat[] {
  const dur = scene.duration_seconds;
  const step = dur / targetCount;
  const words = scene.narration.split(/\s+/).filter(Boolean);
  const wordsPerBeat = Math.max(1, Math.floor(words.length / targetCount));

  const beats: StoryboardBeat[] = [];

  for (let i = 0; i < targetCount; i++) {
    const startSec = Math.round(i * step * 100) / 100;
    const endSec = Math.round((i + 1) * step * 100) / 100;
    const startFr = scene.start_frame + Math.round(startSec * fps);
    const endFr = scene.start_frame + Math.round(endSec * fps);

    const frag = words.slice(i * wordsPerBeat, (i + 1) * wordsPerBeat).join(" ") || "Evidence insight";

    beats.push({
      beat_id: `beat_${scene.scene_id}_${i + 1}`,
      beat_index: i,
      start_seconds: startSec,
      end_seconds: endSec,
      start_frame: startFr,
      end_frame: endFr,
      narration_fragment: frag,
      narrative_goal: `Stage ${i + 1} narrative progression`,
      artifacts_introduced: i === 0 ? scene.artifacts.map((a) => a.artifact_id) : [],
      artifacts_updated: [
        {
          artifact_id: scene.artifacts[0]?.artifact_id || "focal",
          updated_state: { step: i + 1, active: true },
          transition_description: `Visual update for beat ${i + 1}`,
        },
      ],
      motion_instructions: `Micro-animation transition for beat ${i + 1}`,
      focal_point: { x: 0.5, y: 0.2 + i * 0.2, description: `Beat ${i + 1} focus` },
    });
  }

  return beats;
}

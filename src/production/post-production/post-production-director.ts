/**
 * Post-Production Director.
 *
 * Transforms the raw script, narration audio timings, storyboard artifacts,
 * and scene compositions into an automated, frame-accurate Editing Plan.
 *
 * Coordinates:
 * - Camera motion (push-in, pull-out, focus pan, subtle drift)
 * - Motion graphics presets (headline impact, diagram build, chart growth)
 * - Sound design placement (whooshes, hits, digital confirms, accents)
 * - Dynamic internal visual progression (1.5 - 2.5s beat cadence)
 */

import fs from "fs";
import path from "path";
import type { VideoBlueprint, TimelineBlueprint, TimelineScene } from "../../video-engine/types";
import { buildTimeline } from "../../video-engine/timeline/build-timeline";
import type { ScriptDocument } from "../types";
import type {
  PostProductionPlan,
  EditingEvent,
  SoundEffectCue,
  MotionPresetType,
  TransitionPresetType,
  SoundEffectId,
} from "./post-production-types";
import { validateEditingPlan } from "./editing-plan-validator";
import { ensureSfxLibrary } from "../audio/sfx-generator";

export interface PostProductionDirectorOptions {
  forceDeterministic?: boolean;
  baseDir?: string;
  projectId?: string;
  jobId?: string;
}

export class PostProductionDirector {
  public directPostProduction(
    blueprint: VideoBlueprint,
    script: ScriptDocument,
    projectDir: string,
    options: PostProductionDirectorOptions = {}
  ): PostProductionPlan {
    // 1. Ensure SFX assets exist on disk
    ensureSfxLibrary();

    const fps = blueprint.fps || 60;
    const timeline: TimelineBlueprint =
      "totalFrames" in blueprint && Array.isArray((blueprint as TimelineBlueprint).scenes) && "startFrame" in (blueprint as TimelineBlueprint).scenes[0]
        ? (blueprint as TimelineBlueprint)
        : buildTimeline(blueprint);

    const events: EditingEvent[] = [];
    const soundCues: SoundEffectCue[] = [];

    // 2. Iterate each scene and generate choreographed editing decisions
    timeline.scenes.forEach((scene: TimelineScene, sceneIdx: number) => {
      const sceneStartFrame = scene.startFrame;
      const sceneDurFrames = scene.durationFrames;
      const isFirstScene = sceneIdx === 0;
      const isLastScene = sceneIdx === timeline.scenes.length - 1;
      const purpose = (scene.purpose || "content").toLowerCase();

      // ── A. Scene Entrance Transition & Motion Event ───
      let entranceMotion: MotionPresetType = "smoothReveal";
      let transitionType: TransitionPresetType = "cut";
      let entranceSfx: SoundEffectId | undefined = "whoosh_soft";

      if (isFirstScene) {
        entranceMotion = "headlineImpact";
        transitionType = "cut";
        entranceSfx = "hit_cinematic";
      } else if (purpose === "architecture" || scene.scene_type === "system_architecture") {
        entranceMotion = "diagramBuild";
        transitionType = "cut";
        entranceSfx = "riser_short";
      } else if (purpose === "problem" || scene.scene_type === "split_callout") {
        entranceMotion = "smoothReveal";
        transitionType = "directional_wipe";
        entranceSfx = "sweep_transition";
      } else if (purpose === "evidence_statistic" || scene.scene_type === "stat_counter" || scene.scene_type === "bar_chart") {
        entranceMotion = "chartBuild";
        transitionType = "cut";
        entranceSfx = "digital_confirm";
      } else if (purpose === "limitations" || scene.scene_type === "quote_insight") {
        entranceMotion = "evidenceReveal";
        transitionType = "cut";
        entranceSfx = "impact_subtle";
      } else if (isLastScene) {
        entranceMotion = "closingResolve";
        transitionType = "cut";
        entranceSfx = "whoosh_soft";
      }

      // Add entrance motion event
      events.push({
        eventId: `evt_${scene.id}_entrance`,
        sceneId: scene.id,
        startFrame: sceneStartFrame,
        durationFrames: Math.min(sceneDurFrames, Math.round(0.45 * fps)),
        eventType: "motion_graphic",
        motionPreset: entranceMotion,
        targetArtifactId: `art_${scene.id}_primary`,
        transitionPreset: transitionType,
        soundEffectId: entranceSfx,
        intensity: isFirstScene ? 0.95 : 0.75,
        priority: 1,
        reason: `Scene entrance for purpose: ${purpose}`,
        validationStatus: "validated",
      });

      // Add entrance sound cue if assigned
      if (entranceSfx) {
        soundCues.push({
          soundEffectId: entranceSfx,
          timestamp_seconds: sceneStartFrame / fps,
          frame: sceneStartFrame,
          volume: isFirstScene ? 0.28 : 0.20,
          reason: `Entrance accent for ${scene.id} (${purpose})`,
          sceneId: scene.id,
        });
      }

      // ── B. Camera Director Movement ────────────────────
      const cameraPreset: MotionPresetType =
        isFirstScene
          ? "cameraPushIn"
          : purpose === "architecture" || purpose === "mechanism"
          ? "focusPan"
          : purpose === "evidence_statistic"
          ? "cameraPushIn"
          : "imageParallax";

      events.push({
        eventId: `evt_${scene.id}_camera`,
        sceneId: scene.id,
        startFrame: sceneStartFrame,
        durationFrames: sceneDurFrames,
        eventType: "camera_move",
        motionPreset: cameraPreset,
        intensity: 0.5,
        priority: 3,
        reason: `Camera dynamism for ${scene.id} to avoid static plateau`,
        validationStatus: "validated",
      });

      // ── C. Internal Visual Beats & Artifact Choreography ──
      // Subdivide scene into internal visual changes every 1.5 - 2.5s
      const beats = scene.beats && scene.beats.length > 0
        ? scene.beats
        : [
            {
              beat_id: `b_${scene.id}_1`,
              start_seconds: 0.8,
              duration_seconds: 1.5,
              type: "highlight",
              label: "Primary mechanism focus",
            },
            {
              beat_id: `b_${scene.id}_2`,
              start_seconds: 2.5,
              duration_seconds: 1.8,
              type: "highlight",
              label: "Supporting telemetry and citations",
            },
          ];

      beats.forEach((b, beatIdx) => {
        const beatStartFrame = sceneStartFrame + Math.round((b.start_seconds || 1.0) * fps);
        if (beatStartFrame < sceneStartFrame + sceneDurFrames - 15) {
          const beatDuration = Math.round((b.duration_seconds || 1.2) * fps);
          const isNodeOrCode =
            scene.scene_type === "system_architecture" ||
            scene.scene_type === "code_terminal" ||
            scene.scene_type === "process_flow";

          const beatMotion: MotionPresetType = isNodeOrCode
            ? "nodeHighlight"
            : beatIdx === 0
            ? "focusPan"
            : "captionEmphasis";

          const beatSfx: SoundEffectId = isNodeOrCode
            ? "ui_click"
            : beatIdx === 0
            ? "accent_clean"
            : "digital_confirm";

          events.push({
            eventId: `evt_${scene.id}_beat_${beatIdx + 1}`,
            sceneId: scene.id,
            startFrame: beatStartFrame,
            durationFrames: Math.min(beatDuration, sceneDurFrames - (beatStartFrame - sceneStartFrame)),
            eventType: "artifact_focus",
            motionPreset: beatMotion,
            targetArtifactId: `art_${scene.id}_beat_${beatIdx + 1}`,
            soundEffectId: beatSfx,
            intensity: 0.65,
            priority: 2,
            reason: b.label || `Internal visual beat ${beatIdx + 1}`,
            validationStatus: "validated",
          });

          // Tasteful sound cue on internal action
          soundCues.push({
            soundEffectId: beatSfx,
            timestamp_seconds: beatStartFrame / fps,
            frame: beatStartFrame,
            volume: 0.16,
            reason: `Internal beat ${beatIdx + 1} (${b.label || "detail reveal"})`,
            sceneId: scene.id,
          });
        }
      });
    });

    const rawPlan: PostProductionPlan = {
      planId: `post_prod_${path.basename(projectDir)}`,
      jobId: options.jobId,
      projectId: options.projectId || path.basename(projectDir),
      totalFrames: timeline.totalFrames,
      fps,
      events,
      sound_cues: soundCues,
      pacing: {
        average_beat_interval_seconds:
          events.length > 0 ? (timeline.totalFrames / fps) / events.length : 2.0,
        total_visual_changes: events.length,
        sound_events_count: soundCues.length,
        camera_moves_count: events.filter((e) => e.eventType === "camera_move").length,
        motion_graphics_count: events.filter((e) => e.eventType === "motion_graphic").length,
      },
      created_at: new Date().toISOString(),
    };

    // 3. Run rigorous automated validation pass
    const validation = validateEditingPlan(rawPlan, blueprint);
    const finalPlan = validation.repairedPlan;

    // 4. Persist editing plan to project directory
    const planPath = path.join(projectDir, "editing_plan.json");
    fs.writeFileSync(planPath, JSON.stringify(finalPlan, null, 2), "utf-8");

    // 5. Attach editing plan onto blueprint for Remotion runtime access
    (blueprint as unknown as Record<string, unknown>).editing_plan = finalPlan;

    return finalPlan;
  }
}

/**
 * Timeline Engine.
 *
 * Converts scene duration hints, measured audio tracks, and transitions into
 * integer frame boundaries with deterministic precision.
 */

import type {
  VideoBlueprint,
  TimelineBlueprint,
  TimelineScene,
} from "../types";

export interface AudioDurationMap {
  [sceneId: string]: number; // measured audio duration in seconds
}

export function secondsToFrames(seconds: number, fps: number): number {
  return Math.max(1, Math.round(seconds * fps));
}

export function framesToSeconds(frames: number, fps: number): number {
  return frames / fps;
}

/**
 * Builds an absolute frame-based timeline for all scenes in a video blueprint.
 */
export function buildTimeline(
  blueprint: VideoBlueprint,
  audioDurations: AudioDurationMap = {}
): TimelineBlueprint {
  const fps = blueprint.fps || 60;
  const timelineScenes: TimelineScene[] = [];

  let currentFrame = 0;

  for (let i = 0; i < blueprint.scenes.length; i++) {
    const scene = blueprint.scenes[i];

    // Priority: measured audio duration > scene duration hint
    const measuredAudioSec = audioDurations[scene.id];
    let durationSeconds = scene.duration_hint_seconds || 5;

    if (measuredAudioSec !== undefined && measuredAudioSec > 0) {
      // Add slight pad (0.3s) so audio doesn't abruptly clip at scene border
      durationSeconds = Math.max(durationSeconds, measuredAudioSec + 0.3);
    }

    const durationFrames = secondsToFrames(durationSeconds, fps);

    // Calculate transition overlap with next scene
    let transitionOverlapFrames = 0;
    if (scene.transition_out && scene.transition_out.type !== "cut" && i < blueprint.scenes.length - 1) {
      const transSec = scene.transition_out.duration_seconds ?? 0.3;
      transitionOverlapFrames = secondsToFrames(transSec, fps);
    }

    const startFrame = currentFrame;
    const endFrame = startFrame + durationFrames;

    timelineScenes.push({
      ...scene,
      startFrame,
      endFrame,
      durationFrames,
      transitionOverlapFrames,
      measuredAudioDurationSeconds: measuredAudioSec,
    });

    // Advance timeline, subtracting overlap frames if transition blends into next scene
    currentFrame = endFrame - transitionOverlapFrames;
  }

  const totalFrames = Math.max(1, currentFrame);
  const totalDurationSeconds = framesToSeconds(totalFrames, fps);

  return {
    ...blueprint,
    scenes: timelineScenes,
    totalFrames,
    totalDurationSeconds,
  };
}

/**
 * Editing Plan Validator.
 * Validates post-production editing plans for frame boundaries, scene references,
 * sound design spacing, and pacing density.
 */

import type { PostProductionPlan, EditingEvent, SoundEffectCue } from "./post-production-types";
import type { VideoBlueprint } from "../../video-engine/types";

export interface ValidationReport {
  valid: boolean;
  errors: string[];
  warnings: string[];
  repairedPlan: PostProductionPlan;
}

export function validateEditingPlan(
  plan: PostProductionPlan,
  blueprint: VideoBlueprint
): ValidationReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const fps = plan.fps || 60;
  const totalFrames = plan.totalFrames;
  const validSceneIds = new Set(blueprint.scenes.map((s) => s.id));

  const validEvents: EditingEvent[] = [];

  for (const evt of plan.events) {
    let repaired = false;

    // Check scene reference
    if (!validSceneIds.has(evt.sceneId)) {
      errors.push(`Event "${evt.eventId}" references non-existent scene "${evt.sceneId}".`);
      continue;
    }

    // Check frame bounds
    if (evt.startFrame < 0) {
      warnings.push(`Event "${evt.eventId}" has negative startFrame (${evt.startFrame}), clamped to 0.`);
      evt.startFrame = 0;
      repaired = true;
    }

    if (evt.durationFrames <= 0) {
      warnings.push(`Event "${evt.eventId}" has non-positive durationFrames (${evt.durationFrames}), defaulted to 30.`);
      evt.durationFrames = Math.round(0.5 * fps);
      repaired = true;
    }

    if (evt.startFrame + evt.durationFrames > totalFrames) {
      warnings.push(
        `Event "${evt.eventId}" exceeds totalFrames (${evt.startFrame + evt.durationFrames} > ${totalFrames}), clamped.`
      );
      evt.durationFrames = Math.max(1, totalFrames - evt.startFrame);
      repaired = true;
    }

    // Intensity clamp
    evt.intensity = Math.max(0.1, Math.min(1.0, evt.intensity || 0.7));

    if (repaired) {
      evt.validationStatus = "repaired";
    }

    validEvents.push(evt);
  }

  // Validate sound cues: eliminate duplicates within 150ms
  const cleanedSoundCues: SoundEffectCue[] = [];
  const sortedCues = [...plan.sound_cues].sort((a, b) => a.timestamp_seconds - b.timestamp_seconds);

  for (let i = 0; i < sortedCues.length; i++) {
    const cue = sortedCues[i];
    const maxSec = totalFrames / fps;

    if (cue.timestamp_seconds < 0 || cue.timestamp_seconds > maxSec) {
      warnings.push(`Sound cue "${cue.soundEffectId}" at ${cue.timestamp_seconds.toFixed(2)}s outside composition.`);
      continue;
    }

    // Deduplicate rapid identical cues
    const prev = cleanedSoundCues[cleanedSoundCues.length - 1];
    if (prev && prev.soundEffectId === cue.soundEffectId && Math.abs(cue.timestamp_seconds - prev.timestamp_seconds) < 0.15) {
      warnings.push(`Deduplicated identical SFX "${cue.soundEffectId}" within 150ms.`);
      continue;
    }

    // Safety clamp volume: 0.05 to 0.40 to prevent speech masking
    cue.volume = Math.max(0.05, Math.min(0.40, cue.volume || 0.20));
    cleanedSoundCues.push(cue);
  }

  // Pacing check: detect visual dead zones > 3.5 seconds
  validEvents.sort((a, b) => a.startFrame - b.startFrame);
  for (let i = 1; i < validEvents.length; i++) {
    const gapSec = (validEvents[i].startFrame - (validEvents[i - 1].startFrame + validEvents[i - 1].durationFrames)) / fps;
    if (gapSec > 4.0) {
      warnings.push(`Visual plateau detected between frame ${validEvents[i - 1].startFrame} and ${validEvents[i].startFrame} (${gapSec.toFixed(2)}s gap).`);
    }
  }

  const repairedPlan: PostProductionPlan = {
    ...plan,
    events: validEvents,
    sound_cues: cleanedSoundCues,
    pacing: {
      average_beat_interval_seconds:
        validEvents.length > 1
          ? (totalFrames / fps) / validEvents.length
          : totalFrames / fps,
      total_visual_changes: validEvents.length,
      sound_events_count: cleanedSoundCues.length,
      camera_moves_count: validEvents.filter((e) => e.eventType === "camera_move").length,
      motion_graphics_count: validEvents.filter((e) => e.eventType === "motion_graphic").length,
    },
    validation_status: errors.length === 0 ? "valid" : "repaired",
  };

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    repairedPlan,
  };
}

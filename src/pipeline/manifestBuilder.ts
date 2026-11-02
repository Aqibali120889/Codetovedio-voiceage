/**
 * Manifest builder — generates the JSON input manifest for Remotion.
 * Links script, audio paths, and subtitle timing.
 */

import type {
  ScriptSchema,
  AudioMetadata,
  SubtitleResult,
  RenderManifest,
  SceneManifestEntry,
} from "./types";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";

const COMPOSITION_ID = "AIVideoStudio";
const FPS = 60;
const WIDTH = 1080;
const HEIGHT = 1920;

export function buildManifest(
  projectId: string,
  script: ScriptSchema,
  audioMap: Map<string, AudioMetadata>,
  subtitleResult: SubtitleResult,
  projectDir: string
): RenderManifest {
  let startFrame = 0;
  const scenes: SceneManifestEntry[] = [];

  for (const scene of script.scenes) {
    const audio = audioMap.get(scene.id);
    const durationSeconds =
      audio?.durationSeconds ?? scene.duration_hint_seconds;
    const durationFrames = Math.max(1, Math.round(durationSeconds * FPS));
    const endFrame = startFrame + durationFrames;

    // Copy audio to public/ so Remotion staticFile() can load it reliably
    let relativeAudioPath: string | null = null;
    if (audio?.path && fs.existsSync(audio.path)) {
      const publicNarrationDir = path.resolve(
        __dirname,
        "../../public/projects",
        projectId,
        "narration"
      );
      fs.mkdirSync(publicNarrationDir, { recursive: true });
      const publicAudioDest = path.join(publicNarrationDir, `${scene.id}.wav`);
      try {
        fs.copyFileSync(audio.path, publicAudioDest);
        relativeAudioPath = `projects/${projectId}/narration/${scene.id}.wav`;
      } catch {
        relativeAudioPath = audio.path;
      }
    }

    scenes.push({
      sceneId: scene.id,
      narration: scene.narration,
      visual_description: scene.visual_description,
      on_screen_text: scene.on_screen_text,
      audioPath: relativeAudioPath,
      startFrame,
      endFrame,
      durationFrames,
      purpose: scene.purpose,
      scene_type: scene.scene_type,
      layout: scene.layout,
      visual_concept: scene.visual_concept,
      data_points: scene.data_points,
      nodes: scene.nodes,
      terminal_lines: scene.terminal_lines,
      comparison: scene.comparison,
      accent_color: scene.accent_color,
    });

    startFrame = endFrame;
  }

  const totalFrames = startFrame;
  const totalDurationSeconds = totalFrames / FPS;

  const manifest: RenderManifest = {
    projectId,
    compositionId: COMPOSITION_ID,
    fps: FPS,
    width: WIDTH,
    height: HEIGHT,
    totalFrames,
    totalDurationSeconds,
    scenes,
    subtitles: subtitleResult.segments,
    scriptPath: path.join(projectDir, "script.json"),
    generatedAt: new Date().toISOString(),
  };

  const manifestPath = path.join(projectDir, "manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  return manifest;
}

export function generateProjectId(): string {
  return uuidv4();
}

export function createProjectDir(baseDir: string, projectId: string): string {
  const dir = path.join(baseDir, projectId);
  const subdirs = ["narration", "subtitles", "render"];
  fs.mkdirSync(dir, { recursive: true });
  for (const sub of subdirs) {
    fs.mkdirSync(path.join(dir, sub), { recursive: true });
  }
  return dir;
}

/**
 * Pipeline orchestrator — runs all stages in sequence.
 * Each stage is independently recoverable; partial outputs are preserved.
 */

import fs from "fs";
import path from "path";
import { getConfig, checkCredentials } from "./config";
import type { TopicRequest, ScriptSchema, PipelineResult, TtsResult } from "./types";
import {
  generateScriptFromTopic,
  structureUserScript,
  generateSpeech,
  getAudioMetadata,
  type TtsOptions,
} from "./geminiProvider";
import { validateScript } from "./scriptValidator";
import { generateSubtitles } from "./subtitleGenerator";
import {
  buildManifest,
  generateProjectId,
  createProjectDir,
} from "./manifestBuilder";
import type { AudioMetadata } from "./types";
import {
  concatenateSceneAudios,
  isAudioAudible,
  muxAudioOntoVideo,
} from "./audioMuxer";

// ============================================================
// Input types
// ============================================================

export interface TopicModeInput {
  mode: "topic";
  request: TopicRequest;
}

export interface ScriptModeInput {
  mode: "script";
  rawScript: string;
  context?: {
    topic?: string;
    platform?: string;
    language?: string;
    call_to_action?: string;
  };
}

export interface StructuredScriptModeInput {
  mode: "structured_script";
  script: ScriptSchema;
}

export type PipelineInput =
  | TopicModeInput
  | ScriptModeInput
  | StructuredScriptModeInput;

// ============================================================
// Orchestrator
// ============================================================

export async function runPipeline(input: PipelineInput): Promise<PipelineResult> {
  const credError = checkCredentials();
  if (credError) {
    return {
      projectId: "none",
      status: "error",
      completedStages: [],
      error: { stage: "validate_request", message: credError, recoverable: false },
      outputDir: "",
    };
  }

  const config = getConfig();
  const projectId = generateProjectId();
  const projectDir = createProjectDir(config.outputBaseDir, projectId);

  console.log(`\n[pipeline] Project: ${projectId}`);
  console.log(`[pipeline] Output:  ${projectDir}`);

  const result: PipelineResult = {
    projectId,
    status: "partial",
    completedStages: [],
    outputDir: projectDir,
  };

  // ── Stage 1: Validate request ──────────────────────────────
  console.log("\n[pipeline] Stage: validate_request");
  if (input.mode === "topic" && !input.request.topic.trim()) {
    result.error = {
      stage: "validate_request",
      message: "Topic cannot be empty.",
      recoverable: false,
    };
    result.status = "error";
    return result;
  }
  result.completedStages.push("validate_request");

  // ── Stage 2: Generate or accept script ────────────────────
  console.log("\n[pipeline] Stage: generate_script");
  let script: ScriptSchema;

  try {
    if (input.mode === "topic") {
      const { script: s } = await generateScriptFromTopic(input.request, config);
      script = s;
    } else if (input.mode === "script") {
      const { script: s } = await structureUserScript(
        input.rawScript,
        input.context ?? {},
        config
      );
      script = s;
    } else {
      // structured_script mode — user supplied validated JSON
      script = input.script;
    }
  } catch (err) {
    result.error = {
      stage: "generate_script",
      message: (err as Error).message,
      recoverable: false,
    };
    result.status = "error";
    return result;
  }

  result.completedStages.push("generate_script");

  // ── Stage 3: Validate script ──────────────────────────────
  console.log("\n[pipeline] Stage: validate_script");
  const validation = validateScript(script);
  if (!validation.valid) {
    result.error = {
      stage: "validate_script",
      message: `Script validation failed: ${validation.errors.join("; ")}`,
      recoverable: false,
    };
    result.status = "error";
    return result;
  }

  const scriptPath = path.join(projectDir, "script.json");
  fs.writeFileSync(
    scriptPath,
    JSON.stringify({ ...script, _validation_warnings: validation.warnings }, null, 2)
  );
  result.scriptPath = scriptPath;
  result.completedStages.push("validate_script");
  console.log(`[pipeline] Script saved: ${scriptPath}`);

  // ── Stage 4: Generate narration ───────────────────────────
  console.log("\n[pipeline] Stage: generate_narration");
  const audioMap = new Map<string, AudioMetadata>();
  const ttsResults: TtsResult[] = [];
  const ttsOptions: TtsOptions = {};
  let ttsError: string | null = null;

  for (const scene of script.scenes) {
    const audioPath = path.join(projectDir, "narration", `${scene.id}.wav`);
    try {
      // Check cache — don't regenerate if audio already exists
      if (fs.existsSync(audioPath)) {
        const stat = fs.statSync(audioPath);
        if (stat.size > 0) {
          console.log(`[pipeline] Using cached audio for ${scene.id}`);
          const meta = await getAudioMetadata(audioPath, config.ttsModel);
          audioMap.set(scene.id, meta);
          ttsResults.push({ sceneId: scene.id, audio: meta, status: "success" });
          continue;
        }
      }

      const meta = await generateSpeech(
        scene.narration,
        audioPath,
        config,
        ttsOptions
      );
      audioMap.set(scene.id, meta);
      ttsResults.push({ sceneId: scene.id, audio: meta, status: "success" });
      console.log(
        `[pipeline] ${scene.id}: ${meta.durationSeconds.toFixed(2)}s audio generated`
      );
    } catch (err) {
      const errMsg = (err as Error).message;
      console.error(`[pipeline] TTS error for ${scene.id}: ${errMsg}`);
      ttsResults.push({
        sceneId: scene.id,
        audio: {} as AudioMetadata,
        status: "error",
        error: errMsg,
      });
      ttsError = errMsg;
    }
  }

  // Save TTS results
  fs.writeFileSync(
    path.join(projectDir, "narration", "tts_results.json"),
    JSON.stringify(ttsResults, null, 2)
  );

  if (ttsError && audioMap.size === 0) {
    result.error = {
      stage: "generate_narration",
      message: `TTS failed for all scenes. First error: ${ttsError}`,
      recoverable: true,
    };
    result.status = "error";
    return result;
  }

  result.completedStages.push("generate_narration");
  result.completedStages.push("measure_audio");

  // Assemble full narration audio track
  let fullAudioPath: string | null = null;
  try {
    fullAudioPath = await concatenateSceneAudios(
      path.join(projectDir, "narration"),
      script.scenes.map((s) => s.id)
    );
    console.log(`[pipeline] Assembled full narration audio: ${fullAudioPath}`);
  } catch (err) {
    console.warn(
      `[pipeline] Audio concatenation warning: ${(err as Error).message}`
    );
  }

  // ── Stage 5: Generate subtitles ───────────────────────────
  console.log("\n[pipeline] Stage: generate_subtitles");
  let subtitleResult;
  try {
    subtitleResult = generateSubtitles(script, audioMap, 60, projectDir);
    console.log(
      `[pipeline] Subtitles: ${subtitleResult.segments.length} segments, ` +
        `${subtitleResult.totalDurationSeconds.toFixed(2)}s total`
    );
    result.completedStages.push("generate_subtitles");
  } catch (err) {
    result.error = {
      stage: "generate_subtitles",
      message: (err as Error).message,
      recoverable: false,
    };
    result.status = "error";
    return result;
  }

  // ── Stage 6: Create manifest ──────────────────────────────
  console.log("\n[pipeline] Stage: create_manifest");
  try {
    const manifest = buildManifest(
      projectId,
      script,
      audioMap,
      subtitleResult,
      projectDir
    );
    const manifestPath = path.join(projectDir, "manifest.json");
    result.manifestPath = manifestPath;
    result.durationSeconds = manifest.totalDurationSeconds;
    result.completedStages.push("create_manifest");
    console.log(
      `[pipeline] Manifest: ${manifest.totalFrames} frames (${manifest.totalDurationSeconds.toFixed(2)}s)`
    );
  } catch (err) {
    result.error = {
      stage: "create_manifest",
      message: (err as Error).message,
      recoverable: false,
    };
    result.status = "error";
    return result;
  }

  // ── Stage 7: Render video ─────────────────────────────────
  console.log("\n[pipeline] Stage: render_video");
  const renderPath = path.join(projectDir, "render", "final.mp4");
  try {
    await renderVideo(projectId, projectDir, renderPath, result.manifestPath!);
    result.renderPath = renderPath;

    // Verify audio stream and multiplex full narration track if silent
    if (fullAudioPath && fs.existsSync(fullAudioPath)) {
      const audible = await isAudioAudible(renderPath);
      if (!audible) {
        console.log(
          "[pipeline] Remotion rendered silent audio — multiplexing narration track via ffmpeg..."
        );
        await muxAudioOntoVideo(renderPath, fullAudioPath);
        console.log("[pipeline] ✓ Audio track successfully multiplexed onto video!");
      } else {
        console.log("[pipeline] ✓ Rendered video audio stream verified audible.");
      }
    }

    result.completedStages.push("render_video");
    console.log(`[pipeline] ✓ Render complete: ${renderPath}`);
  } catch (err) {
    result.error = {
      stage: "render_video",
      message: (err as Error).message,
      recoverable: true,
    };
    // Partial success — pre-render stages all succeeded
    result.status = "partial";
    return result;
  }

  result.status = "success";
  console.log(`\n[pipeline] ✓ Pipeline complete — project: ${projectId}`);
  return result;
}

// ============================================================
// Remotion render subprocess
// ============================================================

async function renderVideo(
  projectId: string,
  projectDir: string,
  outputPath: string,
  manifestPath: string
): Promise<void> {
  const { spawn } = await import("child_process");

  // Remotion render via npx remotion render
  // The props are passed via --props pointing to the manifest JSON
  const repoRoot = path.resolve(__dirname, "../..");
  const remotionCli = path.join(
    repoRoot,
    "node_modules",
    "@remotion",
    "cli",
    "remotion-cli.js"
  );

  const args = [
    remotionCli,
    "render",
    "AIVideoStudio",
    outputPath,
    "--props",
    manifestPath,
    "--overwrite",
    "--muted",
  ];

  console.log(`[pipeline] Running: node ${remotionCli} render AIVideoStudio ...`);

  return new Promise((resolve, reject) => {
    const proc = spawn(process.execPath, args, {
      cwd: repoRoot,
      stdio: ["ignore", "pipe", "pipe"],
      shell: false,
    });

    let stdout = "";
    let stderr = "";
    proc.stdout?.on("data", (d: Buffer) => {
      const text = d.toString();
      stdout += text;
      process.stdout.write(text);
    });
    proc.stderr?.on("data", (d: Buffer) => {
      const text = d.toString();
      stderr += text;
      process.stderr.write(text);
    });

    proc.on("close", (code) => {
      if (code !== 0) {
        reject(
          new Error(
            `Remotion render exited with code ${code}.\nstderr: ${stderr.slice(-1000)}`
          )
        );
      } else {
        // Verify output exists and is non-empty
        try {
          const stat = fs.statSync(outputPath);
          if (stat.size === 0) {
            reject(new Error("Render produced an empty file."));
          } else {
            resolve();
          }
        } catch {
          reject(new Error(`Render output not found at ${outputPath}`));
        }
      }
    });

    proc.on("error", (e) => {
      reject(new Error(`Render spawn error: ${e.message}`));
    });
  });
}

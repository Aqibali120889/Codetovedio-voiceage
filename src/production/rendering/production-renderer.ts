/**
 * Production Video Renderer.
 * Orchestrates headless Remotion rendering of validated VideoBlueprints,
 * audio stream verification, and ffmpeg multiplexing.
 */

import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import type { VideoBlueprint } from "../../video-engine/types";
import { buildTimeline } from "../../video-engine/timeline/build-timeline";
import { muxAudioOntoVideo } from "../../pipeline/audioMuxer";

export interface RenderResult {
  renderPath: string;
  totalDurationSeconds: number;
  totalFrames: number;
  stillThumbnails: string[];
}

export async function renderProductionVideo(
  blueprint: VideoBlueprint,
  projectDir: string,
  mixedAudioPath?: string,
  options: { compositionId?: string; concurrency?: number; chunkSize?: number } = {}
): Promise<RenderResult> {
  const renderDir = path.join(projectDir, "render");
  if (!fs.existsSync(renderDir)) {
    fs.mkdirSync(renderDir, { recursive: true });
  }

  const compositionId = options.compositionId || "ProductionVideo";
  const outputPath = path.join(renderDir, "final.mp4");
  const blueprintPath = path.join(projectDir, "blueprint.json");

  // Calculate timeline
  const timeline = buildTimeline(blueprint);

  // Write blueprint JSON props with isProductionRender flag
  fs.writeFileSync(
    blueprintPath,
    JSON.stringify({ blueprint, isProductionRender: true }, null, 2),
    "utf-8"
  );

  const repoRoot = path.resolve(process.cwd());
  const remotionCli = path.join(
    repoRoot,
    "node_modules",
    "@remotion",
    "cli",
    "remotion-cli.js"
  );

  // Guarantee narration directory is mirrored in both public/projects/<projectId>/narration/
  // and build/public/projects/<projectId>/narration/ (when pre-bundled build exists)
  const projectId = path.basename(projectDir);
  const localNarrationDir = path.join(projectDir, "narration");
  const targetProjectDirs = [
    path.resolve(repoRoot, "public", "projects"),
    path.resolve(repoRoot, "build", "public", "projects"),
  ];

  for (const pProjectsDir of targetProjectDirs) {
    if (fs.existsSync(pProjectsDir)) {
      for (const item of fs.readdirSync(pProjectsDir)) {
        if (item !== projectId) {
          try {
            fs.rmSync(path.join(pProjectsDir, item), { recursive: true, force: true });
          } catch {
            // ignore
          }
        }
      }
    }

    if (fs.existsSync(localNarrationDir)) {
      const targetNarrationDir = path.resolve(pProjectsDir, projectId, "narration");
      fs.mkdirSync(targetNarrationDir, { recursive: true });
      for (const f of fs.readdirSync(localNarrationDir)) {
        try {
          fs.copyFileSync(path.join(localNarrationDir, f), path.join(targetNarrationDir, f));
        } catch {
          // ignore
        }
      }
    }
  }

  const totalFrames = timeline.totalFrames;
  const chunkSize = options.chunkSize || 75;
  const numChunks = Math.ceil(totalFrames / chunkSize);
  const concurrency = options.concurrency || 4;
  const renderTempDir = path.resolve(repoRoot, "tmp", "remotion-render");
  fs.mkdirSync(renderTempDir, { recursive: true });

  const chunkFiles: string[] = [];
  const buildDir = path.join(repoRoot, "build");
  const useBuild = fs.existsSync(buildDir);

  for (let c = 0; c < numChunks; c++) {
    const start = c * chunkSize;
    const end = Math.min(totalFrames - 1, (c + 1) * chunkSize - 1);
    const chunkPath = numChunks === 1 ? outputPath : path.join(renderDir, `chunk_${c}.mp4`);
    chunkFiles.push(chunkPath);

    // Skip if chunk already rendered and valid
    if (fs.existsSync(chunkPath) && fs.statSync(chunkPath).size > 50000) {
      console.log(
        `[ProductionRenderer] Chunk ${c + 1}/${numChunks} already rendered (${(fs.statSync(chunkPath).size / 1024 / 1024).toFixed(2)} MB), skipping...`
      );
      continue;
    }

    console.log(
      `[ProductionRenderer] Rendering chunk ${c + 1}/${numChunks} (frames ${start}-${end}, concurrency: ${concurrency}x, prebundled: ${useBuild})...`
    );

    const chunkArgs = [
      "--max-old-space-size=4096",
      remotionCli,
      "render",
      ...(useBuild ? [buildDir] : []),
      compositionId,
      chunkPath,
      "--props",
      blueprintPath,
      `--frames=${start}-${end}`,
      "--public-dir",
      path.join(repoRoot, "public"),
      "--concurrency",
      String(concurrency),
      "--timeout",
      "240000",
      "--overwrite",
    ];

    await runRemotionProcess(chunkArgs, repoRoot, renderTempDir, chunkPath);
  }

  // Concatenate multiple chunks losslessly via ffmpeg
  if (numChunks > 1) {
    console.log(`[ProductionRenderer] Losslessly concatenating ${numChunks} video chunks via ffmpeg...`);
    const listFilePath = path.join(renderDir, "chunks.txt");
    const listContent = chunkFiles.map((f) => `file '${f.replace(/\\/g, "/")}'`).join("\n");
    fs.writeFileSync(listFilePath, listContent, "utf-8");

    await new Promise<void>((resolve, reject) => {
      const proc = spawn(
        "ffmpeg",
        [
          "-y",
          "-f",
          "concat",
          "-safe",
          "0",
          "-i",
          listFilePath,
          "-c",
          "copy",
          outputPath,
        ],
        { stdio: "ignore" }
      );
      proc.on("close", (code) => {
        if (code === 0 && fs.existsSync(outputPath)) {
          resolve();
        } else {
          reject(new Error(`FFmpeg chunk concatenation failed with exit code ${code}`));
        }
      });
      proc.on("error", reject);
    });

    // Prune individual chunk files and list manifest
    for (const f of chunkFiles) {
      try {
        fs.unlinkSync(f);
      } catch {}
    }
    try {
      fs.unlinkSync(listFilePath);
    } catch {}
  }

  // Multiplex balanced master mixed audio track (narration + speech-aware ducked BGM)
  if (mixedAudioPath && fs.existsSync(mixedAudioPath)) {
    console.log(
      "[ProductionRenderer] Multiplexing master mixed audio track (narration + speech-aware ducked BGM) via ffmpeg..."
    );
    await muxAudioOntoVideo(outputPath, mixedAudioPath);
    console.log("[ProductionRenderer] ✓ Master audio track successfully multiplexed!");
  }

  // Generate representative QA still frames across the video timeline via ffmpeg
  const stillThumbnails: string[] = [];
  const framesDir = path.join(renderDir, "frames");
  fs.mkdirSync(framesDir, { recursive: true });

  const targetTimes = [
    { name: "frame_begin.png", timeSec: Math.min(2.0, timeline.totalDurationSeconds * 0.1) },
    { name: "frame_mid.png", timeSec: timeline.totalDurationSeconds * 0.5 },
    { name: "frame_end.png", timeSec: Math.max(3.0, timeline.totalDurationSeconds * 0.85) },
  ];

  for (const tf of targetTimes) {
    try {
      const framePath = path.join(framesDir, tf.name);
      await extractFrameFromVideo(outputPath, framePath, tf.timeSec);
      if (fs.existsSync(framePath)) {
        stillThumbnails.push(framePath);
      }
    } catch (err) {
      console.warn(`[ProductionRenderer] Frame ${tf.name} (@${tf.timeSec}s) capture skipped: ${(err as Error).message}`);
    }
  }

  // Ensure default thumbnail.png exists
  const defaultThumb = path.join(renderDir, "thumbnail.png");
  if (stillThumbnails.length > 0 && !fs.existsSync(defaultThumb)) {
    try {
      fs.copyFileSync(stillThumbnails[0], defaultThumb);
    } catch {
      // ignore
    }
  }

  return {
    renderPath: outputPath,
    totalDurationSeconds: timeline.totalDurationSeconds,
    totalFrames: timeline.totalFrames,
    stillThumbnails,
  };
}

async function extractFrameFromVideo(
  videoPath: string,
  outputPath: string,
  timeSeconds: number
): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(
      "ffmpeg",
      [
        "-y",
        "-ss",
        timeSeconds.toFixed(3),
        "-i",
        videoPath,
        "-frames:v",
        "1",
        "-q:v",
        "2",
        outputPath,
      ],
      { stdio: "ignore" }
    );

    proc.on("close", (code) => {
      if (code === 0 && fs.existsSync(outputPath)) {
        resolve();
      } else {
        reject(new Error(`ffmpeg frame extraction exited with code ${code}`));
      }
    });
    proc.on("error", reject);
  });
}

async function runRemotionProcess(
  args: string[],
  cwd: string,
  tempDir: string,
  targetOutput: string
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const currentOptions = process.env.NODE_OPTIONS || "";
    const nodeOptions = currentOptions.includes("--max-old-space-size")
      ? currentOptions
      : `${currentOptions} --max-old-space-size=4096`.trim();

    const proc = spawn(process.execPath, args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
      shell: false,
      env: {
        ...process.env,
        NODE_OPTIONS: nodeOptions,
        TEMP: tempDir,
        TMP: tempDir,
        TMPDIR: tempDir,
      },
    });

    let stderr = "";
    proc.stderr?.on("data", (d: Buffer) => {
      const text = d.toString();
      stderr += text;
      try {
        process.stderr.write(text);
      } catch {
        // Ignore EPIPE when running in background pipes
      }
    });

    proc.stdout?.on("data", (d: Buffer) => {
      try {
        process.stdout.write(d.toString());
      } catch {
        // Ignore EPIPE when running in background pipes
      }
    });

    proc.on("close", (code) => {
      if (code === 0 && fs.existsSync(targetOutput)) {
        resolve();
      } else {
        reject(
          new Error(
            `Remotion render failed with exit code ${code}.\n${stderr.slice(-600)}`
          )
        );
      }
    });

    proc.on("error", (err) => {
      reject(new Error(`Failed to spawn Remotion CLI: ${err.message}`));
    });
  });
}

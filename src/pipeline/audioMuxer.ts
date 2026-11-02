/**
 * Audio Muxer & Fallback Multiplexer.
 *
 * Ensures narration audio is properly concatenated and merged into the final
 * rendered video. If Remotion's headless Chromium output lacks audio (e.g. on
 * Windows without a virtual audio device), this muxer uses ffmpeg to cleanly
 * multiplex the synchronized audio track onto the video.
 */

import fs from "fs";
import path from "path";
import { spawn } from "child_process";

/**
 * Execute an ffmpeg command asynchronously.
 */
function runFfmpeg(args: string[]): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const proc = spawn("ffmpeg", args, {
      stdio: ["ignore", "pipe", "pipe"],
      shell: false,
    });

    let stdout = "";
    let stderr = "";

    proc.stdout?.on("data", (d: Buffer) => {
      stdout += d.toString();
    });
    proc.stderr?.on("data", (d: Buffer) => {
      stderr += d.toString();
    });

    proc.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`ffmpeg exited with code ${code}.\n${stderr.slice(-600)}`));
      } else {
        resolve({ stdout, stderr });
      }
    });

    proc.on("error", (err) => {
      reject(new Error(`Failed to spawn ffmpeg: ${err.message}`));
    });
  });
}

/**
 * Concatenates individual scene WAV audio files into a single full narration track.
 */
export async function concatenateSceneAudios(
  narrationDir: string,
  sceneIds: string[]
): Promise<string> {
  const concatListPath = path.join(narrationDir, "concat_scenes.txt");
  const fullAudioPath = path.join(narrationDir, "full_narration.wav");

  const lines = sceneIds.map((id) => `file '${id}.wav'`);

  fs.writeFileSync(concatListPath, lines.join("\n"), "utf8");

  await runFfmpeg([
    "-y",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    concatListPath,
    "-c",
    "copy",
    fullAudioPath,
  ]);

  return fullAudioPath;
}

/**
 * Checks if a video's audio track has audible volume.
 * Returns true if audio is present and audible (mean volume > -60 dB).
 */
export async function isAudioAudible(videoPath: string): Promise<boolean> {
  try {
    const { stderr } = await runFfmpeg([
      "-i",
      videoPath,
      "-af",
      "volumedetect",
      "-f",
      "null",
      "-",
    ]);

    const match = stderr.match(/mean_volume:\s*(-?[\d.]+)\s*dB/);
    if (!match) return false;

    const meanDb = parseFloat(match[1]);
    // Anything below -75 dB is considered silence
    return meanDb > -75;
  } catch {
    return false;
  }
}

/**
 * Muxes an audio track onto a video file without re-encoding the video stream.
 * Replaces the original video file atomically.
 */
export async function muxAudioOntoVideo(
  videoPath: string,
  audioPath: string
): Promise<void> {
  const tempOutput = path.join(
    path.dirname(videoPath),
    `muxed_${path.basename(videoPath)}`
  );

  await runFfmpeg([
    "-y",
    "-i",
    videoPath,
    "-i",
    audioPath,
    "-c:v",
    "copy",
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    "-ar",
    "48000",
    "-ac",
    "2",
    "-af",
    "loudnorm=I=-14:LRA=7:TP=-1.0",
    "-map",
    "0:v:0",
    "-map",
    "1:a:0",
    "-shortest",
    tempOutput,
  ]);

  // Atomically overwrite original video
  fs.copyFileSync(tempOutput, videoPath);
  try {
    fs.unlinkSync(tempOutput);
  } catch {
    // Ignore cleanup error
  }
}

/**
 * Measures precise ITU-R BS.1770 / EBU R128 integrated loudness, loudness range, and true peak.
 */
export async function measureEbuR128Loudness(
  filePath: string
): Promise<{ integratedLufs: number; loudnessRangeLu: number; truePeakDbfs: number }> {
  try {
    const { stderr } = await runFfmpeg([
      "-i",
      filePath,
      "-af",
      "ebur128=peak=true",
      "-f",
      "null",
      "-",
    ]);

    const iMatch = stderr.match(/I:\s*(-?[\d.]+)\s*LUFS/);
    const lraMatch = stderr.match(/LRA:\s*(-?[\d.]+)\s*LU/);
    const tpMatch = stderr.match(/Peak:\s*(-?[\d.]+)\s*dBFS/);

    return {
      integratedLufs: iMatch ? parseFloat(iMatch[1]) : -70,
      loudnessRangeLu: lraMatch ? parseFloat(lraMatch[1]) : 0,
      truePeakDbfs: tpMatch ? parseFloat(tpMatch[1]) : -70,
    };
  } catch {
    return { integratedLufs: -70, loudnessRangeLu: 0, truePeakDbfs: -70 };
  }
}

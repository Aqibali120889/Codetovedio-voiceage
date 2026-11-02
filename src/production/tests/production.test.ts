/**
 * Milestone 3: End-to-End AI Video Production Pipeline Test Suite.
 *
 * Runs completely offline using Node.js assert.
 * Tests state machine, claim validation, scene planning, audio timing,
 * caption generation, audio mixing, branding, and end-to-end orchestration.
 */

import assert from "assert";
import fs from "fs";
import path from "path";
import os from "os";

import { JobStore } from "../state-machine/job-store";
import { ProductionJobManager } from "../state-machine/production-job";
import { validateScriptClaims } from "../scriptwriting/claim-validator";
import { buildDeterministicScriptFromBrief } from "../scriptwriting/grounded-scriptwriter";
import { validateAndRepairScenePlan } from "../scene-planning/plan-validator";
import { buildDeterministicBlueprintFromScript } from "../scene-planning/scene-planner";
import { createMockWav, generateNarrationForBlueprint } from "../audio/narration-service";
import {
  splitIntoPhrases,
  formatSrtTimestamp,
  formatVttTimestamp,
  generateCaptionsForBlueprint,
} from "../audio/caption-service";
import { buildDuckingFilter, mixAudioTracks } from "../audio/audio-mixer";
import { BrandManager, DEFAULT_BRAND_PROFILE } from "../branding/brand-manager";
import { DailyNewsMonitor } from "../news/daily-news-monitor";
import { ProductionOrchestrator } from "../orchestrator";
import { getBrief } from "../../research/storage/brief-storage";
import type { ScriptDocument } from "../types";
import type { VideoBlueprint } from "../../video-engine/types";
import type { ResearchBrief } from "../../research/types";

let passed = 0;
let failed = 0;

async function test(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err: unknown) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${(err as Error).message}`);
    failed++;
  }
}

async function runAllTests() {
  console.log("\n══════════════════════════════════════");
  console.log("  Milestone 3: Video Production Tests ");
  console.log("══════════════════════════════════════\n");

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "voiceage-prod-test-"));

  try {
    // ── 1. State Machine & Persistence ────────────────────────────
    await test("ProductionJobManager transitions stages and persists checkpoints to disk", () => {
      const store = new JobStore(path.join(tempDir, "jobs"));
      const manager = new ProductionJobManager({ topic: "Autonomous AI" }, store);

      const job = manager.getJob();
      assert.strictEqual(job.status, "queued");
      assert.strictEqual(job.current_stage, "queued");

      manager.transitionTo("generating_script", undefined, { model: "mock-model" });
      const runningJob = manager.getJob();
      assert.strictEqual(runningJob.status, "running");
      assert.strictEqual(runningJob.current_stage, "generating_script");
      assert.ok(runningJob.completed_stages.includes("generating_script"));
      assert.ok(runningJob.checkpoints["generating_script"]);

      manager.addWarning("Minor warning occurred");
      manager.updateLineage({ script_id: "script_001" });
      manager.updateArtifacts({ script_path: "/tmp/script.json" });

      // Verify retrieval from disk
      const retrieved = store.get(job.job_id);
      assert.ok(retrieved);
      assert.strictEqual(retrieved.current_stage, "generating_script");
      assert.strictEqual(retrieved.lineage.script_id, "script_001");
      assert.strictEqual(retrieved.warnings.length, 1);

      manager.complete("completed");
      assert.strictEqual(manager.getJob().status, "completed");
    });

    await test("ProductionJobManager fail() records stage error and marks status as failed", () => {
      const store = new JobStore(path.join(tempDir, "jobs_fail"));
      const manager = new ProductionJobManager({ topic: "Test Fail" }, store);

      manager.transitionTo("rendering_video");
      manager.fail("rendering_video", "FFmpeg process killed");

      const failedJob = manager.getJob();
      assert.strictEqual(failedJob.status, "failed");
      assert.strictEqual(failedJob.current_stage, "rendering_video");
      assert.ok(failedJob.error);
      assert.strictEqual(failedJob.error?.message, "FFmpeg process killed");
    });

    // ── 2. Claim-Level Evidence Validator ─────────────────────────
    await test("validateScriptClaims marks valid claims as verified against brief evidence", () => {
      const brief = getBrief("brief_c8770913") as ResearchBrief;
      assert.ok(brief, "Fixture brief_c8770913 must exist");

      const evidenceIds = Object.keys(brief.evidence_store || {});
      assert.ok(evidenceIds.length > 0, "Brief must contain evidence items");
      const firstEvidenceId = evidenceIds[0];

      const script: ScriptDocument = {
        script_id: "script_test_01",
        title: "Observability in Production",
        topic: "AI Observability",
        target_audience: "DevOps",
        target_duration_seconds: 30,
        created_at: new Date().toISOString(),
        claims_summary: { total: 1, verified: 1, unverified: 0, flagged: 0 },
        scenes: [
          {
            scene_id: "scene_001",
            purpose: "hook",
            narration: "Autonomous agents reduced MTTR by 91%.",
            visual_description: "Chart displaying reduction",
            on_screen_text: "91% FASTER RESOLUTION",
            claims: [
              {
                claim_id: "claim_01",
                spoken_text: "Autonomous agents reduced MTTR by 91%",
                claim_type: "verified_fact",
                supporting_evidence_ids: [firstEvidenceId],
                verification_status: "verified",
              },
            ],
          },
        ],
      };

      const result = validateScriptClaims(script, brief);
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.claimsSummary.verified, 1);
      assert.strictEqual(result.claimsSummary.unverified, 0);
      assert.strictEqual(result.claimsSummary.flagged, 0);
    });

    await test("validateScriptClaims flags unverified evidence and prohibited claims", () => {
      const baseBrief = getBrief("brief_c8770913") as ResearchBrief;
      assert.ok(baseBrief);
      const brief: ResearchBrief = JSON.parse(JSON.stringify(baseBrief));
      brief.scriptwriter_handoff.claims_to_avoid = [
        "Guarantee 100% bug-free autonomous deployment without human oversight",
      ];

      const script: ScriptDocument = {
        script_id: "script_test_02",
        title: "Flawed Claims Script",
        topic: "Mock AI",
        target_audience: "Engineers",
        target_duration_seconds: 30,
        created_at: new Date().toISOString(),
        claims_summary: { total: 2, verified: 0, unverified: 1, flagged: 1 },
        scenes: [
          {
            scene_id: "scene_001",
            purpose: "metric",
            narration: "This guarantees 100% bug-free autonomous deployment without human oversight.",
            visual_description: "Warning",
            on_screen_text: "100% UNTESTED",
            claims: [
              {
                claim_id: "c_unknown_ev",
                spoken_text: "Unverified statistic",
                claim_type: "statistic",
                supporting_evidence_ids: ["nonexistent_evidence_999"],
                verification_status: "unverified",
              },
              {
                claim_id: "c_prohibited",
                spoken_text:
                  "Guarantee 100% bug-free autonomous deployment without human oversight",
                claim_type: "verified_fact",
                supporting_evidence_ids: ["ev_valid"],
                verification_status: "flagged",
              },
            ],
          },
        ],
      };

      const result = validateScriptClaims(script, brief);
      assert.strictEqual(result.valid, false);
      assert.strictEqual(result.claimsSummary.unverified, 1);
      assert.strictEqual(result.claimsSummary.flagged, 1);
      assert.ok(result.errors.some((e) => e.includes("violates constraint")));
    });

    // ── 3. Plan Validator & Bounded Safe Repair ───────────────────
    await test("validateAndRepairScenePlan auto-repairs missing fields and invalid scene types", () => {
      const invalidBlueprint: any = {
        title: "Auto Repair Test",
        fps: 0, // Invalid
        width: 1080,
        height: 1920,
        scenes: [
          {
            id: "", // Missing
            scene_type: "unsupported_magic_hologram", // Unsupported!
            narration: "Our pipeline is ultra fast.",
            on_screen_text: "SPEED",
            duration_hint_seconds: -1, // Invalid
          },
          {
            id: "scene_002",
            scene_type: "stat_counter", // Missing data_points
            narration: "Latency reduced by 85%.",
            duration_hint_seconds: 4,
          },
          {
            id: "scene_003",
            scene_type: "code_terminal", // Missing terminal_lines
            narration: "Terminal output shows success.",
            duration_hint_seconds: 4,
          },
        ],
      };

      const result = validateAndRepairScenePlan(invalidBlueprint);
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.repaired, true);

      const repaired = result.blueprint;
      assert.strictEqual(repaired.fps, 60);
      assert.strictEqual(repaired.theme_preset, "cyber_editorial");
      assert.ok(repaired.brand);

      // Check first scene repaired to kinetic_typography
      assert.strictEqual(repaired.scenes[0].scene_type, "kinetic_typography");
      assert.strictEqual(repaired.scenes[0].id, "scene_001");
      assert.strictEqual(repaired.scenes[0].duration_hint_seconds, 5);

      // Check second scene got data_points
      assert.ok(repaired.scenes[1].data_points);
      assert.ok(repaired.scenes[1].data_points!.length > 0);

      // Check third scene got terminal_lines
      assert.ok(repaired.scenes[2].terminal_lines);
      assert.ok(repaired.scenes[2].terminal_lines!.length > 0);
    });

    // ── 4. Deterministic Script & Scene Planner ───────────────────
    await test("buildDeterministicScriptFromBrief and buildDeterministicBlueprintFromScript create valid blueprints", () => {
      const brief = getBrief("brief_c8770913") as ResearchBrief;
      assert.ok(brief);

      const script = buildDeterministicScriptFromBrief(brief, { targetDurationSeconds: 40 });
      assert.ok(script.scenes.length >= 4);
      assert.strictEqual(script.scenes[0].purpose, "hook");
      assert.strictEqual(script.scenes[script.scenes.length - 1].purpose, "cta");

      const blueprint = buildDeterministicBlueprintFromScript(script, {
        aspectRatio: "9:16",
        themePreset: "cyber_editorial",
      });

      assert.strictEqual(blueprint.title, script.title);
      assert.strictEqual(blueprint.aspect_ratio, "9:16");
      assert.strictEqual(blueprint.width, 1080);
      assert.strictEqual(blueprint.height, 1920);
      assert.strictEqual(blueprint.scenes.length, script.scenes.length);
      assert.ok(blueprint.target_duration_seconds > 0);
    });

    // ── 5. Narration Audio Generation & Timing ────────────────────
    await test("createMockWav produces a valid PCM WAV file with measurable duration", async () => {
      const wavPath = path.join(tempDir, "test_tone.wav");
      createMockWav(wavPath, 2.5);

      assert.ok(fs.existsSync(wavPath));
      const stats = fs.statSync(wavPath);
      assert.ok(stats.size > 1000);

      // Check WAV header magic bytes
      const fd = fs.openSync(wavPath, "r");
      const header = Buffer.alloc(12);
      fs.readSync(fd, header, 0, 12, 0);
      fs.closeSync(fd);
      assert.strictEqual(header.subarray(0, 4).toString(), "RIFF");
      assert.strictEqual(header.subarray(8, 12).toString(), "WAVE");
    });

    await test("generateNarrationForBlueprint measures durations and produces audio map", async () => {
      const dummyBlueprint: VideoBlueprint = {
        title: "Audio Test",
        aspect_ratio: "9:16",
        width: 1080,
        height: 1920,
        fps: 60,
        target_duration_seconds: 10,
        theme_preset: "cyber_editorial",
        brand: { primary_color: "#0A0A0C", accent_color: "#FF5F00" },
        scenes: [
          {
            id: "scene_001",
            purpose: "hook",
            scene_type: "kinetic_typography",
            narration: "First test line spoken clearly.",
            duration_hint_seconds: 3,
          },
          {
            id: "scene_002",
            purpose: "cta",
            scene_type: "cta",
            narration: "Second test line following immediately.",
            duration_hint_seconds: 3,
          },
        ],
      };

      const projectDir = path.join(tempDir, "audio_project");
      const result = await generateNarrationForBlueprint(dummyBlueprint, projectDir, {
        forceMock: true,
      });

      assert.ok(result.audioMap.has("scene_001"));
      assert.ok(result.audioMap.has("scene_002"));
      assert.ok(result.totalDurationSeconds > 4);
      assert.ok(fs.existsSync(result.fullAudioPath));
    });

    // ── 6. Caption & Subtitle Generator ───────────────────────────
    await test("Caption timestamp formatters format millisecond boundaries accurately", () => {
      assert.strictEqual(formatSrtTimestamp(0), "00:00:00,000");
      assert.strictEqual(formatSrtTimestamp(65.5), "00:01:05,500");
      assert.strictEqual(formatVttTimestamp(0), "00:00:00.000");
      assert.strictEqual(formatVttTimestamp(3661.125), "01:01:01.125");

      const phrases = splitIntoPhrases(
        "Autonomous agents reduce latency. They ingest events, execute tools deterministically, and resolve cluster health incidents."
      );
      assert.ok(phrases.length >= 2);
    });

    await test("generateCaptionsForBlueprint produces valid SRT and VTT files", () => {
      const dummyBlueprint: VideoBlueprint = {
        title: "Captions Test",
        aspect_ratio: "9:16",
        width: 1080,
        height: 1920,
        fps: 60,
        target_duration_seconds: 10,
        theme_preset: "cyber_editorial",
        brand: { primary_color: "#0A0A0C", accent_color: "#FF5F00" },
        scenes: [
          {
            id: "scene_001",
            purpose: "hook",
            scene_type: "kinetic_typography",
            narration: "Deploying autonomous AI agents into high throughput systems.",
            duration_hint_seconds: 4,
          },
        ],
      };

      const dummyAudioMap = new Map();
      dummyAudioMap.set("scene_001", {
        path: "/mock.wav",
        durationSeconds: 4.5,
        format: "wav",
        sampleRate: 24000,
        channels: 1,
        sizeBytes: 1000,
        model: "mock",
        generatedAt: new Date().toISOString(),
      });

      const projectDir = path.join(tempDir, "caption_project");
      const result = generateCaptionsForBlueprint(dummyBlueprint, dummyAudioMap, 60, projectDir);

      assert.ok(result.segments.length > 0);
      assert.strictEqual(result.segments[0].start_seconds, 0);
      assert.strictEqual(result.segments[0].start_frame, 0);
      assert.ok(fs.existsSync(result.srtPath));
      assert.ok(fs.existsSync(result.vttPath));

      const srt = fs.readFileSync(result.srtPath, "utf-8");
      assert.ok(srt.includes("-->"));
      const vtt = fs.readFileSync(result.vttPath, "utf-8");
      assert.ok(vtt.startsWith("WEBVTT"));
    });

    // ── 7. Audio Mixer & Ducking ──────────────────────────────────
    await test("buildDuckingFilter creates valid ffmpeg amix filtergraph", () => {
      const filter = buildDuckingFilter(0.15);
      assert.ok(filter.includes("volume=0.15"));
      assert.ok(filter.includes("amix=inputs=2"));

      // Clamping test
      const clampedLow = buildDuckingFilter(0.001);
      assert.ok(clampedLow.includes("volume=0.02"));
      const clampedHigh = buildDuckingFilter(0.9);
      assert.ok(clampedHigh.includes("volume=0.5"));
    });

    await test("mixAudioTracks copies narration in voice-only mode without errors", async () => {
      const narrationPath = path.join(tempDir, "narration_only.wav");
      createMockWav(narrationPath, 2.0);

      const outDir = path.join(tempDir, "mixed");
      fs.mkdirSync(outDir, { recursive: true });

      const mixRes = await mixAudioTracks(
        {
          narration_audio_path: narrationPath,
          voice_only: true,
          music_volume: 0.1,
          ducking_enabled: false,
          ducking_attenuation_db: -14,
          fade_in_seconds: 1,
          fade_out_seconds: 1,
        },
        outDir
      );

      assert.strictEqual(mixRes.musicApplied, false);
      assert.ok(fs.existsSync(mixRes.mixedAudioPath));
    });

    // ── 8. Brand Profile Manager ──────────────────────────────────
    await test("BrandManager retrieves default Voiceage profile and falls back gracefully", () => {
      const bm = new BrandManager(path.join(tempDir, "branding"));
      const profile = bm.getProfile("default");
      assert.strictEqual(profile.id, "default_voiceage");
      assert.strictEqual(profile.colors.primary, DEFAULT_BRAND_PROFILE.colors.primary);

      const unknownProfile = bm.getProfile("nonexistent_brand_xyz");
      assert.strictEqual(unknownProfile.id, "default_voiceage");
    });

    // ── 9. Daily News Monitor Freshness ───────────────────────────
    await test("DailyNewsMonitor calculates brief freshness correctly", () => {
      const cachePath = path.join(tempDir, "news_cache.json");
      const monitor = new DailyNewsMonitor(cachePath);

      const baseBrief = getBrief("brief_c8770913") as ResearchBrief;
      assert.ok(baseBrief);
      const mockBrief: ResearchBrief = JSON.parse(JSON.stringify(baseBrief));
      mockBrief.metadata.created_at = new Date(Date.now() - 3600 * 1000 * 2).toISOString();

      const freshness = monitor.checkBriefFreshness(mockBrief);
      assert.strictEqual(freshness.isFresh, true);
      assert.strictEqual(freshness.newDevelopmentsCount, 0);
    });

    // ── 10. End-to-End Orchestrator Pipeline (Dry Run) ────────────
    await test("ProductionOrchestrator completes full 14-stage workflow in dry run mode", async () => {
      const orchestrator = new ProductionOrchestrator();

      const result = await orchestrator.runProduction(
        { mode: "brief_id", briefId: "brief_c8770913" },
        {
          skip_render: true,
          force_deterministic: true,
          force_mock_audio: true,
          aspect_ratio: "9:16",
          theme_preset: "cyber_editorial",
          target_duration_seconds: 25,
        }
      );

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.job.status, "completed");
      assert.strictEqual(result.job.current_stage, "completed");

      // Verify artifacts generated in project directory
      const artifacts = result.job.artifacts;
      assert.ok(artifacts.brief_path && fs.existsSync(artifacts.brief_path));
      assert.ok(artifacts.script_path && fs.existsSync(artifacts.script_path));
      assert.ok(artifacts.blueprint_path && fs.existsSync(artifacts.blueprint_path));
      assert.ok(artifacts.narration_audio_path && fs.existsSync(artifacts.narration_audio_path));
      assert.ok(artifacts.srt_path && fs.existsSync(artifacts.srt_path));
      assert.ok(artifacts.vtt_path && fs.existsSync(artifacts.vtt_path));

      // Verify blueprint contains valid scenes matching registered types
      assert.ok(result.blueprint);
      assert.ok(result.blueprint!.scenes.length >= 3);
    });
  } finally {
    // Cleanup temporary directory
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error
    }
  }

  console.log("\n══════════════════════════════════════");
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log("══════════════════════════════════════\n");

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAllTests().catch((err) => {
  console.error("Test execution fatal error:", err);
  process.exit(1);
});

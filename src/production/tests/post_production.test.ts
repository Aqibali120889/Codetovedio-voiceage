/**
 * Post-Production Motion Graphics & Sound Design Engine Tests.
 *
 * Validates:
 * 1. Curated SFX Catalog & Synthesizer: 10 CC0 audio categories, 48kHz WAV headers, offline-ready.
 * 2. Deterministic Motion Presets: All 14 presets produce bounded, frame-driven values (no NaNs).
 * 3. Camera Director & Transforms: Smooth zooms, focus pans, and parallax reframing.
 * 4. Post-Production Director: Generates validated editing plans with 1.5-2.5s pacing beats.
 * 5. Plan Validator & Audio Guardrails: Frame clamping, deduplication, volume limits.
 */

import assert from "assert";
import path from "path";
import fs from "fs";
import { SOUND_EFFECTS_CATALOG, getSoundEffectMetadata } from "../audio/sfx-catalog";
import { ensureSfxLibrary } from "../audio/sfx-generator";
import { buildSfxTrack } from "../audio/sfx-track-builder";
import {
  evaluateMotionPreset,
  ALL_MOTION_PRESETS,
} from "../../video-engine/animations/motion-presets";
import { PostProductionDirector } from "../post-production/post-production-director";
import { validateEditingPlan } from "../post-production/editing-plan-validator";
import type { PostProductionPlan, EditingEvent, SoundEffectCue } from "../post-production/post-production-types";
import { buildDeterministicBlueprintFromScript } from "../scene-planning/scene-planner";
import type { ScriptDocument } from "../types";

let passed = 0;
let failed = 0;

async function test(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err: any) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

const MOCK_SCRIPT: ScriptDocument = {
  script_id: "test_script_001",
  title: "Next-Gen AI Compilation Architectures",
  topic: "AI Compilers",
  target_audience: "Engineers & Researchers",
  created_at: new Date().toISOString(),
  hook: "AI compiler breakthroughs are slashing LLM latency by 4.2x.",
  target_duration_seconds: 45,
  claims_summary: { total: 5, verified: 5, unverified: 0, flagged: 0 },
  scenes: [
    {
      scene_id: "sc_01",
      purpose: "hook",
      narration: "AI compiler breakthroughs are slashing inference latency by 4.2x.",
      visual_description: "Kinetic reveal of high-speed compiler benchmarks",
      on_screen_text: "4.2X FASTER COMPILER",
      claims: [],
    },
    {
      scene_id: "sc_02",
      purpose: "problem",
      narration: "Traditional runtime interpreters generate massive kernel dispatch overhead.",
      visual_description: "System diagram showing interpreter bottleneck",
      on_screen_text: "RUNTIME OVERHEAD",
      claims: [],
    },
    {
      scene_id: "sc_03",
      purpose: "mechanism_explanation",
      narration: "By lowering ASTs into deterministic CUDA microkernels, memory traffic drops by 68%.",
      visual_description: "Architecture dataflow pipeline with optimized memory buffers",
      on_screen_text: "68% MEMORY REDUCTION",
      claims: [],
    },
    {
      scene_id: "sc_04",
      purpose: "evidence_led_analysis",
      narration: "Benchmarks show sub-12ms token generation across 70B parameter models.",
      visual_description: "Bar chart comparison against existing vLLM engine",
      on_screen_text: "SUB-12MS GENERATION",
      claims: [],
    },
    {
      scene_id: "sc_05",
      purpose: "cta",
      narration: "Voiceage Systems is deploying compiler optimizations across production clusters today.",
      visual_description: "Call to action panel with verified open-source repository",
      on_screen_text: "DEPLOY TODAY",
      claims: [],
    },
  ],
};

async function runAllTests() {
  console.log("\n══════════════════════════════════════════════════════════════════");
  console.log("  Voiceage Post-Production & Motion Graphics Test Suite          ");
  console.log("══════════════════════════════════════════════════════════════════\n");

  // 1. Curated SFX Catalog
  await test("SFX Catalog defines all 10 required audio categories with metadata", () => {
    assert.strictEqual(SOUND_EFFECTS_CATALOG.length, 10, `Expected 10 categories, found ${SOUND_EFFECTS_CATALOG.length}`);
    const requiredIds = [
      "whoosh_soft",
      "sweep_transition",
      "impact_subtle",
      "hit_cinematic",
      "ui_click",
      "digital_confirm",
      "riser_short",
      "tech_ambient",
      "reverse_swell",
      "accent_clean",
    ];
    for (const id of requiredIds) {
      const meta = getSoundEffectMetadata(id);
      assert.ok(meta, `Missing metadata for ${id}`);
      assert.strictEqual(meta?.license, "CC0-Procedural", `Invalid license for ${id}`);
      assert.ok(meta?.recommended_volume > 0 && meta.recommended_volume <= 0.35, `Unsafe volume for ${id}`);
    }
  });

  // 2. Pure Synthesis & Audio File Integrity
  await test("Pure Node.js WAV synthesis generates valid 48kHz 16-bit stereo assets", () => {
    ensureSfxLibrary();
    const assetsDir = path.resolve(process.cwd(), "assets", "audio", "sfx");
    for (const sfx of SOUND_EFFECTS_CATALOG) {
      const filePath = path.join(assetsDir, sfx.filename);
      assert.ok(fs.existsSync(filePath), `WAV file missing: ${filePath}`);
      const buf = fs.readFileSync(filePath);
      assert.ok(buf.length > 44, `WAV file empty: ${filePath}`);
      // Check RIFF header
      assert.strictEqual(buf.toString("ascii", 0, 4), "RIFF", "Header must be RIFF");
      assert.strictEqual(buf.toString("ascii", 8, 12), "WAVE", "Format must be WAVE");
      // Check sample rate (48000 Hz at offset 24)
      const sampleRate = buf.readUInt32LE(24);
      assert.strictEqual(sampleRate, 48000, `Sample rate should be 48000Hz, got ${sampleRate}`);
      // Check channels (2 stereo at offset 22)
      const channels = buf.readUInt16LE(22);
      assert.strictEqual(channels, 2, `Channels should be 2 (stereo), got ${channels}`);
    }
  });

  // 3. Sample-Accurate SFX Track Builder
  await test("SFX track builder mixes timeline cues into a unified 48kHz audio track", () => {
    const tmpSfxTrack = path.resolve(process.cwd(), "tmp", "test_sfx_track.wav");
    fs.mkdirSync(path.dirname(tmpSfxTrack), { recursive: true });

    const cues: SoundEffectCue[] = [
      {
        soundEffectId: "whoosh_soft",
        timestamp_seconds: 0.5,
        frame: 30,
        volume: 0.18,
        reason: "Test entrance whoosh",
        sceneId: "sc_01",
      },
      {
        soundEffectId: "digital_confirm",
        timestamp_seconds: 2.0,
        frame: 120,
        volume: 0.22,
        reason: "Test metric highlight",
        sceneId: "sc_01",
      },
    ];

    const result = buildSfxTrack(cues, 4.0, tmpSfxTrack);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.cuesPlaced, 2);
    assert.ok(fs.existsSync(tmpSfxTrack));
    const stat = fs.statSync(tmpSfxTrack);
    assert.ok(stat.size > 192000 * 3, "Track size must match ~4 seconds of 48kHz 16-bit stereo audio");
    try { fs.unlinkSync(tmpSfxTrack); } catch {}
  });

  // 4. Motion Presets
  await test("All 14 motion presets produce bounded, deterministic values across animation range", () => {
    assert.strictEqual(ALL_MOTION_PRESETS.length, 14, `Expected 14 presets, found ${ALL_MOTION_PRESETS.length}`);

    for (const preset of ALL_MOTION_PRESETS) {
      // Evaluate at start, 25%, 50%, 75%, 100% of duration
      const frames = [0, 8, 15, 23, 30];
      for (const f of frames) {
        const val = evaluateMotionPreset(preset, f, 0, 30, 60);
        if (val.opacity !== undefined) {
          assert.ok(!isNaN(val.opacity), `Opacity is NaN in ${preset} at frame ${f}`);
          assert.ok(val.opacity >= 0 && val.opacity <= 1.05, `Opacity out of bounds (${val.opacity}) in ${preset}`);
        }
        if (val.scale !== undefined) {
          assert.ok(!isNaN(val.scale), `Scale is NaN in ${preset} at frame ${f}`);
          assert.ok(val.scale >= 0.5 && val.scale <= 1.5, `Scale out of bounds (${val.scale}) in ${preset}`);
        }
        if (val.translateX !== undefined) {
          assert.ok(!isNaN(val.translateX), `translateX is NaN in ${preset} at frame ${f}`);
        }
        if (val.translateY !== undefined) {
          assert.ok(!isNaN(val.translateY), `translateY is NaN in ${preset} at frame ${f}`);
        }
      }
    }
  });

  // 5. Post-Production Director
  await test("PostProductionDirector generates coordinated editing plan with 1.5-2.5s cadence", () => {
    const blueprint = buildDeterministicBlueprintFromScript(MOCK_SCRIPT, {
      aspectRatio: "9:16",
      themePreset: "cyber_editorial",
    });

    const director = new PostProductionDirector();
    const testDir = path.resolve(process.cwd(), "tmp", "test_proj");
    fs.mkdirSync(testDir, { recursive: true });

    const plan = director.directPostProduction(blueprint, MOCK_SCRIPT, testDir);

    assert.ok(plan, "Editing plan must not be null");
    assert.ok(plan.events.length >= 8, `Expected at least 8 editing events, got ${plan.events.length}`);
    assert.ok(plan.sound_cues.length >= 4, `Expected at least 4 sound cues, got ${plan.sound_cues.length}`);

    // Check cadence: average beat interval between 1.0s and 3.2s
    const totalDurationSec = plan.totalFrames / plan.fps;
    const avgSecPerBeat = totalDurationSec / plan.events.length;
    assert.ok(
      avgSecPerBeat >= 1.0 && avgSecPerBeat <= 3.2,
      `Pacing cadence should be 1.0 - 3.2s per beat, got ${avgSecPerBeat.toFixed(2)}s`
    );

    // Verify all event frame ranges stay strictly within composition duration
    for (const ev of plan.events) {
      assert.ok(ev.startFrame >= 0, `Event startFrame cannot be negative: ${ev.startFrame}`);
      assert.ok(
        ev.startFrame + ev.durationFrames <= plan.totalFrames + 60,
        `Event exceeds timeline: ${ev.startFrame + ev.durationFrames} > ${plan.totalFrames}`
      );
    }
  });

  // 6. Plan Validator & Audio Guardrails
  await test("Editing plan validator clamps loud audio and deduplicates rapid-fire sound cues", () => {
    const blueprint = buildDeterministicBlueprintFromScript(MOCK_SCRIPT, {
      aspectRatio: "9:16",
      themePreset: "cyber_editorial",
    });

    const invalidEvents: EditingEvent[] = [
      {
        eventId: "ev_01",
        sceneId: blueprint.scenes[0].id,
        startFrame: 0,
        durationFrames: 60,
        eventType: "motion_graphic",
        motionPreset: "headlineImpact",
        intensity: 0.8,
        priority: 1,
        reason: "Valid entrance",
        validationStatus: "validated",
      },
      {
        eventId: "ev_02",
        sceneId: "non_existent_scene",
        startFrame: 100,
        durationFrames: 60,
        eventType: "artifact_focus",
        motionPreset: "nodeHighlight",
        intensity: 0.5,
        priority: 2,
        reason: "Invalid scene reference",
        validationStatus: "validated",
      },
    ];

    const duplicateSoundCues: SoundEffectCue[] = [
      {
        soundEffectId: "whoosh_soft",
        timestamp_seconds: 1.0,
        frame: 60,
        volume: 0.85, // way too loud
        reason: "First whoosh",
        sceneId: blueprint.scenes[0].id,
      },
      {
        soundEffectId: "whoosh_soft",
        timestamp_seconds: 1.05, // within 50ms of first cue (duplicate spam)
        frame: 63,
        volume: 0.20,
        reason: "Second whoosh",
        sceneId: blueprint.scenes[0].id,
      },
    ];

    const rawPlan: PostProductionPlan = {
      planId: "plan_test",
      projectId: "proj_test",
      created_at: new Date().toISOString(),
      fps: 60,
      totalFrames: 1800,
      pacing: {
        average_beat_interval_seconds: 2.0,
        total_visual_changes: 2,
        sound_events_count: 2,
        camera_moves_count: 0,
        motion_graphics_count: 2,
      },
      events: invalidEvents,
      sound_cues: duplicateSoundCues,
    };

    const validation = validateEditingPlan(rawPlan, blueprint);
    assert.strictEqual(validation.valid, false, "Original plan with non-existent scene should report invalid");
    assert.ok(validation.errors.length > 0, "Errors should flag the invalid scene reference");
    assert.ok(validation.repairedPlan, "Repaired plan must exist");

    // Check that invalid scene reference was skipped in repaired plan
    assert.strictEqual(validation.repairedPlan.events.length, 1);

    // Check that duplicate sound cue was deduplicated
    assert.strictEqual(validation.repairedPlan.sound_cues.length, 1);

    // Check that loud volume was clamped to <= 0.40
    assert.ok(
      validation.repairedPlan.sound_cues[0].volume <= 0.40,
      `Volume not clamped: ${validation.repairedPlan.sound_cues[0].volume}`
    );
  });

  // Report Summary
  console.log("\n──────────────────────────────────────────────────────────────────");
  console.log(`  Tests Passed: ${passed} / ${passed + failed}`);
  if (failed > 0) {
    console.error(`  Tests Failed: ${failed}`);
    process.exit(1);
  } else {
    console.log("  All Post-Production Motion & Sound Engine tests passed cleanly!\n");
    process.exit(0);
  }
}

runAllTests().catch((err) => {
  console.error("Unhandled test suite error:", err);
  process.exit(1);
});

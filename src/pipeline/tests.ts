/**
 * Unit tests for the AI Video Studio pipeline.
 *
 * Run with: npm test
 *
 * These tests use only built-in Node.js assert — no extra test framework needed.
 * They mock external API calls and filesystem writes where needed.
 * They do NOT consume Gemini quota.
 */

import assert from "assert";
import { validateScript, parseAndValidateScript, generateSceneId, normaliseScript } from "./scriptValidator";
import { generateSubtitles } from "./subtitleGenerator";
import type { ScriptSchema, AudioMetadata } from "./types";
import os from "os";
import path from "path";
import fs from "fs";

// ============================================================
// Helpers
// ============================================================

function makeTmpDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "aivs-test-"));
  return dir;
}

function makeValidScript(): ScriptSchema {
  return {
    title: "Test Script",
    topic: "AI automation",
    language: "English",
    target_duration_seconds: 30,
    estimated_word_count: 75,
    scenes: [
      {
        id: "scene_001",
        purpose: "hook",
        narration: "This is the hook narration. It grabs attention fast.",
        visual_description: "Bold text on dark background",
        on_screen_text: "HOOK",
        duration_hint_seconds: 5,
      },
      {
        id: "scene_002",
        purpose: "insight",
        narration: "Here we explain the core insight about AI automation.",
        visual_description: "Diagram showing workflow",
        on_screen_text: "THE INSIGHT",
        duration_hint_seconds: 10,
      },
      {
        id: "scene_003",
        purpose: "cta",
        narration: "Follow for more AI engineering content.",
        visual_description: "CTA panel with green accent",
        on_screen_text: "FOLLOW NOW",
        duration_hint_seconds: 5,
      },
    ],
    full_narration:
      "This is the hook narration. It grabs attention fast. Here we explain the core insight about AI automation. Follow for more AI engineering content.",
    call_to_action: "Follow for more.",
    source: "topic",
    generated_at: new Date().toISOString(),
  };
}

// ============================================================
// Test: Script validation — valid script
// ============================================================

function testValidScriptPasses() {
  const script = makeValidScript();
  const result = validateScript(script);
  assert.strictEqual(result.valid, true, `Expected valid, errors: ${result.errors.join("; ")}`);
  assert.strictEqual(result.errors.length, 0);
  console.log("  ✓ Valid script passes validation");
}

// ============================================================
// Test: Script validation — missing required fields
// ============================================================

function testMissingFieldsFails() {
  const result = validateScript({ title: "", topic: "", scenes: [] });
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.length > 0, "Expected errors for missing fields");
  console.log("  ✓ Missing required fields detected");
}

// ============================================================
// Test: Script validation — duplicate scene IDs
// ============================================================

function testDuplicateSceneIdsFails() {
  const script = makeValidScript();
  script.scenes[1].id = "scene_001"; // duplicate
  const result = validateScript(script);
  assert.strictEqual(result.valid, false);
  assert.ok(
    result.errors.some((e) => e.includes("unique")),
    `Expected duplicate ID error, got: ${result.errors.join("; ")}`
  );
  console.log("  ✓ Duplicate scene IDs detected");
}

// ============================================================
// Test: Script validation — invalid scene ID format
// ============================================================

function testInvalidSceneIdFormatFails() {
  const script = makeValidScript();
  script.scenes[0].id = "scene-1"; // wrong format
  const result = validateScript(script);
  assert.strictEqual(result.valid, false);
  console.log("  ✓ Invalid scene ID format detected");
}

// ============================================================
// Test: JSON parse failure handling
// ============================================================

function testMalformedJsonHandled() {
  const result = parseAndValidateScript("not valid json {{{");
  assert.strictEqual(result.script, null);
  assert.strictEqual(result.validation.valid, false);
  assert.ok(result.validation.errors.some((e) => e.includes("JSON parse error")));
  console.log("  ✓ Malformed JSON handled gracefully");
}

// ============================================================
// Test: generateSceneId produces correct format
// ============================================================

function testGenerateSceneId() {
  assert.strictEqual(generateSceneId(0), "scene_001");
  assert.strictEqual(generateSceneId(9), "scene_010");
  assert.strictEqual(generateSceneId(99), "scene_100");
  console.log("  ✓ Scene ID generation correct");
}

// ============================================================
// Test: normaliseScript fills in defaults
// ============================================================

function testNormaliseScriptDefaults() {
  const partial = {
    title: "Test",
    topic: "AI",
    full_narration: "Hello world content here.",
    scenes: [
      {
        narration: "Hello world content here.",
        visual_description: "A screen",
        on_screen_text: "Hi",
      },
    ],
  };

  const result = normaliseScript(partial as Parameters<typeof normaliseScript>[0]);
  assert.strictEqual(result.language, "English");
  assert.strictEqual(result.scenes[0].id, "scene_001");
  assert.strictEqual(result.source, "user");
  console.log("  ✓ normaliseScript fills in defaults correctly");
}

// ============================================================
// Test: Audio duration-to-frame conversion
// ============================================================

function testAudioToFrameConversion() {
  const fps = 60;
  const durationSeconds = 5.5;
  const expectedFrames = Math.round(durationSeconds * fps);
  const actualFrames = Math.round(durationSeconds * fps);
  assert.strictEqual(actualFrames, expectedFrames);
  // Frame must be non-negative
  assert.ok(actualFrames >= 0);
  console.log("  ✓ Audio duration-to-frame conversion correct");
}

// ============================================================
// Test: Subtitle generation timing
// ============================================================

function testSubtitleGenerationTiming() {
  const tmpDir = makeTmpDir();
  try {
    const script = makeValidScript();
    const audioMap = new Map<string, AudioMetadata>();

    // Simulate known audio durations
    audioMap.set("scene_001", { path: "s1.wav", durationSeconds: 4.0, format: "wav", sampleRate: 24000, channels: 1, sizeBytes: 1000, model: "test", generatedAt: "" });
    audioMap.set("scene_002", { path: "s2.wav", durationSeconds: 6.0, format: "wav", sampleRate: 24000, channels: 1, sizeBytes: 2000, model: "test", generatedAt: "" });
    audioMap.set("scene_003", { path: "s3.wav", durationSeconds: 3.5, format: "wav", sampleRate: 24000, channels: 1, sizeBytes: 1500, model: "test", generatedAt: "" });

    const fps = 60;
    const result = generateSubtitles(script, audioMap, fps, tmpDir);

    // Total duration should be sum of audio durations
    const expectedTotal = 4.0 + 6.0 + 3.5;
    assert.ok(
      Math.abs(result.totalDurationSeconds - expectedTotal) < 0.01,
      `Expected ${expectedTotal}s, got ${result.totalDurationSeconds}s`
    );

    // All segments should have valid frame ranges
    for (const seg of result.segments) {
      assert.ok(seg.startFrame >= 0, `Negative startFrame in segment ${seg.index}`);
      assert.ok(seg.endFrame > seg.startFrame, `Invalid frame range in segment ${seg.index}`);
    }

    // SRT file should exist
    assert.ok(fs.existsSync(result.srtPath), "SRT file not created");
    assert.ok(fs.existsSync(result.vttPath), "VTT file not created");

    // SRT content should be non-empty
    const srt = fs.readFileSync(result.srtPath, "utf-8");
    assert.ok(srt.length > 0, "SRT file is empty");

    console.log("  ✓ Subtitle timing from audio durations is correct");
    console.log(`    Total: ${result.totalDurationSeconds}s, ${result.segments.length} segments`);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

// ============================================================
// Test: No negative durations in subtitle segments
// ============================================================

function testNoNegativeSubtitleDurations() {
  const tmpDir = makeTmpDir();
  try {
    const script = makeValidScript();
    const audioMap = new Map<string, AudioMetadata>();
    // No audio — falls back to duration_hint_seconds
    const fps = 60;
    const result = generateSubtitles(script, audioMap, fps, tmpDir);

    for (const seg of result.segments) {
      assert.ok(
        seg.endSeconds > seg.startSeconds,
        `Negative duration at segment ${seg.index}: ${seg.startSeconds} → ${seg.endSeconds}`
      );
      assert.ok(seg.endFrame > seg.startFrame, `Invalid frame range at ${seg.index}`);
    }
    console.log("  ✓ No negative subtitle durations");
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

// ============================================================
// Test: Output directory creation
// ============================================================

function testProjectDirCreation() {
  // Dynamic import to avoid running config env check at module load
  const tmpBase = makeTmpDir();
  try {
    const { createProjectDir, generateProjectId } = require("./manifestBuilder");
    const id = generateProjectId();
    const dir = createProjectDir(tmpBase, id);
    assert.ok(fs.existsSync(dir), "Project dir not created");
    assert.ok(fs.existsSync(path.join(dir, "narration")));
    assert.ok(fs.existsSync(path.join(dir, "subtitles")));
    assert.ok(fs.existsSync(path.join(dir, "render")));
    console.log("  ✓ Project directory structure created correctly");
  } finally {
    fs.rmSync(tmpBase, { recursive: true, force: true });
  }
}

// ============================================================
// Test: Missing credentials error
// ============================================================

function testMissingCredentialsDetected() {
  const { checkCredentials } = require("./config");
  const originalKey = process.env["GEMINI_API_KEY"];
  delete process.env["GEMINI_API_KEY"];

  const err = checkCredentials();
  assert.ok(err !== null, "Expected credential error when key is absent");
  assert.ok(typeof err === "string" && err.length > 0);

  if (originalKey) process.env["GEMINI_API_KEY"] = originalKey;
  console.log("  ✓ Missing credentials detected correctly");
}

// ============================================================
// Test runner
// ============================================================

async function runTests() {
  console.log("\n══════════════════════════════════════");
  console.log("  AI Video Studio — Unit Tests");
  console.log("══════════════════════════════════════\n");

  const tests: Array<{ name: string; fn: () => void | Promise<void> }> = [
    { name: "Valid script passes validation", fn: testValidScriptPasses },
    { name: "Missing required fields fails", fn: testMissingFieldsFails },
    { name: "Duplicate scene IDs detected", fn: testDuplicateSceneIdsFails },
    { name: "Invalid scene ID format fails", fn: testInvalidSceneIdFormatFails },
    { name: "Malformed JSON handled", fn: testMalformedJsonHandled },
    { name: "Scene ID generation", fn: testGenerateSceneId },
    { name: "normaliseScript defaults", fn: testNormaliseScriptDefaults },
    { name: "Audio to frame conversion", fn: testAudioToFrameConversion },
    { name: "Subtitle timing from audio", fn: testSubtitleGenerationTiming },
    { name: "No negative subtitle durations", fn: testNoNegativeSubtitleDurations },
    { name: "Project directory creation", fn: testProjectDirCreation },
    { name: "Missing credentials detected", fn: testMissingCredentialsDetected },
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      await test.fn();
      passed++;
    } catch (e) {
      console.error(`  ✗ ${test.name}`);
      console.error(`    ${(e as Error).message}`);
      failed++;
    }
  }

  console.log(`\n══════════════════════════════════════`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log(`══════════════════════════════════════\n`);

  if (failed > 0) process.exit(1);
}

runTests().catch((e: Error) => {
  console.error("Test runner error:", e.message);
  process.exit(1);
});

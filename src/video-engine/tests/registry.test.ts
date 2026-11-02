/**
 * Scene Renderer Registry Test Suite.
 *
 * Covers:
 * - Registry Lookups and Duplicate Protection
 * - Capability Manifest Consistency
 * - Zod Validation for Blueprints, Scenes, and Elements
 * - Frame-based Timeline Calculations & Audio Precedence
 * - Deterministic Animation Calculations
 */

import assert from "assert";
import {
  getSceneRenderer,
  hasSceneRenderer,
  listRegisteredSceneTypes,
  registerSceneRenderer,
} from "../registry/scene-registry";
import {
  getElementRenderer,
  hasElementRenderer,
  listRegisteredElementTypes,
  registerElementRenderer,
} from "../registry/element-registry";
import {
  getCapabilityManifest,
  formatCapabilityManifestForPrompt,
} from "../registry/capability-manifest";
import {
  validateVideoBlueprint,
  validateScene,
  validateElement,
} from "../schemas/validation";
import { buildTimeline, secondsToFrames } from "../timeline/build-timeline";
import {
  computeAnimationStyles,
  computeCountUp,
  computeDrawLineProgress,
} from "../animations/animation-dispatcher";
import type { VideoBlueprint, SceneBlueprint } from "../types";

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err: any) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

console.log("\n══════════════════════════════════════");
console.log("  Scene Renderer Registry — Tests");
console.log("══════════════════════════════════════\n");

// -------------------------------------------------------------
// 1. Registry Tests
// -------------------------------------------------------------
test("Every registered scene type has a valid React renderer component", () => {
  const scenes = listRegisteredSceneTypes();
  assert.ok(scenes.length >= 11, `Expected at least 11 scene types, got ${scenes.length}`);
  for (const s of scenes) {
    const renderer = getSceneRenderer(s.type);
    assert.strictEqual(typeof renderer, "function", `Scene ${s.type} renderer must be a function`);
    assert.strictEqual(hasSceneRenderer(s.type), true);
  }
});

test("Duplicate scene registration throws an error", () => {
  assert.throws(() => {
    registerSceneRenderer({
      type: "kinetic_typography",
      name: "Duplicate",
      description: "Should fail",
      renderer: () => null,
      requiredFields: [],
      optionalFields: [],
      example: {},
    });
  }, /Duplicate scene renderer registration/);
});

test("Unknown scene type returns undefined and false", () => {
  assert.strictEqual(hasSceneRenderer("non_existent_type" as any), false);
  assert.strictEqual(getSceneRenderer("non_existent_type" as any), undefined);
});

test("Every registered element type has a valid renderer", () => {
  const elements = listRegisteredElementTypes();
  assert.ok(elements.length >= 20, `Expected at least 20 elements, got ${elements.length}`);
  for (const el of elements) {
    const renderer = getElementRenderer(el.type);
    assert.strictEqual(typeof renderer, "function", `Element ${el.type} renderer must be a function`);
    assert.strictEqual(hasElementRenderer(el.type), true);
  }
});

test("Duplicate element registration throws an error", () => {
  assert.throws(() => {
    registerElementRenderer({
      type: "heading",
      category: "typography",
      name: "Duplicate",
      description: "Should fail",
      renderer: () => null,
    });
  }, /Duplicate element renderer registration/);
});

// -------------------------------------------------------------
// 2. Capability Manifest Tests
// -------------------------------------------------------------
test("Capability manifest matches active registrations with zero drift", () => {
  const manifest = getCapabilityManifest();
  const registeredScenes = listRegisteredSceneTypes();
  const registeredElements = listRegisteredElementTypes();

  assert.strictEqual(manifest.supported_scene_types.length, registeredScenes.length);
  assert.strictEqual(manifest.supported_element_types.length, registeredElements.length);
  assert.ok(manifest.supported_animations.length >= 10);
  assert.ok(manifest.supported_transitions.length >= 3);
  assert.ok(manifest.theme_presets.includes("cyber_editorial"));

  const promptSummary = formatCapabilityManifestForPrompt();
  assert.ok(promptSummary.includes("kinetic_typography"));
  assert.ok(promptSummary.includes("system_architecture"));
  assert.ok(promptSummary.includes("SUPPORTED ANIMATIONS"));
});

// -------------------------------------------------------------
// 3. Schema & Validation Tests
// -------------------------------------------------------------
test("Valid video blueprint passes schema validation", () => {
  const validBlueprint: VideoBlueprint = {
    title: "Test Video",
    aspect_ratio: "9:16",
    width: 1080,
    height: 1920,
    fps: 60,
    target_duration_seconds: 15,
    brand: {
      primary_color: "#111827",
      accent_color: "#FF5F00",
    },
    scenes: [
      {
        id: "scene_001",
        purpose: "hook",
        scene_type: "kinetic_typography",
        narration: "Hello autonomous world.",
        duration_hint_seconds: 5,
      },
      {
        id: "scene_002",
        purpose: "demo",
        scene_type: "code_terminal",
        narration: "CLI execution in progress.",
        duration_hint_seconds: 5,
        terminal_lines: ["echo 'hello'"],
      },
    ],
  };

  const res = validateVideoBlueprint(validBlueprint);
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.errors.length, 0);
});

test("Blueprint with duplicate scene IDs fails validation", () => {
  const duplicateBlueprint = {
    title: "Duplicate Test",
    aspect_ratio: "9:16",
    width: 1080,
    height: 1920,
    fps: 60,
    target_duration_seconds: 10,
    brand: { primary_color: "#111827", accent_color: "#FF5F00" },
    scenes: [
      { id: "scene_001", purpose: "hook", scene_type: "kinetic_typography", narration: "One", duration_hint_seconds: 5 },
      { id: "scene_001", purpose: "cta", scene_type: "cta", narration: "Two", duration_hint_seconds: 5 },
    ],
  };

  const res = validateVideoBlueprint(duplicateBlueprint);
  assert.strictEqual(res.success, false);
  assert.ok(res.errors.some((e) => e.includes("Duplicate scene ID")));
});

test("Invalid hex color fails validation", () => {
  const invalidColorBlueprint = {
    title: "Color Test",
    aspect_ratio: "9:16",
    width: 1080,
    height: 1920,
    fps: 60,
    target_duration_seconds: 5,
    brand: { primary_color: "not-a-color", accent_color: "#FF5F00" },
    scenes: [
      { id: "scene_001", purpose: "hook", scene_type: "kinetic_typography", narration: "One", duration_hint_seconds: 5 },
    ],
  };

  const res = validateVideoBlueprint(invalidColorBlueprint);
  assert.strictEqual(res.success, false);
  assert.ok(res.errors.some((e) => e.includes("brand.primary_color")));
});

test("Scene with duplicate element IDs fails validation", () => {
  const sceneWithDupElements: SceneBlueprint = {
    id: "scene_001",
    purpose: "context",
    scene_type: "modular_scene",
    narration: "Testing elements.",
    duration_hint_seconds: 5,
    elements: [
      { id: "elem_dup", type: "heading", text: "First" },
      { id: "elem_dup", type: "body_text", text: "Second" },
    ],
  };

  const res = validateScene(sceneWithDupElements);
  assert.strictEqual(res.success, false);
  assert.ok(res.errors.some((e) => e.includes("duplicate element ID")));
});

test("Valid visual element passes validation", () => {
  const validBarChart = {
    id: "chart_1",
    type: "bar_chart_elem",
    title: "Performance",
    data: [
      { label: "A", value: 10 },
      { label: "B", value: 20 },
    ],
  };

  const res = validateElement(validBarChart);
  assert.strictEqual(res.success, true);
});

// -------------------------------------------------------------
// 4. Timeline Tests
// -------------------------------------------------------------
test("secondsToFrames correctly calculates integer frame boundaries", () => {
  assert.strictEqual(secondsToFrames(5, 60), 300);
  assert.strictEqual(secondsToFrames(2.5, 60), 150);
  assert.strictEqual(secondsToFrames(0.333, 60), 20);
});

test("buildTimeline constructs contiguous frame timeline without gaps", () => {
  const bp: VideoBlueprint = {
    title: "Timeline Test",
    aspect_ratio: "9:16",
    width: 1080,
    height: 1920,
    fps: 60,
    target_duration_seconds: 15,
    brand: { primary_color: "#000", accent_color: "#FFF" },
    scenes: [
      { id: "s1", purpose: "hook", scene_type: "kinetic_typography", narration: "A", duration_hint_seconds: 4 },
      { id: "s2", purpose: "insight", scene_type: "stat_counter", narration: "B", duration_hint_seconds: 6 },
    ],
  };

  const tl = buildTimeline(bp);
  assert.strictEqual(tl.scenes[0].startFrame, 0);
  assert.strictEqual(tl.scenes[0].durationFrames, 240);
  assert.strictEqual(tl.scenes[0].endFrame, 240);

  assert.strictEqual(tl.scenes[1].startFrame, 240);
  assert.strictEqual(tl.scenes[1].durationFrames, 360);
  assert.strictEqual(tl.scenes[1].endFrame, 600);

  assert.strictEqual(tl.totalFrames, 600);
  assert.strictEqual(tl.totalDurationSeconds, 10);
});

test("Measured audio duration takes precedence over duration_hint_seconds", () => {
  const bp: VideoBlueprint = {
    title: "Audio Timeline Test",
    aspect_ratio: "9:16",
    width: 1080,
    height: 1920,
    fps: 60,
    target_duration_seconds: 5,
    brand: { primary_color: "#000", accent_color: "#FFF" },
    scenes: [
      { id: "s1", purpose: "hook", scene_type: "kinetic_typography", narration: "Long narration", duration_hint_seconds: 3 },
    ],
  };

  // Measured audio is 7.5s
  const tl = buildTimeline(bp, { s1: 7.5 });
  // Duration is 7.5 + 0.3s pad = 7.8s * 60 = 468 frames
  assert.strictEqual(tl.scenes[0].durationFrames, 468);
  assert.strictEqual(tl.totalFrames, 468);
});

test("Transition overlap is accurately subtracted from total frames", () => {
  const bp: VideoBlueprint = {
    title: "Transition Overlap Test",
    aspect_ratio: "9:16",
    width: 1080,
    height: 1920,
    fps: 60,
    target_duration_seconds: 10,
    brand: { primary_color: "#000", accent_color: "#FFF" },
    scenes: [
      {
        id: "s1",
        purpose: "hook",
        scene_type: "kinetic_typography",
        narration: "A",
        duration_hint_seconds: 5, // 300 frames
        transition_out: { type: "fade", duration_seconds: 0.5 }, // 30 frames overlap
      },
      {
        id: "s2",
        purpose: "cta",
        scene_type: "cta",
        narration: "B",
        duration_hint_seconds: 5, // 300 frames
      },
    ],
  };

  const tl = buildTimeline(bp);
  assert.strictEqual(tl.scenes[0].transitionOverlapFrames, 30);
  assert.strictEqual(tl.scenes[1].startFrame, 270); // 300 - 30
  assert.strictEqual(tl.totalFrames, 570); // 300 + 300 - 30
});

// -------------------------------------------------------------
// 5. Animation Calculation Tests
// -------------------------------------------------------------
test("computeAnimationStyles clamps values deterministically", () => {
  const anim = { enter: "fade_up" as const, start_seconds: 1, duration_seconds: 1 };
  const fps = 60;

  // Before start frame (frame 0)
  const before = computeAnimationStyles(anim, 0, fps);
  assert.strictEqual(before.opacity, 0);

  // Halfway (frame 90 = 1.5s)
  const mid = computeAnimationStyles(anim, 90, fps);
  assert.ok(mid.opacity! > 0 && mid.opacity! < 1);

  // After completion (frame 150 = 2.5s)
  const after = computeAnimationStyles(anim, 150, fps);
  assert.strictEqual(after.opacity, 1);
});

test("computeCountUp interpolates numbers smoothly and clamps at bounds", () => {
  const valAtStart = computeCountUp(10, 100, 0, 60, 0);
  assert.strictEqual(valAtStart, 10);

  const valAtEnd = computeCountUp(10, 100, 0, 60, 60);
  assert.strictEqual(valAtEnd, 100);

  const valBeyond = computeCountUp(10, 100, 0, 60, 120);
  assert.strictEqual(valBeyond, 100);
});

test("computeDrawLineProgress clamps to 1 after completion", () => {
  assert.strictEqual(computeDrawLineProgress(0, 30, 0), 0);
  assert.strictEqual(computeDrawLineProgress(0, 30, 30), 1);
  assert.strictEqual(computeDrawLineProgress(0, 30, 999), 1);
});

// -------------------------------------------------------------
// Summary
// -------------------------------------------------------------
console.log("\n══════════════════════════════════════");
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log("══════════════════════════════════════\n");

if (failed > 0) {
  process.exit(1);
}

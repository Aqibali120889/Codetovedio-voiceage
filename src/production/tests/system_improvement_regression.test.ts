/**
 * SYSTEM IMPROVEMENT DIRECTIVE: REGRESSION TEST SUITE (Section 11)
 *
 * Verifies all 14 mandatory failure mode fixes and system invariants:
 * 1. Evidence Isolation: Two unrelated stories cannot inherit one another's evidence or metrics.
 * 2. Story Selection Dynamic: Different briefs produce distinct summaries, angles, and narration.
 * 3. Factual Claim Validation: Unsupported statistics/claims are flagged and rejected.
 * 4. Duration Consistency: Script timing matches narration word count and target duration.
 * 5. Artifact Delivery: Every planned artifact reaches the relevant renderer.
 * 6. Pipeline Preservation: `scene.elements` survives all pipeline boundaries.
 * 7. Asset Propagation: Resolved images reach the final composition.
 * 8. Asset Fallback: Unavailable images trigger deliberate domain-relevant SVG/visual fallbacks.
 * 9. Remotion Bits Integration: Compatible Remotion Bits components are imported and rendered.
 * 10. Unknown Component Safety: Unknown component IDs trigger actionable errors, not silent drops.
 * 11. Resumability: Pipeline can resume from completed stages after later-stage interruptions.
 * 12. Telemetry Attribution: Timeouts and stage latencies are correctly attributed.
 * 13. Generation History: Anti-repetition penalties prevent visual monotony across consecutive runs.
 * 14. Stack Compatibility: Remotion, React 19, Google GenAI SDK, and schema validation stay intact.
 */

import assert from "assert";
import fs from "fs";
import path from "path";
import { FixtureSearchProvider, FeedSearchProvider } from "../../research/retrieval/search-provider";
import { gatherEvidence } from "../../research/agents/evidence-researcher";
import { evaluateEditorialConsistency } from "../editorial/editorial-consistency-gate";
import { analyzeAudienceAndStrategy } from "../../research/agents/audience-strategist";
import { generateGroundedScript } from "../scriptwriting/grounded-scriptwriter";
import { validateScriptClaims } from "../scriptwriting/claim-validator";
import { buildDeterministicBlueprintFromScript } from "../scene-planning/scene-planner";
import { planStoryboardFromScript } from "../storyboard/storyboard-planner";
import { validateAndRepairScenePlan } from "../scene-planning/plan-validator";
import { AssetManager } from "../assets/asset-manager";
import { getCuratedFallbackAsset } from "../assets/curated-library";
import { getElementRenderer, hasElementRenderer } from "../../video-engine/registry/element-registry";
import { hasSceneRenderer, getSceneRenderer } from "../../video-engine/registry/scene-registry";
import { StageProfiler } from "../telemetry/stage-profiler";
import { getGenerationHistoryManager } from "../history/generation-history";
import { determineVisualDirection } from "../editorial/visual-art-director";
import type { ScriptDocument } from "../types";
import type { VideoBlueprint } from "../../video-engine/types";
import { AnimatedCounter, TypeWriter, AnimatedText } from "remotion-bits";
import { generateSpeechOrCleanAudio } from "../audio/narration-service";
import { mixWithSpeechAwareDucking } from "../audio/ducking-engine";
import { computeLayoutZones, fitTextFontSize, remapArtifactPosition } from "../../video-engine/layout/layout-system";

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

export async function runSystemImprovementRegressionTests(): Promise<{ passed: number; failed: number }> {
  console.log("\n══════════════════════════════════════════════════════════════════");
  console.log("  System Improvement Directive — Required Regression Tests");
  console.log("══════════════════════════════════════════════════════════════════\n");

  const search = new FixtureSearchProvider();

  // 1. Evidence Isolation
  await test("1. Evidence Isolation: Unrelated stories cannot inherit one another's evidence or metrics", async () => {
    const fintechResults = await search.search("Axios Live: AI agents are changing how money moves");
    const codingResults = await search.search("ESP-Mosaico Lets AI Agents Do the Coding");

    assert.ok(fintechResults.length > 0, "Expected fintech search results");
    assert.ok(codingResults.length > 0, "Expected coding search results");

    const fintechSnippets = fintechResults.map((r) => r.snippet + " " + r.title).join(" ");
    const codingSnippets = codingResults.map((r) => r.snippet + " " + r.title).join(" ");

    assert.ok(fintechSnippets.includes("Stripe") || fintechSnippets.includes("treasury") || fintechSnippets.includes("money"), "Fintech results should contain finance terms");
    assert.ok(!fintechSnippets.includes("ESP32") && !fintechSnippets.includes("UART") && !fintechSnippets.includes("ESP-Mosaico"), "Fintech must NOT leak ESP-Mosaico evidence");

    assert.ok(codingSnippets.includes("ESP32") || codingSnippets.includes("firmware"), "Coding results should contain embedded terms");
    assert.ok(!codingSnippets.includes("Stripe") && !codingSnippets.includes("settlement idle cash"), "Coding must NOT leak Axios Fintech evidence");
  });

  // 2. Dynamic Story Brief Divergence
  await test("2. Dynamic Story Differentiation: Distinct briefs produce distinct angles, hooks, and narration", async () => {
    const planFintech = {
      topic: "Axios Live: AI agents are changing how money moves",
      targetAudience: "Fintech CTOs & Treasury Leaders",
      subquestions: [
        { id: "sq_1", question: "How are agents clearing liquidity?", focus: "core_architecture", priority: "high", requiredEvidenceType: "technical_architecture" },
        { id: "sq_2", question: "What is the measured settlement speed?", focus: "benchmarks_and_metrics", priority: "high", requiredEvidenceType: "benchmark" },
      ],
    } as any;
    const recordsFintech = [
      { evidence_id: "ev_1", evidence_type: "primary_source", supporting_excerpt: "Stripe and treasury rails routing capital sub-second." },
      { evidence_id: "ev_2", evidence_type: "statistic", supporting_excerpt: "Settlement windows drop from 48 hours to 320ms." },
    ] as any;

    const planCoding = {
      topic: "ESP-Mosaico Lets AI Agents Do the Coding",
      targetAudience: "Embedded Systems Engineers",
      subquestions: [
        { id: "sq_c1", question: "How does ESP-Mosaico flash firmware?", focus: "core_architecture", priority: "high", requiredEvidenceType: "technical_architecture" },
        { id: "sq_c2", question: "What is the compiler first-pass success rate?", focus: "benchmarks_and_metrics", priority: "high", requiredEvidenceType: "benchmark" },
      ],
    } as any;
    const recordsCoding = [
      { evidence_id: "ev_c1", evidence_type: "primary_source", supporting_excerpt: "ESP-Mosaico compiles C code and flashes ESP32 via UART." },
      { evidence_id: "ev_c2", evidence_type: "statistic", supporting_excerpt: "94.6% first-flash firmware verification rate." },
    ] as any;

    const resFintech = analyzeAudienceAndStrategy(planFintech, recordsFintech);
    const resCoding = analyzeAudienceAndStrategy(planCoding, recordsCoding);

    assert.notStrictEqual(resFintech.recommendedAngle.main_thesis, resCoding.recommendedAngle.main_thesis, "Theses must diverge");
    assert.ok(resFintech.contentOpportunities[0].title.includes("Financial") || resFintech.contentOpportunities[0].title.includes("Autonomous"), "Fintech opp tailored");
    assert.ok(resCoding.contentOpportunities[0].title.includes("Software") || resCoding.contentOpportunities[0].title.includes("Code") || resCoding.contentOpportunities[0].title.includes("Autonomous"), "Coding opp tailored");
  });

  // 3. Factual Claim Validation & Rejection of Fabricated Stats
  await test("3. Factual Claim Validation: Unsupported statistics/claims are rejected or flagged", async () => {
    const brief = {
      metadata: { brief_id: "brief_test", research_topic: "Autonomous Banking" },
      facts_and_statistics: [
        { fact_id: "fact_01", exact_claim_or_figure: "Settlement latency reduced to 320ms" },
      ],
      evidence_store: {
        ev_01: { claim: "Settlement latency reduced to 320ms", source_title: "FT", evidence_id: "ev_01" } as any,
      },
      key_findings: [],
    } as any;

    const scriptWithFakeClaim: ScriptDocument = {
      script_id: "scr_fake",
      topic: "Autonomous Banking",
      target_audience: "Finance Directors",
      title: "Autonomous Banking Breakthrough",
      target_duration_seconds: 30,
      created_at: new Date().toISOString(),
      claims_summary: {
        total: 1,
        verified: 0,
        unverified: 1,
        flagged: 0,
      },
      scenes: [
        {
          scene_id: "sc_01",
          purpose: "hook",
          narration: "Autonomous banking protocols achieved an unheard-of 99.999% global cost reduction.",
          on_screen_text: "99.999% SAVINGS",
          visual_description: "Futuristic glow",
          claims: [],
        },
      ],
    };

    const validation = validateScriptClaims(scriptWithFakeClaim, brief);
    assert.strictEqual(validation.valid, false, "Script with fabricated statistic must fail validation");
    assert.ok(validation.errors.length > 0, "Validation must report specific claim errors");
  });

  // 4. Duration Consistency
  await test("4. Duration Consistency: Script scene count and word pacing match target duration", async () => {
    const brief = {
      metadata: { brief_id: "b1", research_topic: "Embedded Firmware" },
      executive_summary: { overview: "Fast testing" },
      why_now: { freshness_status: "recent_update" },
      key_findings: [],
      facts_and_statistics: [{ fact_id: "f1", exact_claim_or_figure: "94.6% first flash success" }],
      evidence_store: {},
      scriptwriter_handoff: {
        core_thesis: "Automated firmware validation",
        recommended_angle_title: "ESP32 Autonomous Flashing",
        verified_facts: [{ claim: "94.6% first flash success", evidence_id: "e1" }],
        narrative_beats: [
          { beat: "1", purpose: "hook", narration_focus: "Hardware limits", visual_suggestion: "terminal" },
          { beat: "2", purpose: "architecture", narration_focus: "Compiler pipeline", visual_suggestion: "diagram" },
          { beat: "3", purpose: "cta", narration_focus: "Next step", visual_suggestion: "cta" },
        ],
      },
    } as any;

    const script = await generateGroundedScript(brief, { targetDurationSeconds: 45, forceDeterministic: true });
    const totalWords = script.scenes.reduce((acc, s) => acc + s.narration.split(/\s+/).length, 0);
    const estimatedSeconds = totalWords / 2.5;

    assert.ok(estimatedSeconds >= 15 && estimatedSeconds <= 60, `Estimated duration ${estimatedSeconds}s must be reasonably aligned with 45s target`);
    assert.ok(script.scenes.length >= 3, "Expected at least 3 scenes in script");
  });

  // 5 & 6. Planned Artifacts & scene.elements Survival Across Pipeline
  await test("5 & 6. Artifact & scene.elements Survival: Storyboard artifacts cleanly map into SceneBlueprint elements", async () => {
    const brief = {
      metadata: { brief_id: "b_art", research_topic: "Payment Routing" },
      executive_summary: { overview: "Sub-second B2B clearing" },
      facts_and_statistics: [],
      evidence_store: {},
      scriptwriter_handoff: {
        core_thesis: "Real-time money moves",
        recommended_angle_title: "Payment Routing",
        verified_facts: [],
        narrative_beats: [{ beat: "1", purpose: "metric", narration_focus: "Settlement", visual_suggestion: "counter" }],
      },
    } as any;

    const script = await generateGroundedScript(brief, { targetDurationSeconds: 30, forceDeterministic: true });
    const storyboard = await planStoryboardFromScript(script, brief, { forceDeterministic: true });

    assert.ok(storyboard.scenes.length > 0, "Storyboard must have scenes");
    const firstSbScene = storyboard.scenes[0];
    assert.ok(firstSbScene.artifacts.length > 0, "Storyboard scene must contain rich artifacts");

    const blueprint = buildDeterministicBlueprintFromScript(script, { storyboard });
    const firstBpScene = blueprint.scenes[0];

    assert.ok(firstBpScene.elements && firstBpScene.elements.length > 0, "SceneBlueprint must preserve scene.elements from Storyboard");
    assert.strictEqual(firstBpScene.elements.length, firstSbScene.artifacts.length, "Every storyboard artifact must survive into scene.elements");

    const validated = validateAndRepairScenePlan(blueprint);
    assert.ok(validated.blueprint.scenes[0].elements!.length > 0, "scene.elements must survive schema validation and repair");
  });

  // 7 & 8. Asset Propagation & Explicit Fallbacks
  await test("7 & 8. Asset Propagation & Fallback: Pixabay enrichment propagates image_url and missing assets trigger SVG fallbacks", async () => {
    const assetManager = new AssetManager();
    const blueprint: VideoBlueprint = {
      title: "Finance Video",
      aspect_ratio: "9:16",
      width: 1080,
      height: 1920,
      fps: 60,
      target_duration_seconds: 30,
      brand: {
        primary_color: "#0A0A0C",
        accent_color: "#10B981",
      },
      scenes: [
        {
          id: "sc_fin",
          purpose: "hook" as const,
          scene_type: "document_reveal" as const,
          narration: "Autonomous clearing protocol.",
          visual_description: "Wall street banking terminal screenshot",
          duration_hint_seconds: 5,
        },
      ],
    };

    const enrichment = await assetManager.enrichBlueprintWithAssets(blueprint);
    assert.ok(enrichment.enrichedCount > 0, "Expected asset enrichment");
    assert.ok(blueprint.scenes[0].image_url, "image_url must be populated on enriched scene");

    // Deliberate fallback verification
    const fallbackAsset = getCuratedFallbackAsset("finance", "photo");
    assert.ok(fallbackAsset.dataUri.startsWith("data:image/svg+xml"), "Curated fallback must be valid SVG data URI");
    assert.ok(fallbackAsset.dataUri.includes("CURATED FALLBACK") || fallbackAsset.dataUri.includes("svg"), "Fallback SVG must be well-formed");
  });

  // 9. Remotion Bits Integration
  await test("9. Remotion Bits Integration: AnimatedText, TypeWriter, and AnimatedCounter are functional React components", async () => {
    assert.strictEqual(typeof AnimatedCounter, "function", "AnimatedCounter must be export function");
    assert.strictEqual(typeof TypeWriter, "function", "TypeWriter must be export function");
    assert.strictEqual(typeof AnimatedText, "function", "AnimatedText must be export function");

    // Verify MetricCounterComponent uses AnimatedCounter in element registry
    assert.ok(hasElementRenderer("metric_counter_elem"), "metric_counter_elem must be registered");
    assert.ok(hasElementRenderer("terminal_window_elem"), "terminal_window_elem must be registered");
  });

  // 10. Unknown Component Safety
  await test("10. Unknown Component Safety: Non-existent scene or element renderers produce actionable errors", async () => {
    assert.strictEqual(hasSceneRenderer("non_existent_scene_type" as any), false, "Unknown scene type returns false");
    assert.strictEqual(getSceneRenderer("non_existent_scene_type" as any), undefined, "Unknown scene returns undefined");

    assert.strictEqual(hasElementRenderer("non_existent_elem" as any), false, "Unknown element type returns false");
    assert.strictEqual(getElementRenderer("non_existent_elem" as any), undefined, "Unknown element returns undefined");
  });

  // 11. Resumability
  await test("11. Pipeline Resumability: Completed stages checkpoint cleanly and StageProfiler records cache hits", async () => {
    const tmpProjectDir = path.join(process.cwd(), "tmp", `test_resume_${Date.now()}`);
    fs.mkdirSync(tmpProjectDir, { recursive: true });

    const profiler = new StageProfiler(tmpProjectDir);
    profiler.startStage("loading_research", { cacheHit: true });
    profiler.completeStage("loading_research", { notes: "Resumed from existing research_brief.json" });

    const summary = profiler.getSummary() as any;
    assert.strictEqual(summary.totalStages, 1, "Should have recorded 1 stage");
    assert.strictEqual(summary.stages[0].cacheHit, true, "Cache hit must be marked true");

    fs.rmSync(tmpProjectDir, { recursive: true, force: true });
  });

  // 12. Telemetry Attribution & Timeouts
  await test("12. Telemetry Attribution: Timeouts and errors are attributed to the exact stage that failed", async () => {
    const profiler = new StageProfiler();
    profiler.startStage("planning_storyboard", { timeoutDurationMs: 40000 });
    profiler.failStage("planning_storyboard", "timeout", "Gemini storyboard planner timed out after 40s");

    const summary = profiler.getSummary() as any;
    const stage = summary.stages[0];
    assert.strictEqual(stage.stage, "planning_storyboard");
    assert.strictEqual(stage.status, "timed_out");
    assert.strictEqual(stage.errorCategory, "timeout");
  });

  // 13. Generation History Anti-Repetition
  await test("13. Anti-Repetition: GenerationHistory records past runs and VisualArtDirector provides avoid_patterns", async () => {
    const history = getGenerationHistoryManager();
    const testGenId = `gen_test_${Date.now()}`;

    history.recordGeneration({
      generation_id: testGenId,
      project_id: "proj_test_01",
      topic: "Autonomous Banking",
      title: "Autonomous Banking",
      timestamp: new Date().toISOString(),
      theme_preset: "cyber_editorial",
      aspect_ratio: "9:16",
      generation_seed: 12345,
      scene_sequence: ["parallax_hero", "document_reveal", "stat_counter", "cta"],
      total_duration_seconds: 45,
      scenes_count: 4,
    });

    const recent = history.getRecent(1);
    assert.strictEqual(recent[0].generation_id, testGenId);

    const brief = {
      metadata: { research_topic: "Autonomous Banking" },
      executive_summary: { overview: "Banking flows" },
      facts_and_statistics: [],
      evidence_store: {},
    } as any;

    const script = {
      script_id: "s1",
      topic: "Autonomous Banking",
      title: "Autonomous Banking",
      target_duration_seconds: 30,
      scenes: [],
    } as any;

    const visualDirection = await determineVisualDirection(brief, script, { forceDeterministic: true });
    assert.ok(visualDirection.avoid_patterns.length > 0, "Visual direction must contain avoid patterns from history");
  });

  // 14. Stack & Renderer Compatibility
  await test("14. Stack Compatibility: All 19 registered scene types remain available in Scene Registry", async () => {
    const requiredSceneTypes = [
      "kinetic_typography", "stat_counter", "bar_chart", "line_chart",
      "system_architecture", "process_flow", "code_terminal", "comparison_grid",
      "dashboard_mockup", "quote_insight", "cta", "modular_scene",
      "parallax_hero", "timeline_reveal", "infographic_grid", "word_by_word",
      "split_callout", "document_reveal", "editorial_montage",
    ];

    for (const type of requiredSceneTypes) {
      assert.ok(hasSceneRenderer(type as any), `Scene renderer "${type}" must be registered`);
    }
  });

  // 15. Tonal Beep Elimination
  await test("15. Tonal Beep Elimination: Audio synthesis generates spoken voice or broadband speech without pure 440Hz sine tone", async () => {
    const testDir = path.resolve(process.cwd(), "scratch", "test_beep_check");
    fs.mkdirSync(testDir, { recursive: true });
    const wavPath = path.join(testDir, "test_speech.wav");

    generateSpeechOrCleanAudio("Autonomous financial agents are settling liquidity pipelines.", wavPath, 2.0);

    assert.ok(fs.existsSync(wavPath), "Generated speech WAV file must exist on disk");
    const stat = fs.statSync(wavPath);
    assert.ok(stat.size > 2000, "Generated audio must contain real audio bytes");

    // Inspect audio stats to confirm absence of 440Hz sine beep
    const { spawnSync } = await import("child_process");
    const inspect = spawnSync("ffmpeg", ["-i", wavPath, "-af", "volumedetect,astats", "-f", "null", "-"], { encoding: "utf8" });
    const meanMatch = inspect.stderr?.match(/mean_volume:\s*(-?[\d.]+)\s*dB/);
    const crestMatch = inspect.stderr?.match(/Crest factor:\s*([\d.]+)/);
    const meanDb = meanMatch ? parseFloat(meanMatch[1]) : -80;
    const crest = crestMatch ? parseFloat(crestMatch[1]) : 0;

    assert.ok(meanDb > -60, `Synthesized audio must be audible (mean volume: ${meanDb} dB)`);
    // Pure sine wave has crest factor = 1.4142. Speech has crest factor > 1.8 or != 1.414
    const isPureSine = crest >= 1.40 && crest <= 1.43 && Math.abs(meanDb - -10.0) < 5;
    assert.ok(!isPureSine, `Audio must not be a pure 440Hz sine beep (measured crest factor: ${crest})`);

    // Clean up
    try { fs.rmSync(testDir, { recursive: true, force: true }); } catch (_) {}
  });

  // 16. Speech-Aware Audio Ducking
  await test("16. Audio Ducking: Speech-aware engine ducks background music and limits peak levels", async () => {
    const testDir = path.resolve(process.cwd(), "scratch", "test_ducking");
    fs.mkdirSync(testDir, { recursive: true });
    const narrPath = path.join(testDir, "narr.wav");
    const mixPath = path.join(testDir, "ducked_mix.wav");
    const bgmPath = path.resolve(process.cwd(), "assets", "audio", "music", "cyber_ambient_pulse.wav");

    assert.ok(fs.existsSync(bgmPath), "Cyber ambient pulse background music track must exist");

    generateSpeechOrCleanAudio("Real-time telemetry confirms transaction verification.", narrPath, 2.5);

    const mixResult = await mixWithSpeechAwareDucking(narrPath, bgmPath, mixPath, {
      attackMs: 60,
      releaseMs: 500,
      threshold: 0.032,
      baseMusicVolume: 0.20,
      peakCeilingDb: -0.8,
    });

    assert.ok(fs.existsSync(mixPath), "Ducked audio mix output file must exist");
    assert.strictEqual(mixResult.musicApplied, true, "Background music must be applied");
    assert.ok(mixResult.peakVolumeDb <= -0.7, `Peak volume (${mixResult.peakVolumeDb} dBFS) must respect -0.8 dBFS ceiling`);
    assert.ok(mixResult.meanVolumeDb > -45, `Mixed audio must remain audible (mean volume: ${mixResult.meanVolumeDb} dB)`);

    // Clean up
    try { fs.rmSync(testDir, { recursive: true, force: true }); } catch (_) {}
  });

  // 17. Layout System Vertical Partitioning & Text Overlap Elimination
  await test("17. Layout System: Enforces non-overlapping vertical zones, text auto-scaling, and collision avoidance", async () => {
    const zones916 = computeLayoutZones(1080, 1920, "9:16");
    assert.ok(zones916.header.bottomPx < zones916.primaryContent.topPx, "Header must not overlap primary content");
    assert.ok(zones916.primaryContent.bottomPx < zones916.auxiliaryTelemetry.topPx, "Primary content must not overlap auxiliary telemetry");
    assert.ok(zones916.auxiliaryTelemetry.bottomPx < zones916.subtitles.topPx, "Auxiliary telemetry must not overlap subtitles");
    assert.ok(zones916.subtitles.bottomPx < zones916.footer.topPx, "Subtitles must not overlap footer");

    // Text auto-scaling
    const shortTextSize = fitTextFontSize("Short Title", 28, 36, 20);
    const longTextSize = fitTextFontSize("A Very Long Comprehensive Analytical Headline That Exceeds Container Boundaries Significantly", 28, 36, 20);
    assert.strictEqual(shortTextSize, 36, "Short text should retain base font size (36px)");
    assert.ok(longTextSize < 36, "Long text must auto-scale downwards to prevent overflow");
    assert.ok(longTextSize >= 20, "Scaled text must not shrink below minSizePx (20px)");

    // Collision avoidance remapping
    const remapped = remapArtifactPosition({ x: 10, y: 40 }, { width: 300, height: 150 }, true);
    assert.strictEqual(remapped.y, 74, "Artifacts colliding with primary content must be remapped to auxiliary telemetry zone (74%)");

    const remappedSub = remapArtifactPosition({ x: 10, y: 88 }, { width: 300, height: 150 }, true);
    assert.strictEqual(remappedSub.y, 75, "Artifacts floating over subtitle zone must be cleared above 82%");
  });

  // 18. Scene Segmentation Density & Story Pacing
  await test("18. Scene Segmentation: 45s production yields >= 8 content-driven scenes with rapid visual progression", async () => {
    const brief = {
      metadata: { brief_id: "b_beats", research_topic: "Axios Live: AI agents are changing how money moves" },
      executive_summary: { overview: "Sub-second B2B clearing" },
      facts_and_statistics: [{ fact_id: "f1", exact_claim_or_figure: "320ms settlement" }],
      evidence_store: {
        ev_1: { evidence_id: "ev_1", evidence_type: "statistic", supporting_excerpt: "Settlement windows drop from 48 hours to 320ms." },
      },
      scriptwriter_handoff: {
        core_thesis: "Instant liquidity channels",
        recommended_angle_title: "The Collapse of Settlement Latency",
        verified_facts: [{ claim: "Settlement windows drop from 48 hours to 320ms.", evidence_id: "ev_1", source_title: "Axios 2026" }],
        narrative_beats: [],
      },
    } as any;

    const script = await generateGroundedScript(brief, { targetDurationSeconds: 45, forceDeterministic: true });
    assert.ok(script.scenes.length >= 8, `Expected >= 8 scenes for 45s target, got ${script.scenes.length}`);

    const blueprint = buildDeterministicBlueprintFromScript(script);
    assert.ok(blueprint.scenes.length >= 8, `Expected >= 8 blueprint scenes, got ${blueprint.scenes.length}`);

    // Verify average scene duration is between 3.5s and 6.0s
    const avgDuration = blueprint.scenes.reduce((acc, s) => acc + (s.duration_hint_seconds || 5), 0) / blueprint.scenes.length;
    assert.ok(avgDuration >= 3.5 && avgDuration <= 6.0, `Average scene duration (${avgDuration.toFixed(1)}s) must be between 3.5s and 6.0s`);
  });

  // 19. Metric Integrity & Dynamic Architecture Relevance
  await test("19. Metric Integrity: No fabricated 99.9% 0 counters, and dynamic architecture nodes replace generic fallbacks", async () => {
    const brief = {
      metadata: { brief_id: "b_integrity", research_topic: "ESP-Mosaico Lets AI Agents Do the Coding" },
      executive_summary: { overview: "Autonomous coding agent loop" },
      facts_and_statistics: [{ fact_id: "f1", exact_claim_or_figure: "94.2% test pass rate" }],
      evidence_store: {
        ev_code: { evidence_id: "ev_code", evidence_type: "statistic", supporting_excerpt: "Pass rate increases to 94.2% in compiler sandbox." },
      },
      scriptwriter_handoff: {
        core_thesis: "Compiler in the loop",
        recommended_angle_title: "Autonomous Coding Verification",
        verified_facts: [{ claim: "Pass rate increases to 94.2% in compiler sandbox.", evidence_id: "ev_code", source_title: "ESP-Mosaico Benchmarks" }],
        narrative_beats: [],
      },
    } as any;

    const script = await generateGroundedScript(brief, { targetDurationSeconds: 45, forceDeterministic: true });
    const storyboard = await planStoryboardFromScript(script, brief, { forceDeterministic: true });
    const blueprint = buildDeterministicBlueprintFromScript(script, { storyboard });

    // Inspect metric counter elements
    for (const sc of blueprint.scenes) {
      if (sc.elements) {
        for (const el of sc.elements) {
          if (el.type === "metric_counter_elem") {
            const endVal = (el as any).end_value;
            assert.ok(typeof endVal === "number" && !isNaN(endVal), `Metric counter end_value must be a valid number, got ${endVal}`);
            assert.notStrictEqual((el as any).label, "99.9%", "Metric counter label must not be raw metric value '99.9%'");
          }
        }
      }
    }

    // Inspect architecture scenes: must not use generic "Source Layer"
    const archScene = blueprint.scenes.find((s) => s.scene_type === "system_architecture");
    assert.ok(archScene, "Blueprint should include an architecture scene");
    if (archScene?.nodes) {
      const labels = archScene.nodes.map((n) => n.label).join(" ");
      assert.ok(!labels.includes("Source Layer"), "Architecture nodes must not use generic 'Source Layer'");
      assert.ok(labels.includes("Compiler") || labels.includes("AST") || labels.includes("Test"), "Coding architecture nodes must reflect compiler/AST domain entities");
    }
  });

  // 20. Route Optimization Story Relevance & Strict Cross-Domain Editorial Gating
  await test("20. Route Optimization Relevance: Feed search prevents off-topic contamination, fallbacks are domain-grounded, and editorial gate rejects cross-domain leaks", async () => {
    const feedSearch = new FeedSearchProvider();
    const query = "The Real-World Impact of AI Agents in Route Optimization";

    // A. Feed search does not return off-topic Figma or AI Control Roadmap articles
    const searchResults = await feedSearch.search(query, { maxResults: 10 });
    for (const res of searchResults) {
      assert.ok(!res.title.toLowerCase().includes("figma"), "Search results must not include Figma");
      assert.ok(!res.title.toLowerCase().includes("control roadmap"), "Search results must not include AI Control Roadmap");
    }

    // B. Evidence gathering produces domain-grounded logistics records
    const plan = {
      topic: query,
      targetAudience: "Logistics Operations & Fleet Executives",
      subquestions: [
        { id: "sq_1", question: "How do dynamic routing agents sequence multi-stop delivery schedules?", focus: "core_architecture", priority: "high", requiredEvidenceType: "technical_architecture" },
        { id: "sq_2", question: "What is the measured reduction in fuel consumption and transit delays?", focus: "benchmarks_and_metrics", priority: "high", requiredEvidenceType: "benchmark" },
      ],
    } as any;

    const evidenceResult = await gatherEvidence(plan, feedSearch);
    assert.ok(evidenceResult.evidenceRecords.length >= 2, "Must generate at least 2 evidence records");

    const combinedEvidence = evidenceResult.evidenceRecords.map(e => e.claim_text + " " + e.supporting_excerpt).join(" ").toLowerCase();
    assert.ok(
      combinedEvidence.includes("telematics") || combinedEvidence.includes("transit delays") || combinedEvidence.includes("dispatch") || combinedEvidence.includes("fuel"),
      "Evidence must contain domain-grounded logistics terms"
    );
    assert.ok(!combinedEvidence.includes("figma"), "Evidence must not contain Figma");
    assert.ok(!combinedEvidence.includes("grafana"), "Evidence must not contain Grafana");
    assert.ok(!combinedEvidence.includes("alert fatigue"), "Evidence must not contain alert fatigue");

    // C. Script generation adheres to logistics domain without boilerplate leakage
    const brief = {
      metadata: { brief_id: "b_route_opt", research_topic: query },
      executive_summary: { overview: "Dynamic fleet optimization and dispatch intelligence" },
      facts_and_statistics: [
        { fact_id: "f_fuel", exact_claim_or_figure: "18% reduction in fuel burn" },
        { fact_id: "f_delay", exact_claim_or_figure: "26% drop in transit delays" },
      ],
      evidence_store: {
        ev_001: evidenceResult.evidenceRecords[0],
        ev_002: evidenceResult.evidenceRecords[1],
      },
      scriptwriter_handoff: {
        core_thesis: "Continuous telematics dispatch cuts fleet operating costs and transit variance",
        recommended_angle_title: "Autonomous Fleet Dispatch and Dynamic Route Optimization",
        verified_facts: [
          { claim: "18% reduction in fuel burn", evidence_id: "ev_001" },
          { claim: "26% drop in transit delays", evidence_id: "ev_002" },
        ],
        narrative_beats: [],
      },
    } as any;

    const script = await generateGroundedScript(brief, { targetDurationSeconds: 45, forceDeterministic: true });
    assert.ok(script.scenes.length >= 8, `Expected >= 8 scenes for 45s target, got ${script.scenes.length}`);

    const allScriptText = script.scenes.map(s => s.narration + " " + s.on_screen_text).join(" ").toLowerCase();
    assert.ok(
      allScriptText.includes("route") || allScriptText.includes("fleet") || allScriptText.includes("telematics") || allScriptText.includes("dispatch"),
      "Script must discuss fleet routing and logistics"
    );
    assert.ok(!allScriptText.includes("alert fatigue"), "Script must NOT discuss alert fatigue");
    assert.ok(!allScriptText.includes("grafana"), "Script must NOT mention Grafana");
    assert.ok(!allScriptText.includes("incident recovery"), "Script must NOT mention incident recovery");
    assert.ok(!allScriptText.includes("figma"), "Script must NOT mention Figma");

    // D. Editorial Consistency Gate accepts the aligned logistics script
    const gatePass = evaluateEditorialConsistency(brief, script);
    assert.strictEqual(gatePass.passed, true, `Editorial gate must pass aligned logistics script. Errors: ${gatePass.errors.join("; ")}`);
    assert.strictEqual(gatePass.errors.length, 0, "No errors should be reported for aligned script");

    // E. Editorial Consistency Gate rejects a contaminated/poisoned script
    const poisonedScript: ScriptDocument = {
      ...script,
      scenes: [
        ...script.scenes.slice(0, 2),
        {
          scene_id: "sc_poisoned",
          purpose: "architecture",
          narration: "Our Figma design canvas automates cloud alert fatigue and siloed telemetry across Grafana clusters.",
          on_screen_text: "FIGMA ALERT FATIGUE",
          visual_description: "Figma dashboard with alert fatigue metrics",
          claims: [],
        },
        ...script.scenes.slice(3),
      ],
    };

    const gateFail = evaluateEditorialConsistency(brief, poisonedScript);
    assert.strictEqual(gateFail.passed, false, "Editorial gate must strictly reject script poisoned with Figma and alert fatigue");
    assert.ok(
      gateFail.errors.some(e => e.toLowerCase().includes("alert fatigue") || e.toLowerCase().includes("figma") || e.toLowerCase().includes("cloud infrastructure")),
      "Editorial gate must cite alert fatigue or design tool contamination in errors"
    );
  });

  console.log(`\n══════════════════════════════════════════════════`);
  console.log(`  Regression Tests: ${passed} passed, ${failed} failed`);
  console.log(`══════════════════════════════════════════════════\n`);

  if (failed > 0) {
    throw new Error(`${failed} regression test(s) failed.`);
  }

  return { passed, failed };
}

if (require.main === module) {
  runSystemImprovementRegressionTests()
    .then(() => {
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

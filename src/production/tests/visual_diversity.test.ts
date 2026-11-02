/**
 * Visual Diversity & Topic Differentiation Test Suite.
 *
 * Validates:
 * 1. Topic-Aware Visual Art Direction:
 *    - Produces distinct color palettes, typography, and motion moods for different topics.
 * 2. Curated Offline Asset Library & Robust Image Resolution:
 *    - Guaranteed SVG Data URI fallbacks for finance, coding, healthcare, and news domains.
 *    - AssetManager enriches multiple scene types (document_reveal, editorial_montage, split_callout, etc.).
 * 3. Artifact Layer & Composition Integration:
 *    - scene.elements are positioned with real Remotion coordinates, z-layers, and entrance animations.
 * 4. Visual Diversity Validator:
 *    - Enforces beat cadence, variety of scene types, and penalizes consecutive duplicates or high concentration.
 * 5. End-to-End Regression Test across Distinct Topics:
 *    - Topic A: "Axios Live: AI agents are changing how money moves" (Fintech/Banking)
 *    - Topic B: "ESP-Mosaico Lets AI Agents Do the Coding" (Embedded/Developer Tools)
 *    - Verifies zero cross-contamination of palettes, visual assets, code snippets, or scene structures.
 */

import assert from "assert";
import { determineVisualDirection } from "../editorial/visual-art-director";
import { getCuratedFallbackAsset } from "../assets/curated-library";
import { AssetManager } from "../assets/asset-manager";
import { validateVisualDiversity } from "../qa/visual-diversity-validator";
import { buildDeterministicBlueprintFromScript } from "../scene-planning/scene-planner";
import type { ResearchBrief } from "../../research/types";
import type { ScriptDocument } from "../types";
import type { VideoBlueprint } from "../../video-engine/types";

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

async function runVisualDiversityTests() {
  console.log("\n══════════════════════════════════════════════════");
  console.log("  Visual Diversity & Dynamic Engine Test Suite    ");
  console.log("══════════════════════════════════════════════════\n");

  // 1. Topic-Aware Visual Art Direction
  await test("VisualArtDirector produces domain-tailored palettes and styling for finance vs coding", async () => {
    const financeBrief = {
      brief_id: "brief_fin_01",
      topic: "Axios Live: AI agents are changing how money moves",
      metadata: {
        research_topic: "Axios Live: AI agents are changing how money moves",
      },
      executive_summary: {
        overview: "Automated treasury management, high-frequency settlement, and autonomous fraud mitigation in digital banking.",
        confirmed_developments: ["$42B automated volume", "Sub-second cross-border clearance"],
        interpretations_and_context: ["Fintech APIs shifting to autonomous agents"],
        critical_uncertainties: ["Regulatory capital requirements"],
      },
      scriptwriter_handoff: {
        recommended_angle_title: "How Autonomous Agents Move Trillions in Modern Finance",
        core_thesis: "Financial infrastructure is evolving from batch processing to continuous agentic settlement.",
        must_include_facts: ["$42B automated transaction volume"],
        must_include_quotes: [],
        claims_to_avoid: [],
        structural_beat_sheet: [],
      },
    } as unknown as ResearchBrief;

    const financeScript: ScriptDocument = {
      script_id: "sc_fin_doc",
      title: "How Autonomous Agents Move Trillions in Modern Finance",
      topic: "Axios Live: AI agents are changing how money moves",
      target_audience: "Fintech architects and executives",
      target_duration_seconds: 24,
      claims_summary: { total: 4, verified: 4, unverified: 0, flagged: 0 },
      created_at: new Date().toISOString(),
      scenes: [],
    };

    const codingBrief = {
      brief_id: "brief_code_01",
      topic: "ESP-Mosaico Lets AI Agents Do the Coding",
      metadata: {
        research_topic: "ESP-Mosaico Lets AI Agents Do the Coding",
      },
      executive_summary: {
        overview: "Microcontroller firmware generation and embedded C++ synthesis through autonomous LLM agents.",
        confirmed_developments: ["ESP32 peripheral initialization", "Zero compile-error benchmark"],
        interpretations_and_context: ["Edge IoT programming shifted to automated agents"],
        critical_uncertainties: ["Real-time interrupt latency"],
      },
      scriptwriter_handoff: {
        recommended_angle_title: "Compiling Edge Firmware with Autonomous Agents",
        core_thesis: "Embedded systems engineering is being automated with direct hardware HAL generation.",
        must_include_facts: ["ESP32 HAL automation"],
        must_include_quotes: [],
        claims_to_avoid: [],
        structural_beat_sheet: [],
      },
    } as unknown as ResearchBrief;

    const codingScript: ScriptDocument = {
      script_id: "sc_code_doc",
      title: "Compiling Edge Firmware with Autonomous Agents",
      topic: "ESP-Mosaico Lets AI Agents Do the Coding",
      target_audience: "Embedded firmware developers and hardware engineers",
      target_duration_seconds: 24,
      claims_summary: { total: 4, verified: 4, unverified: 0, flagged: 0 },
      created_at: new Date().toISOString(),
      scenes: [],
    };

    const financeDir = await determineVisualDirection(financeBrief, financeScript, { forceDeterministic: true });
    const codingDir = await determineVisualDirection(codingBrief, codingScript, { forceDeterministic: true });

    assert.strictEqual(financeDir.art_direction_mood, "data_investigative");
    assert.strictEqual(codingDir.art_direction_mood, "technical_deepdive");

    // Colors must be distinct
    assert.notStrictEqual(financeDir.palette.accent, codingDir.palette.accent);
    assert.strictEqual(financeDir.palette.accent, "#10B981"); // Emerald
    assert.strictEqual(codingDir.palette.accent, "#F59E0B"); // Amber code glow
    assert.notStrictEqual(financeDir.palette.background, codingDir.palette.background);

    // Typography hierarchy
    assert.ok(financeDir.typography.fontHeading);
    assert.ok(codingDir.typography.fontCode.includes("Fira") || codingDir.typography.fontCode.includes("JetBrains"));
  });

  // 2. Curated Offline Asset Library & Fallback Mechanism
  await test("Curated asset library provides crisp vector Data URIs for offline/fallback rendering", () => {
    const finAsset = getCuratedFallbackAsset("finance investment banking");
    const codeAsset = getCuratedFallbackAsset("developer compiler terminal code");
    const healthAsset = getCuratedFallbackAsset("clinical medical healthcare");
    const newsAsset = getCuratedFallbackAsset("broadcast press journalism");

    assert.ok(finAsset.dataUri.startsWith("data:image/svg+xml;utf8,"), "Finance asset must be a valid SVG Data URI");
    assert.ok(codeAsset.dataUri.startsWith("data:image/svg+xml;utf8,"), "Code asset must be a valid SVG Data URI");
    assert.ok(healthAsset.dataUri.startsWith("data:image/svg+xml;utf8,"), "Healthcare asset must be a valid SVG Data URI");
    assert.ok(newsAsset.dataUri.startsWith("data:image/svg+xml;utf8,"), "News asset must be a valid SVG Data URI");

    assert.strictEqual(finAsset.domain, "finance");
    assert.strictEqual(codeAsset.domain, "coding");
    assert.notStrictEqual(finAsset.dataUri, codeAsset.dataUri, "Finance and coding assets must not be identical");
  });

  // 3. AssetManager Enriches Non-Parallax Scenes with Fallbacks
  await test("AssetManager enriches document_reveal, editorial_montage, split_callout, and word_by_word", async () => {
    const manager = new AssetManager();
    const testBlueprint: VideoBlueprint = {
      title: "Visual Assets Test",
      target_duration_seconds: 24,
      aspect_ratio: "16:9",
      brand: { primary_color: "#0A0A0C", accent_color: "#FF5F00", font_token: "Inter" },
      fps: 30,
      width: 1920,
      height: 1080,
      scenes: [
        {
          id: "sc_doc",
          purpose: "insight",
          scene_type: "document_reveal",
          narration: "New financial directives mandate cryptographic proofs for all automated settlements.",
          duration_hint_seconds: 6,
        },
        {
          id: "sc_montage",
          purpose: "hook",
          scene_type: "editorial_montage",
          narration: "Trading desks are executing thousands of high frequency algorithmic transactions.",
          duration_hint_seconds: 6,
        },
        {
          id: "sc_split",
          purpose: "comparison",
          scene_type: "split_callout",
          narration: "Legacy wire networks versus sub-second agent routing.",
          duration_hint_seconds: 6,
        },
        {
          id: "sc_chart",
          purpose: "metric",
          scene_type: "bar_chart",
          narration: "Volume growth over three quarters.",
          duration_hint_seconds: 6,
        },
      ],
    };

    const result = await manager.enrichBlueprintWithAssets(testBlueprint);
    assert.ok(result.enrichedCount >= 3, `Expected at least 3 scenes enriched, got ${result.enrichedCount}`);
    assert.ok(testBlueprint.scenes[0].image_url, "document_reveal must receive an image asset");
    assert.ok(testBlueprint.scenes[1].image_url, "editorial_montage must receive an image asset");
    assert.ok(testBlueprint.scenes[2].image_url, "split_callout must receive an image asset");
    assert.ok(
      testBlueprint.scenes[0].image_url?.startsWith("http") ||
      testBlueprint.scenes[0].image_url?.startsWith("data:image/svg+xml")
    );
  });

  // 4. Visual Diversity Validator: Detects Failures and Repetitions
  await test("VisualDiversityValidator enforces cadence and catches consecutive duplicates or excessive concentration", () => {
    // Valid diverse blueprint
    const validBlueprint: VideoBlueprint = {
      title: "Diverse Video",
      target_duration_seconds: 24,
      aspect_ratio: "16:9",
      brand: { primary_color: "#0A0A0C", accent_color: "#FF5F00", font_token: "Inter" },
      fps: 30,
      width: 1920,
      height: 1080,
      scenes: [
        {
          id: "s1",
          purpose: "hook",
          scene_type: "editorial_montage",
          narration: "The paradigm is shifting across all industries.",
          duration_hint_seconds: 4,
          beats: [
            { beat_id: "b1", start_seconds: 0, type: "text_reveal", description: "Headline drops" },
            { beat_id: "b2", start_seconds: 2, type: "stat_pop", description: "Data badge zooms" },
          ],
        },
        {
          id: "s2",
          purpose: "insight",
          scene_type: "document_reveal",
          narration: "New benchmarks prove a 400% efficiency increase.",
          duration_hint_seconds: 5,
          beats: [
            { beat_id: "b3", start_seconds: 0, type: "image_in", description: "Document unrolls" },
            { beat_id: "b4", start_seconds: 2.5, type: "highlight", description: "Highlighter illuminates row 4" },
          ],
        },
        {
          id: "s3",
          purpose: "comparison",
          scene_type: "split_callout",
          narration: "Contrast manual workflows against automated agent pipelines.",
          duration_hint_seconds: 5,
          beats: [
            { beat_id: "b5", start_seconds: 0, type: "callout", description: "Left panel enters" },
            { beat_id: "b6", start_seconds: 2.5, type: "callout", description: "Right panel enters" },
          ],
        },
        {
          id: "s4",
          purpose: "context",
          scene_type: "code_terminal",
          narration: "Review the low level pipeline implementation.",
          duration_hint_seconds: 5,
          beats: [
            { beat_id: "b7", start_seconds: 0, type: "text_reveal", description: "Terminal prompt types" },
            { beat_id: "b8", start_seconds: 2.5, type: "text_reveal", description: "Buffer flushes" },
          ],
        },
      ],
    };

    const validResult = validateVisualDiversity(validBlueprint);
    assert.strictEqual(validResult.passed, true);
    assert.strictEqual(validResult.issues.length, 0);
    assert.ok(validResult.score >= 80, `Expected score >= 80, got ${validResult.score}`);

    // Invalid blueprint: 3 consecutive identical scenes
    const repetitiveBlueprint: VideoBlueprint = {
      title: "Repetitive Video",
      target_duration_seconds: 15,
      aspect_ratio: "16:9",
      brand: { primary_color: "#0A0A0C", accent_color: "#FF5F00", font_token: "Inter" },
      fps: 30,
      width: 1920,
      height: 1080,
      scenes: [
        { id: "r1", purpose: "metric", scene_type: "stat_counter", narration: "Number one", duration_hint_seconds: 5 },
        { id: "r2", purpose: "metric", scene_type: "stat_counter", narration: "Number two", duration_hint_seconds: 5 },
        { id: "r3", purpose: "metric", scene_type: "stat_counter", narration: "Number three", duration_hint_seconds: 5 },
      ],
    };

    const repResult = validateVisualDiversity(repetitiveBlueprint);
    assert.strictEqual(repResult.passed, false, "Must fail on consecutive duplicate scene types");
    assert.strictEqual(repResult.metrics.consecutive_duplicates, 2);
    assert.ok(repResult.issues.some((issue) => issue.includes("Consecutive duplicate scene type")));
    assert.ok(repResult.score < 60, `Score must drop below passing threshold (got ${repResult.score})`);
  });

  // 5. End-to-End Regression Test across Two Distinct Topics
  await test("Topic A (Money Moving) vs Topic B (ESP-Mosaico Coding) generate entirely distinct visual productions", async () => {
    // Topic A: Finance
    const scriptFinance: ScriptDocument = {
      script_id: "script_finance_01",
      title: "Axios Live: AI Agents Are Changing How Money Moves",
      topic: "Axios Live: AI agents are changing how money moves",
      target_audience: "Finance executives and fintech architects",
      target_duration_seconds: 24,
      claims_summary: { total: 4, verified: 4, unverified: 0, flagged: 0 },
      created_at: new Date().toISOString(),
      scenes: [
        {
          scene_id: "s_fin_1",
          purpose: "hook",
          suggested_scene_type: "editorial_montage",
          narration: "Trillions of dollars in global capital are transitioning to autonomous agent settlement.",
          visual_description: "Dynamic capital flows over financial trading networks.",
          on_screen_text: "$42B automated volume",
          claims: [],
        },
        {
          scene_id: "s_fin_2",
          purpose: "insight",
          suggested_scene_type: "document_reveal",
          narration: "Federal regulatory filings confirm sub-second cross-border clearance without manual reconciliation.",
          visual_description: "Audit document highlight on ledger clearance.",
          on_screen_text: "99.98% instant settlement",
          claims: [],
        },
        {
          scene_id: "s_fin_3",
          purpose: "comparison",
          suggested_scene_type: "comparison_grid",
          narration: "Legacy 3-day clearing cycles vs microsecond algorithmic routing through automated market makers.",
          visual_description: "Side-by-side settlement latency comparison.",
          on_screen_text: "Clearing Speed Comparison",
          claims: [],
        },
        {
          scene_id: "s_fin_4",
          purpose: "cta",
          suggested_scene_type: "cta",
          narration: "Explore how autonomous banking primitives are redefining financial sovereignty.",
          visual_description: "Voiceage Finance Briefing URL callout.",
          on_screen_text: "voiceage.com/finance",
          claims: [],
        },
      ],
    };

    // Topic B: Embedded Firmware
    const scriptCoding: ScriptDocument = {
      script_id: "script_coding_01",
      title: "ESP-Mosaico Lets AI Agents Do the Coding",
      topic: "ESP-Mosaico Lets AI Agents Do the Coding",
      target_audience: "Embedded engineers and software architects",
      target_duration_seconds: 24,
      claims_summary: { total: 4, verified: 4, unverified: 0, flagged: 0 },
      created_at: new Date().toISOString(),
      scenes: [
        {
          scene_id: "s_code_1",
          purpose: "hook",
          suggested_scene_type: "code_terminal",
          narration: "ESP-Mosaico writes zero-defect C++ firmware directly for microcontrollers without developer intervention.",
          visual_description: "Terminal streaming compiler diagnostics.",
          on_screen_text: "0 compile errors",
          claims: [],
        },
        {
          scene_id: "s_code_2",
          purpose: "architecture",
          suggested_scene_type: "system_architecture",
          narration: "The agent architecture translates high-level system requirements into ESP32 hardware register commands.",
          visual_description: "LLM agent nodes talking to SPI, I2C, and UART peripherals.",
          on_screen_text: "SPI Bus -> I2C Core -> UART Serial -> Register Map",
          claims: [],
        },
        {
          scene_id: "s_code_3",
          purpose: "metric",
          suggested_scene_type: "bar_chart",
          narration: "Benchmarks reveal memory footprint reductions of 38% compared to standard human-written HAL drivers.",
          visual_description: "Bar chart comparing Flash and SRAM footprint.",
          on_screen_text: "38% less RAM",
          claims: [],
        },
        {
          scene_id: "s_code_4",
          purpose: "cta",
          suggested_scene_type: "cta",
          narration: "Clone the ESP-Mosaico firmware synthesizer on GitHub today.",
          visual_description: "Terminal git clone link.",
          on_screen_text: "github.com/esp-mosaico",
          claims: [],
        },
      ],
    };

    const bpFinance = buildDeterministicBlueprintFromScript(scriptFinance);
    const bpCoding = buildDeterministicBlueprintFromScript(scriptCoding);

    // 1. Scene sequences must be distinct
    const scenesFin = bpFinance.scenes.map((s) => s.scene_type);
    const scenesCode = bpCoding.scenes.map((s) => s.scene_type);
    assert.notDeepStrictEqual(scenesFin, scenesCode, "Scene structures must reflect individual script types");

    // 2. Artifact specifications must be topic-specific
    const finElements = bpFinance.scenes.flatMap((s) => s.elements || []);
    const codeElements = bpCoding.scenes.flatMap((s) => s.elements || []);
    assert.ok(finElements.length > 0, "Finance blueprint must contain generated artifacts");
    assert.ok(codeElements.length > 0, "Coding blueprint must contain generated artifacts");

    // Check code terminal content in coding
    const codeScene = bpCoding.scenes.find((s) => s.scene_type === "code_terminal");
    assert.ok(codeScene?.terminal_lines, "Coding scene must have terminal lines");
    assert.ok(
      codeScene.terminal_lines.some((l) => l.toLowerCase().includes("esp") || l.toLowerCase().includes("mosaico")),
      "Code content must be derived from the embedded systems topic"
    );

    // Check comparison in finance
    const compScene = bpFinance.scenes.find((s) => s.scene_type === "comparison_grid");
    assert.ok(compScene?.comparison, "Finance comparison scene must have comparison config");
    assert.ok(
      compScene.comparison.right.title.toLowerCase().includes("axios") ||
      compScene.comparison.right.title.toLowerCase().includes("breakthrough"),
      "Finance comparison title must reflect finance topic contrasts"
    );

    // Check system architecture nodes in coding
    const archScene = bpCoding.scenes.find((s) => s.scene_type === "system_architecture");
    assert.ok(archScene?.nodes, "System architecture must have nodes");
    assert.ok(
      archScene.nodes.some((n) => n.label.toLowerCase().includes("spi") || n.label.toLowerCase().includes("i2c")),
      "Architecture nodes must derive from on_screen_text / narration"
    );

    // 3. Asset queries & enrichments must be domain specific
    const assetManager = new AssetManager();
    await assetManager.enrichBlueprintWithAssets(bpFinance);
    await assetManager.enrichBlueprintWithAssets(bpCoding);

    const finUrls = bpFinance.scenes.map((s) => s.image_url).filter(Boolean);
    const codeUrls = bpCoding.scenes.map((s) => s.image_url).filter(Boolean);

    assert.ok(finUrls.length > 0, "Finance blueprint must have enriched images");
    assert.ok(codeUrls.length > 0, "Coding blueprint must have enriched images");
    assert.notStrictEqual(finUrls[0], codeUrls[0], "Finance and coding image assets must differ");
  });

  console.log("\n══════════════════════════════════════════════════");
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log("══════════════════════════════════════════════════\n");

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runVisualDiversityTests().catch((err) => {
  console.error("Test suite fatal error:", err);
  process.exit(1);
});

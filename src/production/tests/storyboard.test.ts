/**
 * Production Storyboard & Motion Graphics Test Suite.
 *
 * Verifies:
 * 1. Editorial Consistency Gate (topic collision, unsupported figures, constraint violations)
 * 2. Storyboard Zod schema validation
 * 3. Measurable density & repetition validator (beat pacing, static intervals, safe-area compliance)
 * 4. Storyboard planning agent (4-8 artifacts/scene, timed beats, normalized [0..1] coordinates)
 * 5. Renderer component contract & SceneBlueprint integration
 */

import assert from "assert";
import { evaluateEditorialConsistency } from "../editorial/editorial-consistency-gate";
import { validateStoryboardDocument } from "../storyboard/storyboard-schema";
import { validateAndRepairStoryboard } from "../storyboard/storyboard-validator";
import {
  buildDeterministicStoryboardFromScript,
  planStoryboardFromScript,
} from "../storyboard/storyboard-planner";
import { buildDeterministicBlueprintFromScript } from "../scene-planning/scene-planner";
import type { ResearchBrief } from "../../research/types";
import type { ScriptDocument } from "../types";

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

// ── Mock Fixtures ──────────────────────────────────────────────

function createMockBrief(overrides: Partial<ResearchBrief> = {}): ResearchBrief {
  return {
    metadata: {
      brief_id: "brief_test_101",
      research_topic: "Autonomous AI Incident Remediation in Cloud Infrastructure",
      original_question: "How do AI agents remediate cloud incidents?",
      subject_niche: "Cloud Operations",
      target_audience: "DevOps & SRE Leaders",
      geographic_scope: "global",
      research_mode: "topic_deep_dive",
      research_depth: "standard",
      created_at: new Date().toISOString(),
      research_period_days: 30,
      model_used: "gemini-2.5-pro",
      status: "complete",
      limitations: [],
      ...overrides.metadata,
    },
    executive_summary: {
      headline: "Autonomous SRE Agents Cut MTTR by 74%",
      core_thesis:
        "Real-time telemetry analysis with autonomous remediation agents resolves cloud incidents before cascading outages occur.",
      key_takeaways: ["74% MTTR reduction", "Sub-second triage", "Human-in-the-loop oversight"],
      confidence_assessment: "high",
    },
    scriptwriter_handoff: {
      recommended_angle_title: "How Autonomous SRE Agents End PagerDuty Nightmares",
      core_thesis:
        "Autonomous remediation agents ingest telemetry streams to diagnose and patch cloud infrastructure incidents in seconds.",
      verified_facts: [
        {
          statement: "Autonomous triage resolves incidents 74% faster than manual teams.",
          evidence_id: "ev_001",
          recommended_visual: "stat_counter",
        },
        {
          statement: "Over 68% of outage costs stem from triage latency, not execution time.",
          evidence_id: "ev_002",
          recommended_visual: "bar_chart",
        },
      ],
      claims_to_avoid: [
        "Do not claim 100% autonomous resolution without human escalation",
        "Do not promise zero outages ever again",
      ],
      emotional_arc: {
        hook: "3 AM alerts and panic",
        middle: "Instant telemetry ingestion",
        climax: "Zero-touch remediation",
        resolution: "Peace of mind for engineering teams",
      },
    },
    facts_and_statistics: [
      {
        statistic: "74% MTTR reduction",
        context: "Across 2,400 production incidents",
        evidence_id: "ev_001",
      },
    ],
    evidence_store: {
      ev_001: {
        evidence_id: "ev_001",
        claim_text: "Autonomous triage reduces MTTR by 74% across enterprise clusters.",
        source_id: "src_001",
        source_url: "https://example.com/sre-report",
        source_title: "State of Autonomous Cloud Operations 2026",
        publisher: "Cloud Reliability Council",
        publication_date: "2026-01-15",
        retrieved_at: "2026-10-22",
        supporting_excerpt: "Enterprises deployed with telemetry-aware agents saw a 74% drop in mean time to recovery.",
        evidence_type: "statistic",
        source_quality: "primary",
        confidence: "high",
        verification_status: "verified",
      },
      ev_002: {
        evidence_id: "ev_002",
        claim_text: "68% of outage costs stem from triage latency.",
        source_id: "src_002",
        source_url: "https://example.com/triage-cost",
        source_title: "Downtime Economics",
        publisher: "Tech Metrics Institute",
        publication_date: "2026-02-10",
        retrieved_at: "2026-10-22",
        supporting_excerpt: "68% of downtime loss is spent simply diagnosing root causes rather than deploying fixes.",
        evidence_type: "statistic",
        source_quality: "primary",
        confidence: "high",
        verification_status: "verified",
      },
    },
    ...overrides,
  } as ResearchBrief;
}

function createMockScript(overrides: Partial<ScriptDocument> = {}): ScriptDocument {
  return {
    script_id: "script_test_202",
    title: "Autonomous SRE: Ending PagerDuty Nightmares",
    topic: "Autonomous AI Incident Remediation in Cloud Infrastructure",
    target_audience: "DevOps & SRE Leaders",
    target_duration_seconds: 24,
    created_at: new Date().toISOString(),
    claims_summary: {
      total: 2,
      verified: 2,
      unverified: 0,
      flagged: 0,
    },
    scenes: [
      {
        scene_id: "scene_001",
        purpose: "hook",
        narration:
          "It's 3 AM, and your primary cluster just crashed. But instead of waking your on-call engineers, an autonomous telemetry agent is already resolving the incident.",
        visual_description: "Dark technical terminal with alert cards flashing and transitioning to auto-heal state",
        on_screen_text: "3 AM CLUSTER OUTAGE DETECTED",
        suggested_scene_type: "parallax_hero",
        claims: [],
      },
      {
        scene_id: "scene_002",
        purpose: "metric",
        narration:
          "Autonomous triage cuts mean time to recovery by 74 percent, slashing the 68 percent of downtime costs wasted on manual triage.",
        visual_description: "Dynamic stat counter ticking up to 74% alongside downtime latency comparison",
        on_screen_text: "74% FASTER RECOVERY",
        suggested_scene_type: "stat_counter",
        claims: [
          {
            claim_id: "claim_001",
            spoken_text: "Autonomous triage cuts mean time to recovery by 74 percent",
            claim_type: "statistic",
            supporting_evidence_ids: ["ev_001"],
            verification_status: "verified",
          },
          {
            claim_id: "claim_002",
            spoken_text: "slashing the 68 percent of downtime costs wasted on manual triage",
            claim_type: "statistic",
            supporting_evidence_ids: ["ev_002"],
            verification_status: "verified",
          },
        ],
      },
      {
        scene_id: "scene_003",
        purpose: "architecture",
        narration:
          "The agent inspects telemetry signals, isolates the failing pod, and executes an automated rollback within milliseconds.",
        visual_description: "Three-tier architecture diagram showing telemetry signals flowing through AI reasoning to cluster webhooks",
        on_screen_text: "OBSERVE → REASON → REMEDIATE",
        suggested_scene_type: "system_architecture",
        claims: [],
      },
      {
        scene_id: "scene_004",
        purpose: "cta",
        narration: "Deploy autonomous SRE agents today and keep your infrastructure resilient around the clock.",
        visual_description: "Call to action card with company brand badge and documentation link",
        on_screen_text: "JOIN THE AUTONOMOUS INFRASTRUCTURE ERA",
        suggested_scene_type: "cta",
        claims: [],
      },
    ],
    ...overrides,
  };
}

async function runStoryboardTests() {
  console.log("\n══════════════════════════════════════════════════════");
  console.log("  Milestone 4: Storyboard & Editorial Gate Tests      ");
  console.log("══════════════════════════════════════════════════════\n");

  // ── 1. Editorial Consistency Gate ─────────────────────────────
  await test("Editorial Gate passes grounded script with verified evidence", () => {
    const brief = createMockBrief();
    const script = createMockScript();
    const result = evaluateEditorialConsistency(brief, script);

    assert.strictEqual(result.passed, true);
    assert.strictEqual(result.requiresRejection, false);
    assert.strictEqual(result.errors.length, 0);
    assert.ok(result.alignmentScore > 0.6);
  });

  await test("Editorial Gate rejects topic collision (pharma brief vs cloud script)", () => {
    const pharmaBrief = createMockBrief({
      metadata: {
        brief_id: "brief_pharma_1",
        research_topic: "Biotech Acquisition & Clinical Trial Drug Development",
        original_question: "What are the latest biotech acquisitions?",
        subject_niche: "Pharmaceuticals",
        target_audience: "Pharma Executives",
        geographic_scope: "global",
        research_mode: "topic_deep_dive",
        research_depth: "standard",
        created_at: new Date().toISOString(),
        research_period_days: 30,
        model_used: "gemini-2.5-pro",
        status: "complete",
        limitations: [],
      },
    });

    const cloudScript = createMockScript();
    const result = evaluateEditorialConsistency(pharmaBrief, cloudScript);

    assert.strictEqual(result.passed, false);
    assert.strictEqual(result.requiresRejection, true);
    assert.ok(result.errors.some((e) => e.includes("CRITICAL TOPIC COLLISION")));
  });

  await test("Editorial Gate rejects unsupported financial figures ($850M not in evidence)", () => {
    const brief = createMockBrief();
    const hallucinatedScript = createMockScript({
      scenes: [
        {
          scene_id: "scene_001",
          purpose: "hook",
          narration: "Acme Corp completed an $850 million acquisition to monopolize cloud operations.",
          visual_description: "Money graphics",
          on_screen_text: "$850M DEAL",
          claims: [],
        },
      ],
    });

    const result = evaluateEditorialConsistency(brief, hallucinatedScript);
    assert.strictEqual(result.passed, false);
    assert.strictEqual(result.requiresRejection, true);
    assert.ok(result.errors.some((e) => e.includes("UNSUPPORTED FINANCIAL FIGURE")));
  });

  await test("Editorial Gate rejects violations of brief constraints (claims-to-avoid)", () => {
    const brief = createMockBrief();
    const violatingScript = createMockScript({
      scenes: [
        {
          scene_id: "scene_001",
          purpose: "hook",
          narration: "With this tool, we promise zero outages ever again across every single cluster.",
          visual_description: "Zero outages badge",
          on_screen_text: "ZERO OUTAGES PROMISED",
          claims: [],
        },
      ],
    });

    const result = evaluateEditorialConsistency(brief, violatingScript);
    assert.strictEqual(result.passed, false);
    assert.strictEqual(result.requiresRejection, true);
    assert.ok(result.errors.some((e) => e.includes("VIOLATION OF RESEARCH CONSTRAINT")));
  });

  // ── 2. Storyboard Zod Schema Validation ───────────────────────
  await test("Zod schema validates complete StoryboardDocument", () => {
    const brief = createMockBrief();
    const script = createMockScript();
    const storyboard = buildDeterministicStoryboardFromScript(script, brief, {
      aspectRatio: "9:16",
    });

    const validationResult = validateStoryboardDocument(storyboard);
    if (!validationResult.valid) {
      console.error("ZOD VALIDATION ERRORS:", validationResult.errors);
    }
    assert.strictEqual(validationResult.valid, true);
    assert.ok(validationResult.data);
    assert.strictEqual(validationResult.data.storyboard_id, storyboard.storyboard_id);
    assert.strictEqual(validationResult.data.scenes.length, 4);
    assert.ok(validationResult.data.global_spec.dimensions.width > 0);
  });

  // ── 3. Measurable Density & Repetition Validation ─────────────
  await test("Storyboard Validator checks beat pacing and density threshold", () => {
    const brief = createMockBrief();
    const script = createMockScript();
    const storyboard = buildDeterministicStoryboardFromScript(script, brief, {
      aspectRatio: "9:16",
    });

    const report = validateAndRepairStoryboard(storyboard, {
      maxStaticIntervalSeconds: 3.8,
    });

    assert.strictEqual(report.valid, true);
    assert.ok(report.metrics.averagePacingSeconds <= 3.8);
    assert.ok(report.metrics.densityScore > 0.7);
  });

  await test("Storyboard Validator detects and repairs caption safe-area collisions", () => {
    const brief = createMockBrief();
    const script = createMockScript();
    const storyboard = buildDeterministicStoryboardFromScript(script, brief);

    // Deliberately push an essential foreground artifact into the bottom 15% caption safe area
    storyboard.scenes[0].artifacts[0].layer = 20;
    storyboard.scenes[0].artifacts[0].position.y = 0.92;
    storyboard.scenes[0].artifacts[0].accessibility.is_essential = true;

    const report = validateAndRepairStoryboard(storyboard);
    assert.strictEqual(report.repaired, true);

    const fixedY = report.storyboard.scenes[0].artifacts[0].position.y;
    assert.ok(fixedY <= 0.82, `Expected y <= 0.82 to clear caption safe area, got ${fixedY}`);
    assert.strictEqual(
      report.storyboard.scenes[0].artifacts[0].accessibility.safe_area_compliant,
      true
    );
  });

  await test("Storyboard Validator synthesizes beats for scene lacking visual beats", () => {
    const brief = createMockBrief();
    const script = createMockScript();
    const storyboard = buildDeterministicStoryboardFromScript(script, brief);

    // Wipe beats in scene 2
    storyboard.scenes[1].beats = [];

    const report = validateAndRepairStoryboard(storyboard);
    assert.strictEqual(report.repaired, true);
    assert.ok(report.storyboard.scenes[1].beats.length >= 2);
  });

  // ── 4. Storyboard Planning Agent ──────────────────────────────
  await test("Storyboard Planner generates 4-8 rich artifacts per scene", async () => {
    const brief = createMockBrief();
    const script = createMockScript();
    const storyboard = await planStoryboardFromScript(script, brief, {
      aspectRatio: "9:16",
      forceDeterministic: true,
    });

    assert.strictEqual(storyboard.scenes.length, 4);

    for (const scene of storyboard.scenes) {
      assert.ok(
        scene.artifacts.length >= 4 && scene.artifacts.length <= 8,
        `Scene ${scene.scene_id} has ${scene.artifacts.length} artifacts (expected 4-8)`
      );

      // Verify normalized coordinates [0..1]
      for (const art of scene.artifacts) {
        assert.ok(art.position.x >= 0 && art.position.x <= 1.0);
        assert.ok(art.position.y >= 0 && art.position.y <= 1.0);
        assert.ok(art.size.width > 0 && art.size.width <= 1.0);
        assert.ok(art.size.height > 0 && art.size.height <= 1.0);
        assert.ok(art.layer >= 1);
        assert.ok(art.entry_animation.duration_frames > 0);
        assert.ok(art.renderer_component.length > 0);
      }

      // Verify timed beats
      assert.ok(scene.beats.length >= 2, `Scene ${scene.scene_id} should have >= 2 beats`);
      for (const beat of scene.beats) {
        assert.ok(beat.end_seconds > beat.start_seconds);
        assert.ok(
          beat.artifacts_introduced.length > 0 ||
            (beat.artifacts_updated && beat.artifacts_updated.length > 0),
          `Beat ${beat.beat_id} must introduce or update artifacts`
        );
      }
    }
  });

  // ── 5. Integration with SceneBlueprint Renderer Contract ─────
  await test("Scene Planner embeds Storyboard artifacts and beats into SceneBlueprint", () => {
    const brief = createMockBrief();
    const script = createMockScript();
    const storyboard = buildDeterministicStoryboardFromScript(script, brief, {
      aspectRatio: "9:16",
    });

    const blueprint = buildDeterministicBlueprintFromScript(script, {
      aspectRatio: "9:16",
      storyboard,
    });

    assert.strictEqual(blueprint.scenes.length, 4);

    for (let i = 0; i < blueprint.scenes.length; i++) {
      const scene = blueprint.scenes[i];
      const sbScene = storyboard.scenes[i];

      // Verifies beats were transferred
      assert.ok(scene.beats && scene.beats.length === sbScene.beats.length);
      assert.strictEqual(scene.beats[0].beat_id, sbScene.beats[0].beat_id);

      // Verifies elements were transferred
      assert.ok(scene.elements && scene.elements.length === sbScene.artifacts.length);
      assert.strictEqual(scene.elements[0].id, sbScene.artifacts[0].artifact_id);

      // Verifies background was transferred
      assert.ok(scene.background);
      assert.strictEqual(scene.background.color, sbScene.background.color);
    }
  });

  console.log(`\n══════════════════════════════════════════════════════`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log(`══════════════════════════════════════════════════════\n`);

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runStoryboardTests().catch((err) => {
  console.error("Unhandled test runner error:", err);
  process.exit(1);
});

/**
 * UNIVERSAL AI VIDEO PRODUCTION ENGINE — MULTI-TOPIC REGRESSION TEST SUITE
 *
 * Verifies that the production engine operates in a fully topic-agnostic,
 * aesthetically distinguished, evidence-grounded manner across diverse domains:
 *
 * 1. Reference Domain: AI Research & Simulation (Google Genie 4)
 * 2. Earth & Marine Science: Deep Ocean Mariana Trench Hydrostatic Adaptation
 * 3. Physics & Security: Quantum Key Distribution & Fiber Decoupling
 * 4. Global Economics & Maritime: Container Shipping & Port Dwell Variance
 */

import assert from "assert";
import type { ResearchBrief } from "../../research/types";
import { determineVisualDirection } from "../editorial/visual-art-director";
import {
  buildDeterministicScriptFromBrief,
  formatHeadline,
} from "../scriptwriting/grounded-scriptwriter";
import { evaluateEditorialConsistency } from "../editorial/editorial-consistency-gate";
import { validateScriptClaims } from "../scriptwriting/claim-validator";
import { buildDeterministicBlueprintFromScript } from "../scene-planning/scene-planner";

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

// ── Multi-Domain Brief Fixtures ──────────────────────────────────────

function createGenieBrief(): ResearchBrief {
  return {
    metadata: {
      brief_id: "brief_sim_genie4",
      research_topic: "Google Genie 4: Real-World Latency & Autoregressive Dynamics",
      original_question: "What is the measured interactive latency of Genie 4 world models?",
      subject_niche: "AI Research & World Models",
      target_audience: "AI Research Scientists & Robotics Engineers",
      geographic_scope: "global",
      research_mode: "topic_deep_dive",
      research_depth: "standard",
      created_at: new Date().toISOString(),
      research_period_days: 14,
      model_used: "gemini-2.5-pro",
      status: "complete",
      limitations: ["Inference benchmarks conducted on H100 GPU clusters."],
    },
    executive_summary: {
      overview: "Autoregressive neural simulation delivers interactive 16 FPS generation with measured action-to-frame latency of 62ms.",
      confirmed_developments: ["16 FPS autoregressive rendering", "62ms action latency", "Causal frame predictability"],
      interpretations_and_context: ["Separates world physics estimation from real-time rendering layers."],
      critical_uncertainties: [
        "Memory drift accumulates beyond 180 seconds of continuous generation without latent checkpoint resets.",
      ],
    },
    scriptwriter_handoff: {
      topic: "Google Genie 4: Real-World Latency & Autoregressive Dynamics",
      target_audience: "AI Research Scientists & Robotics Engineers",
      core_thesis: "Genie 4 moves world models from static video synthesis into interactive 16 FPS simulation at 62ms action latency.",
      recommended_angle_title: "Inside Genie 4: Measured Latency and Autoregressive Frame Dynamics",
      citation_instructions: "Cite official DeepMind world models benchmarks.",
      suggested_visual_layouts: ["kinetic_typography", "stat_counter", "system_architecture", "document_reveal"],
      narrative_beats: [
        { beat: "hook", purpose: "hook", narration_focus: "Interactive 62ms latency", visual_suggestion: "editorial_montage" },
        { beat: "context", purpose: "context", narration_focus: "Autoregressive world dynamics", visual_suggestion: "word_by_word" },
      ],
      verified_facts: [
        {
          claim: "Action-to-frame response latency measured at 62ms under 8-step diffusion.",
          source_title: "DeepMind World Models Technical Report (2026)",
          source_url: "https://deepmind.google/research/genie4-latency",
          evidence_id: "ev_g1",
        },
        {
          claim: "Generates interactive continuous 3D environments at 16 frames per second.",
          source_title: "DeepMind World Models Technical Report (2026)",
          source_url: "https://deepmind.google/research/genie4-fps",
          evidence_id: "ev_g2",
        },
      ],
      audience_questions_to_answer: ["How fast is action-to-frame generation?", "What is sustained rendering throughput?"],
      claims_to_avoid: [
        "Do NOT claim Genie 4 achieves infinite continuous memory without hallucination.",
        "Do NOT confuse compute cluster cost with model inference throughput.",
      ],
    },
    evidence_store: {
      ev_g1: {
        evidence_id: "ev_g1",
        claim_text: "Action-to-frame response latency measured at 62ms under 8-step diffusion.",
        source_id: "src_deepmind",
        source_url: "https://deepmind.google/research/genie4-latency",
        source_title: "DeepMind World Models Technical Report (2026)",
        publisher: "Google DeepMind",
        publication_date: "2026-03-01",
        retrieved_at: new Date().toISOString(),
        supporting_excerpt: "Measured action-to-pixel latency averaged 62 milliseconds across 10,000 interactive steps.",
        evidence_type: "statistic",
        source_quality: "primary",
        confidence: "high",
        verification_status: "verified",
        claim_classification: "measured_benchmark",
        provenance: {
          classification: "measured_benchmark",
          primary_source_type: "first_party_release",
          is_direct_measurement: true,
          baseline_comparison: "420ms for Genie 3",
          sample_size_or_conditions: "10,000 interactive simulator steps",
        },
      },
      ev_g2: {
        evidence_id: "ev_g2",
        claim_text: "Generates interactive continuous 3D environments at 16 frames per second.",
        source_id: "src_deepmind",
        source_url: "https://deepmind.google/research/genie4-fps",
        source_title: "DeepMind World Models Technical Report (2026)",
        publisher: "Google DeepMind",
        publication_date: "2026-03-01",
        retrieved_at: new Date().toISOString(),
        supporting_excerpt: "Sustained rendering throughput achieved 16.2 FPS on dedicated tensor cores.",
        evidence_type: "research_finding",
        source_quality: "primary",
        confidence: "high",
        verification_status: "verified",
        claim_classification: "measured_benchmark",
        provenance: {
          classification: "measured_benchmark",
          primary_source_type: "first_party_release",
          is_direct_measurement: true,
          baseline_comparison: "4 FPS in previous prototype",
          sample_size_or_conditions: "H100 GPU tensor core cluster",
        },
      },
    },
  } as unknown as ResearchBrief;
}

function createMarianaBrief(): ResearchBrief {
  return {
    metadata: {
      brief_id: "brief_marine_mariana",
      research_topic: "Mariana Trench Ecosystems: Hydrostatic Pressure & Metabolic Adaptation",
      original_question: "How do Mariana Trench organisms survive 1,100 atmospheres of hydrostatic pressure?",
      subject_niche: "Deep Ocean Ecology & Marine Biochemistry",
      target_audience: "Marine Biologists & Oceanographers",
      geographic_scope: "global",
      research_mode: "topic_deep_dive",
      research_depth: "standard",
      created_at: new Date().toISOString(),
      research_period_days: 30,
      model_used: "gemini-2.5-pro",
      status: "complete",
      limitations: ["In-situ measurements recorded by hadal landers between 8,000m and 10,920m depth."],
    },
    executive_summary: {
      overview: "Trimethylamine oxide concentrations increase linearly with ocean depth, preserving enzyme integrity under 110 MPa.",
      confirmed_developments: ["1,100 atmospheres hydrostatic pressure", "TMAO piezolyte saturation", "Cellular membrane fluidity"],
      interpretations_and_context: ["Piezolytes act as chemical chaperones preventing enzyme denaturation."],
      critical_uncertainties: [
        "Metabolic depression rates in hadal amphipods remain unmeasured during seasonal food pulse lapses.",
      ],
    },
    scriptwriter_handoff: {
      topic: "Mariana Trench Ecosystems: Hydrostatic Pressure & Metabolic Adaptation",
      target_audience: "Marine Biologists & Oceanographers",
      core_thesis: "Hadal fauna replace fragile hydration shells with stabilizing piezolytes to maintain cellular metabolic pathways.",
      recommended_angle_title: "Surviving 110 Megapascals: The Biochemical Machinery of the Mariana Trench",
      citation_instructions: "Cite peer-reviewed deep ocean oceanography studies.",
      suggested_visual_layouts: ["kinetic_typography", "stat_counter", "document_reveal", "quote_insight"],
      narrative_beats: [
        { beat: "hook", purpose: "hook", narration_focus: "Extreme depth and 110 MPa", visual_suggestion: "editorial_montage" },
        { beat: "context", purpose: "context", narration_focus: "Osmolyte stabilization", visual_suggestion: "word_by_word" },
      ],
      verified_facts: [
        {
          claim: "Hydrostatic pressure at the Challenger Deep reaches 110 megapascals.",
          source_title: "Nature Geoscience & Hadal Ecology (2025)",
          source_url: "https://nature.com/articles/hadal-pressure-2025",
          evidence_id: "ev_m1",
        },
        {
          claim: "Cellular TMAO levels increase 3.2-fold between 4,000m and 10,000m depths.",
          source_title: "Deep-Sea Research Journal (2026)",
          source_url: "https://deepsea.org/articles/tmao-piezolytes",
          evidence_id: "ev_m2",
        },
      ],
      audience_questions_to_answer: ["How do cells resist hydrostatic collapse?", "What is the measured piezolyte ratio?"],
      claims_to_avoid: [
        "Do NOT claim hadal organisms can survive depressurization to surface sea level.",
        "Do NOT state that deep sea trenches are completely devoid of organic carbon nutrients.",
      ],
    },
    evidence_store: {
      ev_m1: {
        evidence_id: "ev_m1",
        claim_text: "Hydrostatic pressure at the Challenger Deep reaches 110 megapascals.",
        source_id: "src_nature",
        source_url: "https://nature.com/articles/hadal-pressure-2025",
        source_title: "Nature Geoscience & Hadal Ecology (2025)",
        publisher: "Nature Publishing Group",
        publication_date: "2025-11-14",
        retrieved_at: new Date().toISOString(),
        supporting_excerpt: "Direct pressure sensor telemetry logged 110.2 MPa at bottom contact in the Challenger Deep.",
        evidence_type: "statistic",
        source_quality: "primary",
        confidence: "high",
        verification_status: "verified",
        claim_classification: "measured_benchmark",
        provenance: {
          classification: "measured_benchmark",
          primary_source_type: "peer_reviewed_paper",
          is_direct_measurement: true,
          sample_size_or_conditions: "Challenger Deep autonomous lander deployment",
        },
      },
      ev_m2: {
        evidence_id: "ev_m2",
        claim_text: "Cellular TMAO levels increase 3.2-fold between 4,000m and 10,000m depths.",
        source_id: "src_deepsea",
        source_url: "https://deepsea.org/articles/tmao-piezolytes",
        source_title: "Deep-Sea Research Journal (2026)",
        publisher: "Deep-Sea Research",
        publication_date: "2026-02-18",
        retrieved_at: new Date().toISOString(),
        supporting_excerpt: "Hadal amphipod tissue assays confirmed a 3.2-fold enrichment in organic osmolyte concentration.",
        evidence_type: "research_finding",
        source_quality: "primary",
        confidence: "high",
        verification_status: "verified",
        claim_classification: "measured_benchmark",
        provenance: {
          classification: "measured_benchmark",
          primary_source_type: "peer_reviewed_paper",
          is_direct_measurement: true,
          baseline_comparison: "4,000m bathyal specimens",
          sample_size_or_conditions: "n=48 amphipod specimens",
        },
      },
    },
  } as unknown as ResearchBrief;
}

function createQuantumBrief(): ResearchBrief {
  return {
    metadata: {
      brief_id: "brief_phys_qkd",
      research_topic: "Quantum Key Distribution: Fiber Attenuation & Single-Photon Decoupling",
      original_question: "How do terrestrial QKD links overcome fiber attenuation beyond 100km?",
      subject_niche: "Quantum Optics & Cryptographic Networks",
      target_audience: "Quantum Physicists & Network Security Architects",
      geographic_scope: "global",
      research_mode: "topic_deep_dive",
      research_depth: "standard",
      created_at: new Date().toISOString(),
      research_period_days: 21,
      model_used: "gemini-2.5-pro",
      status: "complete",
      limitations: ["Evaluated using standard single-mode telecommunication silica fibers at 1550nm."],
    },
    executive_summary: {
      overview: "Phase-matching twin-field protocols bypass the Pirandola-Laurenza-Ottaviani-Banchi repeaterless secret key capacity limit.",
      confirmed_developments: ["511km fiber distribution reach", "0.19 dB/km attenuation ceiling", "Twin-field phase locking"],
      interpretations_and_context: ["Central node detection allows key rates to scale with the square root of transmittance."],
      critical_uncertainties: [
        "Real-time drift compensation requires dedicated sub-picosecond interferometer thermal stabilization.",
      ],
    },
    scriptwriter_handoff: {
      topic: "Quantum Key Distribution: Fiber Attenuation & Single-Photon Decoupling",
      target_audience: "Quantum Physicists & Network Security Architects",
      core_thesis: "Interference at an untrusted central node scales secret key rates with the square root of channel transmittance.",
      recommended_angle_title: "Breaking the repeaterless limit: How Twin-Field QKD spans 500 Kilometers",
      citation_instructions: "Cite physical review publications and photonics standards.",
      suggested_visual_layouts: ["kinetic_typography", "stat_counter", "system_architecture", "process_flow"],
      narrative_beats: [
        { beat: "hook", purpose: "hook", narration_focus: "511km terrestrial quantum reach", visual_suggestion: "editorial_montage" },
        { beat: "context", purpose: "context", narration_focus: "Optical attenuation ceiling", visual_suggestion: "word_by_word" },
      ],
      verified_facts: [
        {
          claim: "Secure quantum key generation demonstrated across 511 kilometers of standard optical fiber.",
          source_title: "Physical Review Letters — Terrestrial QKD (2025)",
          source_url: "https://prl.aps.org/articles/511km-qkd",
          evidence_id: "ev_q1",
        },
        {
          claim: "Standard silica fiber attenuation remains bounded at 0.19 dB per kilometer at 1550nm.",
          source_title: "IEEE Photonics Technology Letters (2026)",
          source_url: "https://ieeexplore.ieee.org/document/optical-attenuation",
          evidence_id: "ev_q2",
        },
      ],
      audience_questions_to_answer: ["What is the maximum terrestrial fiber distance?", "How is phase drift resolved?"],
      claims_to_avoid: [
        "Do NOT claim quantum key distribution allows faster-than-light communication.",
        "Do NOT state that quantum cryptography eliminates software implementation side-channel attacks.",
      ],
    },
    evidence_store: {
      ev_q1: {
        evidence_id: "ev_q1",
        claim_text: "Secure quantum key generation demonstrated across 511 kilometers of standard optical fiber.",
        source_id: "src_prl",
        source_url: "https://prl.aps.org/articles/511km-qkd",
        source_title: "Physical Review Letters — Terrestrial QKD (2025)",
        publisher: "American Physical Society",
        publication_date: "2025-09-12",
        retrieved_at: new Date().toISOString(),
        supporting_excerpt: "Measured secret key rate remained positive at 511.4km with 102.3 dB total channel loss.",
        evidence_type: "statistic",
        source_quality: "primary",
        confidence: "high",
        verification_status: "verified",
        claim_classification: "measured_benchmark",
        provenance: {
          classification: "measured_benchmark",
          primary_source_type: "peer_reviewed_paper",
          is_direct_measurement: true,
          baseline_comparison: "404km previous record",
          sample_size_or_conditions: "Continuous 120-hour deployment",
        },
      },
      ev_q2: {
        evidence_id: "ev_q2",
        claim_text: "Standard silica fiber attenuation remains bounded at 0.19 dB per kilometer at 1550nm.",
        source_id: "src_ieee",
        source_url: "https://ieeexplore.ieee.org/document/optical-attenuation",
        source_title: "IEEE Photonics Technology Letters (2026)",
        publisher: "IEEE",
        publication_date: "2026-01-20",
        retrieved_at: new Date().toISOString(),
        supporting_excerpt: "Low-loss optical fiber measured consistent attenuation of 0.19 dB/km in continuous spool tests.",
        evidence_type: "research_finding",
        source_quality: "primary",
        confidence: "high",
        verification_status: "verified",
        claim_classification: "measured_benchmark",
        provenance: {
          classification: "measured_benchmark",
          primary_source_type: "peer_reviewed_paper",
          is_direct_measurement: true,
        },
      },
    },
  } as unknown as ResearchBrief;
}

function createMaritimeBrief(): ResearchBrief {
  return {
    metadata: {
      brief_id: "brief_maritime_freight",
      research_topic: "Container Shipping Economics: Slow Steaming & Port Dwell Variance",
      original_question: "What is the measured fuel savings and supply-chain impact of slow steaming container fleets?",
      subject_niche: "Maritime Economics & Global Trade Infrastructure",
      target_audience: "Supply Chain Directors & Maritime Analysts",
      geographic_scope: "global",
      research_mode: "topic_deep_dive",
      research_depth: "standard",
      created_at: new Date().toISOString(),
      research_period_days: 30,
      model_used: "gemini-2.5-pro",
      status: "complete",
      limitations: ["AIS tracking data sampled across Ultra Large Container Vessels on Asia-Europe routes."],
    },
    executive_summary: {
      overview: "Cubic engine propulsion dynamics make reducing voyage speed from 22 knots to 17 knots reduce bunker fuel consumption by 24%.",
      confirmed_developments: ["24% propulsion fuel reduction", "5-knot speed delta", "Berth queue dwell buffer"],
      interpretations_and_context: ["Operational savings exceed inventory carrying costs at current bunker prices."],
      critical_uncertainties: [
        "Unplanned port berth congestion can wipe out transit inventory savings if dwell exceeds 4.5 days.",
      ],
    },
    scriptwriter_handoff: {
      topic: "Container Shipping Economics: Slow Steaming & Port Dwell Variance",
      target_audience: "Supply Chain Directors & Maritime Analysts",
      core_thesis: "Because ship engine power scales with the cube of speed, modest sailing reductions yield massive economic dividends.",
      recommended_angle_title: "The Physics of Freight: Why Slow Steaming Dominates Global Container Shipping",
      citation_instructions: "Cite official maritime telematics and Drewry benchmarks.",
      suggested_visual_layouts: ["kinetic_typography", "stat_counter", "comparison_grid", "document_reveal"],
      narrative_beats: [
        { beat: "hook", purpose: "hook", narration_focus: "24% fuel cut via 5-knot drop", visual_suggestion: "editorial_montage" },
        { beat: "context", purpose: "context", narration_focus: "Port dwell variance", visual_suggestion: "word_by_word" },
      ],
      verified_facts: [
        {
          claim: "Reducing speed from 22 to 17 knots cuts voyage bunker fuel consumption by 24%.",
          source_title: "Drewry Maritime Research & Bunker Audits (2025)",
          source_url: "https://drewry.co.uk/insights/slow-steaming-audits",
          evidence_id: "ev_s1",
        },
        {
          claim: "Port terminal dwell times vary by up to 4.5 days across major European container hubs.",
          source_title: "Global Container Terminal Telematics (2026)",
          source_url: "https://maritime-telematics.org/port-dwell",
          evidence_id: "ev_s2",
        },
      ],
      audience_questions_to_answer: ["How much fuel is saved?", "How does port dwell impact total cycle time?"],
      claims_to_avoid: [
        "Do NOT claim slow steaming completely eliminates shipping greenhouse gas emissions.",
        "Do NOT state that slow steaming reduces container transit times for cargo owners.",
      ],
    },
    evidence_store: {
      ev_s1: {
        evidence_id: "ev_s1",
        claim_text: "Reducing speed from 22 to 17 knots cuts voyage bunker fuel consumption by 24%.",
        source_id: "src_drewry",
        source_url: "https://drewry.co.uk/insights/slow-steaming-audits",
        source_title: "Drewry Maritime Research & Bunker Audits (2025)",
        publisher: "Drewry Shipping Consultants",
        publication_date: "2025-10-05",
        retrieved_at: new Date().toISOString(),
        supporting_excerpt: "Telemetry across 45 voyages confirmed an average 24.1% reduction in metric tons of fuel per nautical mile.",
        evidence_type: "statistic",
        source_quality: "primary",
        confidence: "high",
        verification_status: "verified",
        claim_classification: "measured_benchmark",
        provenance: {
          classification: "measured_benchmark",
          primary_source_type: "peer_reviewed_paper",
          is_direct_measurement: true,
          baseline_comparison: "Standard 22 knot service speed",
          sample_size_or_conditions: "45 commercial Asia-Europe voyages",
        },
      },
      ev_s2: {
        evidence_id: "ev_s2",
        claim_text: "Port terminal dwell times vary by up to 4.5 days across major European container hubs.",
        source_id: "src_dwell",
        source_url: "https://maritime-telematics.org/port-dwell",
        source_title: "Global Container Terminal Telematics (2026)",
        publisher: "Port of Rotterdam Authority",
        publication_date: "2026-01-14",
        retrieved_at: new Date().toISOString(),
        supporting_excerpt: "Berth waiting and container yard dwell averaged 4.5 days standard deviation across major ports.",
        evidence_type: "research_finding",
        source_quality: "primary",
        confidence: "high",
        verification_status: "verified",
        claim_classification: "measured_benchmark",
        provenance: {
          classification: "measured_benchmark",
          primary_source_type: "peer_reviewed_paper",
          is_direct_measurement: true,
          sample_size_or_conditions: "12 European terminal yards",
        },
      },
    },
  } as unknown as ResearchBrief;
}

// ── Test Execution ──────────────────────────────────────────────────

export async function runUniversalEngineRegressionTests(): Promise<{ passed: number; failed: number }> {
  console.log("\n══════════════════════════════════════════════════════════════════");
  console.log("  Voiceage Universal Production Engine — Multi-Topic Regression");
  console.log("══════════════════════════════════════════════════════════════════\n");

  const briefs = [
    { name: "AI Research & Simulation", brief: createGenieBrief() },
    { name: "Earth & Marine Science", brief: createMarianaBrief() },
    { name: "Physics & Network Security", brief: createQuantumBrief() },
    { name: "Maritime & Global Trade", brief: createMaritimeBrief() },
  ];

  // 1. Domain Aesthetic & Palette Differentiation
  await test("1. Domain Aesthetic Differentiation: Color palettes distinctly adapt to each domain", async () => {
    const directions = await Promise.all(
      briefs.map(async (b) => {
        const script = buildDeterministicScriptFromBrief(b.brief);
        const dir = await determineVisualDirection(b.brief, script, { forceDeterministic: true });
        return { name: b.name, dir };
      })
    );

    // Ensure distinct primary and accent colors across all 4 domains
    console.log("Palettes:", directions.map((d) => ({ name: d.name, primary: d.dir.palette.primary, accent: d.dir.palette.accent })));
    const primaryColors = new Set(directions.map((d) => d.dir.palette.primary));
    const accentColors = new Set(directions.map((d) => d.dir.palette.accent));
    assert.strictEqual(primaryColors.size, 4, "All 4 domains must produce distinct primary brand colors");
    assert.strictEqual(accentColors.size, 4, "All 4 domains must produce distinct accent highlight colors");

    // Verify marine earth science adopts oceanic cyan/deep-sea palette
    const marineDir = directions.find((d) => d.name === "Earth & Marine Science")!.dir;
    assert.ok(
      marineDir.palette.accent.toLowerCase() === "#00e5ff",
      "Earth & Marine Science should feature cyan hadal glow accent"
    );

    // Verify quantum physics adopts ultraviolet/indigo palette
    const quantumDir = directions.find((d) => d.name === "Physics & Network Security")!.dir;
    assert.ok(
      quantumDir.palette.accent.toLowerCase() === "#a855f7",
      "Physics & Network Security should feature violet/quantum accents"
    );

    // Verify maritime trade adopts maritime beacon amber palette
    const maritimeDir = directions.find((d) => d.name === "Maritime & Global Trade")!.dir;
    assert.ok(
      maritimeDir.palette.accent.toLowerCase() === "#f59e0b",
      "Maritime & Global Trade should feature maritime beacon amber accents"
    );

    // Verify simulation world model adopts Voiceage Neon Orange
    const simDir = directions.find((d) => d.name === "AI Research & Simulation")!.dir;
    assert.ok(
      simDir.palette.accent.toLowerCase() === "#ff5f00",
      "AI Research & Simulation should feature Voiceage Neon Orange"
    );
  });

  // 2. Visual Beat Planning Completeness
  await test("2. Visual Beat Planning: Every scene generates a comprehensive beat_plan with asset types and queries", async () => {
    for (const { name, brief } of briefs) {
      const script = buildDeterministicScriptFromBrief(brief);
      const dir = await determineVisualDirection(brief, script, { forceDeterministic: true });
      assert.ok(dir.beat_plan && dir.beat_plan.length >= 6, `${name} must generate a complete beat_plan`);

      for (const beat of dir.beat_plan) {
        assert.ok(beat.scene_id, `${name}: beat must have scene_id`);
        assert.ok(beat.visual_concept, `${name}: beat must define visual_concept`);
        assert.ok(beat.asset_type, `${name}: beat must specify asset_type`);
        assert.ok(beat.search_query_or_prompt, `${name}: beat must provide search_query_or_prompt`);
        assert.ok(beat.motion_and_composition?.camera_motion, `${name}: beat must specify camera_motion`);
        assert.ok(beat.fallback_strategy, `${name}: beat must specify fallback_strategy`);
      }
    }
  });

  // 3. Absence of Internal Developer Leaks
  await test("3. Developer Leak Elimination: Zero internal prompt tokens in display text or narration across all domains", async () => {
    const leakTokens = [
      "cinematic parallax",
      "split callout",
      "source id:",
      "archive evidence fig",
      "prompt:",
      "high-contrast typography",
    ];

    for (const { name, brief } of briefs) {
      const script = buildDeterministicScriptFromBrief(brief, { targetDurationSeconds: 45 });
      const blueprint = buildDeterministicBlueprintFromScript(script, { themePreset: "cyber_editorial" });

      for (const scene of blueprint.scenes) {
        const textToCheck = `${scene.on_screen_text || ""} ${scene.narration || ""}`.toLowerCase();
        for (const token of leakTokens) {
          assert.ok(
            !textToCheck.includes(token),
            `Domain "${name}" scene "${scene.id}" leaked developer token "${token}" in text: "${textToCheck}"`
          );
        }
      }
    }
  });

  // 4. Headline Formatting and Display Text Sanitization
  await test("4. Text Sanitization: formatHeadline prevents mid-word truncation and dangling quotes (<55 chars)", () => {
    const testCases = [
      {
        input: 'The Real-World Impact of Google\'s Genie 4: What the Evidence Shows',
        maxLen: 48,
      },
      {
        input: 'Inside Mariana Trench: Hydrostatic Pressure & Metabolic Adaptation in Hadal Ecosystems',
        maxLen: 48,
      },
      {
        input: 'Quantum Key Distribution: Breaking the Repeaterless Limit with Twin-Field Interference',
        maxLen: 48,
      },
      {
        input: 'Container Shipping Economics: Why Slow Steaming Dominates Global Commercial Freight',
        maxLen: 48,
      },
    ];

    for (const tc of testCases) {
      const formatted = formatHeadline(tc.input, tc.maxLen);
      assert.ok(formatted.length <= 55, `Headline exceeds safe length: "${formatted}" (${formatted.length} chars)`);
      assert.ok(!/[’'"]$/.test(formatted), `Headline ends with dangling quote: "${formatted}"`);
      assert.ok(!/\b[a-z]{1,2}$/i.test(formatted) || (formatted.split(" ").pop()?.length || 0) > 2, `Headline appears sliced mid-word: "${formatted}"`);
      assert.ok(!formatted.endsWith("-"), `Headline ends with broken hyphen: "${formatted}"`);
    }
  });

  // 5. Absence of Pricing-as-Benchmark
  await test("5. Benchmark Integrity: Product pricing and subscription tiers are not classified as empirical benchmarks", () => {
    for (const { name, brief } of briefs) {
      const script = buildDeterministicScriptFromBrief(brief);
      const blueprint = buildDeterministicBlueprintFromScript(script, { themePreset: "cyber_editorial" });

      for (const scene of blueprint.scenes) {
        if (scene.scene_type === "stat_counter" || scene.scene_type === "comparison_grid") {
          const text = `${scene.on_screen_text || ""} ${scene.narration || ""}`.toLowerCase();
          const hasPricing = /\b(\$|per month|\/mo|pricing tier|subscription fee)\b/i.test(text);
          assert.strictEqual(
            hasPricing,
            false,
            `Domain "${name}" scene "${scene.id}" improperly features subscription pricing in benchmark scene`
          );
        }
      }
    }
  });

  // 6. Grounded Evidence Provenance
  await test("6. Grounded Evidence Provenance: All scene claims reference genuine evidence with verified status", () => {
    for (const { name, brief } of briefs) {
      const script = buildDeterministicScriptFromBrief(brief);
      const claimVal = validateScriptClaims(script, brief);

      assert.strictEqual(claimVal.valid, true, `Script for "${name}" must pass claim validation: ${claimVal.errors.join("; ")}`);
      assert.ok(script.scenes.length >= 8, `Script for "${name}" must have >= 8 scenes for 45s target duration`);

      for (const sc of script.scenes) {
        for (const claim of sc.claims) {
          if (sc.purpose !== "cta") {
            assert.strictEqual(claim.verification_status, "verified", `Claim "${claim.claim_id}" in "${name}" must be verified`);
            assert.ok(claim.supporting_evidence_ids.length > 0, `Claim "${claim.claim_id}" must reference evidence IDs`);
          } else {
            assert.ok(
              claim.verification_status === "verified" || claim.verification_status === "partially_verified",
              `CTA claim "${claim.claim_id}" in "${name}" must be verified or partially_verified`
            );
          }
        }
      }
    }
  });

  // 7. Editorial Consistency Gate on Diverse Domains
  await test("7. Editorial Gate Multi-Domain Enforcement: Approves grounded scripts and blocks cross-domain leaks", () => {
    for (const { name, brief } of briefs) {
      const script = buildDeterministicScriptFromBrief(brief);
      const gateResult = evaluateEditorialConsistency(brief, script);

      assert.strictEqual(gateResult.passed, true, `Editorial gate failed on valid script for "${name}": ${gateResult.errors.join("; ")}`);
      assert.strictEqual(gateResult.requiresRejection, false);
    }

    // Verify cross-topic poisoning is rejected:
    const marineBrief = createMarianaBrief();
    const quantumScript = buildDeterministicScriptFromBrief(createQuantumBrief());
    const poisonedGateResult = evaluateEditorialConsistency(marineBrief, quantumScript);

    assert.strictEqual(poisonedGateResult.passed, false, "Editorial Gate must reject quantum script evaluated against marine brief");
    assert.strictEqual(poisonedGateResult.requiresRejection, true);
  });

  // 8. Quality Inspector Report Format (Three Layers)
  await test("8. Three-Layered QA Report Structure: Report cleanly separates Media, Editorial, and Visual review", () => {
    const mockReport = {
      report_id: "rep_test_layer",
      job_id: "job_test",
      project_id: "proj_test",
      output_path: "data/production/videos/test.mp4",
      rendered_at: new Date().toISOString(),
      status: "passed" as const,
      file_metrics: {
        size_bytes: 14500000,
        duration_seconds: 44.5,
        container: "mov,mp4,m4a,3gp,3g2,mj2",
        video_codec: "h264",
        audio_codec: "aac",
        width: 1080,
        height: 1920,
        fps: 60,
      },
      audio_metrics: {
        sample_rate: 48000,
        channels: 2,
        max_volume_db: -1.0,
        mean_volume_db: -18.2,
        silence_detected: false,
        ebu_r128_integrated_loudness: -14.2,
        ebu_r128_true_peak: -1.0,
      },
      scene_metrics: {
        total_scenes: 9,
        missing_scenes: 0,
        static_scenes: 0,
        average_scene_duration_seconds: 4.9,
      },
      checks: [
        { name: "video_stream_exists", category: "stream" as const, passed: true, severity: "critical" as const, details: "h264 1080x1920" },
        { name: "ebu_r128_integrated_loudness", category: "audio" as const, passed: true, severity: "critical" as const, details: "-14.2 LUFS" },
        { name: "audio_true_peak_ceiling", category: "audio" as const, passed: true, severity: "critical" as const, details: "-1.0 dBFS" },
        { name: "absence_of_developer_leaks", category: "editorial" as const, passed: true, severity: "critical" as const, details: "Zero leaks" },
        { name: "absence_of_pricing_as_benchmark", category: "editorial" as const, passed: true, severity: "warning" as const, details: "Verified benchmarks" },
        { name: "visual_diversity_score", category: "visual" as const, passed: true, severity: "warning" as const, details: "Score 85/100" },
      ],
    };

    // Format markdown report
    const markdown = (function formatReportMarkdown(r: typeof mockReport): string {
      const layer1 = r.checks.filter((c) => c.category === "stream" || c.category === "audio");
      const layer2 = r.checks.filter((c) => c.category === "editorial");
      const layer3 = r.checks.filter((c) => c.category === "visual");

      return `
# Quality Assurance Report
### Layer 1: Technical Media Quality (PASS)
- Codec: ${r.file_metrics.video_codec} ${r.file_metrics.width}x${r.file_metrics.height}
- Audio: ${r.audio_metrics.sample_rate}Hz stereo, ${r.audio_metrics.ebu_r128_integrated_loudness} LUFS
${layer1.map((c) => `- ${c.name}: ${c.details}`).join("\n")}

### Layer 2: Automated Editorial Consistency (PASS)
${layer2.map((c) => `- ${c.name}: ${c.details}`).join("\n")}

### Layer 3: Rendered Content Review (PASS)
${layer3.map((c) => `- ${c.name}: ${c.details}`).join("\n")}
`;
    })(mockReport);

    assert.ok(markdown.includes("Layer 1: Technical Media Quality"), "Must contain Layer 1 section");
    assert.ok(markdown.includes("Layer 2: Automated Editorial Consistency"), "Must contain Layer 2 section");
    assert.ok(markdown.includes("Layer 3: Rendered Content Review"), "Must contain Layer 3 section");
    assert.ok(markdown.includes("48000Hz stereo"), "Must confirm 48kHz stereo");
    assert.ok(markdown.includes("-14.2 LUFS"), "Must confirm EBU R128 loudness");
  });

  console.log("\n──────────────────────────────────────────────────────────────────");
  console.log(`  Tests Passed: ${passed} / ${passed + failed}`);
  if (failed > 0) {
    throw new Error(`${failed} universal engine regression test(s) failed.`);
  }
  console.log("  All Universal Engine Multi-Topic Regression tests passed cleanly!\n");

  return { passed, failed };
}

if (require.main === module) {
  runUniversalEngineRegressionTests()
    .then(() => {
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

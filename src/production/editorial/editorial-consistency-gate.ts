/**
 * Editorial Consistency Gate.
 *
 * Enforces editorial integrity between the research brief and the proposed script
 * prior to storyboard generation.
 *
 * Detects:
 * - Topic mismatch / drift (e.g. pharma acquisition vs cloud incident remediation)
 * - Unsupported financial numbers, acquisitions, or percentage claims
 * - Claims that overstate or exaggerate the source evidence
 * - Prohibited claims from the brief's claims-to-avoid constraints
 * - Evidence linkage validity
 */

import type { ResearchBrief } from "../../research/types";
import type { ScriptDocument } from "../types";

export interface EditorialGateResult {
  passed: boolean;
  requiresRejection: boolean;
  alignmentScore: number;
  evidenceCoverage: number;
  errors: string[];
  warnings: string[];
  recommendations: string[];
}

export function evaluateEditorialConsistency(
  brief: ResearchBrief,
  script: ScriptDocument
): EditorialGateResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const recommendations: string[] = [];

  const briefTopic = (brief.metadata?.research_topic || "").toLowerCase();
  const briefAngle = (brief.scriptwriter_handoff?.recommended_angle_title || "").toLowerCase();
  const briefThesis = (brief.scriptwriter_handoff?.core_thesis || "").toLowerCase();
  const scriptTopic = (script.topic || "").toLowerCase();
  const scriptTitle = (script.title || "").toLowerCase();

  // 1. Topic Alignment & Semantic Domain Validation
  const topicKeywords = new Set(
    `${briefTopic} ${briefAngle} ${briefThesis}`
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3)
  );

  const fullScriptNarration = script.scenes
    .map((s) => s.narration)
    .join(" ")
    .toLowerCase();

  let matchedKeywordCount = 0;
  for (const kw of topicKeywords) {
    if (fullScriptNarration.includes(kw) || scriptTitle.includes(kw) || scriptTopic.includes(kw)) {
      matchedKeywordCount++;
    }
  }

  const keywordCoverage =
    topicKeywords.size > 0 ? matchedKeywordCount / topicKeywords.size : 1.0;

  // Check for distinct domain collision (e.g., Pharma/Bio vs Cloud/Infrastructure vs Logistics)
  const pharmaKeywords = ["pharma", "drug", "clinical", "patient", "biotech", "fda", "therapeutic", "acquisition"];
  const infraKeywords = ["telemetry", "incident", "cluster", "kubernetes", "latency", "microservice", "remediation", "alert fatigue"];
  const logisticsKeywords = ["route", "routing", "optimization", "logistics", "fleet", "dispatch", "telematics", "delivery", "freight", "cargo"];

  const briefIsPharma = pharmaKeywords.some((k) => briefTopic.includes(k) || briefAngle.includes(k));
  const briefIsInfra = infraKeywords.some((k) => briefTopic.includes(k) || briefAngle.includes(k));
  const briefIsLogistics = logisticsKeywords.some((k) => briefTopic.includes(k) || briefAngle.includes(k));

  const scriptIsInfra = infraKeywords.filter((k) => fullScriptNarration.includes(k)).length >= 3;
  const scriptIsPharma = pharmaKeywords.filter((k) => fullScriptNarration.includes(k)).length >= 3;
  const scriptIsLogistics = logisticsKeywords.filter((k) => fullScriptNarration.includes(k)).length >= 3;

  if (briefIsPharma && scriptIsInfra) {
    errors.push(
      `CRITICAL TOPIC COLLISION: Brief concerns pharmaceutical/biotech topic ("${brief.metadata.research_topic}") but script discusses cloud infrastructure/incident remediation.`
    );
  }

  if (briefIsInfra && scriptIsPharma) {
    errors.push(
      `CRITICAL TOPIC COLLISION: Brief concerns cloud infrastructure ("${brief.metadata.research_topic}") but script discusses pharmaceutical/drug development.`
    );
  }

  if (briefIsLogistics && (scriptIsInfra || fullScriptNarration.includes("alert fatigue") || fullScriptNarration.includes("siloed telemetry"))) {
    errors.push(
      `CRITICAL TOPIC COLLISION: Brief concerns logistics/route optimization ("${brief.metadata.research_topic}") but script discusses cloud infrastructure/alert fatigue.`
    );
  }

  if ((briefIsPharma || briefIsInfra) && scriptIsLogistics) {
    errors.push(
      `CRITICAL TOPIC COLLISION: Brief concerns ("${brief.metadata.research_topic}") but script discusses commercial logistics/route optimization.`
    );
  }

  // 2. Fact & Evidence Store Verification
  const validEvidenceIds = new Set<string>();
  const evidenceStore = brief.evidence_store || {};
  for (const item of Object.values(evidenceStore)) {
    if (item.evidence_id) validEvidenceIds.add(item.evidence_id);
  }

  const allEvidenceText = Object.values(evidenceStore)
    .map((e) => `${e.source_title} ${e.supporting_excerpt} ${e.claim_text}`)
    .join(" ")
    .toLowerCase();

  // Cross-brand & tool contamination check (e.g., Figma in route optimization or finance)
  const designBrands = ["figma", "sketch", "canva", "invision"];
  for (const db of designBrands) {
    if (fullScriptNarration.includes(db) && !briefTopic.includes(db) && !briefAngle.includes(db) && !allEvidenceText.includes(db)) {
      errors.push(
        `CRITICAL TOOL COLLISION: Script mentions design tool ("${db}") in an unrelated topic ("${brief.metadata.research_topic}").`
      );
    }
  }

  if (keywordCoverage < 0.20 && topicKeywords.size >= 4) {
    errors.push(
      `CRITICAL TOPIC DRIFT: Script narration has less than 20% alignment (${Math.round(keywordCoverage * 100)}% overlap) with research brief ("${brief.metadata.research_topic}").`
    );
  } else if (keywordCoverage < 0.30 && topicKeywords.size >= 4) {
    warnings.push(
      `Low topic keyword alignment (${Math.round(keywordCoverage * 100)}% overlap between research brief and script). Ensure narration directly addresses the brief's core thesis.`
    );
  }

  const factsAndStats = brief.facts_and_statistics || [];
  for (const stat of factsAndStats) {
    if (stat.evidence_id) validEvidenceIds.add(stat.evidence_id);
  }

  const verifiedFacts = brief.scriptwriter_handoff?.verified_facts || [];
  for (const vf of verifiedFacts) {
    if (vf.evidence_id) validEvidenceIds.add(vf.evidence_id);
  }

  // 3. Financial & Acquisition Hallucination Check
  // Detect $ dollar amounts or acquisitions in script narration that are absent in brief
  const dollarMatches = fullScriptNarration.match(/\$\s*[\d,]+(?:\.\d+)?\s*(?:billion|million|trillion|b|m|k)?/gi) || [];
  for (const match of dollarMatches) {
    const cleanNum = match.replace(/[$,\s]/g, "").toLowerCase();
    if (!allEvidenceText.includes(cleanNum) && !allEvidenceText.includes(match.toLowerCase())) {
      errors.push(
        `UNSUPPORTED FINANCIAL FIGURE: Script mentions "${match}" in narration, but this figure does not appear in the research evidence.`
      );
    }
  }

  const acquisitionKeywords = ["acquired", "acquisition", "bought for", "takeover of"];
  for (const ak of acquisitionKeywords) {
    if (fullScriptNarration.includes(ak)) {
      if (!allEvidenceText.includes(ak) && !briefTopic.includes("acqui")) {
        errors.push(
          `UNSUPPORTED ACQUISITION CLAIM: Script asserts an acquisition ("${ak}"), which is not documented in the verified evidence.`
        );
      }
    }
  }

  // 4. Claims Coverage and Overstatement Checks
  let totalScriptClaims = 0;
  let supportedScriptClaims = 0;

  for (const scene of script.scenes) {
    for (const claim of scene.claims || []) {
      totalScriptClaims++;

      // Check evidence ID validity
      const invalidIds = (claim.supporting_evidence_ids || []).filter(
        (id) => !validEvidenceIds.has(id)
      );

      if (invalidIds.length > 0) {
        warnings.push(
          `Scene "${scene.scene_id}" claim "${claim.claim_id}" references non-existent evidence IDs: [${invalidIds.join(", ")}].`
        );
      } else if ((claim.supporting_evidence_ids || []).length > 0) {
        supportedScriptClaims++;
      }

      // Check claim overstatement: "100%", "guaranteed", "flawless", "infinite"
      const overstatementRegex = /\b(100%|guaranteed|flawless|infinite|zero error|impossible to fail)\b/i;
      if (overstatementRegex.test(claim.spoken_text)) {
        warnings.push(
          `Scene "${scene.scene_id}" claim "${claim.claim_id}" uses absolute claim language ("${claim.spoken_text.match(overstatementRegex)?.[0]}") that may overstate empirical evidence.`
        );
      }
    }
  }

  // 5. Constraints & Claims-to-Avoid Check
  const claimsToAvoid = brief.scriptwriter_handoff?.claims_to_avoid || [];
  for (const prohibited of claimsToAvoid) {
    const prohibitedLower = prohibited.toLowerCase();
    const prohibitedKeywords = prohibitedLower
      .replace(/[^\w\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 4);

    if (prohibitedKeywords.length >= 2) {
      const matchCount = prohibitedKeywords.filter((k) => fullScriptNarration.includes(k)).length;
      if (matchCount === prohibitedKeywords.length || fullScriptNarration.includes(prohibitedLower)) {
        errors.push(
          `VIOLATION OF RESEARCH CONSTRAINT: Script narration contains prohibited assertion: "${prohibited}"`
        );
      }
    }
  }

  // 6. Universal Text-Sanitization & Prompt Leakage Gate
  const forbiddenLeakTokens = [
    "cinematic parallax",
    "split callout",
    "source id:",
    "archive evidence fig",
    "prompt:",
    "developer description",
    "scene_00",
    "render prompt",
  ];

  for (const scene of script.scenes) {
    const onScreen = (scene.on_screen_text || "").toLowerCase();
    const narration = (scene.narration || "").toLowerCase();

    for (const token of forbiddenLeakTokens) {
      if (onScreen.includes(token) || narration.includes(token)) {
        errors.push(
          `INTERNAL PROMPT LEAKAGE DETECTED in scene "${scene.scene_id}": contains internal token "${token}". Display and narration text must never leak prompt or engineering directives.`
        );
      }
    }

    // Check for dangling apostrophe or truncated word at end of headline
    if (scene.on_screen_text && /[’'—\-]\s*$/.test(scene.on_screen_text.trim())) {
      errors.push(
        `HEADLINE TRUNCATION DETECTED in scene "${scene.scene_id}": on_screen_text "${scene.on_screen_text}" ends with dangling punctuation/cut.`
      );
    }
  }

  const evidenceCoverage =
    totalScriptClaims > 0 ? supportedScriptClaims / totalScriptClaims : 1.0;

  const alignmentScore = Math.max(
    0,
    Math.min(1.0, keywordCoverage * 0.4 + evidenceCoverage * 0.6 - errors.length * 0.25)
  );

  const requiresRejection = errors.length > 0;

  if (requiresRejection) {
    recommendations.push(
      "Script failed the Editorial Consistency Gate. Revise script to align strictly with verified evidence."
    );
  }

  return {
    passed: !requiresRejection,
    requiresRejection,
    alignmentScore,
    evidenceCoverage,
    errors,
    warnings,
    recommendations,
  };
}

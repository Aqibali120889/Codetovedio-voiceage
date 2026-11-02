/**
 * Claim-Level Evidence Validator.
 * Verifies that script claims reference valid evidence IDs from the research brief,
 * checks for prohibited claims-to-avoid, and enforces strict anti-hallucination rules.
 */

import type { ScriptDocument } from "../types";
import type { ResearchBrief } from "../../research/types";

export interface ClaimValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  claimsSummary: {
    total: number;
    verified: number;
    unverified: number;
    flagged: number;
  };
}

export function validateScriptClaims(
  script: ScriptDocument,
  brief?: ResearchBrief
): ClaimValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Build index of valid evidence IDs from research brief
  const validEvidenceIds = new Set<string>();
  const claimsToAvoid: string[] = [];

  if (brief) {
    if (brief.evidence_store) {
      for (const item of Object.values(brief.evidence_store)) {
        validEvidenceIds.add(item.evidence_id);
      }
    }
    if (brief.facts_and_statistics) {
      for (const stat of brief.facts_and_statistics) {
        if (stat.evidence_id) validEvidenceIds.add(stat.evidence_id);
      }
    }
    if (brief.scriptwriter_handoff?.claims_to_avoid) {
      claimsToAvoid.push(...brief.scriptwriter_handoff.claims_to_avoid);
    }
  }

  let totalClaims = 0;
  let verifiedCount = 0;
  let unverifiedCount = 0;
  let flaggedCount = 0;

  for (const scene of script.scenes) {
    if (!scene.claims || scene.claims.length === 0) {
      // If scene has factual assertions in narration without structured evidence grounding, reject
      if (
        scene.narration.includes("%") ||
        /\b\d+(\.\d+)?(x|k|m|b)\b/i.test(scene.narration) ||
        /\b(study|report|found|according to)\b/i.test(scene.narration)
      ) {
        errors.push(
          `Scene ${scene.scene_id} asserts statistical or factual claims in narration without verified evidence grounding.`
        );
        unverifiedCount++;
      }
      continue;
    }

    for (const claim of scene.claims) {
      totalClaims++;

      // Check for prohibited claims-to-avoid
      let violatedAvoidClaim = false;
      for (const prohibited of claimsToAvoid) {
        const lowerClaim = claim.spoken_text.toLowerCase();
        const lowerProhibited = prohibited.toLowerCase();
        const prohibitedAssertion = lowerProhibited
          .replace(/^do\s+not\s+(claim|assert|promise|state)\s+/i, "")
          .replace(/[^\w\s]/g, "")
          .trim();
        const assertionKeywords = prohibitedAssertion
          .split(/\s+/)
          .filter((w) => w.length > 4 && !["without", "during", "before", "across"].includes(w));

        const matchCount = assertionKeywords.filter((k) => lowerClaim.includes(k)).length;
        const threshold = Math.max(3, Math.ceil(assertionKeywords.length * 0.75));
        if (
          lowerClaim.includes(lowerProhibited) ||
          (prohibitedAssertion.length > 15 && lowerClaim.includes(prohibitedAssertion)) ||
          (assertionKeywords.length >= 3 && matchCount >= threshold)
        ) {
          claim.verification_status = "flagged";
          claim.notes = `Violates research constraint: "${prohibited}"`;
          errors.push(
            `Scene ${scene.scene_id} claim "${claim.claim_id}" violates constraint: "${prohibited}"`
          );
          violatedAvoidClaim = true;
          break;
        }
      }

      if (violatedAvoidClaim) {
        flaggedCount++;
        continue;
      }

      // Check evidence support for facts and statistics
      if (claim.claim_type === "verified_fact" || claim.claim_type === "statistic") {
        if (!claim.supporting_evidence_ids || claim.supporting_evidence_ids.length === 0) {
          claim.verification_status = "unverified";
          errors.push(
            `Scene ${scene.scene_id} claim "${claim.claim_id}" (${claim.claim_type}) has no supporting evidence IDs.`
          );
          unverifiedCount++;
        } else if (brief && validEvidenceIds.size > 0) {
          const invalidIds = claim.supporting_evidence_ids.filter(
            (id) => !validEvidenceIds.has(id)
          );
          if (invalidIds.length > 0) {
            claim.verification_status = "unverified";
            claim.notes = `Invalid evidence IDs referenced: ${invalidIds.join(", ")}`;
            errors.push(
              `Scene ${scene.scene_id} claim "${claim.claim_id}" references unknown evidence ID(s): ${invalidIds.join(", ")}`
            );
            unverifiedCount++;
          } else {
            claim.verification_status = "verified";
            verifiedCount++;
          }
        } else {
          // If no brief is provided for reference, accept as verified if IDs are present
          claim.verification_status = "verified";
          verifiedCount++;
        }
      } else {
        // Interpretations, opinions, rhetorical framings
        if (claim.supporting_evidence_ids && claim.supporting_evidence_ids.length > 0) {
          claim.verification_status = "verified";
          verifiedCount++;
        } else {
          claim.verification_status = "partially_verified";
          verifiedCount++;
        }
      }
    }
  }

  const claimsSummary = {
    total: totalClaims,
    verified: verifiedCount,
    unverified: unverifiedCount,
    flagged: flaggedCount,
  };

  script.claims_summary = claimsSummary;

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    claimsSummary,
  };
}

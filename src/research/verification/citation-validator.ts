/**
 * Citation Integrity & Evidence Verification Engine.
 * Enforces zero-hallucination citation validation across all brief sections.
 */

import type { ResearchBrief } from "../types";
import { ResearchBriefSchema } from "../schemas";

export interface CitationValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  metrics: {
    totalFindings: number;
    totalFacts: number;
    totalEvidenceRecords: number;
    verifiedEvidenceCount: number;
    citationsResolvedRatio: number;
  };
}

/**
 * Perform strict citation validation on a ResearchBrief.
 */
export function validateBriefCitations(brief: ResearchBrief): CitationValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Validate against Zod schema
  const schemaRes = ResearchBriefSchema.safeParse(brief);
  if (!schemaRes.success) {
    for (const issue of schemaRes.error.issues) {
      errors.push(`[Schema] ${issue.path.join(".")}: ${issue.message}`);
    }
  }

  const evidenceStore = brief.evidence_store || {};
  const validEvidenceIds = new Set(Object.keys(evidenceStore));

  let totalCitationRefs = 0;
  let resolvedCitationRefs = 0;

  // 2. Validate Key Findings citations
  for (const finding of brief.key_findings || []) {
    if (!finding.supporting_evidence_ids || finding.supporting_evidence_ids.length === 0) {
      warnings.push(`Finding "${finding.finding_id}" has no supporting evidence IDs.`);
    } else {
      for (const evId of finding.supporting_evidence_ids) {
        totalCitationRefs++;
        if (!validEvidenceIds.has(evId)) {
          errors.push(
            `Finding "${finding.finding_id}" references unknown evidence ID "${evId}" not found in evidence store.`
          );
        } else {
          resolvedCitationRefs++;
          const ev = evidenceStore[evId];
          // Check if finding URL is in evidence
          if (ev && !finding.supporting_urls.includes(ev.source_url)) {
            warnings.push(
              `Finding "${finding.finding_id}" URL list does not include evidence source URL ${ev.source_url}.`
            );
          }
        }
      }
    }
  }

  // 3. Validate Facts and Statistics citations
  for (const fact of brief.facts_and_statistics || []) {
    totalCitationRefs++;
    if (!fact.evidence_id) {
      errors.push(`Fact "${fact.fact_id}" is missing required evidence_id.`);
    } else if (!validEvidenceIds.has(fact.evidence_id)) {
      errors.push(
        `Fact "${fact.fact_id}" references unknown evidence ID "${fact.evidence_id}" not found in evidence store.`
      );
    } else {
      resolvedCitationRefs++;
      const ev = evidenceStore[fact.evidence_id];
      if (ev.verification_status === "unverified" || ev.verification_status === "excluded") {
        warnings.push(
          `Fact "${fact.fact_id}" relies on evidence "${fact.evidence_id}" with status "${ev.verification_status}".`
        );
      }
    }
  }

  // 4. Validate Source Bibliography citations
  for (const bib of brief.source_bibliography || []) {
    for (const evId of bib.evidence_ids || []) {
      if (!validEvidenceIds.has(evId)) {
        errors.push(
          `Bibliography source "${bib.source_id}" (${bib.title}) references unknown evidence ID "${evId}".`
        );
      }
    }
  }

  // 5. Verify scriptwriter handoff references real facts
  for (const vf of brief.scriptwriter_handoff?.verified_facts || []) {
    if (!validEvidenceIds.has(vf.evidence_id)) {
      errors.push(
        `Scriptwriter handoff verified fact "${vf.claim.slice(0, 30)}..." references missing evidence ID "${vf.evidence_id}".`
      );
    }
  }

  // Count verified evidence records
  let verifiedCount = 0;
  for (const ev of Object.values(evidenceStore)) {
    if (ev.verification_status === "verified" || ev.verification_status === "partially_supported") {
      verifiedCount++;
    }
  }

  const ratio = totalCitationRefs > 0 ? resolvedCitationRefs / totalCitationRefs : 1.0;

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    metrics: {
      totalFindings: (brief.key_findings || []).length,
      totalFacts: (brief.facts_and_statistics || []).length,
      totalEvidenceRecords: Object.keys(evidenceStore).length,
      verifiedEvidenceCount: verifiedCount,
      citationsResolvedRatio: ratio,
    },
  };
}

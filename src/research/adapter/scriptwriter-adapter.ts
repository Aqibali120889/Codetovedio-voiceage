/**
 * Scriptwriter Adapter.
 * Bridges Milestone 2 Research Briefs into the Milestone 1 AI Video Creation Pipeline.
 * Preserves evidence citations, narrative beats, and claims-to-avoid.
 */

import type { ResearchBrief, ScriptwriterHandoff } from "../types";
import { getBrief } from "../storage/brief-storage";
import { runPipeline, TopicModeInput } from "../../pipeline/orchestrator";
import type { TopicRequest, PipelineResult } from "../../pipeline/types";

export interface ScriptwriterAdapterOptions {
  platform?: string;
  target_duration_seconds?: number;
  tone?: string;
  call_to_action?: string;
  skipRender?: boolean;
}

/**
 * Format the Section 12 scriptwriter handoff package into a rich, structured prompt context.
 */
export function formatResearchContextForScriptwriter(handoff: ScriptwriterHandoff): string {
  const verifiedFactsFormatted = handoff.verified_facts
    .map((vf) => `• [${vf.evidence_id}] "${vf.claim}" (Source: ${vf.source_title})`)
    .join("\n");

  const narrativeBeatsFormatted = handoff.narrative_beats
    .map((nb) => `• ${nb.beat}: Focus="${nb.narration_focus}", Visual="${nb.visual_suggestion}"`)
    .join("\n");

  const claimsToAvoidFormatted = handoff.claims_to_avoid
    .map((cta) => `⚠️ ${cta}`)
    .join("\n");

  const audienceQuestions = handoff.audience_questions_to_answer
    .map((q) => `? ${q}`)
    .join("\n");

  return `
[GROUNDED RESEARCH BRIEF CONTEXT]
Recommended Angle: "${handoff.recommended_angle_title}"
Core Thesis: "${handoff.core_thesis}"

VERIFIED FACTS & EVIDENCE (Must ground all narration claims in these):
${verifiedFactsFormatted}

SUGGESTED NARRATIVE BEATS:
${narrativeBeatsFormatted}

AUDIENCE QUESTIONS TO ANSWER:
${audienceQuestions}

STRICT CONSTRAINTS (Claims to Avoid):
${claimsToAvoidFormatted}

CITATION DIRECTIVE:
${handoff.citation_instructions}
`.trim();
}

/**
 * Converts a ResearchBrief into a Milestone 1 TopicRequest with rich research context.
 */
export function adaptBriefToTopicRequest(
  brief: ResearchBrief,
  options: ScriptwriterAdapterOptions = {}
): TopicRequest {
  const handoff = brief.scriptwriter_handoff;
  const researchContext = formatResearchContextForScriptwriter(handoff);

  return {
    topic: `${handoff.recommended_angle_title}: ${handoff.core_thesis}`,
    audience: handoff.target_audience,
    platform: options.platform || "YouTube Shorts",
    target_duration_seconds: options.target_duration_seconds || 45,
    tone: options.tone || "confident, engaging, and authoritative",
    language: "English",
    call_to_action:
      options.call_to_action || "Follow Voiceage Systems for practical AI engineering.",
    brand_context: researchContext,
  };
}

/**
 * Directly sends a saved ResearchBrief to the Milestone 1 video creation pipeline.
 */
export async function sendBriefToScriptwriter(
  briefId: string,
  options: ScriptwriterAdapterOptions = {}
): Promise<PipelineResult> {
  const brief = getBrief(briefId);
  if (!brief) {
    throw new Error(`Research brief "${briefId}" not found in storage.`);
  }

  console.log(`\n[scriptwriter-adapter] Adapting brief "${briefId}" (${brief.metadata.research_topic}) for video pipeline...`);
  const topicRequest = adaptBriefToTopicRequest(brief, options);

  const pipelineInput: TopicModeInput = {
    mode: "topic",
    request: topicRequest,
  };

  console.log(`[scriptwriter-adapter] Dispatching into Milestone 1 runPipeline()...`);
  const result = await runPipeline(pipelineInput);

  console.log(`[scriptwriter-adapter] Pipeline finished with status: ${result.status} (Project: ${result.projectId})`);
  return result;
}

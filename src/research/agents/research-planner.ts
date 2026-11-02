/**
 * Agent 2: Research Planner.
 * Decomposes broad topics into focused, prioritized investigative subquestions
 * bounded by research depth.
 */

import { GoogleGenAI } from "@google/genai";
import { getConfig, checkCredentials } from "../../pipeline/config";
import type { ResearchDepth } from "../types";

export interface ResearchPlan {
  topic: string;
  depth: ResearchDepth;
  primaryObjective: string;
  targetAudience: string;
  subquestions: Array<{
    id: string;
    question: string;
    priority: "high" | "medium" | "low";
    requiredEvidenceType: string;
    focus: string;
  }>;
}

export async function generateResearchPlan(
  topic: string,
  targetAudience = "engineers and technical founders",
  depth: ResearchDepth = "standard",
  forceDeterministic = false
): Promise<ResearchPlan> {
  const maxSubquestions = depth === "quick" ? 3 : depth === "standard" ? 5 : 7;

  if (!forceDeterministic) {
    const credError = checkCredentials();
    if (!credError) {
    try {
      const config = getConfig();
      const client = new GoogleGenAI({ apiKey: config.geminiApiKey });

      const prompt = `You are a Senior Research Planner for technical video documentaries and educational content.
Decompose the following topic into ${maxSubquestions} prioritized, evidence-demanding subquestions for research depth "${depth}".

Topic: "${topic}"
Target Audience: "${targetAudience}"

Requirements:
- Subquestions must demand verifiable facts, empirical metrics, concrete architecture, or direct user complaints.
- Do NOT ask vague philosophical questions.
- Focus on: (1) Current technical capability, (2) Real operational problems, (3) Verified metrics/costs, (4) Tradeoffs & security risks.

Return ONLY valid JSON matching this schema:
{
  "primaryObjective": "string",
  "subquestions": [
    {
      "id": "sq_1",
      "question": "string",
      "priority": "high | medium | low",
      "requiredEvidenceType": "statistic | official_fact | research_finding | community_observation",
      "focus": "string"
    }
  ]
}`;

      // 45-second timeout guard — falls through to deterministic planner on slow/unavailable API
      const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 45_000));
      const apiPromise = client.interactions.create({
        model: config.textModel,
        input: prompt,
        response_format: { type: "text", mime_type: "application/json" },
        store: false,
      });

      const res = await Promise.race([apiPromise, timeoutPromise]);

      if (res !== null) {
        const raw = res.output_text?.trim() || "";
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed.subquestions) && parsed.subquestions.length > 0) {
            return {
              topic,
              depth,
              primaryObjective: parsed.primaryObjective || `Investigate ${topic} for ${targetAudience}`,
              targetAudience,
              subquestions: parsed.subquestions.slice(0, maxSubquestions),
            };
          }
        }
      } else {
        console.warn("[ResearchPlanner] Gemini API timed out after 30s, using deterministic planner.");
      }
    } catch (err) {
      console.warn(`[ResearchPlanner] Gemini planning failed (${(err as Error).message}), using deterministic planner.`);
    }
  }
  }

  // Deterministic fallback planner (0 quota, test-safe)
  const fallbackQuestions = [
    {
      id: "sq_1",
      question: `What verified capabilities and architectural components define ${topic}?`,
      priority: "high" as const,
      requiredEvidenceType: "official_fact",
      focus: "core_architecture",
    },
    {
      id: "sq_2",
      question: `What empirical benchmarks or performance metrics exist regarding ${topic}?`,
      priority: "high" as const,
      requiredEvidenceType: "statistic",
      focus: "benchmarks_and_metrics",
    },
    {
      id: "sq_3",
      question: `What operational friction, failure modes, or pain points do users report with ${topic}?`,
      priority: "high" as const,
      requiredEvidenceType: "community_observation",
      focus: "audience_problems",
    },
    {
      id: "sq_4",
      question: `What are the cost tradeoffs and unit economics of adopting ${topic}?`,
      priority: "medium" as const,
      requiredEvidenceType: "statistic",
      focus: "unit_economics",
    },
    {
      id: "sq_5",
      question: `What regulatory, privacy, or security constraints impact ${topic}?`,
      priority: "medium" as const,
      requiredEvidenceType: "research_finding",
      focus: "security_and_compliance",
    },
    {
      id: "sq_6",
      question: `What counter-evidence or skepticism exists challenging the narrative of ${topic}?`,
      priority: "low" as const,
      requiredEvidenceType: "expert_opinion",
      focus: "counter_evidence",
    },
    {
      id: "sq_7",
      question: `What practical deployment roadmap allows ${targetAudience} to adopt ${topic} safely?`,
      priority: "low" as const,
      requiredEvidenceType: "official_fact",
      focus: "implementation",
    },
  ];

  return {
    topic,
    depth,
    primaryObjective: `Investigate core architecture, operational metrics, and user pain points for ${topic}`,
    targetAudience,
    subquestions: fallbackQuestions.slice(0, maxSubquestions),
  };
}

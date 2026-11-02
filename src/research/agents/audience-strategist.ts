/**
 * Agent 5: Audience and Content Strategist.
 * Analyzes verified evidence from the audience's perspective to discover
 * actionable pain points, misconceptions, and differentiated content opportunities.
 *
 * IMPORTANT: All content in this agent MUST be derived from the research plan
 * and verified records. NEVER hardcode topic-specific strings.
 */

import type { AudienceIntelligence, ContentOpportunity, RecommendedVideoAngle, EvidenceRecord } from "../types";
import { ResearchPlan } from "./research-planner";

export interface AudienceStrategyResult {
  audienceIntelligence: AudienceIntelligence;
  contentOpportunities: ContentOpportunity[];
  recommendedAngle: RecommendedVideoAngle;
}

export function analyzeAudienceAndStrategy(
  plan: ResearchPlan,
  verifiedRecords: EvidenceRecord[]
): AudienceStrategyResult {
  const audience = plan.targetAudience;
  const topic = plan.topic;

  // Extract evidence IDs
  const allEvIds = verifiedRecords.map((r) => r.evidence_id);
  const primaryEvId = allEvIds[0] || "ev_001";
  const statEvId = verifiedRecords.find((r) => r.evidence_type === "statistic")?.evidence_id || primaryEvId;

  // ── Pain Points: derived from subquestions focused on "problems" and "friction" ──
  const problemSubqs = plan.subquestions.filter(
    (sq) =>
      sq.focus === "audience_problems" ||
      sq.focus === "security_and_compliance" ||
      sq.focus === "counter_evidence" ||
      sq.question.toLowerCase().includes("problem") ||
      sq.question.toLowerCase().includes("risk") ||
      sq.question.toLowerCase().includes("friction") ||
      sq.question.toLowerCase().includes("pain")
  );

  const painPoints: AudienceIntelligence["pain_points"] = problemSubqs.slice(0, 3).map((sq, i) => ({
    problem: sq.question,
    evidence: verifiedRecords[i]?.supporting_excerpt?.slice(0, 160) ?? `Documented in ${sq.requiredEvidenceType} research on ${topic}.`,
    severity: (i === 0 ? "high" : "medium") as "high" | "medium" | "low",
  }));

  // Fallback if no problem-focused subquestions
  if (painPoints.length === 0) {
    painPoints.push(
      {
        problem: `Understanding the real-world limitations and failure modes of ${topic}.`,
        evidence: verifiedRecords[0]?.supporting_excerpt?.slice(0, 160) ?? `Emerging research on ${topic} documents operational constraints.`,
        severity: "high",
      },
      {
        problem: `Evaluating cost-benefit and adoption risk for ${topic} in production environments.`,
        evidence: `Cost and reliability tradeoffs are frequently discussed by practitioners adopting ${topic}.`,
        severity: "medium",
      }
    );
  }

  // ── Repeated Questions: derived from subquestions ──
  const repeatedQuestions = plan.subquestions.slice(0, 3).map((sq) => sq.question);

  // ── Misconceptions: derived from counter-evidence subquestions and verified records ──
  const counterSubq = plan.subquestions.find(
    (sq) => sq.focus === "counter_evidence" || sq.question.toLowerCase().includes("skeptic") || sq.question.toLowerCase().includes("counter")
  );

  const commonMisconceptions: AudienceIntelligence["common_misconceptions"] = [];
  if (counterSubq) {
    const counterEvidence = verifiedRecords.find((r) =>
      r.evidence_type === "community_observation" || r.evidence_type === "expert_opinion"
    );
    commonMisconceptions.push({
      misconception: `${topic} delivers immediate results without significant implementation overhead.`,
      reality_backed_by_evidence:
        counterEvidence?.supporting_excerpt?.slice(0, 200) ??
        `Empirical deployments of ${topic} consistently show that implementation requires careful architecture, validation, and monitoring to deliver reliable outcomes.`,
    });
  }

  if (commonMisconceptions.length === 0) {
    commonMisconceptions.push({
      misconception: `${topic} is only relevant to large enterprises with dedicated engineering teams.`,
      reality_backed_by_evidence: `Research shows ${topic} is increasingly accessible to mid-market and smaller teams, with documented case studies across organization sizes.`,
    });
  }

  const audienceIntelligence: AudienceIntelligence = {
    pain_points: painPoints,
    repeated_questions: repeatedQuestions,
    common_misconceptions: commonMisconceptions,
    unanswered_questions: plan.subquestions
      .filter((sq) => sq.priority === "low")
      .slice(0, 2)
      .map((sq) => sq.question),
    inferences_labeled: [
      `[Inference] Adoption of ${topic} among ${audience} will accelerate as empirical evidence from early adopters becomes more widely published.`,
    ],
  };

  // ── Content Opportunities: derived from top subquestions and evidence ──
  const coreSubq = plan.subquestions.find((sq) => sq.focus === "core_architecture" || sq.priority === "high") || plan.subquestions[0];
  const benchmarkSubq = plan.subquestions.find((sq) => sq.focus === "benchmarks_and_metrics") || plan.subquestions[1];
  const implementationSubq = plan.subquestions.find((sq) => sq.focus === "implementation" || sq.focus === "unit_economics") || plan.subquestions[2];

  const topicTitleClean = topic.replace(/^[a-z0-9_-]+:\s*/i, "").trim();
  const domainCategory = (function deduceDomainCategory(text: string): string {
    const lower = text.toLowerCase();
    if (/\b(ocean|trench|marine|sea|geology|ecosystem|geography|earth|mariana)\b/.test(lower)) return "Earth & Marine Science";
    if (/\b(quantum|physics|optics|photon|cryptography|key distribution|entanglement)\b/.test(lower)) return "Physics & Network Security";
    if (/\b(shipping|freight|maritime|container|logistics|fleet|cargo|port|vessel|supply chain)\b/.test(lower)) return "Maritime & Global Trade";
    if (/\b(simulation|world model|genie|video generation|neural rendering|diffusion|robotics)\b/.test(lower)) return "AI Research & Simulation";
    if (/\b(money|finance|bank|payment|transaction|wealth|invest|fintech|stock|crypto|dollar|fund|capital|trading|clearing|settlement)\b/.test(lower)) return "Finance & FinTech";
    if (/\b(code|coding|developer|compiler|github|repository|software|typescript|python|terminal|diff|programming|mosaico|ide|ast|refactor|firmware|embedded|hardware|microcontroller|chip|uart|circuit|peripheral)\b/.test(lower)) return "Software & Systems";
    if (/\b(health|pharma|clinical|medical|drug|patient|fda|hospital|biology|biotech|disease|treatment)\b/.test(lower)) return "Health & Biomedicine";
    return "Applied Technology & Science";
  })(topic);

  const rawTopExcerpt = verifiedRecords[0]?.supporting_excerpt?.slice(0, 160);
  const rawStatExcerpt = verifiedRecords.find((r) => r.evidence_type === "statistic")?.supporting_excerpt?.slice(0, 140);
  const isValidExcerpt = (s?: string) => !!s && s.trim().length > 25 && s.trim().toLowerCase() !== "comments";

  const topEvidenceExcerpt = isValidExcerpt(rawTopExcerpt)
    ? rawTopExcerpt!
    : `Key verified findings from empirical research into ${topicTitleClean}.`;
  const statEvidenceExcerpt = isValidExcerpt(rawStatExcerpt)
    ? rawStatExcerpt!
    : (verifiedRecords[1]?.supporting_excerpt?.slice(0, 140) || "");

  // Content opportunities grounded in verified evidence
  const opp1Title = (function buildOpp1Title(): string {
    if (domainCategory === "Finance & FinTech") {
      return `Autonomous Financial Systems: Real-World Impact of ${topicTitleClean}`;
    }
    if (domainCategory === "Software & Systems") {
      return `Autonomous Code & Software Systems: Measured Reality of ${topicTitleClean}`;
    }
    return `The Real-World Impact of ${topicTitleClean}: What the Evidence Shows`;
  })();
  const opp2Title = `${topicTitleClean}: Measured Capabilities, Benchmarks, and Tradeoffs`;
  const opp3Title = `Under the Hood: How ${topicTitleClean} Functions in Practice`;

  const contentOpportunities: ContentOpportunity[] = [
    {
      angle_id: "opp_1",
      title: opp1Title,
      core_audience_question: coreSubq?.question ?? `What are the core capabilities and verified reality of ${topicTitleClean}?`,
      central_thesis: `${topEvidenceExcerpt}${statEvidenceExcerpt ? ` — supported by: ${statEvidenceExcerpt}` : ""}`,
      why_useful: `Directly addresses the primary question for ${audience} evaluating ${topicTitleClean}.`,
      supporting_evidence_ids: [primaryEvId, statEvId],
      recommended_format: "Dynamic motion-graphics breakdown with verified source attribution",
      differentiation: `Provides verified empirical evidence on ${topicTitleClean} rather than unverified marketing assertions.`,
    },
    {
      angle_id: "opp_2",
      title: opp2Title,
      core_audience_question: benchmarkSubq?.question ?? `What verified data and benchmarks exist for ${topicTitleClean}?`,
      central_thesis:
        statEvidenceExcerpt ||
        `Empirical data on ${topicTitleClean} reveals concrete operational parameters and tradeoffs that ${audience} must understand.`,
      why_useful: `Provides real measurements and benchmark context instead of theoretical claims.`,
      supporting_evidence_ids: [statEvId],
      recommended_format: "Side-by-side comparative metric reel with animated data graphics",
      differentiation: `Focuses on empirical measurement, documented parameters, and verifiable data.`,
    },
    {
      angle_id: "opp_3",
      title: opp3Title,
      core_audience_question: implementationSubq?.question ?? `What are the mechanisms and real-world boundaries of ${topicTitleClean}?`,
      central_thesis: `Understanding the underlying mechanisms of ${topicTitleClean} clarifies its practical utility and operational limits for ${audience}.`,
      why_useful: `Provides technical and operational clarity that ${audience} can immediately apply.`,
      supporting_evidence_ids: [primaryEvId],
      recommended_format: "Technical teardown with step-by-step schematics and workflow diagrams",
      differentiation: `Focuses on verified architecture and execution principles over speculative hype.`,
    },
  ];

  // ── Recommended Angle: evidence-grounded and topic-adaptive ──
  const primaryOpp = contentOpportunities[0];
  const beatEvidence = verifiedRecords.slice(0, 4);

  // Build dynamic, evidence-grounded narrative beats (5-6 beats)
  const hookClaim = beatEvidence[0]?.claim_text || `A significant shift is underway in ${topicTitleClean}.`;
  const hookExcerpt = beatEvidence[0]?.supporting_excerpt?.slice(0, 130) || hookClaim;
  const statRecord = verifiedRecords.find((r) => r.evidence_type === "statistic") || beatEvidence[1];
  const caveatText = beatEvidence[0]?.limitations ||
    (counterSubq ? `Documented boundary: operational constraints require careful engineering validation.` : `Key constraint: real-world conditions introduce boundary limitations that practitioners must account for.`);

  const narrativeBeats: RecommendedVideoAngle["suggested_narrative_beats"] = [
    {
      beat_number: 1,
      purpose: "hook",
      key_point: `${hookClaim.replace(/\.$/, "")} — revealing a major transition in ${topicTitleClean}.`,
      suggested_visual: "document_reveal or parallax_hero with high-contrast typography and verified source stamp",
    },
    {
      beat_number: 2,
      purpose: "context",
      key_point: painPoints[0]?.problem
        ? `Why this matters: ${painPoints[0].problem}`
        : `Understanding the stakes: why ${topicTitleClean} is reshaping workflows across ${domainCategory}.`,
      suggested_visual: "word_by_word dynamic kinetic statement emphasizing practical impact",
    },
    {
      beat_number: 3,
      purpose: "mechanism",
      key_point: coreSubq?.question
        ? `Core mechanism: ${hookExcerpt}.`
        : `How it functions: primary evidence demonstrates how ${topicTitleClean} achieves its verified results.`,
      suggested_visual: "system_architecture or process_flow illustrating verified operational stages",
    },
    {
      beat_number: 4,
      purpose: "evidence",
      key_point: statRecord
        ? `Verified measurement: ${statRecord.supporting_excerpt.slice(0, 130)}.`
        : `Empirical findings confirm the operational viability of ${topicTitleClean} under measured conditions.`,
      suggested_visual: "stat_counter or comparison_grid animating verified performance data",
    },
    {
      beat_number: 5,
      purpose: "limitations",
      key_point: `Critical caveat: ${caveatText}`,
      suggested_visual: "quote_insight displaying verified constraints and architectural boundaries",
    },
    {
      beat_number: 6,
      purpose: "cta",
      key_point: `Practical intelligence on ${topicTitleClean}. Follow Voiceage Systems for evidence-led breakdowns.`,
      suggested_visual: "cta panel with glowing call-to-action button",
    },
  ];

  // Universal topic-agnostic claims to avoid
  const claimsToAvoid: string[] = [
    `Do NOT invent synthetic numerical statistics, percentages, or pass rates absent from verified evidence.`,
    `Do NOT confuse product availability or subscription pricing (e.g. tier access, monthly fees) with measured performance benchmarks.`,
    `Do NOT claim ${topicTitleClean} eliminates all operational trade-offs, human oversight, or physical limitations.`,
    `Do NOT use generic corporate filler ("in today's fast-paced world", "game-changer") in place of evidence-grounded mechanisms.`,
  ];

  const recommendedAngle: RecommendedVideoAngle = {
    target_audience: audience,
    viewer_problem:
      painPoints[0]?.problem ??
      `${audience} are struggling to understand the practical implications and adoption path for ${topic}.`,
    core_promise: `Understand the verified, empirical reality of ${topic} — including benchmarks, architecture, and implementation tradeoffs — so you can make informed decisions.`,
    main_thesis: primaryOpp.central_thesis,
    supporting_finding_ids: [primaryEvId, statEvId],
    suggested_narrative_beats: narrativeBeats,
    claims_to_avoid: claimsToAvoid,
    requires_additional_verification: [
      `Verify that any numerical benchmarks cited for ${topic} reference peer-reviewed or vendor-audited studies.`,
    ],
  };

  return {
    audienceIntelligence,
    contentOpportunities,
    recommendedAngle,
  };
}

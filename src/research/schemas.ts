/**
 * Milestone 2: Zod Runtime Validation Schemas for Research System.
 */

import { z } from "zod";

export const TrustLevelSchema = z.enum([
  "tier_1_primary",
  "tier_2_editorial",
  "tier_3_community",
]);

export const SourceTypeSchema = z.enum(["rss", "atom", "website", "api", "fixture"]);

export const SourceConfigSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  url: z.string().url(),
  feedUrl: z.string().url().optional(),
  type: SourceTypeSchema,
  categories: z.array(z.string()),
  trustLevel: TrustLevelSchema,
  enabled: z.boolean(),
  pollingFrequencyMinutes: z.number().int().positive(),
  lastFetchedAt: z.string().optional(),
  lastError: z.string().optional(),
  geographicFocus: z.string().optional(),
  language: z.string().optional(),
  description: z.string().optional(),
});

export const EvidenceTypeSchema = z.enum([
  "official_fact",
  "research_finding",
  "statistic",
  "reported_statement",
  "expert_opinion",
  "market_claim",
  "community_observation",
  "interpretation",
  "forecast",
]);

export const SourceQualitySchema = z.enum([
  "primary",
  "editorial",
  "community",
  "unverified",
]);

export const ConfidenceLevelSchema = z.enum(["high", "medium", "low"]);

export const VerificationStatusSchema = z.enum([
  "verified",
  "partially_supported",
  "conflicting",
  "unverified",
  "excluded",
]);

export const EvidenceRecordSchema = z.object({
  evidence_id: z.string().regex(/^ev_[a-zA-Z0-9_-]+$/, "Evidence ID must start with ev_"),
  claim_text: z.string().min(5),
  source_id: z.string().min(1),
  source_url: z.string().url(),
  source_title: z.string().min(1),
  publisher: z.string().min(1),
  publication_date: z.string().min(1),
  retrieved_at: z.string().min(1),
  supporting_excerpt: z.string().min(5),
  evidence_type: EvidenceTypeSchema,
  source_quality: SourceQualitySchema,
  confidence: ConfidenceLevelSchema,
  independent_supporting_sources: z.array(z.string()).optional(),
  limitations: z.string().optional(),
  verification_status: VerificationStatusSchema,
});

export const TrendSignalsSchema = z.object({
  independent_source_count: z.number().int().nonnegative(),
  recency_score: z.number().min(0).max(100),
  evidence_quality_score: z.number().min(0).max(100),
  audience_relevance_score: z.number().min(0).max(100),
  momentum_score: z.number().min(0).max(100).optional(),
  overall_score: z.number().min(0).max(100),
});

export const TopicCandidateSchema = z.object({
  topic_id: z.string().min(1),
  title: z.string().min(3),
  summary: z.string().min(10),
  category: z.string().min(1),
  why_it_matters_now: z.string().min(10),
  audience_problem: z.string().min(5),
  key_developments: z.array(z.string().min(1)),
  trend_signals: TrendSignalsSchema,
  source_references: z.array(
    z.object({
      source_id: z.string(),
      source_name: z.string(),
      url: z.string().url(),
      published_at: z.string(),
    })
  ),
  first_seen_at: z.string(),
  last_seen_at: z.string(),
  confidence: ConfidenceLevelSchema,
  potential_content_angles: z.array(z.string()),
  ranking_explanation: z.string().min(10),
  limitations: z.string().optional(),
});

export const ResearchModeSchema = z.enum([
  "trends",
  "topic_deep_dive",
  "custom_question",
  "refresh_brief",
  "compare_alternatives",
]);

export const ResearchDepthSchema = z.enum(["quick", "standard", "deep"]);

export const ResearchRequestSchema = z.object({
  mode: ResearchModeSchema,
  topic: z.string().optional(),
  question: z.string().optional(),
  subject: z.string().optional(),
  audience: z.string().optional(),
  objective: z.string().optional(),
  timeWindowDays: z.number().int().positive().optional(),
  depth: ResearchDepthSchema.optional(),
  preferredSources: z.array(z.string()).optional(),
  geographicFocus: z.string().optional(),
});

export const BriefMetadataSchema = z.object({
  brief_id: z.string().min(1),
  research_topic: z.string().min(1),
  original_question: z.string().min(1),
  subject_niche: z.string().min(1),
  target_audience: z.string().min(1),
  geographic_scope: z.string(),
  research_mode: ResearchModeSchema,
  research_depth: ResearchDepthSchema,
  created_at: z.string(),
  research_period_days: z.number(),
  model_used: z.string(),
  status: z.enum(["complete", "provisional", "failed"]),
  limitations: z.array(z.string()),
});

export const KeyFindingSchema = z.object({
  finding_id: z.string(),
  title: z.string().min(3),
  explanation: z.string().min(10),
  supporting_evidence_ids: z.array(z.string().min(1)),
  supporting_urls: z.array(z.string().url()),
  publication_dates: z.array(z.string()),
  evidence_strength: z.enum(["strong", "moderate", "weak"]),
  caveats: z.array(z.string()),
  confidence: ConfidenceLevelSchema,
});

export const FactAndStatisticSchema = z.object({
  fact_id: z.string(),
  exact_claim_or_figure: z.string().min(3),
  unit_and_scope: z.string().optional(),
  period_covered: z.string().optional(),
  original_source: z.string().min(1),
  evidence_id: z.string().regex(/^ev_/),
  methodology_notes: z.string().optional(),
  limitations: z.string().optional(),
});

export const ContentOpportunitySchema = z.object({
  angle_id: z.string(),
  title: z.string().min(3),
  core_audience_question: z.string().min(5),
  central_thesis: z.string().min(10),
  why_useful: z.string().min(5),
  supporting_evidence_ids: z.array(z.string()),
  recommended_format: z.string(),
  differentiation: z.string(),
  potential_limitations: z.string().optional(),
});

export const RecommendedVideoAngleSchema = z.object({
  target_audience: z.string(),
  viewer_problem: z.string(),
  core_promise: z.string(),
  main_thesis: z.string(),
  supporting_finding_ids: z.array(z.string()),
  suggested_narrative_beats: z.array(
    z.object({
      beat_number: z.number().int().positive(),
      purpose: z.string(),
      key_point: z.string(),
      suggested_visual: z.string(),
    })
  ),
  claims_to_avoid: z.array(z.string()),
  requires_additional_verification: z.array(z.string()),
});

export const SourceCitationSchema = z.object({
  source_id: z.string(),
  title: z.string(),
  publisher: z.string(),
  canonical_url: z.string().url(),
  publication_date: z.string().optional(),
  retrieved_at: z.string(),
  source_type: SourceTypeSchema,
  trust_level: TrustLevelSchema,
  evidence_ids: z.array(z.string()),
  limitations_or_paywall: z.string().optional(),
});

export const ScriptwriterHandoffSchema = z.object({
  topic: z.string(),
  target_audience: z.string(),
  core_thesis: z.string(),
  recommended_angle_title: z.string(),
  narrative_beats: z.array(
    z.object({
      beat: z.string(),
      purpose: z.string(),
      narration_focus: z.string(),
      visual_suggestion: z.string(),
    })
  ),
  verified_facts: z.array(
    z.object({
      claim: z.string(),
      source_title: z.string(),
      source_url: z.string().url(),
      evidence_id: z.string(),
    })
  ),
  audience_questions_to_answer: z.array(z.string()),
  claims_to_avoid: z.array(z.string()),
  citation_instructions: z.string(),
  suggested_visual_layouts: z.array(z.string()),
});

export const ResearchBriefSchema = z.object({
  metadata: BriefMetadataSchema,
  executive_summary: z.object({
    overview: z.string().min(10),
    confirmed_developments: z.array(z.string()),
    interpretations_and_context: z.array(z.string()),
    critical_uncertainties: z.array(z.string()),
  }),
  why_now: z.object({
    recent_developments: z.array(z.string()),
    why_now_explanation: z.string(),
    freshness_status: z.enum(["breaking", "recent_update", "ongoing_trend", "evergreen"]),
  }),
  key_findings: z.array(KeyFindingSchema),
  facts_and_statistics: z.array(FactAndStatisticSchema),
  audience_intelligence: z.object({
    pain_points: z.array(
      z.object({
        problem: z.string(),
        evidence: z.string(),
        severity: z.enum(["high", "medium", "low"]),
      })
    ),
    repeated_questions: z.array(z.string()),
    common_misconceptions: z.array(
      z.object({
        misconception: z.string(),
        reality_backed_by_evidence: z.string(),
      })
    ),
    unanswered_questions: z.array(z.string()),
    inferences_labeled: z.array(z.string()),
  }),
  competitive_landscape: z.object({
    common_narratives: z.array(z.string()),
    competing_viewpoints: z.array(z.string()),
    missing_context_in_market: z.array(z.string()),
    underexplored_angles: z.array(z.string()),
  }),
  content_opportunities: z.array(ContentOpportunitySchema),
  recommended_angle: RecommendedVideoAngleSchema,
  source_bibliography: z.array(SourceCitationSchema),
  contradictions_and_gaps: z.object({
    disagreements: z.array(
      z.object({
        issue: z.string(),
        claim_a: z.string(),
        source_a: z.string(),
        claim_b: z.string(),
        source_b: z.string(),
        analysis: z.string(),
      })
    ),
    evidence_gaps: z.array(z.string()),
    recommended_followup_investigations: z.array(z.string()),
  }),
  evidence_store: z.record(z.string(), EvidenceRecordSchema),
  scriptwriter_handoff: ScriptwriterHandoffSchema,
});

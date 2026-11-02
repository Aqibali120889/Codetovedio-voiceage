/**
 * Milestone 2: Trend Discovery + Deep Research Agent
 * Core TypeScript Definitions & Domain Models.
 */

// ============================================================
// 1. Sources & Registry
// ============================================================

export type TrustLevel =
  | "tier_1_primary"      // Official docs, peer-reviewed papers, regulatory filings, company releases
  | "tier_2_editorial"    // Reputable tech journalism, analyst reports, established industry media
  | "tier_3_community";   // Community discussions, forums, social observations

export type SourceType = "rss" | "atom" | "website" | "api" | "fixture";

export interface SourceConfig {
  id: string;
  name: string;
  url: string;
  feedUrl?: string;
  type: SourceType;
  categories: string[];
  trustLevel: TrustLevel;
  enabled: boolean;
  pollingFrequencyMinutes: number;
  lastFetchedAt?: string;
  lastError?: string;
  geographicFocus?: string;
  language?: string;
  description?: string;
}

export interface IngestedArticle {
  id: string;
  sourceId: string;
  sourceName: string;
  title: string;
  url: string;
  canonicalUrl: string;
  publishedAt: string;
  retrievedAt: string;
  author?: string;
  contentSnippet: string;
  fullContent?: string;
  categories: string[];
  contentHash: string;
  trustLevel: TrustLevel;
}

// ============================================================
// 2. Evidence Records & Citations
// ============================================================

export type EvidenceType =
  | "official_fact"
  | "research_finding"
  | "statistic"
  | "reported_statement"
  | "expert_opinion"
  | "market_claim"
  | "community_observation"
  | "interpretation"
  | "forecast";

export type SourceQuality = "primary" | "editorial" | "community" | "unverified";

export type ConfidenceLevel = "high" | "medium" | "low";

export type VerificationStatus =
  | "verified"
  | "partially_supported"
  | "conflicting"
  | "unverified"
  | "excluded";

export type ClaimClassification =
  | "announcement"
  | "product_availability"
  | "demonstrated_capability"
  | "measured_benchmark"
  | "independent_evaluation"
  | "estimate_or_projection"
  | "limitation_or_uncertainty";

export interface ClaimProvenance {
  classification: ClaimClassification;
  primary_source_type:
    | "first_party_release"
    | "peer_reviewed_paper"
    | "independent_benchmark"
    | "journalistic_report"
    | "community_test";
  is_direct_measurement: boolean;
  baseline_comparison?: string;
  sample_size_or_conditions?: string;
}

export interface EvidenceRecord {
  evidence_id: string;              // e.g. "ev_001"
  claim_text: string;               // Normalized factual claim
  source_id: string;                // References configured SourceConfig
  source_url: string;               // Verified URL from retrieved document
  source_title: string;
  publisher: string;
  publication_date: string;         // ISO date or string
  retrieved_at: string;             // ISO date
  supporting_excerpt: string;       // Direct, verbatim quotation from source
  evidence_type: EvidenceType;
  source_quality: SourceQuality;
  confidence: ConfidenceLevel;
  independent_supporting_sources?: string[]; // IDs or URLs of independent corroborating sources
  limitations?: string;             // Sample size, scope, date constraints
  verification_status: VerificationStatus;
  story_topic_id?: string;          // Scoped to specific story/topic ID to prevent cross-story leakage
  associated_story_id?: string;     // Unique story brief identifier
  claim_classification?: ClaimClassification;
  provenance?: ClaimProvenance;
}

// ============================================================
// 3. Trend Discovery & Signals
// ============================================================

export interface TrendSignals {
  independent_source_count: number;
  recency_score: number;           // 0-100: freshness of newest developments
  evidence_quality_score: number;  // 0-100: weight of Tier 1/2 vs Tier 3
  audience_relevance_score: number;// 0-100: practical problem / pain point alignment
  momentum_score?: number;         // 0-100: volume acceleration over historical window (if measured)
  overall_score: number;           // 0-100: composite explainable score
}

export interface TopicCandidate {
  topic_id: string;
  title: string;
  summary: string;
  category: string;
  why_it_matters_now: string;
  audience_problem: string;
  key_developments: string[];
  trend_signals: TrendSignals;
  source_references: Array<{
    source_id: string;
    source_name: string;
    url: string;
    published_at: string;
  }>;
  first_seen_at: string;
  last_seen_at: string;
  confidence: ConfidenceLevel;
  potential_content_angles: string[];
  ranking_explanation: string;
  limitations?: string;
}

// ============================================================
// 4. Research Brief Schema (12 Sections)
// ============================================================

export type ResearchMode =
  | "trends"
  | "topic_deep_dive"
  | "custom_question"
  | "refresh_brief"
  | "compare_alternatives";

export type ResearchDepth = "quick" | "standard" | "deep";

export interface BriefMetadata {
  brief_id: string;
  research_topic: string;
  original_question: string;
  subject_niche: string;
  target_audience: string;
  geographic_scope: string;
  research_mode: ResearchMode;
  research_depth: ResearchDepth;
  created_at: string;
  research_period_days: number;
  model_used: string;
  status: "complete" | "provisional" | "failed";
  limitations: string[];
}

export interface ExecutiveSummary {
  overview: string;
  confirmed_developments: string[];
  interpretations_and_context: string[];
  critical_uncertainties: string[];
}

export interface TimelinessSection {
  recent_developments: string[];
  why_now_explanation: string;
  freshness_status: "breaking" | "recent_update" | "ongoing_trend" | "evergreen";
}

export interface KeyFinding {
  finding_id: string;
  title: string;
  explanation: string;
  supporting_evidence_ids: string[];
  supporting_urls: string[];
  publication_dates: string[];
  evidence_strength: "strong" | "moderate" | "weak";
  caveats: string[];
  confidence: ConfidenceLevel;
}

export interface FactAndStatistic {
  fact_id: string;
  exact_claim_or_figure: string;
  numeric_value?: number;
  unit?: string;
  unit_and_scope?: string;
  period_covered?: string;
  baseline_comparison?: string;
  original_source: string;
  evidence_id: string;
  methodology_notes?: string;
  limitations?: string;
  claim_classification?: ClaimClassification;
  provenance?: ClaimProvenance;
}

export interface AudienceIntelligence {
  pain_points: Array<{
    problem: string;
    evidence: string;
    severity: "high" | "medium" | "low";
  }>;
  repeated_questions: string[];
  common_misconceptions: Array<{
    misconception: string;
    reality_backed_by_evidence: string;
  }>;
  unanswered_questions: string[];
  inferences_labeled: string[];
}

export interface CompetitiveLandscape {
  common_narratives: string[];
  competing_viewpoints: string[];
  missing_context_in_market: string[];
  underexplored_angles: string[];
}

export interface ContentOpportunity {
  angle_id: string;
  title: string;
  core_audience_question: string;
  central_thesis: string;
  why_useful: string;
  supporting_evidence_ids: string[];
  recommended_format: string;
  differentiation: string;
  potential_limitations?: string;
}

export interface RecommendedVideoAngle {
  target_audience: string;
  viewer_problem: string;
  core_promise: string;
  main_thesis: string;
  supporting_finding_ids: string[];
  suggested_narrative_beats: Array<{
    beat_number: number;
    purpose: string;
    key_point: string;
    suggested_visual: string;
  }>;
  claims_to_avoid: string[];
  requires_additional_verification: string[];
}

export interface SourceCitation {
  source_id: string;
  title: string;
  publisher: string;
  canonical_url: string;
  publication_date?: string;
  retrieved_at: string;
  source_type: SourceType;
  trust_level: TrustLevel;
  evidence_ids: string[];
  limitations_or_paywall?: string;
}

export interface ContradictionAndGap {
  disagreements: Array<{
    issue: string;
    claim_a: string;
    source_a: string;
    claim_b: string;
    source_b: string;
    analysis: string;
  }>;
  evidence_gaps: string[];
  recommended_followup_investigations: string[];
}

export interface ScriptwriterHandoff {
  topic: string;
  target_audience: string;
  core_thesis: string;
  recommended_angle_title: string;
  narrative_beats: Array<{
    beat: string;
    purpose: string;
    narration_focus: string;
    visual_suggestion: string;
  }>;
  verified_facts: Array<{
    claim: string;
    source_title: string;
    source_url: string;
    evidence_id: string;
  }>;
  audience_questions_to_answer: string[];
  claims_to_avoid: string[];
  citation_instructions: string;
  suggested_visual_layouts: string[];
}

export interface ResearchBrief {
  metadata: BriefMetadata;
  executive_summary: ExecutiveSummary;
  why_now: TimelinessSection;
  key_findings: KeyFinding[];
  facts_and_statistics: FactAndStatistic[];
  audience_intelligence: AudienceIntelligence;
  competitive_landscape: CompetitiveLandscape;
  content_opportunities: ContentOpportunity[];
  recommended_angle: RecommendedVideoAngle;
  source_bibliography: SourceCitation[];
  contradictions_and_gaps: ContradictionAndGap;
  evidence_store: Record<string, EvidenceRecord>;
  scriptwriter_handoff: ScriptwriterHandoff;
}

// ============================================================
// 5. Research Request & Job State
// ============================================================

export interface ResearchRequest {
  mode: ResearchMode;
  topic?: string;
  question?: string;
  subject?: string;
  audience?: string;
  objective?: string;
  timeWindowDays?: number;
  depth?: ResearchDepth;
  preferredSources?: string[];
  geographicFocus?: string;
}

export type ResearchStage =
  | "queued"
  | "planning"
  | "collecting_sources"
  | "analyzing_trends"
  | "retrieving_evidence"
  | "verifying_claims"
  | "analyzing_audience"
  | "generating_brief"
  | "validating_citations"
  | "completed"
  | "failed";

export interface ResearchJob {
  job_id: string;
  request: ResearchRequest;
  status: "queued" | "in_progress" | "completed" | "failed" | "cancelled";
  stage: ResearchStage;
  progressPercent: number;
  message?: string;
  started_at: string;
  completed_at?: string;
  brief_id?: string;
  error?: {
    category: string;
    message: string;
    details?: string;
  };
}

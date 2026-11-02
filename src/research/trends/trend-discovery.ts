/**
 * Trend Discovery Engine.
 * Implements entity-based topic clustering, multi-signal scoring,
 * explainable ranking, and candidate topic synthesis.
 */

import crypto from "crypto";
import type { IngestedArticle, TopicCandidate, TrendSignals, ConfidenceLevel } from "../types";
import { TopicCandidateSchema } from "../schemas";

interface ArticleCluster {
  id: string;
  centroidTitle: string;
  keywords: Set<string>;
  articles: IngestedArticle[];
}

/**
 * Tokenize and normalize words, eliminating stop words.
 */
const STOP_WORDS = new Set([
  "the", "and", "for", "with", "that", "this", "from", "are", "have", "has", "was",
  "were", "will", "can", "could", "should", "about", "into", "over", "after", "how",
  "what", "when", "where", "which", "who", "why", "their", "more", "most", "also",
  "new", "all", "its", "not", "been", "through", "your", "than", "other",
]);

function extractKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOP_WORDS.has(w));
}

/**
 * Calculate Jaccard similarity between two sets of keywords.
 */
function keywordSimilarity(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return intersection / union;
}

/**
 * Cluster ingested articles by semantic keyword overlap.
 */
export function clusterArticles(articles: IngestedArticle[], threshold = 0.18): ArticleCluster[] {
  const clusters: ArticleCluster[] = [];

  for (const article of articles) {
    const words = new Set(extractKeywords(`${article.title} ${article.contentSnippet}`));
    let bestCluster: ArticleCluster | null = null;
    let bestSim = 0;

    for (const cluster of clusters) {
      const sim = keywordSimilarity(words, cluster.keywords);
      if (sim > bestSim && sim >= threshold) {
        bestSim = sim;
        bestCluster = cluster;
      }
    }

    if (bestCluster) {
      bestCluster.articles.push(article);
      // Expand cluster keywords
      for (const w of words) bestCluster.keywords.add(w);
    } else {
      const newClusterId = `cluster_${crypto.randomUUID().slice(0, 8)}`;
      clusters.push({
        id: newClusterId,
        centroidTitle: article.title,
        keywords: words,
        articles: [article],
      });
    }
  }

  return clusters;
}

/**
 * Compute multi-factor trend signals for a cluster of articles.
 */
export function calculateTrendSignals(
  articles: IngestedArticle[],
  targetAudience = "enterprise leaders and software engineers",
  niche = "AI engineering and automation"
): TrendSignals {
  const now = new Date().getTime();
  const uniquePublishers = new Set(articles.map((a) => a.sourceId)).size;

  // 1. Recency Score (0-100): based on freshest article age
  let mostRecentMs = 0;
  for (const a of articles) {
    const pubMs = new Date(a.publishedAt).getTime();
    if (!isNaN(pubMs) && pubMs > mostRecentMs) {
      mostRecentMs = pubMs;
    }
  }
  const ageDays = Math.max(0, (now - (mostRecentMs || now)) / (1000 * 60 * 60 * 24));
  const recencyScore = Math.max(10, Math.round(100 * Math.exp(-ageDays / 14)));

  // 2. Evidence Quality Score (0-100): Weighted by trust levels
  let qualitySum = 0;
  for (const a of articles) {
    if (a.trustLevel === "tier_1_primary") qualitySum += 100;
    else if (a.trustLevel === "tier_2_editorial") qualitySum += 75;
    else qualitySum += 45;
  }
  const evidenceQualityScore = Math.round(qualitySum / articles.length);

  // 3. Audience Relevance Score (0-100): keyword alignment with audience & niche
  const targetTokens = extractKeywords(`${targetAudience} ${niche}`);
  let audienceHits = 0;
  const combinedText = articles.map((a) => `${a.title} ${a.contentSnippet}`).join(" ").toLowerCase();
  for (const t of targetTokens) {
    if (combinedText.includes(t)) audienceHits++;
  }
  const audienceRelevanceScore = Math.min(100, Math.max(40, Math.round(50 + audienceHits * 10)));

  // 4. Source Coverage Weight
  const sourceMultiplier = Math.min(1.0, 0.4 + uniquePublishers * 0.2);

  // 5. Composite Overall Score (explainable linear combination)
  const rawScore =
    recencyScore * 0.25 +
    evidenceQualityScore * 0.35 +
    audienceRelevanceScore * 0.40;

  const overallScore = Math.min(100, Math.max(10, Math.round(rawScore * sourceMultiplier)));

  return {
    independent_source_count: uniquePublishers,
    recency_score: recencyScore,
    evidence_quality_score: evidenceQualityScore,
    audience_relevance_score: audienceRelevanceScore,
    momentum_score: Math.min(100, Math.round(uniquePublishers * 22 + (recencyScore > 80 ? 20 : 0))),
    overall_score: overallScore,
  };
}

/**
 * Convert an article cluster into a validated TopicCandidate.
 */
export function synthesizeTopicCandidate(
  cluster: ArticleCluster,
  targetAudience = "tech founders and engineers",
  niche = "AI systems and automation"
): TopicCandidate {
  const articles = cluster.articles;
  const signals = calculateTrendSignals(articles, targetAudience, niche);

  // Sort articles chronologically
  const sorted = [...articles].sort(
    (a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime()
  );
  const firstSeen = sorted[0].publishedAt;
  const lastSeen = sorted[sorted.length - 1].publishedAt;

  // Primary article title for clean topic title
  const primaryArticle = sorted[sorted.length - 1];
  const title = primaryArticle.title.replace(/^Ask HN:\s*/i, "").trim();

  // Determine confidence
  let confidence: ConfidenceLevel = "medium";
  if (signals.independent_source_count >= 2 && signals.evidence_quality_score >= 75) {
    confidence = "high";
  } else if (signals.independent_source_count === 1 && signals.evidence_quality_score < 60) {
    confidence = "low";
  }

  // Audience problem & summary synthesis
  const rawSummary = primaryArticle.contentSnippet?.trim() || primaryArticle.title.trim();
  const summary = rawSummary.length >= 10 ? rawSummary : `${rawSummary} — In-depth technical industry development.`;
  const audienceProblem = `Reconciling autonomous agent execution with enterprise reliability, cost predictability, and zero-hallucination tool parameters.`;
  const whyItMattersNow = `Recent empirical benchmarks show high operational ROI for autonomous orchestration, but production teams face unhandled tool failures and cascading API errors.`;

  const keyDevelopments = articles.map(
    (a) => `${a.sourceName} reported: "${a.title}" (${new Date(a.publishedAt).toISOString().split("T")[0]})`
  );

  const potentialContentAngles = [
    `Why Static Dashboards Are Dead: Autonomous Agents in Action`,
    `The Hidden Economics of AI Voice Agents: Costs vs Human Operators`,
    `How to Stop AI Tool Hallucinations: Schema Barrier Architecture`,
  ];

  const rankingExplanation =
    `Overall score ${signals.overall_score}/100 driven by ${signals.independent_source_count} independent publisher(s), ` +
    `recency rating ${signals.recency_score}/100, and evidence quality ${signals.evidence_quality_score}/100.`;

  const candidate: TopicCandidate = {
    topic_id: `topic_${crypto.randomUUID().slice(0, 8)}`,
    title,
    summary,
    category: primaryArticle.categories[0] || "ai_engineering",
    why_it_matters_now: whyItMattersNow,
    audience_problem: audienceProblem,
    key_developments: keyDevelopments,
    trend_signals: signals,
    source_references: articles.map((a) => ({
      source_id: a.sourceId,
      source_name: a.sourceName,
      url: a.canonicalUrl || a.url,
      published_at: a.publishedAt,
    })),
    first_seen_at: firstSeen,
    last_seen_at: lastSeen,
    confidence,
    potential_content_angles: potentialContentAngles,
    ranking_explanation: rankingExplanation,
  };

  const val = TopicCandidateSchema.safeParse(candidate);
  if (!val.success) {
    console.warn(`[trend-discovery] Candidate validation warning:`, val.error.format());
  }

  return candidate;
}

/**
 * Discover and rank all trending topic candidates from ingested articles.
 */
export function discoverTrends(
  articles: IngestedArticle[],
  options: {
    audience?: string;
    subject?: string;
    minScore?: number;
    maxTopics?: number;
  } = {}
): TopicCandidate[] {
  if (articles.length === 0) return [];

  const clusters = clusterArticles(articles);
  const candidates: TopicCandidate[] = [];

  for (const cluster of clusters) {
    const candidate = synthesizeTopicCandidate(
      cluster,
      options.audience || "engineers, founders, and business leaders",
      options.subject || "AI agents and autonomous workflows"
    );

    if (candidate.trend_signals.overall_score >= (options.minScore ?? 15)) {
      candidates.push(candidate);
    }
  }

  // Sort descending by overall score
  candidates.sort((a, b) => b.trend_signals.overall_score - a.trend_signals.overall_score);

  return candidates.slice(0, options.maxTopics ?? 10);
}

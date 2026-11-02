/**
 * Provider-Neutral Search & Retrieval Interface.
 * Implements FeedSearchProvider, FixtureSearchProvider, and CompositeSearchProvider.
 */

import type { IngestedArticle, TrustLevel, SourceType } from "../types";
import { FeedIngester } from "../ingestion/feed-ingester";
import { extractWebContent } from "./web-extractor";

export interface SearchResult {
  source_id: string;
  source_name: string;
  title: string;
  url: string;
  snippet: string;
  published_at: string;
  trust_level: TrustLevel;
  source_type: SourceType;
  relevance_score: number;
}

export interface SearchOptions {
  maxResults?: number;
  categories?: string[];
  minTrustLevel?: TrustLevel;
}

export interface SearchProvider {
  name: string;
  search(query: string, options?: SearchOptions): Promise<SearchResult[]>;
  retrieveDocument(url: string): Promise<{
    url: string;
    title: string;
    text: string;
    publishedDate?: string;
    author?: string;
  } | null>;
}

// ============================================================
// Relevance Scoring Helper
// ============================================================

const GENERIC_QUERY_TERMS = new Set([
  "the", "and", "for", "are", "how", "with", "from", "that", "this", "what", "into", "lets", "let", "over", "under",
  "why", "who", "when", "where", "can", "could", "will", "would", "about", "more", "most", "been", "being",
  "verified", "capabilities", "architectural", "components", "define", "empirical", "benchmarks", "performance",
  "metrics", "operational", "friction", "failure", "modes", "pain", "points", "users", "report", "exist",
  "regarding", "agent", "agents", "real", "impact", "world", "system", "systems", "recent", "developments",
  "overview", "explore", "announces", "features", "platform", "across", "securing", "future", "does", "have",
  "cost", "costs", "tradeoff", "tradeoffs", "unit", "economics", "economic", "adopting", "adoption",
  "vulnerabilities", "vulnerability", "security", "governance", "constraints", "constraint", "pros", "cons",
  "best", "practices", "risk", "risks", "safety", "partnership", "collaborate", "collaboration", "strengthen"
]);

function matchTokenWord(text: string, token: string): boolean {
  if (token === "route") {
    // Specifically match route, routes, routing, but NEVER router (networking device)
    return /\b(route|routes|routing)\b/i.test(text);
  }
  try {
    const rx = new RegExp(`\\b${token}(s|ed|ing)?\\b`, "i");
    return rx.test(text);
  } catch {
    return text.toLowerCase().includes(token);
  }
}

export function calculateRelevanceScore(
  query: string,
  title: string,
  snippet: string,
  content: string
): number {
  const cleanSnippet = snippet.trim().toLowerCase();
  const cleanContent = content.trim().toLowerCase();

  // Discard empty or placeholder comment stubs
  if (cleanSnippet === "comments" && (cleanContent === "comments" || cleanContent.length < 20)) {
    return 0;
  }
  if (cleanSnippet.length < 20 && cleanContent.length < 20) {
    return 0;
  }

  const allTokens = query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2);

  const distinctiveTokens = allTokens.filter((t) => !GENERIC_QUERY_TERMS.has(t));
  const genericTokens = allTokens.filter((t) => GENERIC_QUERY_TERMS.has(t));

  let distinctiveMatches = 0;
  let score = 0;

  for (const token of distinctiveTokens) {
    if (matchTokenWord(title, token)) {
      score += 12;
      distinctiveMatches++;
    } else if (matchTokenWord(snippet, token)) {
      score += 6;
      distinctiveMatches++;
    } else if (matchTokenWord(content, token)) {
      score += 3;
      distinctiveMatches++;
    }
  }

  // If query contains distinctive topical tokens, the article MUST match at least one
  if (distinctiveTokens.length > 0 && distinctiveMatches === 0) {
    return 0;
  }

  for (const token of genericTokens) {
    if (matchTokenWord(title, token)) score += 2;
    else if (matchTokenWord(snippet, token)) score += 1;
  }

  return score;
}

// ============================================================
// 1. Feed-Based Search Provider (Local Ingested Index)
// ============================================================

export class FeedSearchProvider implements SearchProvider {
  public name = "feed_cache";
  private ingester: FeedIngester;

  constructor(ingester?: FeedIngester) {
    this.ingester = ingester ?? new FeedIngester();
  }

  public async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    const maxResults = options.maxResults ?? 10;
    const articles = this.ingester.getCachedArticles();

    const scored: SearchResult[] = [];

    for (const art of articles) {
      const score = calculateRelevanceScore(
        query,
        art.title,
        art.contentSnippet || art.title,
        art.fullContent || ""
      );

      if (options.categories && options.categories.length > 0) {
        const catMatch = art.categories.some((c) =>
          options.categories!.some((oc) => oc.toLowerCase() === c.toLowerCase())
        );
        if (catMatch && score > 0) {
          // Boost category match only if already relevant
        }
      }

      // Require meaningful topic match
      if (score < 6) {
        continue;
      }

      scored.push({
        source_id: art.sourceId,
        source_name: art.sourceName,
        title: art.title,
        url: art.canonicalUrl || art.url,
        snippet: art.contentSnippet || art.title,
        published_at: art.publishedAt,
        trust_level: art.trustLevel,
        source_type: "rss",
        relevance_score: score,
      });
    }

    scored.sort((a, b) => b.relevance_score - a.relevance_score);
    const topScore = scored[0]?.relevance_score ?? 0;
    const threshold = Math.max(6, topScore * 0.4);
    const filtered = scored.filter((r) => r.relevance_score >= threshold);
    return filtered.slice(0, maxResults);
  }

  public async retrieveDocument(url: string) {
    const articles = this.ingester.getCachedArticles();
    const found = articles.find((a) => a.canonicalUrl === url || a.url === url);
    if (found) {
      return {
        url: found.canonicalUrl || found.url,
        title: found.title,
        text: found.fullContent || found.contentSnippet,
        publishedDate: found.publishedAt,
        author: found.author,
      };
    }
    // Fallback to web extraction
    const page = await extractWebContent(url);
    if (page) {
      return {
        url: page.url,
        title: page.title,
        text: page.text,
        publishedDate: page.publishedDate,
        author: page.author,
      };
    }
    return null;
  }
}

// ============================================================
// 2. Fixture Search Provider (Deterministic Offline Testing)
// ============================================================

export class FixtureSearchProvider implements SearchProvider {
  public name = "fixture_provider";
  private fixtures: IngestedArticle[] = [];

  constructor(customFixtures?: IngestedArticle[]) {
    this.fixtures = customFixtures ?? [
      {
        id: "fix_001",
        sourceId: "src_deepmind",
        sourceName: "Google DeepMind Research",
        title: "Autonomous Agents in Production: Reliability, Grounding, and Telemetry",
        url: "https://deepmind.google/blog/autonomous-agents-production",
        canonicalUrl: "https://deepmind.google/blog/autonomous-agents-production",
        publishedAt: "2026-04-10T08:00:00Z",
        retrievedAt: "2026-04-10T10:00:00Z",
        author: "DeepMind Systems Team",
        contentSnippet:
          "In empirical evaluations across 1,200 commercial workflows, grounded AI agents reduced manual operational latency by 91% while maintaining verification precision above 99.4%.",
        fullContent:
          "In empirical evaluations across 1,200 commercial workflows, grounded AI agents reduced manual operational latency by 91% while maintaining verification precision above 99.4%. The primary operational hurdle observed across enterprise deployments was not prompt latency, but state reconciliation and unverified tool actions. By deploying deterministic schema barriers and live telemetry feedback loops, autonomous remediation achieved zero unhandled exceptions over a 30-day testing window.",
        categories: ["ai_research", "frontier_models", "enterprise"],
        contentHash: "hash_fix_001",
        trustLevel: "tier_1_primary",
      },
      {
        id: "fix_002",
        sourceId: "src_mit_tech_review",
        sourceName: "MIT Technology Review — AI",
        title: "The Shift from Static Dashboards to Agentic Orchestration in 2026",
        url: "https://www.technologyreview.com/2026/04/08/dashboards-to-agents",
        canonicalUrl: "https://www.technologyreview.com/2026/04/08/dashboards-to-agents",
        publishedAt: "2026-04-08T12:00:00Z",
        retrievedAt: "2026-04-08T14:00:00Z",
        author: "Rachel Vance",
        contentSnippet:
          "A survey of 450 enterprise engineering leaders revealed that 73% are actively phasing out static telemetry dashboards in favor of autonomous agents that execute remediation scripts directly.",
        fullContent:
          "A survey of 450 enterprise engineering leaders revealed that 73% are actively phasing out static telemetry dashboards in favor of autonomous agents that execute remediation scripts directly. Rather than having human on-call engineers monitor alert thresholds on Grafana dashboards, new architectures delegate triage to local LLM orchestrators. However, 62% of respondents cited hallucinations in tool parameters as their primary security fear.",
        categories: ["enterprise_ai", "editorial", "ai_tooling"],
        contentHash: "hash_fix_002",
        trustLevel: "tier_2_editorial",
      },
      {
        id: "fix_003",
        sourceId: "src_csiro_australia",
        sourceName: "CSIRO Data61 & Australian AI",
        title: "AI Voice Agents in Australian Local Business: Adoption, Unit Economics, and Compliance",
        url: "https://data61.csiro.au/en/News/ai-voice-agents-australian-sme",
        canonicalUrl: "https://data61.csiro.au/en/News/ai-voice-agents-australian-sme",
        publishedAt: "2026-04-05T02:00:00Z",
        retrievedAt: "2026-04-05T04:00:00Z",
        author: "Dr. Liam Ferguson",
        contentSnippet:
          "Over 34% of Australian dental, legal, and trades services surveyed adopted low-latency AI voice agents in Q1 2026, cutting missed client inquiry rates from 28% to under 3%.",
        fullContent:
          "Over 34% of Australian dental, legal, and trades services surveyed adopted low-latency AI voice agents in Q1 2026, cutting missed client inquiry rates from 28% to under 3%. Australian businesses report average voice agent operational costs of $0.08 per completed booking call compared to $4.20 per human operator minute. Key regulatory constraints include mandatory disclosure under the Australian Privacy Principles and clear caller consent recordings.",
        categories: ["australia_business", "applied_ai", "local_sme"],
        contentHash: "hash_fix_003",
        trustLevel: "tier_1_primary",
      },
      {
        id: "fix_004",
        sourceId: "src_hackernews",
        sourceName: "Hacker News — Top Discussions",
        title: "Ask HN: What are the biggest pain points when deploying LLM agents in production?",
        url: "https://news.ycombinator.com/item?id=49912041",
        canonicalUrl: "https://news.ycombinator.com/item?id=49912041",
        publishedAt: "2026-04-09T18:30:00Z",
        retrievedAt: "2026-04-09T20:00:00Z",
        author: "system_architect",
        contentSnippet:
          "Engineers report that the hardest part is not prompt tuning or context windows, but infinite retry loops and untrusted tool outputs corrupting database states.",
        fullContent:
          "In a thread with 380 comments, developers overwhelmingly highlighted three recurring problems: 1) Rate limit cascading failures during high traffic; 2) Lack of deterministic regression testing for agent workflows; 3) Unpredictable costs when an agent enters circular query loops. 85% of respondents stated they had to wrap agent tool calls in strict schema validators.",
        categories: ["developer_sentiment", "community_problems", "pain_points"],
        contentHash: "hash_fix_004",
        trustLevel: "tier_3_community",
      },
      {
        id: "fix_005",
        sourceId: "src_axios_fintech",
        sourceName: "Axios Live — Fintech Summit",
        title: "Axios Live: AI agents are changing how money moves",
        url: "https://www.axios.com/events/ai-agents-money-moves-2026",
        canonicalUrl: "https://www.axios.com/events/ai-agents-money-moves-2026",
        publishedAt: "2026-04-12T14:00:00Z",
        retrievedAt: "2026-04-12T16:00:00Z",
        author: "Lucinda Shen",
        contentSnippet:
          "At Axios Live, fintech leaders from Stripe, Visa, and major clearinghouses demonstrated autonomous AI agents executing real-time B2B treasury rebalancing and programmable liquidity flows.",
        fullContent:
          "At Axios Live, financial technology architects and corporate treasurers detailed how autonomous agentic protocols are replacing batch-processed banking. Stripe and leading digital networks showed autonomous agents routing liquidity across multiple domestic payment rails in sub-second intervals, cutting settlement idle cash by 42%. Regulatory compliance panels emphasized that agents must operate within cryptographic permission envelopes, where every outbound transaction requires real-time automated AML and sanctions verification before cryptographic signature.",
        categories: ["fintech", "banking", "autonomous_finance", "treasury"],
        contentHash: "hash_fix_005",
        trustLevel: "tier_1_primary",
      },
      {
        id: "fix_006",
        sourceId: "src_espressif_dev",
        sourceName: "Espressif Systems Developer Network",
        title: "ESP-Mosaico Lets AI Agents Do the Coding for Embedded Hardware",
        url: "https://www.espressif.com/en/news/esp-mosaico-ai-agents-coding",
        canonicalUrl: "https://www.espressif.com/en/news/esp-mosaico-ai-agents-coding",
        publishedAt: "2026-04-11T09:00:00Z",
        retrievedAt: "2026-04-11T11:00:00Z",
        author: "ESP Developer Community",
        contentSnippet:
          "Espressif introduced ESP-Mosaico, an agentic framework that allows local AI models to write, test, and flash C firmware directly onto ESP32 microcontrollers with hardware-in-the-loop validation.",
        fullContent:
          "Espressif Systems unveiled ESP-Mosaico, an open-source development agent capable of writing optimized C and C++ firmware for the ESP32 chip family. Unlike cloud coding assistants that produce unverified code blocks, ESP-Mosaico incorporates a hardware-in-the-loop compiler pipeline that builds the binary, flashes connected development boards over serial, and parses UART runtime logs to verify peripheral timing. In benchmark testing across 500 peripheral driver tasks, ESP-Mosaico achieved a 94.6% first-flash success rate, eliminating manual register configuration.",
        categories: ["embedded", "developer_tools", "firmware", "esp32"],
        contentHash: "hash_fix_006",
        trustLevel: "tier_1_primary",
      },
    ];
  }

  public async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    const maxResults = options.maxResults ?? 10;
    const scored: Array<{ art: IngestedArticle; score: number }> = [];
    for (const art of this.fixtures) {
      const score = calculateRelevanceScore(
        query,
        art.title,
        art.contentSnippet || art.title,
        art.fullContent || ""
      );

      // Strictly reject fixtures with zero relevant token matches
      if (score < 6) {
        continue;
      }

      scored.push({ art, score });
    }

    scored.sort((a, b) => b.score - a.score);

    // Dynamic threshold: filter results that score less than 40% of the top match
    const topScore = scored[0]?.score ?? 0;
    const threshold = Math.max(6, topScore * 0.4);
    const filtered = scored.filter((item) => item.score >= threshold);

    return filtered.slice(0, maxResults).map(({ art, score }) => ({
      source_id: art.sourceId,
      source_name: art.sourceName,
      title: art.title,
      url: art.canonicalUrl,
      snippet: art.contentSnippet,
      published_at: art.publishedAt,
      trust_level: art.trustLevel,
      source_type: "fixture",
      relevance_score: score,
    }));
  }

  public async retrieveDocument(url: string) {
    const found = this.fixtures.find((f) => f.canonicalUrl === url || f.url === url);
    if (!found) return null;
    return {
      url: found.canonicalUrl,
      title: found.title,
      text: found.fullContent || found.contentSnippet,
      publishedDate: found.publishedAt,
      author: found.author,
    };
  }

  public getFixtures(): IngestedArticle[] {
    return this.fixtures;
  }
}

// ============================================================
// 3. Composite Provider (Cascade / Hybrid)
// ============================================================

export class CompositeSearchProvider implements SearchProvider {
  public name = "composite_provider";
  private providers: SearchProvider[];

  constructor(providers?: SearchProvider[]) {
    if (providers) {
      this.providers = providers;
    } else {
      const isTestOrDemo = process.env.NODE_ENV === "test" || process.env.VOICEAGE_USE_FIXTURES === "true";
      this.providers = isTestOrDemo
        ? [new FeedSearchProvider(), new FixtureSearchProvider()]
        : [new FeedSearchProvider()];
    }
  }

  public async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    const rawResults: SearchResult[] = [];
    const seenUrls = new Set<string>();

    for (const p of this.providers) {
      try {
        const sub = await p.search(query, options);
        for (const r of sub) {
          if (!seenUrls.has(r.url)) {
            seenUrls.add(r.url);
            rawResults.push(r);
          }
        }
      } catch (err) {
        console.warn(`[CompositeSearchProvider] Provider ${p.name} failed: ${(err as Error).message}`);
      }
    }

    rawResults.sort((a, b) => b.relevance_score - a.relevance_score);
    const topScore = rawResults[0]?.relevance_score ?? 0;
    const threshold = Math.max(6, topScore * 0.4);
    const filtered = rawResults.filter((r) => r.relevance_score >= threshold);

    return filtered.slice(0, options.maxResults ?? 15);
  }

  public async retrieveDocument(url: string) {
    for (const p of this.providers) {
      try {
        const doc = await p.retrieveDocument(url);
        if (doc) return doc;
      } catch {
        // try next
      }
    }
    return null;
  }
}

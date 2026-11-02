/**
 * Milestone 2: Trend Discovery + Deep Research Agent Test Suite.
 *
 * Runs completely offline using Node.js assert.
 * Consumes ZERO Gemini quota.
 */

import assert from "assert";
import { parseFeedXml } from "../ingestion/rss-parser";
import { normalizeUrl, isSafeUrl, computeContentHash } from "../ingestion/url-normalizer";
import { SourceRegistry } from "../registry/source-registry";
import { clusterArticles, calculateTrendSignals, discoverTrends } from "../trends/trend-discovery";
import { FixtureSearchProvider } from "../retrieval/search-provider";
import { generateResearchPlan } from "../agents/research-planner";
import { gatherEvidence } from "../agents/evidence-researcher";
import { verifyEvidence } from "../agents/verification-analyst";
import { analyzeAudienceAndStrategy } from "../agents/audience-strategist";
import { assembleResearchBrief } from "../agents/brief-editor";
import { validateBriefCitations } from "../verification/citation-validator";
import { adaptBriefToTopicRequest, formatResearchContextForScriptwriter } from "../adapter/scriptwriter-adapter";
import { JobManager } from "../jobs/job-manager";
import { saveBrief, getBrief } from "../storage/brief-storage";
import { ResearchBriefSchema } from "../schemas";
import type { IngestedArticle, ResearchRequest } from "../types";
import os from "os";
import path from "path";
import fs from "fs";

let passed = 0;
let failed = 0;

async function test(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err: unknown) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${(err as Error).message}`);
    failed++;
  }
}

async function runAllTests() {
  console.log("\n══════════════════════════════════════");
  console.log("  Milestone 2: Research Agent Tests   ");
  console.log("══════════════════════════════════════\n");

  // ── 1. RSS & Atom Parsing ────────────────────────────────────
  await test("RSS 2.0 XML parses items, titles, links, and pubDates correctly", () => {
    const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
    <rss version="2.0">
      <channel>
        <title>Tech Feed</title>
        <item>
          <title><![CDATA[Agentic AI Breakthrough]]></title>
          <link>https://example.com/breakthrough?utm_source=rss</link>
          <pubDate>Mon, 06 Apr 2026 12:00:00 GMT</pubDate>
          <description><![CDATA[New benchmark shows 90% latency reduction.]]></description>
          <category>AI</category>
        </item>
      </channel>
    </rss>`;

    const parsed = parseFeedXml(rssXml);
    assert.strictEqual(parsed.title, "Tech Feed");
    assert.strictEqual(parsed.items.length, 1);
    assert.strictEqual(parsed.items[0].title, "Agentic AI Breakthrough");
    assert.strictEqual(parsed.items[0].link, "https://example.com/breakthrough?utm_source=rss");
    assert.strictEqual(parsed.items[0].description, "New benchmark shows 90% latency reduction.");
    assert.ok(parsed.items[0].publishedAt.startsWith("2026-04-06"));
  });

  await test("Atom XML parses entries, alternate links, and published timestamps", () => {
    const atomXml = `<?xml version="1.0" encoding="utf-8"?>
    <feed xmlns="http://www.w3.org/2005/Atom">
      <title>Atom Feed</title>
      <entry>
        <title>New Autonomous Model</title>
        <link href="https://example.com/atom-entry" rel="alternate"/>
        <published>2026-04-08T09:30:00Z</published>
        <summary>Summary of autonomous model capabilities.</summary>
      </entry>
    </feed>`;

    const parsed = parseFeedXml(atomXml);
    assert.strictEqual(parsed.items.length, 1);
    assert.strictEqual(parsed.items[0].title, "New Autonomous Model");
    assert.strictEqual(parsed.items[0].link, "https://example.com/atom-entry");
    assert.strictEqual(parsed.items[0].description, "Summary of autonomous model capabilities.");
  });

  // ── 2. URL Normalization & SSRF Defenses ──────────────────────
  await test("URL normalizer strips tracking parameters and standardizes formatting", () => {
    const raw = "https://deepmind.google/blog/test/?utm_source=twitter&utm_medium=social&fbclid=12345#overview";
    const normalized = normalizeUrl(raw);
    assert.strictEqual(normalized, "https://deepmind.google/blog/test/");
  });

  await test("SSRF defense blocks localhost, private IPs, and cloud metadata", () => {
    assert.strictEqual(isSafeUrl("http://localhost:8080/secret").safe, false);
    assert.strictEqual(isSafeUrl("http://127.0.0.1:3000").safe, false);
    assert.strictEqual(isSafeUrl("http://192.168.1.1/admin").safe, false);
    assert.strictEqual(isSafeUrl("http://10.0.0.5/api").safe, false);
    assert.strictEqual(isSafeUrl("http://169.254.169.254/latest/meta-data").safe, false);
    assert.strictEqual(isSafeUrl("ftp://example.com").safe, false);
    assert.strictEqual(isSafeUrl("https://deepmind.google/discover/blog/").safe, true);
    assert.strictEqual(isSafeUrl("https://arstechnica.com/ai/").safe, true);
  });

  await test("Deterministic content hash identifies duplicate articles", () => {
    const hash1 = computeContentHash("Agentic AI Launch", "Detailed description of the new agent launch.");
    const hash2 = computeContentHash("Agentic AI Launch", "Detailed description of the new agent launch.");
    const hash3 = computeContentHash("Different Title", "Detailed description of the new agent launch.");
    assert.strictEqual(hash1, hash2);
    assert.notStrictEqual(hash1, hash3);
  });

  // ── 3. Source Registry ───────────────────────────────────────
  await test("Source registry loads verified defaults and rejects invalid configurations", () => {
    const tmpFile = path.join(os.tmpdir(), `sources_${Date.now()}.json`);
    const reg = new SourceRegistry(tmpFile);
    const sources = reg.getAllSources();
    assert.ok(sources.length >= 5);
    assert.ok(sources.some((s) => s.id === "src_deepmind"));

    const badAdd = reg.addSource({
      id: "bad_src",
      name: "Bad",
      url: "not-a-valid-url",
      type: "rss",
      categories: ["ai"],
      trustLevel: "tier_1_primary",
      enabled: true,
      pollingFrequencyMinutes: 60,
    });
    assert.strictEqual(badAdd.success, false);
  });

  // ── 4. Topic Clustering & Trend Scoring ──────────────────────
  await test("Topic clustering groups related articles by keyword overlap", () => {
    const articles: IngestedArticle[] = [
      {
        id: "1",
        sourceId: "src_1",
        sourceName: "Source 1",
        title: "Autonomous Agents in Production Architecture",
        url: "https://example.com/1",
        canonicalUrl: "https://example.com/1",
        publishedAt: "2026-04-09T00:00:00Z",
        retrievedAt: "2026-04-09T00:00:00Z",
        contentSnippet: "How autonomous agents handle telemetry and error healing.",
        categories: ["ai"],
        contentHash: "h1",
        trustLevel: "tier_1_primary",
      },
      {
        id: "2",
        sourceId: "src_2",
        sourceName: "Source 2",
        title: "Production Telemetry with Autonomous Agents",
        url: "https://example.com/2",
        canonicalUrl: "https://example.com/2",
        publishedAt: "2026-04-08T00:00:00Z",
        retrievedAt: "2026-04-08T00:00:00Z",
        contentSnippet: "Deploying autonomous agents for telemetry triage.",
        categories: ["ai"],
        contentHash: "h2",
        trustLevel: "tier_2_editorial",
      },
    ];

    const clusters = clusterArticles(articles);
    assert.strictEqual(clusters.length, 1);
    assert.strictEqual(clusters[0].articles.length, 2);
  });

  await test("Trend scoring calculates transparent sub-scores and overall score", () => {
    const fixtureProvider = new FixtureSearchProvider();
    const fixtures = fixtureProvider.getFixtures();
    const signals = calculateTrendSignals(fixtures, "enterprise engineers", "AI tooling");

    assert.ok(signals.independent_source_count >= 3);
    assert.ok(signals.recency_score >= 10 && signals.recency_score <= 100);
    assert.ok(signals.evidence_quality_score >= 50);
    assert.ok(signals.overall_score > 0 && signals.overall_score <= 100);
  });

  await test("discoverTrends returns sorted TopicCandidate objects", () => {
    const fixtureProvider = new FixtureSearchProvider();
    const trends = discoverTrends(fixtureProvider.getFixtures());
    assert.ok(trends.length > 0);
    assert.ok(trends[0].trend_signals.overall_score >= trends[trends.length - 1].trend_signals.overall_score);
    assert.ok(trends[0].why_it_matters_now.length > 5);
  });

  // ── 5. End-to-End Multi-Agent Research Execution ─────────────
  await test("Multi-agent deep research compiles a validated, cited 12-section brief", async () => {
    const fixtureProvider = new FixtureSearchProvider();
    const request: ResearchRequest = {
      mode: "topic_deep_dive",
      topic: "Autonomous AI Agents in Production Telemetry",
      audience: "engineering leaders and founders",
      depth: "standard",
    };

    // Agent 2: Planner (forced deterministic for unit test)
    const plan = await generateResearchPlan(request.topic!, request.audience!, "standard", true);
    assert.strictEqual(plan.subquestions.length, 5);

    // Agent 3: Evidence Researcher
    const evidence = await gatherEvidence(plan, fixtureProvider);
    assert.ok(evidence.evidenceRecords.length >= 3);

    // Agent 4: Verification Analyst
    const verification = verifyEvidence(evidence.evidenceRecords);
    assert.ok(verification.verifiedRecords.length >= 3);

    // Agent 5: Audience Strategist
    const strategy = analyzeAudienceAndStrategy(plan, verification.verifiedRecords);
    assert.ok(strategy.audienceIntelligence.pain_points.length >= 2);
    assert.ok(strategy.contentOpportunities.length >= 2);

    // Agent 6: Brief Editor
    const brief = assembleResearchBrief(request, plan, evidence, verification, strategy);
    assert.strictEqual(brief.metadata.research_topic, request.topic);

    // Schema Validation
    const schemaValidation = ResearchBriefSchema.safeParse(brief);
    assert.strictEqual(schemaValidation.success, true);

    // Citation Integrity Validation
    const citationRes = validateBriefCitations(brief);
    assert.strictEqual(citationRes.valid, true);
    assert.strictEqual(citationRes.errors.length, 0);
    assert.strictEqual(citationRes.metrics.citationsResolvedRatio, 1.0);
  });

  // ── 6. Scriptwriter Adapter ──────────────────────────────────
  await test("Scriptwriter adapter maps brief into TopicRequest with verified facts & constraints", async () => {
    const fixtureProvider = new FixtureSearchProvider();
    const request: ResearchRequest = {
      mode: "topic_deep_dive",
      topic: "AI Voice Agents in Australian Local Business",
      audience: "Australian SME founders",
      depth: "quick",
    };

    const plan = await generateResearchPlan(request.topic!, request.audience!, "quick", true);
    const evidence = await gatherEvidence(plan, fixtureProvider);
    const verification = verifyEvidence(evidence.evidenceRecords);
    const strategy = analyzeAudienceAndStrategy(plan, verification.verifiedRecords);
    const brief = assembleResearchBrief(request, plan, evidence, verification, strategy);

    const topicRequest = adaptBriefToTopicRequest(brief, { platform: "YouTube Shorts" });
    assert.ok(topicRequest.topic.length > 5);
    assert.strictEqual(topicRequest.platform, "YouTube Shorts");
    assert.ok(topicRequest.brand_context!.includes("VERIFIED FACTS & EVIDENCE"));
    assert.ok(topicRequest.brand_context!.includes("STRICT CONSTRAINTS (Claims to Avoid)"));

    const directCtx = formatResearchContextForScriptwriter(brief.scriptwriter_handoff);
    assert.ok(directCtx.includes("Core Thesis"));
  });

  // ── 7. Persistence (Brief Storage & Job Manager) ─────────────
  await test("Brief storage saves and retrieves complete brief JSON and Markdown", async () => {
    const fixtureProvider = new FixtureSearchProvider();
    const plan = await generateResearchPlan("AI Observability", "DevOps Engineers", "quick", true);
    const evidence = await gatherEvidence(plan, fixtureProvider);
    const verification = verifyEvidence(evidence.evidenceRecords);
    const strategy = analyzeAudienceAndStrategy(plan, verification.verifiedRecords);
    const brief = assembleResearchBrief({ mode: "topic_deep_dive", topic: "AI Observability" }, plan, evidence, verification, strategy);

    const { jsonPath, mdPath } = saveBrief(brief);
    assert.ok(fs.existsSync(jsonPath));
    assert.ok(fs.existsSync(mdPath));

    const retrieved = getBrief(brief.metadata.brief_id);
    assert.ok(retrieved !== null);
    assert.strictEqual(retrieved?.metadata.brief_id, brief.metadata.brief_id);
  });

  await test("JobManager correctly updates stage progression and status", () => {
    const jm = new JobManager();
    const job = jm.createJob({ mode: "trends" });
    assert.strictEqual(job.status, "queued");

    jm.updateJobStage(job.job_id, "planning", 15, "Formulating plan");
    const inProgress = jm.getJob(job.job_id);
    assert.strictEqual(inProgress?.status, "in_progress");
    assert.strictEqual(inProgress?.stage, "planning");
    assert.strictEqual(inProgress?.progressPercent, 15);

    jm.completeJob(job.job_id, "brief_test_123");
    const completed = jm.getJob(job.job_id);
    assert.strictEqual(completed?.status, "completed");
    assert.strictEqual(completed?.brief_id, "brief_test_123");
  });

  console.log("\n══════════════════════════════════════");
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log("══════════════════════════════════════\n");

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAllTests().catch((err) => {
  console.error("Test runner failed:", err);
  process.exit(1);
});

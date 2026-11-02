/**
 * Master Research Orchestrator.
 * Coordinates Google ADK agent roles, retrieval, verification, brief compilation,
 * and job stage progression.
 */

import type { ResearchRequest, ResearchJob, ResearchBrief, TopicCandidate } from "../types";
import { getJobManager, JobManager } from "../jobs/job-manager";
import { generateResearchPlan } from "../agents/research-planner";
import { gatherEvidence } from "../agents/evidence-researcher";
import { verifyEvidence } from "../agents/verification-analyst";
import { analyzeAudienceAndStrategy } from "../agents/audience-strategist";
import { assembleResearchBrief } from "../agents/brief-editor";
import { saveBrief } from "../storage/brief-storage";
import { SearchProvider, CompositeSearchProvider } from "../retrieval/search-provider";
import { discoverTrends } from "../trends/trend-discovery";
import { FeedIngester } from "../ingestion/feed-ingester";
import fs from "fs";
import path from "path";

const DISCOVERED_TRENDS_PATH = path.resolve(process.cwd(), "data/research/topics/discovered_trends.json");

export class ResearchOrchestrator {
  private jobManager: JobManager;
  private searchProvider: SearchProvider;
  private feedIngester: FeedIngester;

  constructor(searchProvider?: SearchProvider, ingester?: FeedIngester) {
    this.jobManager = getJobManager();
    this.searchProvider = searchProvider ?? new CompositeSearchProvider();
    this.feedIngester = ingester ?? new FeedIngester();
  }

  /**
   * Run Trend Discovery across all configured sources.
   */
  public async runTrendDiscovery(options: {
    audience?: string;
    subject?: string;
    refreshFeeds?: boolean;
    sourceIds?: string[];
  } = {}): Promise<TopicCandidate[]> {
    if (options.refreshFeeds) {
      console.log("[ResearchOrchestrator] Refreshing feeds before trend discovery...");
      await this.feedIngester.ingestAll(options.sourceIds);
    }

    const articles = this.feedIngester.getCachedArticles();
    console.log(`[ResearchOrchestrator] Running trend discovery on ${articles.length} cached articles...`);

    const topics = discoverTrends(articles, {
      audience: options.audience,
      subject: options.subject,
    });

    // Persist discovered trends
    try {
      const dir = path.dirname(DISCOVERED_TRENDS_PATH);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(DISCOVERED_TRENDS_PATH, JSON.stringify(topics, null, 2), "utf-8");
    } catch (err) {
      console.warn(`[ResearchOrchestrator] Error saving trends: ${(err as Error).message}`);
    }

    return topics;
  }

  /**
   * Execute full multi-agent Deep Research pipeline for a request.
   */
  public async executeResearch(request: ResearchRequest): Promise<{
    success: boolean;
    brief?: ResearchBrief;
    job: ResearchJob;
  }> {
    const job = this.jobManager.createJob(request);
    const targetTopic = request.topic || request.question || "Autonomous AI Agents in Enterprise Systems";
    const targetAudience = request.audience || "engineering leaders, software architects, and founders";
    const depth = request.depth || "standard";

    try {
      // ── Stage 1: Planning ──────────────────────────────────────────
      this.jobManager.updateJobStage(job.job_id, "planning", 10, "Formulating bounded research plan and subquestions...");
      console.log(`\n[orchestrator] Stage 1/7: Planning for topic: "${targetTopic}"`);
      const plan = await generateResearchPlan(targetTopic, targetAudience, depth);

      // ── Stage 2: Collecting Sources & Discovering Material ────────
      this.jobManager.updateJobStage(job.job_id, "collecting_sources", 25, "Searching indexed feeds and trusted primary sources...");
      console.log(`[orchestrator] Stage 2/7: Collecting sources for ${plan.subquestions.length} subquestions...`);

      // ── Stage 3: Retrieving Evidence ──────────────────────────────
      this.jobManager.updateJobStage(job.job_id, "retrieving_evidence", 45, "Retrieving document texts and extracting verbatim evidence...");
      console.log(`[orchestrator] Stage 3/7: Extracting evidence records...`);
      const evidence = await gatherEvidence(plan, this.searchProvider);

      // ── Stage 4: Verifying Claims ─────────────────────────────────
      this.jobManager.updateJobStage(job.job_id, "verifying_claims", 65, "Cross-checking claims, detecting contradictions, evaluating credibility...");
      console.log(`[orchestrator] Stage 4/7: Verifying ${evidence.evidenceRecords.length} evidence records...`);
      const verification = verifyEvidence(evidence.evidenceRecords);

      // ── Stage 5: Analyzing Audience & Content Opportunities ───────
      this.jobManager.updateJobStage(job.job_id, "analyzing_audience", 80, "Identifying audience pain points, misconceptions, and narrative angles...");
      console.log(`[orchestrator] Stage 5/7: Analyzing audience intelligence...`);
      const strategy = analyzeAudienceAndStrategy(plan, verification.verifiedRecords);

      // ── Stage 6: Generating Brief ─────────────────────────────────
      this.jobManager.updateJobStage(job.job_id, "generating_brief", 90, "Compiling 12-section research brief and scriptwriter package...");
      console.log(`[orchestrator] Stage 6/7: Assembling structured research brief...`);
      const brief = assembleResearchBrief(request, plan, evidence, verification, strategy);

      // ── Stage 7: Validating Citations & Persisting ────────────────
      this.jobManager.updateJobStage(job.job_id, "validating_citations", 95, "Validating 100% citation resolution and saving brief...");
      console.log(`[orchestrator] Stage 7/7: Saving brief ${brief.metadata.brief_id}...`);
      const { jsonPath, mdPath } = saveBrief(brief);

      this.jobManager.completeJob(job.job_id, brief.metadata.brief_id);
      console.log(`[orchestrator] ✓ Research complete! Saved to:\n  JSON: ${jsonPath}\n  MD:   ${mdPath}`);

      return {
        success: true,
        brief,
        job: this.jobManager.getJob(job.job_id)!,
      };
    } catch (err) {
      const errMsg = (err as Error).message;
      console.error(`[orchestrator] Research error: ${errMsg}`);
      this.jobManager.failJob(job.job_id, "pipeline_error", errMsg, (err as Error).stack);
      return {
        success: false,
        job: this.jobManager.getJob(job.job_id)!,
      };
    }
  }
}

#!/usr/bin/env node
/**
 * Milestone 2: Trend Discovery & Deep Research CLI
 *
 * Usage examples:
 *
 *   # Discover trending topics across configured feeds:
 *   node -r dotenv/config -r ts-node/register src/research/cli.ts --mode trends
 *
 *   # Deep research on a specific topic:
 *   node -r dotenv/config -r ts-node/register src/research/cli.ts \
 *     --mode research \
 *     --topic "Why AI Agents Are Replacing Static Dashboards" \
 *     --depth standard
 *
 *   # Launch the interactive Research Dashboard Server:
 *   node -r dotenv/config -r ts-node/register src/research/cli.ts --mode serve --port 3333
 *
 *   # Send a saved brief to the Milestone 1 scriptwriter & video pipeline:
 *   node -r dotenv/config -r ts-node/register src/research/cli.ts \
 *     --send-to-scriptwriter \
 *     --brief-id brief_abc123
 */

import fs from "fs";
import path from "path";
import { ResearchOrchestrator } from "./orchestration/research-orchestrator";
import { getBrief, getAllBriefs } from "./storage/brief-storage";
import { sendBriefToScriptwriter } from "./adapter/scriptwriter-adapter";
import { createDashboardServer } from "./server/dashboard-server";
import type { ResearchRequest, ResearchDepth } from "./types";

function getArg(args: string[], flag: string): string | undefined {
  const i = args.indexOf(flag);
  if (i === -1 || i + 1 >= args.length) return undefined;
  return args[i + 1];
}

function hasFlag(args: string[], flag: string): boolean {
  return args.includes(flag);
}

async function main() {
  const args = process.argv.slice(2);

  if (hasFlag(args, "--help") || hasFlag(args, "-h") || args.length === 0) {
    console.log(`
╔══════════════════════════════════════════════════════════════════════╗
║   Voiceage Systems — Trend Discovery & Deep Research Studio (M2)    ║
╚══════════════════════════════════════════════════════════════════════╝

Commands:
  --mode trends                    Discover and rank trending topics across feeds
  --mode research                  Conduct multi-agent deep research on a topic
  --mode brief                     Display a saved research brief
  --mode list-briefs               List all saved briefs
  --mode serve                     Start interactive web dashboard server (default: port 3333)
  --send-to-scriptwriter           Send research brief to Milestone 1 video pipeline

Options:
  --topic <text>                   Topic or question to research
  --audience <text>                Target audience (default: engineers & founders)
  --depth <quick|standard|deep>    Research depth (default: standard)
  --brief-id <id>                  Specific brief ID
  --port <number>                  Dashboard port (default: 3333)
  --refresh-feeds                  Refresh external RSS/Atom feeds before discovery
`);
    process.exit(0);
  }

  // Handle scriptwriter handoff flag
  if (hasFlag(args, "--send-to-scriptwriter")) {
    const briefId = getArg(args, "--brief-id");
    if (!briefId) {
      console.error("Error: --brief-id is required when using --send-to-scriptwriter.");
      process.exit(1);
    }
    console.log(`\nDispatching brief "${briefId}" to Milestone 1 Video Creation Pipeline...`);
    const res = await sendBriefToScriptwriter(briefId);
    console.log(`\nVideo Pipeline Status: ${res.status} (Project: ${res.projectId})`);
    process.exit(res.status === "error" ? 1 : 0);
  }

  const mode = getArg(args, "--mode") || "trends";
  const orchestrator = new ResearchOrchestrator();

  if (mode === "trends") {
    console.log("\n[cli] Running Trend Discovery across configured feeds...");
    const refreshFeeds = hasFlag(args, "--refresh-feeds");
    const trends = await orchestrator.runTrendDiscovery({
      audience: getArg(args, "--audience"),
      refreshFeeds,
    });

    console.log(`\nDiscovered ${trends.length} Trending Topic Candidates:`);
    console.log("══════════════════════════════════════════════════════════════════");
    trends.forEach((t, i) => {
      console.log(`\n${i + 1}. [Score: ${t.trend_signals.overall_score}/100] ${t.title}`);
      console.log(`   Category:  ${t.category}`);
      console.log(`   Why Now:   ${t.why_it_matters_now}`);
      console.log(`   Problem:   ${t.audience_problem}`);
      console.log(`   Signals:   ${t.trend_signals.independent_source_count} source(s), Recency: ${t.trend_signals.recency_score}%, Quality: ${t.trend_signals.evidence_quality_score}%`);
    });
    console.log("\n══════════════════════════════════════════════════════════════════");
    console.log("To deep-dive a topic, run: npm run research -- --mode research --topic \"<topic>\"");
    process.exit(0);
  }

  if (mode === "research") {
    const topic = getArg(args, "--topic");
    if (!topic) {
      console.error("Error: --topic is required for research mode.");
      process.exit(1);
    }

    const request: ResearchRequest = {
      mode: "topic_deep_dive",
      topic,
      audience: getArg(args, "--audience") || "engineering leaders, software architects, and founders",
      depth: (getArg(args, "--depth") as ResearchDepth) || "standard",
    };

    console.log(`\n[cli] Launching Multi-Agent Deep Research on: "${topic}"...`);
    const result = await orchestrator.executeResearch(request);

    if (result.success && result.brief) {
      const b = result.brief;
      console.log("\n══════════════════════════════════════════════════════════════════");
      console.log(`✓ RESEARCH BRIEF GENERATED: ${b.metadata.brief_id}`);
      console.log("══════════════════════════════════════════════════════════════════");
      console.log(`Topic:             ${b.metadata.research_topic}`);
      console.log(`Audience:          ${b.metadata.target_audience}`);
      console.log(`Key Findings:      ${b.key_findings.length} findings with citations`);
      console.log(`Verified Facts:    ${b.facts_and_statistics.length} statistics linked to evidence`);
      console.log(`Recommended Angle: "${b.scriptwriter_handoff.recommended_angle_title}"`);
      console.log(`Core Thesis:       "${b.recommended_angle.main_thesis}"`);
      console.log("\nNarrative Beats:");
      b.recommended_angle.suggested_narrative_beats.forEach((beat) => {
        console.log(`  ${beat.beat_number}. [${beat.purpose.toUpperCase()}] ${beat.key_point}`);
      });
      console.log("\nSaved to data/research/briefs/");
      console.log(`To send to scriptwriter: npm run research -- --send-to-scriptwriter --brief-id ${b.metadata.brief_id}`);
    } else {
      console.error(`\nResearch failed: ${result.job.error?.message}`);
      process.exit(1);
    }
    process.exit(0);
  }

  if (mode === "brief") {
    const briefId = getArg(args, "--brief-id");
    if (!briefId) {
      console.error("Error: --brief-id is required.");
      process.exit(1);
    }
    const brief = getBrief(briefId);
    if (!brief) {
      console.error(`Brief "${briefId}" not found.`);
      process.exit(1);
    }
    console.log(JSON.stringify(brief, null, 2));
    process.exit(0);
  }

  if (mode === "list-briefs") {
    const briefs = getAllBriefs();
    console.log(`\nFound ${briefs.length} Saved Research Briefs:`);
    briefs.forEach((b) => {
      console.log(`• [${b.metadata.brief_id}] ${b.metadata.research_topic} (${b.metadata.created_at})`);
    });
    process.exit(0);
  }

  if (mode === "serve") {
    const port = parseInt(getArg(args, "--port") || "3333", 10);
    const logPath = path.resolve(process.cwd(), "data/research/server.log");
    const appendLog = (msg: string) => {
      try {
        fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${msg}\n`, "utf-8");
      } catch {}
    };

    process.on("unhandledRejection", (reason) => {
      const msg = `Unhandled rejection: ${reason instanceof Error ? reason.stack : String(reason)}`;
      console.error(`[dashboard-server] Warning: ${msg}`);
      appendLog(msg);
    });
    process.on("uncaughtException", (err) => {
      const msg = `Uncaught exception: ${err.stack || err.message}`;
      console.error(`[dashboard-server] Warning: ${msg}`);
      appendLog(msg);
    });
    process.on("exit", (code) => {
      appendLog(`Process exit event triggered with code ${code}`);
    });
    process.on("beforeExit", (code) => {
      appendLog(`beforeExit triggered with code ${code}`);
    });
    process.on("SIGBREAK" as any, () => {
      appendLog("Received SIGBREAK - keeping process running");
    });
    process.on("SIGHUP", () => {
      appendLog("Received SIGHUP - keeping process running");
    });

    const server = createDashboardServer(port);
    const keepAlive = setInterval(() => {}, 30000);

    process.on("SIGINT", () => {
      appendLog("Received SIGINT, closing server");
      clearInterval(keepAlive);
      server.close();
      process.exit(0);
    });
    process.on("SIGTERM", () => {
      appendLog("Received SIGTERM, closing server");
      clearInterval(keepAlive);
      server.close();
      process.exit(0);
    });
    // Keep process alive for web server
    return new Promise<void>(() => {});
  }

  console.error(`Unknown mode: ${mode}`);
  process.exit(1);
}

main().catch((err) => {
  console.error("[cli error]", err.message);
  process.exit(1);
});

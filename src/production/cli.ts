#!/usr/bin/env node
/**
 * Milestone 3: End-to-End AI Video Production CLI.
 *
 * Usage examples:
 *
 *   # Produce a video from a saved research brief:
 *   node -r dotenv/config -r ts-node/register src/production/cli.ts --brief-id brief_c8770913
 *
 *   # Research-first production on a new topic:
 *   node -r dotenv/config -r ts-node/register src/production/cli.ts \
 *     --topic "Why AI Voice Agents Are Replacing Static Dashboards" \
 *     --aspect-ratio 9:16
 *
 *   # Run 24-hour daily technology news discovery:
 *   node -r dotenv/config -r ts-node/register src/production/cli.ts --news
 *
 *   # List all production jobs:
 *   node -r dotenv/config -r ts-node/register src/production/cli.ts --list-jobs
 */

import fs from "fs";
import { ProductionOrchestrator } from "./orchestrator";
import { getJobStore } from "./state-machine/job-store";
import { getDailyNewsMonitor } from "./news/daily-news-monitor";
import type { ProductionInput, ProductionJobConfig, ScriptDocument } from "./types";

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
║    Voiceage Systems — AI Video Production Studio (Milestone 3)      ║
╚══════════════════════════════════════════════════════════════════════╝

Commands:
  --brief-id <id>              Produce video from an existing Milestone 2 brief
  --topic <text>               Research topic from scratch and produce video
  --script-file <path>         Produce video directly from user-supplied script JSON
  --news                       Discover daily technology developments (last 24h)
  --list-jobs                  List all recent production jobs
  --job-id <id>                Show status and QA report for a specific job

Options:
  --aspect-ratio <9:16|16:9>   Video orientation (default: 9:16)
  --theme-preset <name>        Theme preset (cyberpunk_dark, minimalist_light, etc.)
  --skip-render                Fast validation without running headless Remotion
  --background-music           Enable background music mixing and ducking
`);
    process.exit(0);
  }

  // Daily News Monitor
  if (hasFlag(args, "--news")) {
    console.log("\n[cli] Running 24-Hour Daily Technology News Discovery...");
    const monitor = getDailyNewsMonitor();
    const items = await monitor.discoverDailyNews(24);
    console.log(`\nDiscovered ${items.length} Tech & AI Developments (Last 24 Hours):`);
    console.log("══════════════════════════════════════════════════════════════════");
    items.slice(0, 15).forEach((item, idx) => {
      console.log(`\n${idx + 1}. [${item.category}] ${item.title}`);
      console.log(`   Source: ${item.source} (${item.age_hours}h ago)`);
      console.log(`   URL:    ${item.url}`);
    });
    console.log("\n══════════════════════════════════════════════════════════════════");
    process.exit(0);
  }

  // List Jobs
  if (hasFlag(args, "--list-jobs")) {
    const store = getJobStore();
    const jobs = store.getAll();
    console.log(`\nFound ${jobs.length} Production Jobs:`);
    jobs.forEach((j) => {
      console.log(
        `• [${j.job_id}] Status: ${j.status.toUpperCase()} (${j.current_stage}) — Project: ${j.project_id}`
      );
      if (j.artifacts.render_path) {
        console.log(`   Output: ${j.artifacts.render_path}`);
      }
    });
    process.exit(0);
  }

  // Show Specific Job
  const inspectJobId = getArg(args, "--job-id");
  if (inspectJobId) {
    const store = getJobStore();
    const j = store.get(inspectJobId);
    if (!j) {
      console.error(`Job "${inspectJobId}" not found.`);
      process.exit(1);
    }
    console.log(JSON.stringify(j, null, 2));
    process.exit(0);
  }

  // Determine Production Input
  let input: ProductionInput;
  const briefId = getArg(args, "--brief-id");
  const topic = getArg(args, "--topic");
  const scriptFile = getArg(args, "--script-file");

  if (briefId) {
    input = { mode: "brief_id", briefId };
  } else if (topic) {
    input = { mode: "topic", topic, audience: getArg(args, "--audience") };
  } else if (scriptFile) {
    if (!fs.existsSync(scriptFile)) {
      console.error(`Script file not found: ${scriptFile}`);
      process.exit(1);
    }
    const script = JSON.parse(fs.readFileSync(scriptFile, "utf-8")) as ScriptDocument;
    input = { mode: "script", script };
  } else {
    console.error("Error: Must provide --brief-id, --topic, or --script-file.");
    process.exit(1);
  }

  const options: Partial<ProductionJobConfig> = {
    aspect_ratio: (getArg(args, "--aspect-ratio") as "9:16" | "16:9") || "9:16",
    theme_preset: getArg(args, "--theme-preset") || "cyber_editorial",
    skip_render: hasFlag(args, "--skip-render"),
    force_deterministic: hasFlag(args, "--force-deterministic"),
    background_music: hasFlag(args, "--background-music"),
    target_duration_seconds: parseInt(getArg(args, "--duration") || "45", 10),
    resume: hasFlag(args, "--resume") || !!getArg(args, "--resume-project-id"),
    resume_project_id: getArg(args, "--resume-project-id"),
  };

  const orchestrator = new ProductionOrchestrator();
  const result = await orchestrator.runProduction(input, options);

  if (result.success) {
    console.log(`\n══════════════════════════════════════════════════════════════════`);
    console.log(`✓ PRODUCTION SUCCESSFUL: ${result.job.job_id}`);
    console.log(`══════════════════════════════════════════════════════════════════`);
    if (result.job.artifacts.render_path) {
      console.log(`Rendered Video: ${result.job.artifacts.render_path}`);
    }
    if (result.qualityReport) {
      console.log(`QA Status:      ${result.qualityReport.status.toUpperCase()}`);
      console.log(`Duration:       ${result.qualityReport.file_metrics.duration_seconds.toFixed(2)}s`);
      console.log(`Resolution:     ${result.qualityReport.file_metrics.width}x${result.qualityReport.file_metrics.height}`);
    }
    process.exit(0);
  } else {
    console.error(`\nProduction failed at stage ${result.job.current_stage}: ${result.job.error?.message}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("[Production CLI error]", err.message);
  process.exit(1);
});

#!/usr/bin/env node
/**
 * AI Video Studio CLI
 *
 * Usage examples:
 *
 *   # Topic mode
 *   node -r dotenv/config -r ts-node/register src/pipeline/cli.ts \
 *     --mode topic \
 *     --topic "How Gemini Flash TTS changes podcast production" \
 *     --platform "YouTube Shorts" \
 *     --duration 45
 *
 *   # Script mode (supply your own script text)
 *   node -r dotenv/config -r ts-node/register src/pipeline/cli.ts \
 *     --mode script \
 *     --script-file ./my_script.txt \
 *     --topic "AI Automation"
 *
 *   # Structured JSON script mode (skip AI generation entirely)
 *   node -r dotenv/config -r ts-node/register src/pipeline/cli.ts \
 *     --mode structured \
 *     --script-file ./my_script.json
 */

import { runPipeline } from "./orchestrator";
import type { PipelineInput, TopicModeInput, ScriptModeInput, StructuredScriptModeInput } from "./orchestrator";
import type { ScriptSchema } from "./types";
import fs from "fs";

// ============================================================
// Minimal arg parser (no extra deps)
// ============================================================

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

  if (hasFlag(args, "--help") || hasFlag(args, "-h")) {
    console.log(`
AI Video Studio CLI

Modes:
  --mode topic        Generate script from a topic (requires GEMINI_API_KEY)
  --mode script       Structure and narrate a plain-text script
  --mode structured   Use a pre-validated JSON script (skip generation)

Topic mode options:
  --topic <text>          The video topic (required)
  --audience <text>       Target audience
  --platform <text>       e.g. "YouTube Shorts", "LinkedIn"
  --duration <seconds>    Target video duration in seconds
  --tone <text>           e.g. "confident", "educational"
  --language <text>       Language (default: English)
  --cta <text>            Call to action text
  --brand <text>          Brand context

Script / structured mode options:
  --script-file <path>    Path to a .txt (script mode) or .json (structured mode) file
  --topic <text>          Topic context for script mode

Other:
  --no-render             Skip Remotion render (generate manifest only)
  --help                  Show this help
`);
    process.exit(0);
  }

  const mode = getArg(args, "--mode") ?? "topic";

  let input: PipelineInput;

  if (mode === "topic") {
    const topic = getArg(args, "--topic");
    if (!topic) {
      console.error("Error: --topic is required for topic mode.");
      process.exit(1);
    }

    const topicInput: TopicModeInput = {
      mode: "topic",
      request: {
        topic,
        audience: getArg(args, "--audience"),
        platform: getArg(args, "--platform"),
        target_duration_seconds: getArg(args, "--duration")
          ? parseInt(getArg(args, "--duration")!, 10)
          : undefined,
        tone: getArg(args, "--tone"),
        language: getArg(args, "--language"),
        call_to_action: getArg(args, "--cta"),
        brand_context: getArg(args, "--brand"),
      },
    };
    input = topicInput;
  } else if (mode === "script") {
    const scriptFile = getArg(args, "--script-file");
    if (!scriptFile) {
      console.error("Error: --script-file is required for script mode.");
      process.exit(1);
    }

    const rawScript = fs.readFileSync(scriptFile, "utf-8");

    const scriptInput: ScriptModeInput = {
      mode: "script",
      rawScript,
      context: {
        topic: getArg(args, "--topic"),
        platform: getArg(args, "--platform"),
        language: getArg(args, "--language"),
        call_to_action: getArg(args, "--cta"),
      },
    };
    input = scriptInput;
  } else if (mode === "structured") {
    const scriptFile = getArg(args, "--script-file");
    if (!scriptFile) {
      console.error("Error: --script-file is required for structured mode.");
      process.exit(1);
    }

    let script: ScriptSchema;
    try {
      script = JSON.parse(fs.readFileSync(scriptFile, "utf-8")) as ScriptSchema;
    } catch (e) {
      console.error(`Error reading script file: ${(e as Error).message}`);
      process.exit(1);
    }

    const structuredInput: StructuredScriptModeInput = {
      mode: "structured_script",
      script,
    };
    input = structuredInput;
  } else {
    console.error(`Unknown mode: ${mode}. Use --mode topic|script|structured`);
    process.exit(1);
  }

  console.log("\n╔══════════════════════════════════════╗");
  console.log("║   AI Video Studio — Pipeline Start   ║");
  console.log("╚══════════════════════════════════════╝\n");

  const result = await runPipeline(input);

  console.log("\n╔══════════════════════════════════════╗");
  console.log("║          Pipeline Complete           ║");
  console.log("╚══════════════════════════════════════╝\n");

  console.log(`Status:      ${result.status}`);
  console.log(`Project ID:  ${result.projectId}`);
  console.log(`Output dir:  ${result.outputDir}`);
  if (result.scriptPath)   console.log(`Script:      ${result.scriptPath}`);
  if (result.manifestPath) console.log(`Manifest:    ${result.manifestPath}`);
  if (result.renderPath)   console.log(`Render:      ${result.renderPath}`);
  if (result.durationSeconds)
    console.log(`Duration:    ${result.durationSeconds.toFixed(2)}s`);

  if (result.error) {
    console.error(`\nError at stage [${result.error.stage}]:`);
    console.error(result.error.message);
    if (result.error.recoverable) {
      console.log("\nThis error is recoverable. Fix the issue and re-run.");
    }
    process.exit(1);
  }

  console.log("\nCompleted stages:", result.completedStages.join(" → "));
  process.exit(0);
}

main().catch((err: Error) => {
  console.error("\n[fatal]", err.message);
  process.exit(1);
});

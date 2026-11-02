import { spawn } from "child_process";

const testSuites = [
  { name: "Pipeline Architecture", file: "src/pipeline/tests.ts" },
  { name: "Scene Registry & Layout", file: "src/video-engine/tests/registry.test.ts" },
  { name: "Research Pipeline", file: "src/research/tests/research.test.ts" },
  { name: "Production Orchestrator", file: "src/production/tests/production.test.ts" },
  { name: "Extended Video Engine", file: "src/production/tests/extended_engine.test.ts" },
  { name: "Storyboard & Editorial Gate", file: "src/production/tests/storyboard.test.ts" },
  { name: "Visual Diversity & Dynamic Engine", file: "src/production/tests/visual_diversity.test.ts" },
  { name: "System Improvement Regression", file: "src/production/tests/system_improvement_regression.test.ts" },
  { name: "Post-Production Motion & Audio", file: "src/production/tests/post_production.test.ts" },
  { name: "Universal Engine Multi-Topic Regression", file: "src/production/tests/universal_engine_regression.test.ts" },
];

async function runAll() {
  console.log("╔══════════════════════════════════════════════════════════════════╗");
  console.log("║     VOICEAGE SYSTEMS — COMPREHENSIVE PRODUCTION TEST SUITE       ║");
  console.log("╚══════════════════════════════════════════════════════════════════╝\n");

  let passedCount = 0;
  let failedCount = 0;
  const results: Array<{ name: string; status: "PASS" | "FAIL"; durationMs: number }> = [];

  for (const suite of testSuites) {
    console.log(`\n▶ Running: ${suite.name} (${suite.file})...`);
    const startTime = Date.now();

    const exitCode = await new Promise<number>((resolve) => {
      const proc = spawn(
        process.execPath,
        ["--require", "dotenv/config", "--require", "ts-node/register", suite.file],
        {
          stdio: ["ignore", "inherit", "inherit"],
          shell: false,
          cwd: process.cwd(),
          env: process.env,
        }
      );
      proc.on("close", (code) => resolve(code ?? 1));
      proc.on("error", (err) => {
        console.error(`Error spawning ${suite.file}:`, err);
        resolve(1);
      });
    });

    const durationMs = Date.now() - startTime;
    if (exitCode === 0) {
      passedCount++;
      results.push({ name: suite.name, status: "PASS", durationMs });
      console.log(`✔ [PASS] ${suite.name} (${(durationMs / 1000).toFixed(1)}s)`);
    } else {
      failedCount++;
      results.push({ name: suite.name, status: "FAIL", durationMs });
      console.error(`✘ [FAIL] ${suite.name} (exit code ${exitCode})`);
      break;
    }
  }

  console.log("\n══════════════════════════════════════════════════════════════════");
  console.log("  TEST SUITE EXECUTION SUMMARY");
  console.log("══════════════════════════════════════════════════════════════════");
  for (const r of results) {
    const icon = r.status === "PASS" ? "✔" : "✘";
    console.log(`  ${icon} [${r.status}] ${r.name.padEnd(42)} (${(r.durationMs / 1000).toFixed(1)}s)`);
  }
  console.log("══════════════════════════════════════════════════════════════════");
  console.log(`  Total: ${passedCount} passed, ${failedCount} failed (${testSuites.length} total suites)`);
  console.log("══════════════════════════════════════════════════════════════════\n");

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAll().catch((err) => {
  console.error("Test runner fatal error:", err);
  process.exit(1);
});

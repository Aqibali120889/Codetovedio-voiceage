import fs from "fs";
import path from "path";
import { renderProductionVideo } from "../src/production/rendering/production-renderer";
import { inspectRenderQuality } from "../src/production/qa/quality-inspector";

async function main() {
  const projectId = "proj_d02e1aed-6c61-42f9-8685-4a850a6fb0a2";
  const projectDir = path.resolve(process.cwd(), "data/projects", projectId);
  const blueprintPath = path.join(projectDir, "blueprint.json");
  const raw = fs.readFileSync(blueprintPath, "utf-8");
  const parsed = JSON.parse(raw);
  const blueprint = parsed.blueprint || parsed;
  const masterAudio = path.join(projectDir, "narration/master_audio.wav");

  console.log(`\n══════════════════════════════════════════════════════════════════`);
  console.log(`  Rendering Video for Project: ${projectId}`);
  console.log(`  Topic: ${blueprint.topic || blueprint.title}`);
  console.log(`══════════════════════════════════════════════════════════════════\n`);

  const renderResult = await renderProductionVideo(
    blueprint,
    projectDir,
    masterAudio,
    { concurrency: 1 }
  );

  console.log(`\n✓ Video Rendered Successfully: ${renderResult.renderPath}`);
  console.log(`  Duration: ${renderResult.totalDurationSeconds.toFixed(2)}s (${renderResult.totalFrames} frames)`);

  console.log(`\n[QA] Running Automated Quality Inspector...`);
  const qaReport = await inspectRenderQuality(renderResult.renderPath, {
    jobId: "job_7267af9d",
    projectId,
    blueprint,
  });

  const qaReportPath = path.join(projectDir, "render/quality_report.json");
  fs.writeFileSync(qaReportPath, JSON.stringify(qaReport, null, 2), "utf-8");

  console.log(`\n══════════════════════════════════════════════════════════════════`);
  console.log(`  QA Report: ${qaReport.status.toUpperCase()}`);
  console.log(`══════════════════════════════════════════════════════════════════`);
  console.log(`Checks Passed: ${qaReport.checks.filter(c => c.passed).length} / ${qaReport.checks.length}`);
  for (const c of qaReport.checks) {
    const symbol = c.passed ? "✓" : "✗";
    console.log(`  ${symbol} [${c.category}] ${c.name}: ${c.details}`);
  }
}

main().catch((err) => {
  console.error("Render error:", err);
  process.exit(1);
});

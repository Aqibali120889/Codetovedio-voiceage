const path = require("path");
const bp = require(path.resolve(__dirname, "../data/projects/proj_d02e1aed-6c61-42f9-8685-4a850a6fb0a2/blueprint.json"));
const { buildTimeline } = require(path.resolve(__dirname, "../src/video-engine/timeline/build-timeline"));
const blueprint = bp.blueprint || bp;
const t = buildTimeline(blueprint);
console.log("totalFrames:", t.totalFrames, "duration:", t.totalDurationSeconds);
console.log("scene count:", blueprint.scenes.length);
blueprint.scenes.forEach((s, i) => {
  console.log(`Scene ${i+1} (${s.id}, ${s.scene_type}): duration=${s.duration_hint_seconds}s`);
});

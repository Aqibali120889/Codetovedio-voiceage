/**
 * Scene Plan & Blueprint Validator.
 * Validates generated scene blueprints against the Scene Renderer Registry,
 * capability manifest constraints, and element schemas.
 * Implements bounded safe repair for unknown components.
 */

import type { VideoBlueprint, SceneBlueprint, ScenePurpose } from "../../video-engine/types";
import { validateVideoBlueprint } from "../../video-engine/schemas/validation";
import { hasSceneRenderer } from "../../video-engine/registry/scene-registry";
import { hasElementRenderer } from "../../video-engine/registry/element-registry";

export interface PlanValidationResult {
  valid: boolean;
  repaired: boolean;
  errors: string[];
  warnings: string[];
  blueprint: VideoBlueprint;
}

const VALID_THEME_PRESETS = [
  "cyber_editorial",
  "cinematic_tech",
  "clean_minimal",
  "data_journalism",
] as const;

export function validateAndRepairScenePlan(rawBlueprint: VideoBlueprint): PlanValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let repaired = false;

  // Deep clone to avoid mutating input during repair
  const blueprint: VideoBlueprint = JSON.parse(JSON.stringify(rawBlueprint));

  // 1. Ensure basic blueprint defaults
  if (!blueprint.fps || blueprint.fps <= 0) {
    blueprint.fps = 60;
    repaired = true;
  }
  if (!blueprint.width) {
    blueprint.width = 1080;
    repaired = true;
  }
  if (!blueprint.height) {
    blueprint.height = 1920;
    repaired = true;
  }
  if (!blueprint.aspect_ratio) {
    blueprint.aspect_ratio = blueprint.width > blueprint.height ? "16:9" : "9:16";
    repaired = true;
  }
  if (
    !blueprint.theme_preset ||
    !(VALID_THEME_PRESETS as readonly string[]).includes(blueprint.theme_preset)
  ) {
    blueprint.theme_preset = "cyber_editorial";
    repaired = true;
  }
  if (!blueprint.brand) {
    blueprint.brand = {
      primary_color: "#0A0A0C",
      accent_color: "#FF5F00",
    };
    repaired = true;
  }

  // 2. Validate Scenes
  if (!Array.isArray(blueprint.scenes) || blueprint.scenes.length === 0) {
    errors.push("Blueprint must contain at least one scene.");
    return { valid: false, repaired, errors, warnings, blueprint };
  }

  if (!blueprint.target_duration_seconds || blueprint.target_duration_seconds <= 0) {
    blueprint.target_duration_seconds = blueprint.scenes.reduce(
      (sum, s) => sum + (s.duration_hint_seconds || 5),
      0
    );
    repaired = true;
  }

  const seenSceneIds = new Set<string>();

  for (let i = 0; i < blueprint.scenes.length; i++) {
    const scene = blueprint.scenes[i];

    // Ensure stable scene id
    if (!scene.id) {
      scene.id = `scene_${String(i + 1).padStart(3, "0")}`;
      repaired = true;
    }

    if (seenSceneIds.has(scene.id)) {
      scene.id = `${scene.id}_${i + 1}`;
      repaired = true;
      warnings.push(`Duplicate scene ID resolved: renamed to "${scene.id}".`);
    }
    seenSceneIds.add(scene.id);

    // Duration hint
    if (!scene.duration_hint_seconds || scene.duration_hint_seconds <= 0) {
      scene.duration_hint_seconds = 5;
      repaired = true;
    }

    // Purpose fallback
    if (!scene.purpose) {
      scene.purpose = (
        i === 0 ? "hook" : i === blueprint.scenes.length - 1 ? "cta" : "insight"
      ) as ScenePurpose;
      repaired = true;
    }

    // Verify Scene Renderer in Registry
    if (!hasSceneRenderer(scene.scene_type)) {
      warnings.push(
        `Scene "${scene.id}" specified unsupported scene_type "${scene.scene_type}". Repaired to "kinetic_typography".`
      );
      scene.scene_type = "kinetic_typography";
      repaired = true;
    }

    // Repair missing required fields per scene type
    repairSceneSpecificFields(scene);

    // Validate elements inside scene if present
    if (scene.elements && Array.isArray(scene.elements)) {
      const validElements = [];
      for (const el of scene.elements) {
        if (!el.type || !hasElementRenderer(el.type)) {
          warnings.push(
            `Scene "${scene.id}" element "${el.id || "unnamed"}" has unsupported type "${el.type}". Dropping element.`
          );
          repaired = true;
        } else {
          validElements.push(el);
        }
      }
      scene.elements = validElements;
    }
  }

  // 3. Schema validation pass
  const schemaRes = validateVideoBlueprint(blueprint);
  if (!schemaRes.success) {
    for (const err of schemaRes.errors) {
      errors.push(`Schema error: ${err}`);
    }
  }

  return {
    valid: errors.length === 0,
    repaired,
    errors,
    warnings,
    blueprint,
  };
}

/**
 * Repairs missing fields for specialized scene renderers to prevent runtime blank screens.
 */
function repairSceneSpecificFields(scene: SceneBlueprint): void {
  if (scene.scene_type === "stat_counter") {
    if (!scene.data_points || scene.data_points.length === 0) {
      scene.data_points = [
        {
          label: scene.on_screen_text || "Empirical Benchmark",
          value: 95,
          change: "+95%",
          status: "good",
        },
      ];
    }
  }

  if (scene.scene_type === "bar_chart" || scene.scene_type === "line_chart") {
    if (!scene.chart && (!scene.data_points || scene.data_points.length === 0)) {
      scene.chart = {
        type: scene.scene_type === "bar_chart" ? "bar" : "line",
        title: scene.on_screen_text || "Metrics",
        points: [
          { label: "Phase 1", value: 30 },
          { label: "Phase 2", value: 75 },
          { label: "Phase 3", value: 95 },
        ],
      };
    }
  }

  if (scene.scene_type === "system_architecture" || scene.scene_type === "process_flow") {
    if (!scene.nodes || !Array.isArray(scene.nodes) || scene.nodes.length === 0) {
      scene.nodes = [
        { label: "Input Event", detail: "service", status: "active" },
        { label: "Agent Loop", detail: "gateway", status: "active" },
        { label: "Telemetry Sink", detail: "database", status: "done" },
      ];
    }
  }

  if (scene.scene_type === "code_terminal") {
    if (!scene.terminal_lines || !Array.isArray(scene.terminal_lines) || scene.terminal_lines.length === 0) {
      scene.terminal_lines = [
        "$ voiceage run-agent --target prod",
        "[OK] Agent deployed successfully in 120ms",
      ];
    }
  }

  if (scene.scene_type === "comparison_grid") {
    const rawComp = scene.comparison as Record<string, any> | undefined;
    if (!rawComp || (!rawComp.left && !rawComp.left_title)) {
      scene.comparison = {
        left: { title: "Traditional", points: ["High Latency", "Manual Triage"] },
        right: { title: "Autonomous", points: ["Real-time Loop", "Auto-Remediation"] },
      };
    } else if (rawComp.left_title && !rawComp.left) {
      scene.comparison = {
        left: {
          title: rawComp.left_title,
          points: Array.isArray(rawComp.left_points)
            ? rawComp.left_points
            : ["Manual alert triage", "Human bottleneck"],
        },
        right: {
          title: rawComp.right_title || "Autonomous",
          points: Array.isArray(rawComp.right_points)
            ? rawComp.right_points
            : ["Instant event ingestion", "Sub-second mitigation"],
        },
      };
    } else if (rawComp.left && !rawComp.left.title) {
      rawComp.left.title = "Traditional";
      if (!rawComp.left.points) rawComp.left.points = ["Manual alert triage", "Human bottleneck"];
      if (rawComp.right && !rawComp.right.title) rawComp.right.title = "Autonomous";
      if (rawComp.right && !rawComp.right.points) rawComp.right.points = ["Instant execution", "Sub-second mitigation"];
    }
  }

  if (scene.scene_type === "timeline_reveal") {
    if (!scene.steps || !Array.isArray(scene.steps) || scene.steps.length === 0) {
      scene.steps = [
        { label: "Trigger Event", detail: "Real-time stream ingested" },
        { label: "Autonomous Reasoning", detail: "Agent determines optimal action" },
        { label: "Deterministic Execution", detail: "Remediation verified & logged" },
      ];
    }
  }

  if (scene.scene_type === "infographic_grid") {
    if (!scene.grid_items && (!scene.data_points || scene.data_points.length === 0)) {
      scene.grid_items = [
        { label: "Latency", value: "320ms", description: "Sub-second execution" },
        { label: "Availability", value: "99.99%", description: "Zero downtime" },
        { label: "Efficiency", value: "+10×", description: "Throughput multiplier" },
        { label: "Cost", value: "−85%", description: "Compute optimization" },
      ];
    }
  }

  if (scene.scene_type === "split_callout") {
    if (!scene.callout_text) {
      scene.callout_text = scene.on_screen_text || "KEY ADVANTAGE";
    }
    if (!scene.callout_label) {
      scene.callout_label = "ANALYSIS";
    }
  }

  // Ensure scenes with duration >= 3.5s have at least 1-2 visual beats to maintain density
  if (!scene.beats || scene.beats.length === 0) {
    const dur = scene.duration_hint_seconds || 5;
    const words = (scene.narration || "").split(/\s+/).filter(Boolean);
    const keyPhrase = words.slice(1, 5).join(" ") || scene.on_screen_text || "CORE INSIGHT";

    scene.beats = [
      {
        beat_id: `beat_${scene.id}_1`,
        start_seconds: 1.2,
        duration_seconds: Math.min(2.2, dur - 1.4),
        type: "highlight",
        description: `Visual highlight: "${keyPhrase}"`,
        label: "HIGHLIGHT",
        text: keyPhrase,
        accent_color: scene.accent_color,
      },
    ];

    if (dur >= 5) {
      scene.beats.push({
        beat_id: `beat_${scene.id}_2`,
        start_seconds: Math.round(dur * 0.55 * 10) / 10,
        duration_seconds: 2.0,
        type: "callout",
        description: "Narration-aligned dynamic callout",
        label: "KEY POINT",
        text: scene.on_screen_text || "Autonomous Execution",
        accent_color: scene.accent_color,
      });
    }
  }
}

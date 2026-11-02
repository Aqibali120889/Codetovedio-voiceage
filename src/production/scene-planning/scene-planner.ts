/**
 * Scene Planner.
 * Converts an approved ScriptDocument into a validated VideoBlueprint,
 * matching narration beats to supported Scene Renderer Registry components.
 */

import { GoogleGenAI } from "@google/genai";
import { getConfig, checkCredentials } from "../../pipeline/config";
import type {
  VideoBlueprint,
  SceneBlueprint,
  SceneType,
  ScenePurpose,
  AspectRatio,
  VisualElement,
  AnimationType,
  ElementType,
  ChartDataPoint,
} from "../../video-engine/types";
import { formatCapabilityManifestForPrompt } from "../../video-engine/registry/capability-manifest";
import { hasSceneRenderer } from "../../video-engine/registry/scene-registry";
import type { ScriptDocument } from "../types";
import type {
  StoryboardDocument,
  StoryboardScene,
  StoryboardArtifactType,
} from "../storyboard/storyboard-types";
import type { VisualDirection } from "../editorial/visual-art-director";
import { validateAndRepairScenePlan } from "./plan-validator";

export type ThemePresetName = "cyber_editorial" | "cinematic_tech" | "clean_minimal" | "data_journalism";

export interface ScenePlannerOptions {
  themePreset?: ThemePresetName | string;
  aspectRatio?: AspectRatio;
  forceDeterministic?: boolean;
  storyboard?: StoryboardDocument;
  visualDirection?: VisualDirection;
}

function normalizeThemePreset(preset?: string): ThemePresetName {
  const valid: ThemePresetName[] = [
    "cyber_editorial",
    "cinematic_tech",
    "clean_minimal",
    "data_journalism",
  ];
  if (preset && valid.includes(preset as ThemePresetName)) {
    return preset as ThemePresetName;
  }
  return "cyber_editorial";
}

function mapToScenePurpose(p?: string): ScenePurpose {
  switch (p) {
    case "hook":
      return "hook";
    case "problem":
      return "problem";
    case "context":
      return "context";
    case "architecture":
    case "core_architecture":
    case "mechanism":
      return "architecture";
    case "comparison":
      return "comparison";
    case "demo":
      return "demo";
    case "metric":
    case "evidence_statistic":
      return "metric";
    case "recap":
      return "recap";
    case "cta":
      return "cta";
    default:
      return "insight";
  }
}

export async function planScenesFromScript(
  script: ScriptDocument,
  options: ScenePlannerOptions = {}
): Promise<VideoBlueprint> {
  const themePreset = normalizeThemePreset(options.themePreset);
  const aspectRatio: AspectRatio = options.aspectRatio || "9:16";

  const width = aspectRatio === "16:9" ? 1920 : aspectRatio === "1:1" ? 1080 : 1080;
  const height = aspectRatio === "16:9" ? 1080 : aspectRatio === "1:1" ? 1080 : 1920;

  const credError = checkCredentials();
  const useDeterministic = options.forceDeterministic || !!credError;

  if (useDeterministic) {
    return buildDeterministicBlueprintFromScript(script, {
      themePreset,
      aspectRatio,
      width,
      height,
      storyboard: options.storyboard || script.storyboard,
      visualDirection: options.visualDirection,
    });
  }

  const config = getConfig();
  const client = new GoogleGenAI({ apiKey: config.geminiApiKey });
  const manifestPrompt = formatCapabilityManifestForPrompt();

  const scriptFormatted = script.scenes
    .map(
      (s, i) =>
        `Scene ${i + 1} (${s.scene_id}):\n  Narration: "${s.narration}"\n  On-Screen Text: "${s.on_screen_text}"\n  Visual: "${s.visual_description}"\n  Suggested Type: ${s.suggested_scene_type || "kinetic_typography"}`
    )
    .join("\n\n");

  // Use a generation seed for reproducibility (stored in blueprint later)
  const generationSeed = Date.now() % 1000000;

  const systemInstruction = `You are a Senior Motion Graphics Video Director at Voiceage Systems.
Your task is to convert a narrated script into a fully specified Remotion VideoBlueprint JSON.

${manifestPrompt}

AVAILABLE SCENE TYPES (choose only from these):
kinetic_typography, stat_counter, bar_chart, line_chart, system_architecture, process_flow,
code_terminal, comparison_grid, dashboard_mockup, quote_insight, cta, modular_scene,
parallax_hero, timeline_reveal, infographic_grid, word_by_word, split_callout,
document_reveal, editorial_montage

CRITICAL DIVERSITY RULES:
1. NEVER use the same scene_type for two consecutive scenes.
2. The first scene should be parallax_hero OR editorial_montage OR word_by_word.
3. The last scene should be cta.
4. Alternate between data-heavy scenes (stat_counter, bar_chart, infographic_grid), narrative scenes (word_by_word, quote_insight, split_callout, document_reveal), and cinematic scenes (parallax_hero, editorial_montage).
5. Include at least one of: document_reveal, editorial_montage, timeline_reveal, infographic_grid, split_callout, parallax_hero.
6. Do NOT use kinetic_typography more than once per 4 scenes.
7. Match scene_type to narration content — use code_terminal only for technical demos, stat_counter for numeric claims.
8. For each scene with data, populate: nodes, data_points, terminal_lines, comparison, steps, grid_items, or chart as appropriate.
9. Add accent_color variation: rotate between #FF5F00, #00C853, #0EA5E9, #A855F7, #FF3B30.
10. Output only valid JSON matching the VideoBlueprint specification.`;

  const userPrompt = `TOPIC: "${script.topic}"
THEME PRESET: "${themePreset}"
RESOLUTION: ${width}x${height} (Aspect Ratio: ${aspectRatio})
GENERATION SEED: ${generationSeed}

SCRIPT SCENES:
${scriptFormatted}

Generate a JSON object with this exact structure.
VARY accent_color per scene. Populate domain-specific data arrays (nodes/data_points/steps/grid_items/terminal_lines/comparison) based on narration content.
NEVER use the same scene_type twice in a row.

{
  "title": "${script.title}",
  "aspect_ratio": "${aspectRatio}",
  "width": ${width},
  "height": ${height},
  "fps": 60,
  "target_duration_seconds": ${script.target_duration_seconds || 45},
  "theme_preset": "${themePreset}",
  "brand": {
    "primary_color": "#0A0A0C",
    "accent_color": "#FF5F00"
  },
  "scenes": [
    {
      "id": "scene_001",
      "purpose": "hook",
      "scene_type": "parallax_hero",
      "narration": "Spoken line...",
      "visual_description": "Vivid description of what appears on screen",
      "on_screen_text": "HOOK HEADLINE",
      "duration_hint_seconds": 6,
      "accent_color": "#FF5F00",
      "transition_out": { "type": "fade", "duration_seconds": 0.25 }
    }
  ]
}

Include ALL scenes from the script in order. Output only the JSON.`;

  try {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Gemini scene planner timed out after 90s")), 90000)
    );

    const callPromise = client.interactions.create({
      model: config.textModel,
      input: userPrompt,
      system_instruction: systemInstruction,
      response_format: {
        type: "text",
        mime_type: "application/json",
      },
      store: false,
    });

    const response = await Promise.race([callPromise, timeoutPromise]);
    const rawJson = response.output_text || "";
    const parsed = JSON.parse(rawJson) as VideoBlueprint;

    // Synchronize narration and text from approved script
    for (let i = 0; i < script.scenes.length; i++) {
      if (parsed.scenes && parsed.scenes[i]) {
        parsed.scenes[i].id = script.scenes[i].scene_id;
        parsed.scenes[i].narration = script.scenes[i].narration;
        parsed.scenes[i].on_screen_text = script.scenes[i].on_screen_text;
        parsed.scenes[i].purpose = mapToScenePurpose(script.scenes[i].purpose);
      }
    }

    parsed.aspect_ratio = aspectRatio;
    parsed.width = width;
    parsed.height = height;
    parsed.theme_preset = themePreset;
    if (!parsed.brand) {
      parsed.brand = { primary_color: "#0A0A0C", accent_color: "#FF5F00" };
    }

    const { blueprint, repaired, warnings } = validateAndRepairScenePlan(parsed);
    if (repaired && warnings.length > 0) {
      console.log(`[ScenePlanner] Repaired blueprint: ${warnings.join("; ")}`);
    }

    const effectiveStoryboard = options.storyboard || script.storyboard;
    if (effectiveStoryboard) {
      for (const scene of blueprint.scenes) {
        const matchingSbScene = effectiveStoryboard.scenes.find((s) => s.scene_id === scene.id);
        if (matchingSbScene) {
          enrichSceneBlueprintWithStoryboard(scene, matchingSbScene, blueprint.fps || 60);
        }
      }
    }

    return blueprint;
  } catch (err) {
    console.warn(
      `[ScenePlanner] Gemini planning failed (${(err as Error).message}), using deterministic planner...`
    );
    return buildDeterministicBlueprintFromScript(script, {
      themePreset,
      aspectRatio,
      width,
      height,
      storyboard: options.storyboard || script.storyboard,
      visualDirection: options.visualDirection,
    });
  }
}

/**
 * Deterministically constructs a validated VideoBlueprint from the script,
 * mapping purpose to supported scene renderers.
 */
export function buildDeterministicBlueprintFromScript(
  script: ScriptDocument,
  options: {
    themePreset?: string;
    aspectRatio?: AspectRatio;
    width?: number;
    height?: number;
    storyboard?: StoryboardDocument;
    visualDirection?: VisualDirection;
  } = {}
): VideoBlueprint {
  const themePreset = normalizeThemePreset(options.themePreset);
  const aspectRatio: AspectRatio = options.aspectRatio || "9:16";
  const width = options.width || (aspectRatio === "16:9" ? 1920 : 1080);
  const height = options.height || (aspectRatio === "16:9" ? 1080 : 1920);

  // Accent color rotation — anchored by visual direction palette if present
  const primaryAccent = options.visualDirection?.palette?.accent || "#FF5F00";
  const accentColors = [
    primaryAccent,
    "#00C853",
    "#0EA5E9",
    "#A855F7",
    "#FF3B30",
    "#FFB800",
    "#10B981",
  ];

  // Full rotating sequence of scene types (all 19 registered)
  // Ordered to maximize visual variety and narrative flow
  const SCENE_TYPE_ROTATION: SceneType[] = [
    "parallax_hero",       // Hook — full-bleed cinematic
    "document_reveal",     // Evidence / investigative citation
    "word_by_word",        // Punchy claim
    "editorial_montage",   // Feature story collage
    "infographic_grid",    // Numbers
    "timeline_reveal",     // Process
    "split_callout",       // Contrast
    "stat_counter",        // KPI
    "bar_chart",           // Comparison data
    "system_architecture", // Architecture
    "code_terminal",       // Technical demo
    "comparison_grid",     // Before/after
    "line_chart",          // Trend
    "kinetic_typography",  // Impact headline
    "quote_insight",       // Insight
    "dashboard_mockup",    // Product
    "process_flow",        // Sequential
    "modular_scene",       // Flexible
    "cta",                 // Always last
  ];

  /**
   * Pick a scene type that (a) fits the scene purpose and (b) is
   * not the same as the previous scene's type.
   */
  function pickSceneType(
    s: (typeof script.scenes)[number],
    idx: number,
    totalScenes: number,
    previousType: SceneType | null
  ): SceneType {
    // Explicit override from script
    if (s.suggested_scene_type && isValidSceneType(s.suggested_scene_type)) {
      const t = s.suggested_scene_type as SceneType;
      if (t !== previousType) return t;
    }

    // Last scene is always CTA
    if (idx === totalScenes - 1) return "cta";

    // First scene — prefer cinematic hook types
    if (idx === 0) {
      const hookTypes: SceneType[] = ["parallax_hero", "editorial_montage", "word_by_word", "kinetic_typography"];
      return hookTypes.find((t) => t !== previousType) ?? "parallax_hero";
    }

    // Purpose-to-type mapping (with fallback rotation)
    const purposeMap: Record<string, SceneType[]> = {
      hook:               ["parallax_hero", "editorial_montage", "word_by_word", "kinetic_typography"],
      problem:            ["split_callout", "document_reveal", "word_by_word", "comparison_grid"],
      context:            ["document_reveal", "timeline_reveal", "system_architecture", "infographic_grid"],
      architecture:       ["system_architecture", "timeline_reveal", "process_flow"],
      core_architecture:  ["system_architecture", "timeline_reveal", "process_flow"],
      mechanism:          ["process_flow", "code_terminal", "timeline_reveal"],
      comparison:         ["comparison_grid", "split_callout", "bar_chart"],
      demo:               ["code_terminal", "dashboard_mockup", "infographic_grid"],
      metric:             ["infographic_grid", "stat_counter", "bar_chart"],
      evidence_statistic: ["stat_counter", "infographic_grid", "split_callout"],
      recap:              ["quote_insight", "document_reveal", "word_by_word", "kinetic_typography"],
      insight:            ["quote_insight", "document_reveal", "word_by_word", "split_callout"],
      cta:                ["cta"],
    };

    const candidates = purposeMap[s.purpose] ?? SCENE_TYPE_ROTATION;

    // Pick first candidate that isn't the same as the previous scene type
    const picked = candidates.find((t) => t !== previousType);
    if (picked) return picked;

    // All candidates are same as previous — cycle to rotation
    const rotationIdx = idx % (SCENE_TYPE_ROTATION.length - 2); // exclude "cta" at end
    const rotated = SCENE_TYPE_ROTATION[rotationIdx];
    return rotated !== previousType ? rotated : SCENE_TYPE_ROTATION[(rotationIdx + 1) % (SCENE_TYPE_ROTATION.length - 1)];
  }

  let previousSceneType: SceneType | null = null;

  const scenes: SceneBlueprint[] = script.scenes.map((s, idx) => {
    const sceneType = pickSceneType(s, idx, script.scenes.length, previousSceneType);
    previousSceneType = sceneType;

    const accentColor = accentColors[idx % accentColors.length];

    const scene: SceneBlueprint = {
      id: s.scene_id || `scene_${String(idx + 1).padStart(3, "0")}`,
      purpose: mapToScenePurpose(s.purpose),
      scene_type: sceneType,
      narration: s.narration,
      visual_description: s.visual_description,
      on_screen_text: s.on_screen_text,
      accent_color: accentColor,
      claims: s.claims,
      duration_hint_seconds: Math.max(4, Math.round(s.narration.split(/\s+/).length / 2.5)),
      transition_out: {
        type: "cut",
        duration_seconds: 0,
      },
    };

    // Populate data for specialized renderers dynamically grounded in topic & narration
    if (sceneType === "stat_counter" || sceneType === "infographic_grid") {
      const numbers = [...s.narration.matchAll(/(\d+(?:\.\d+)?)\s*(%|x|X|times|billion|million|k|K)?/g)];
      if (numbers.length > 0) {
        scene.data_points = numbers.slice(0, 4).map((m, i) => {
          const val = parseFloat(m[1]);
          const unit = m[2] || "";
          return {
            label: s.on_screen_text ? `${s.on_screen_text.slice(0, 16)}` : `Metric ${i + 1}`,
            value: val,
            change: `${val}${unit}`,
            status: i % 2 === 0 ? "good" : "neutral",
          };
        });
        scene.grid_items = scene.data_points.map((dp) => ({
          label: dp.label,
          value: String(dp.value) + (dp.change?.includes("%") ? "%" : ""),
          description: dp.change,
        }));
      } else {
        scene.data_points = [
          { label: s.on_screen_text || "Benchmark", value: 10, change: "10×", status: "good" },
          { label: "vs Baseline", value: 85, change: "−85%", status: "good" },
        ];
      }
    } else if (sceneType === "system_architecture" || sceneType === "process_flow") {
      const parts = (s.on_screen_text || "")
        .split(/[,\-→>|]/)
        .map((p) => p.trim())
        .filter((p) => p.length > 2 && !/^(scene|part|step)/i.test(p));

      let domainNodes: Array<{ label: string; detail: string; status: "done" | "active" | "queued" }>;

      if (parts.length >= 3) {
        domainNodes = parts.slice(0, 4).map((label, i) => ({
          label,
          detail: ["Input stream", "Processing core", "Validation checkpoint", "Terminal register"][i] || "active stream",
          status: (["done", "active", "active", "queued"] as const)[i] || "queued",
        }));
      } else {
        const isFinance = /money|settle|liquidity|treasury|clearance|wire/i.test(script.topic + " " + s.narration);
        const isCoding = /code|compiler|ast|test|diff|developer|mosaico|ide|spi|i2c|uart|firmware/i.test(script.topic + " " + s.narration);

        domainNodes = isFinance
          ? [
              { label: "Treasury Ingest API", detail: "Real-time balance-sheet events", status: "done" as const },
              { label: "Cryptographic Router", detail: "Deterministic compliance checks", status: "active" as const },
              { label: "Liquidity Ledger", detail: "Sub-second ledger synchronization", status: "active" as const },
              { label: "Instant Settlement", detail: "Cryptographic transaction finality", status: "queued" as const },
            ]
          : isCoding
          ? [
              { label: "AST Parse & Ingest", detail: "TypeScript / Python syntax tokens", status: "done" as const },
              { label: "Compiler Diagnostic Loop", detail: "Zero-error type validation", status: "active" as const },
              { label: "Sandbox Test Runner", detail: "Hardware-in-the-loop test execution", status: "active" as const },
              { label: "Deterministic Git Merge", detail: "Verified diff commit to main", status: "queued" as const },
            ]
          : [
              { label: "Telemetry Stream", detail: "Vectorized log ingest", status: "done" as const },
              { label: "Root-Cause Reasoner", detail: "Diagnostic agent reasoning", status: "active" as const },
              { label: "Remediation Engine", detail: "Automated webhook dispatch", status: "active" as const },
              { label: "Post-Incident Verifier", detail: "SLO baseline confirmation", status: "queued" as const },
            ];
      }

      scene.nodes = domainNodes;
      scene.steps = domainNodes.map((n) => ({ label: n.label, detail: n.detail }));
    } else if (sceneType === "timeline_reveal") {
      const isFinance = /money|settle|liquidity|treasury|clearance|wire/i.test(script.topic + " " + s.narration);
      const isCoding = /code|compiler|ast|test|diff|developer|mosaico|ide/i.test(script.topic + " " + s.narration);

      scene.steps = isFinance
        ? [
            { label: "Discovery", detail: "Account balance check" },
            { label: "Negotiation", detail: "Liquidity channel open" },
            { label: "Execution", detail: "Cryptographic sign" },
            { label: "Finality", detail: "Instant ledger write" },
          ]
        : isCoding
        ? [
            { label: "Code Synthesis", detail: "Raw LLM diff generation" },
            { label: "AST Validation", detail: "Compiler type checks" },
            { label: "Sandbox Run", detail: "Automated unit tests" },
            { label: "Merge", detail: "Verified production pull" },
          ]
        : [
            { label: "Incident Detection", detail: "High-priority alert ingested" },
            { label: "Root Cause", detail: "Multi-modal model triage" },
            { label: "Autonomous Patch", detail: "Runbook executed in sandbox" },
            { label: "Recovery", detail: "Telemetry confirms baseline" },
          ];
    } else if (sceneType === "code_terminal") {
      const topicWord = script.topic.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 20);
      scene.terminal_lines = [
        `$ run --topic "${topicWord}"`,
        `[INIT] Initializing pipeline for ${script.title.slice(0, 36)}...`,
        `[EXEC] ${s.narration.slice(0, 45)}...`,
        `[200 OK] Verified completion in 185ms`,
      ];
    } else if (sceneType === "comparison_grid") {
      const firstWord = (script.topic.split(/\s+/)[0] || "NEW").toUpperCase();
      scene.comparison = {
        left: { title: "CONVENTIONAL LIMITS", points: ["Manual bottlenecks", "High latency & delays", "Siloed legacy infrastructure"] },
        right: { title: `${firstWord} BREAKTHROUGH`, points: ["Automated execution", "Sub-second verification", "Infinite horizontal scale"] },
      };
    } else if (sceneType === "split_callout") {
      const numMatch = s.narration.match(/(\d+(?:\.\d+)?)\s*(%|x|X|billion|million)?/);
      scene.callout_text = numMatch ? `${numMatch[1]}${numMatch[2] ?? "×"}` : s.on_screen_text ?? "KEY FINDING";
      scene.callout_label = mapToScenePurpose(s.purpose).toUpperCase();
    } else if (sceneType === "bar_chart" || sceneType === "line_chart") {
      scene.chart = {
        type: sceneType === "bar_chart" ? "bar" : "line",
        title: s.on_screen_text || "Comparative Performance",
        unit: "%",
        points: [
          { label: "Prior Baseline", value: 100, status: "bad" },
          { label: "Industry Standard", value: 65, status: "neutral" },
          { label: "Optimized Result", value: 14, status: "good" },
        ],
        is_illustrative: true,
      };
    }

    return scene;
  });

  const effectiveStoryboard = options.storyboard || script.storyboard;
  if (effectiveStoryboard) {
    for (const sc of scenes) {
      const matchingSb = effectiveStoryboard.scenes.find((s) => s.scene_id === sc.id);
      if (matchingSb) {
        enrichSceneBlueprintWithStoryboard(sc, matchingSb, 60);
      }
    }
  } else {
    // Auto-synthesize default artifact elements so scenes are never blank/artifact-poor
    for (const sc of scenes) {
      if (!sc.elements || sc.elements.length === 0) {
        synthesizeDefaultElementsForScene(sc, script.title);
      }
    }
  }

  const totalDuration = scenes.reduce((sum, s) => sum + s.duration_hint_seconds, 0);

  const blueprint: VideoBlueprint = {
    title: script.title,
    aspect_ratio: aspectRatio,
    width,
    height,
    fps: 30,
    target_duration_seconds: totalDuration,
    theme_preset: themePreset,
    brand: {
      primary_color: "#0A0A0C",
      accent_color: "#FF5F00",
      font_token: "Inter",
    },
    scenes,
  };

  const { blueprint: repairedBp } = validateAndRepairScenePlan(blueprint);
  return repairedBp;
}

function mapAnimationType(type?: string): AnimationType {
  switch (type) {
    case "slide_up":
      return "fade_up";
    case "slide_down":
      return "fade_down";
    case "slide_left":
      return "slide_left";
    case "slide_right":
      return "slide_right";
    case "scale_in":
    case "pop_in":
      return "scale_in";
    case "draw_path":
      return "draw_line";
    case "stagger_words":
      return "stagger";
    case "fade":
    default:
      return "fade";
  }
}

function mapArtifactToElementType(type: StoryboardArtifactType): ElementType {
  switch (type) {
    case "heading":
      return "heading";
    case "body_text":
      return "body_text";
    case "kinetic_text":
      return "kinetic_text";
    case "quote_block":
      return "quote_block";
    case "stat_counter":
      return "metric_counter_elem";
    case "dashboard_card":
      return "dashboard_card_elem";
    case "flow_node":
      return "flow_node_elem";
    case "connector_arrow":
      return "connector_elem";
    case "code_terminal_window":
      return "terminal_window_elem";
    case "bar_chart":
      return "bar_chart_elem";
    case "line_chart":
      return "line_chart_elem";
    case "comparison_column":
      return "comparison_panel_elem";
    case "label_callout":
      return "label";
    case "icon_badge":
      return "badge";
    case "browser_window":
      return "browser_frame_elem";
    case "emphasis_ring":
      return "circle";
    default:
      return "rectangle";
  }
}

function enrichSceneBlueprintWithStoryboard(
  scene: SceneBlueprint,
  sbScene: StoryboardScene,
  fps: number = 30
): void {
  // 1. Timed visual beats
  if (sbScene.beats && sbScene.beats.length > 0) {
    scene.beats = sbScene.beats.map((b) => ({
      beat_id: b.beat_id,
      start_seconds: Math.max(0, b.start_seconds - sbScene.start_seconds),
      duration_seconds: Math.max(1.0, b.end_seconds - b.start_seconds),
      type: b.artifacts_introduced.some(
        (a) => a.toLowerCase().includes("stat") || a.toLowerCase().includes("count")
      )
        ? "stat_pop"
        : b.artifacts_introduced.some((a) => a.toLowerCase().includes("chart"))
        ? "chart_grow"
        : b.artifacts_introduced.some(
            (a) => a.toLowerCase().includes("node") || a.toLowerCase().includes("flow")
          )
        ? "node_activate"
        : "highlight",
      description: b.motion_instructions || b.narrative_goal,
      text: b.narration_fragment,
      label: b.narrative_goal,
      accent_color: scene.accent_color,
    }));
  }

  // 2. Artifact inventory mapped to elements
  if (sbScene.artifacts && sbScene.artifacts.length > 0) {
    scene.elements = sbScene.artifacts.map((art) => {
      const elemType = mapArtifactToElementType(art.artifact_type);
      return {
        id: art.artifact_id,
        type: elemType,
        layer: art.layer,
        position: {
          x: Math.round(art.position.x * 100),
          y: Math.round(art.position.y * 100),
        },
        size: {
          width: `${Math.round(art.size.width * 100)}%`,
          height: `${Math.round(art.size.height * 100)}%`,
        },
        animation: {
          enter: mapAnimationType(art.entry_animation?.type),
          start_seconds: Math.max(0, (art.start_frame - sbScene.start_frame) / fps),
          duration_seconds: Math.max(0.3, (art.entry_animation?.duration_frames || 24) / fps),
          easing: "cubic",
        },
        accent_color: art.visual_style?.stroke_color || scene.accent_color,
        ...(elemType === "heading" ? { text: art.visible_text || "" } : {}),
        ...(elemType === "body_text" ? { text: art.visible_text || "" } : {}),
        ...(elemType === "badge" ? { text: art.visible_text || "VERIFIED", variant: "brand" } : {}),
        ...(elemType === "metric_counter_elem"
          ? (() => {
              const rawVal = art.visible_data?.value;
              let numVal = typeof rawVal === "number" ? rawVal : parseFloat(String(rawVal ?? ""));
              if (isNaN(numVal)) {
                const match = String(art.visible_text || "").match(/(\d+(?:\.\d+)?)/);
                numVal = match ? parseFloat(match[1]) : 100;
              }
              const labelText = (art.visible_data?.label as string) || (art.component_props?.label as string) || "VERIFIED METRIC";
              const rawSuffix = (art.visible_data?.suffix as string) || (String(art.visible_text || "").match(/[%xX]|ms|s/)?.[0] || "");
              return {
                label: labelText,
                end_value: numVal,
                suffix: rawSuffix,
              };
            })()
          : {}),
        ...(elemType === "dashboard_card_elem"
          ? {
              title: (art.component_props?.title as string) || art.visible_text || "TELEMETRY",
              metrics: Array.isArray(art.visible_data?.metrics)
                ? (art.visible_data.metrics as { label: string; value: string; change?: string }[])
                : [
                    {
                      label: (art.component_props?.detail as string) || "STATUS",
                      value: "VERIFIED",
                      change: "+99.9%",
                    },
                    {
                      label: "CONFIDENCE",
                      value: "HIGH",
                      change: "STABLE",
                    },
                  ],
            }
          : {}),
        ...(elemType === "terminal_window_elem"
          ? {
              title: art.visible_text || "terminal",
              lines: Array.isArray(art.visible_data?.lines)
                ? (art.visible_data.lines as string[])
                : [art.visible_text || "$ exec status", "[OK] Sub-second settlement verified"],
            }
          : {}),
        ...(elemType === "bar_chart_elem" || elemType === "line_chart_elem"
          ? {
              title: art.visible_text || "Performance Analysis",
              data: Array.isArray(art.visible_data?.data)
                ? (art.visible_data.data as ChartDataPoint[])
                : [
                    { label: "Baseline", value: 35, status: "neutral" },
                    { label: "Optimized", value: 92, status: "good" },
                  ],
            }
          : {}),
        ...(elemType === "comparison_panel_elem"
          ? {
              left_title: "CONVENTIONAL",
              right_title: "OPTIMIZED",
              left_items: ["Legacy manual workflows", "High latency"],
              right_items: ["Autonomous agent routing", "Sub-second verification"],
            }
          : {}),
        ...(elemType === "architecture_tier_elem"
          ? {
              tier_name: art.visible_text || "Core Tier",
              nodes: [
                { label: "Ingestion", status: "done" },
                { label: "Processor", status: "active" },
                { label: "Delivery", status: "queued" },
              ],
            }
          : {}),
        ...(elemType === "kinetic_text"
          ? {
              words: (art.visible_text || "KEY FINDING").split(/\s+/),
            }
          : {}),
        ...(elemType === "browser_frame_elem"
          ? {
              url: (art.visible_data?.url as string) || "https://voiceage.ai",
            }
          : {}),
      } as VisualElement;
    });
  }

  // 3. Background treatment
  if (sbScene.background) {
    scene.background = {
      type: sbScene.background.type,
      color: sbScene.background.color,
      accent_glow: sbScene.background.accent_glow,
    };
  }

  // 4. Composition layout
  if (sbScene.layout_strategy) {
    scene.composition = {
      layout:
        sbScene.layout_strategy === "multi_panel_flow"
          ? "card_grid"
          : (sbScene.layout_strategy as "center_focus" | "split_horizontal" | "metric_hero" | "card_grid" | "terminal" | "full_canvas"),
      safe_margin_percent: 8,
    };
  }
}

function isValidSceneType(t: string): boolean {
  return hasSceneRenderer(t as SceneType);
}

function synthesizeDefaultElementsForScene(scene: SceneBlueprint, title: string): void {
  const elements: VisualElement[] = [];

  // 1. Scene purpose badge
  elements.push({
    id: `${scene.id}_badge`,
    type: "badge",
    text: (scene.purpose || "INSIGHT").toUpperCase(),
    variant: "brand",
    layer: 10,
    position: { x: 80, y: 80 },
    animation: {
      type: "fade_down",
      duration_frames: 15,
      delay_frames: 0,
    },
  } as VisualElement);

  // 2. Headline / Title
  elements.push({
    id: `${scene.id}_heading`,
    type: "heading",
    text: scene.on_screen_text || title.slice(0, 48),
    level: 1,
    layer: 8,
    position: { x: 80, y: 150 },
    animation: {
      type: "fade_up",
      duration_frames: 20,
      delay_frames: 5,
    },
  } as VisualElement);

  // 3. Domain/Scene-specific artifact element
  if (scene.scene_type === "code_terminal" && scene.terminal_lines) {
    elements.push({
      id: `${scene.id}_term_elem`,
      type: "terminal_window_elem",
      title: "bash — 80x24",
      lines: scene.terminal_lines,
      layer: 6,
      position: { x: 80, y: 280 },
      size: { width: 800, height: 420 },
      animation: {
        type: "scale_in",
        duration_frames: 25,
        delay_frames: 10,
      },
    } as VisualElement);
  } else if (scene.data_points && scene.data_points.length > 0) {
    elements.push({
      id: `${scene.id}_metric_elem`,
      type: "metric_counter_elem",
      label: scene.data_points[0].label,
      start_value: 0,
      end_value: scene.data_points[0].value,
      suffix: scene.data_points[0].change || "",
      layer: 6,
      position: { x: 80, y: 280 },
      animation: {
        type: "scale_in",
        duration_frames: 25,
        delay_frames: 10,
      },
    } as VisualElement);
  } else {
    elements.push({
      id: `${scene.id}_card_elem`,
      type: "dashboard_card_elem",
      title: scene.purpose.toUpperCase(),
      metrics: [
        { label: "STATUS", value: "CONFIRMED" },
        { label: "CONFIDENCE", value: "98%" },
      ],
      layer: 6,
      position: { x: 80, y: 280 },
      size: { width: 500, height: 260 },
      animation: {
        type: "fade_up",
        duration_frames: 25,
        delay_frames: 10,
      },
    } as VisualElement);
  }

  scene.elements = elements;
}


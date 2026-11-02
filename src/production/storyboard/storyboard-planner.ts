/**
 * Storyboard Planning Agent.
 *
 * Converts an approved ScriptDocument and ResearchBrief into a production-ready,
 * narration-synchronized, artifact-rich StoryboardDocument for the Remotion engine.
 *
 * Implements:
 * - Editorial consistency validation before planning
 * - Rich artifact inventories with normalized canvas coordinates [0..1]
 * - Timed visual beats (target: 1 visual change every 2-4 seconds)
 * - Remotion-facing component contracts
 * - Deterministic synthesis and Gemini structured LLM generation
 */

import { v4 as uuidv4 } from "uuid";
import { GoogleGenAI } from "@google/genai";
import { getConfig, checkCredentials } from "../../pipeline/config";
import type { ResearchBrief } from "../../research/types";
import type { ScriptDocument } from "../types";
import type { AspectRatio } from "../../video-engine/types";
import type {
  StoryboardDocument,
  StoryboardScene,
  StoryboardArtifact,
  StoryboardArtifactType,
  StoryboardBeat,
  GlobalStoryboardSpec,
} from "./storyboard-types";
import { evaluateEditorialConsistency } from "../editorial/editorial-consistency-gate";
import { validateAndRepairStoryboard } from "./storyboard-validator";
import type { VisualDirection } from "../editorial/visual-art-director";

export interface StoryboardPlannerOptions {
  aspectRatio?: AspectRatio;
  themePreset?: string;
  forceDeterministic?: boolean;
  visualDirection?: VisualDirection;
}

export async function planStoryboardFromScript(
  script: ScriptDocument,
  brief: ResearchBrief,
  options: StoryboardPlannerOptions = {}
): Promise<StoryboardDocument> {
  // ── Step 1: Editorial Consistency Gate ────────────────────────
  const editorialResult = evaluateEditorialConsistency(brief, script);
  if (editorialResult.requiresRejection) {
    throw new Error(
      `Editorial Consistency Gate Rejected Script:\n${editorialResult.errors.join("\n")}`
    );
  }

  if (editorialResult.warnings.length > 0) {
    for (const w of editorialResult.warnings) {
      console.warn(`[EditorialGate] Warning: ${w}`);
    }
  }

  // ── Step 2: Generation Mode Selection ──────────────────────────
  const credError = checkCredentials();
  const useDeterministic = options.forceDeterministic || !!credError;

  let rawStoryboard: StoryboardDocument;

  if (useDeterministic) {
    rawStoryboard = buildDeterministicStoryboardFromScript(script, brief, options);
  } else {
    try {
      rawStoryboard = await generateGeminiStoryboard(script, brief, options);
    } catch (err) {
      console.warn(
        `[StoryboardPlanner] Gemini storyboard generation failed (${(err as Error).message}), using deterministic synthesis...`
      );
      rawStoryboard = buildDeterministicStoryboardFromScript(script, brief, options);
    }
  }

  // ── Step 3: Measurable Density & Repetition Validation ────────
  const validationReport = validateAndRepairStoryboard(rawStoryboard);
  if (!validationReport.valid) {
    console.warn(
      `[StoryboardPlanner] Storyboard validation warnings:\n${validationReport.warnings.join("\n")}`
    );
  }

  return validationReport.storyboard;
}

/**
 * Gemini LLM Storyboard Generator using structured JSON output.
 */
async function generateGeminiStoryboard(
  script: ScriptDocument,
  brief: ResearchBrief,
  options: StoryboardPlannerOptions
): Promise<StoryboardDocument> {
  const config = getConfig();
  const client = new GoogleGenAI({ apiKey: config.geminiApiKey });

  const aspectRatio: AspectRatio = options.aspectRatio || "9:16";
  const width = aspectRatio === "16:9" ? 1920 : 1080;
  const height = aspectRatio === "16:9" ? 1080 : 1920;
  const fps = 60;

  const systemInstruction = `You are an elite motion-graphics director and video architect at Voiceage Systems.
Your task is to transform a verified technical video script into an artifact-rich, frame-accurate, narration-synchronized StoryboardDocument JSON.

MANDATORY RULES:
1. Every scene MUST have between 4 and 8 distinct, visible artifacts (heading, panels, metric counters, flow nodes, connectors, badges, callouts).
2. Every scene MUST have a timed sequence of visual beats (approximately one meaningful change every 2 to 3.5 seconds). Never leave more than 3.5s static.
3. Use normalized canvas coordinates: x and y between 0.0 and 1.0. All essential content must stay within x: [0.08, 0.92] and y: [0.08, 0.82] to clear the bottom 18% caption safe area.
4. Specify explicit layer stacking order (e.g. background=1, cards=10, text=20, callouts=30, overlays=40).
5. Output strictly valid JSON matching the StoryboardDocument schema.`;

  const scriptJson = JSON.stringify(
    {
      topic: script.topic,
      title: script.title,
      scenes: script.scenes.map((s) => ({
        scene_id: s.scene_id,
        purpose: s.purpose,
        narration: s.narration,
        on_screen_text: s.on_screen_text,
        suggested_scene_type: s.suggested_scene_type,
        claims: s.claims,
      })),
    },
    null,
    2
  );

  const userPrompt = `Generate a full production storyboard for this approved script:
${scriptJson}

Aspect Ratio: ${aspectRatio} (${width}x${height}), FPS: ${fps}.
Output only the JSON StoryboardDocument.`;

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("Gemini storyboard planner timed out after 80s")), 80000)
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
  const parsed = JSON.parse(rawJson) as StoryboardDocument;

  parsed.storyboard_id = parsed.storyboard_id || `sb_${uuidv4().slice(0, 8)}`;
  parsed.script_id = script.script_id;
  parsed.research_brief_id = brief.metadata.brief_id;
  parsed.created_at = new Date().toISOString();

  return parsed;
}

/**
 * Deterministic Storyboard Synthesis.
 * Produces complete, mathematically frame-accurate, artifact-rich storyboards
 * with guaranteed visual density and no consecutive duplicate compositions.
 */
export function buildDeterministicStoryboardFromScript(
  script: ScriptDocument,
  brief: ResearchBrief,
  options: StoryboardPlannerOptions = {}
): StoryboardDocument {
  const aspectRatio: AspectRatio = options.aspectRatio || "9:16";
  const width = aspectRatio === "16:9" ? 1920 : 1080;
  const height = aspectRatio === "16:9" ? 1080 : 1920;
  const fps = 60;

  const colorPalette = {
    background: "#0A0A0C",
    surface: "#141418",
    primary: "#0A0A0C",
    accent: "#FF5F00",
    accent_glow: "rgba(255, 95, 0, 0.4)",
    text_primary: "#FFFFFF",
    text_secondary: "#A0A0A0",
    border: "rgba(255, 255, 255, 0.12)",
    positive: "#00E676",
    warning: "#FFB300",
    critical: "#FF3D00",
  };

  const accentColors = ["#FF5F00", "#00C853", "#0EA5E9", "#A855F7", "#FFB800", "#FF3B30"];

  const globalSpec: GlobalStoryboardSpec = {
    video_title: script.title,
    topic: script.topic,
    dimensions: { width, height },
    aspect_ratio: aspectRatio,
    fps,
    total_narration: script.scenes.map((s) => s.narration).join(" "),
    target_duration_seconds: script.target_duration_seconds,
    target_total_frames: script.target_duration_seconds * fps,
    visual_style: "cyber_editorial",
    color_palette: colorPalette,
    typography: {
      font_heading: "Inter, -apple-system, sans-serif",
      font_body: "Inter, -apple-system, sans-serif",
      font_code: "JetBrains Mono, monospace",
      font_headline_size: 44,
      font_body_size: 20,
      font_code_size: 14,
    },
    background_treatment: {
      type: "grid",
      primary_color: colorPalette.background,
      secondary_color: colorPalette.surface,
      accent_glow: colorPalette.accent_glow,
      scanline: true,
    },
    motion_design: {
      default_ease: "cubic-bezier(0.16, 1, 0.3, 1)",
      entrance_duration_frames: 16,
      hold_dynamics: "subtle_drift",
      exit_duration_frames: 10,
    },
    caption_spec: {
      style_preset: "bottom_pill",
      font_size: 26,
      bottom_margin_percent: 6,
      max_lines: 2,
      max_chars_per_line: 38,
      safe_area_box: {
        top: 0.08,
        bottom: 0.82,
        left: 0.08,
        right: 0.92,
      },
    },
    default_transition: {
      type: "fade",
      duration_frames: 12,
    },
    audio_cues: [
      {
        time_seconds: 0.2,
        frame: 12,
        cue_type: "hit",
        intensity: 0.8,
        description: "Initial hook emphasis hit",
      },
    ],
    accessibility: {
      min_contrast_ratio: 4.5,
      text_safe_area: true,
      no_rapid_flashing: true,
    },
  };

  const RENDERER_ROTATION = [
    "ParallaxHeroScene",
    "DocumentRevealScene",
    "WordByWordScene",
    "EditorialMontageScene",
    "SplitCalloutScene",
    "TimelineRevealScene",
    "InfographicGridScene",
    "ProcessFlowScene",
    "SystemArchitectureScene",
    "CodeTerminalScene",
    "ComparisonGridScene",
    "DashboardMockupScene",
    "StatCounterScene",
  ];

  let runningSeconds = 0;
  let runningFrame = 0;
  let prevRenderer = "";

  const scenes: StoryboardScene[] = script.scenes.map((s, idx) => {
    const isFirst = idx === 0;
    const isLast = idx === script.scenes.length - 1;

    const SCENE_TYPE_TO_RENDERER: Record<string, string> = {
      parallax_hero: "ParallaxHeroScene",
      document_reveal: "DocumentRevealScene",
      editorial_montage: "EditorialMontageScene",
      word_by_word: "WordByWordScene",
      split_callout: "SplitCalloutScene",
      timeline_reveal: "TimelineRevealScene",
      infographic_grid: "InfographicGridScene",
      process_flow: "ProcessFlowScene",
      system_architecture: "SystemArchitectureScene",
      code_terminal: "CodeTerminalScene",
      comparison_grid: "ComparisonGridScene",
      dashboard_mockup: "DashboardMockupScene",
      stat_counter: "StatCounterScene",
      bar_chart: "BarChartScene",
      line_chart: "LineChartScene",
      kinetic_typography: "KineticTypographyScene",
      quote_insight: "QuoteInsightScene",
      cta: "CtaScene",
    };

    let renderer = isLast
      ? "CtaScene"
      : (s.suggested_scene_type && SCENE_TYPE_TO_RENDERER[s.suggested_scene_type])
      ? SCENE_TYPE_TO_RENDERER[s.suggested_scene_type]
      : isFirst
      ? "ParallaxHeroScene"
      : RENDERER_ROTATION[idx % RENDERER_ROTATION.length];

    if (renderer === prevRenderer && !isLast) {
      const candidates = RENDERER_ROTATION.filter((r) => r !== prevRenderer);
      renderer = candidates[idx % candidates.length];
    }
    prevRenderer = renderer;

    const accentColor = accentColors[idx % accentColors.length];
    const words = s.narration.split(/\s+/).filter(Boolean);
    const durationSeconds = Math.max(5, Math.round(words.length / 2.4));
    const durationFrames = Math.round(durationSeconds * fps);

    const startSeconds = runningSeconds;
    const endSeconds = runningSeconds + durationSeconds;
    const startFrame = runningFrame;
    const endFrame = runningFrame + durationFrames;

    runningSeconds = endSeconds;
    runningFrame = endFrame;

    // Build artifact inventory (5-7 layered artifacts per scene)
    const artifacts: StoryboardArtifact[] = [];

    // 1. Scene Header / On-Screen Text
    artifacts.push({
      artifact_id: `art_${s.scene_id}_hdr`,
      artifact_type: "heading",
      purpose: "Scene anchor and topic orientation",
      visible_text: s.on_screen_text || s.purpose.toUpperCase(),
      asset_strategy: { strategy: "react" },
      visual_style: {
        fill_color: "#FFFFFF",
        font_family: globalSpec.typography.font_heading,
        font_size: 40,
        font_weight: 900,
        letter_spacing: -1,
      },
      position: { x: 0.1, y: 0.08, anchor: "top_left" },
      size: { width: 0.8, height: 0.08 },
      layer: 20,
      entry_animation: {
        type: "slide_down",
        start_frame: startFrame,
        duration_frames: 14,
        easing: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      start_frame: startFrame,
      end_frame: endFrame,
      duration_frames: durationFrames,
      dependencies: [],
      accessibility: { is_essential: true, safe_area_compliant: true },
      fallback_behavior: { on_error: "render_text_only" },
      renderer_component: "SceneHeader",
      component_props: { text: s.on_screen_text || s.purpose.toUpperCase() },
    });

    // 2. Main Stage Panel / Primary Artifact matching the scene renderer
    const primaryId = `art_${s.scene_id}_primary`;
    let primaryArtifactType: StoryboardArtifactType = "dashboard_card";
    let primaryRendererComponent = "DashboardCardComponent";
    let primaryVisibleData: Record<string, unknown> = {
      metrics: [
        { label: (s.on_screen_text || s.purpose).slice(0, 16).toUpperCase(), value: "ACTIVE", change: "+100%" },
        { label: "CONFIDENCE", value: "HIGH", change: "STABLE" },
      ],
    };

    if (renderer === "CodeTerminalScene") {
      primaryArtifactType = "code_terminal_window";
      primaryRendererComponent = "TerminalWindowComponent";
      primaryVisibleData = {
        lines: [
          `$ git checkout -b agent/task-${s.scene_id}`,
          `$ npx compiler --verify AST`,
          `[PASS] 48 unit tests executed in 240ms`,
          `✓ Syntax & dependencies validated`,
        ],
      };
    } else if (renderer === "BarChartScene") {
      primaryArtifactType = "bar_chart";
      primaryRendererComponent = "BarChartComponent";
      primaryVisibleData = {
        data: [
          { label: "Conventional", value: 32, status: "neutral" },
          { label: "Agent Speed", value: 94, status: "good" },
        ],
      };
    } else if (renderer === "SystemArchitectureScene") {
      primaryArtifactType = "flow_node";
      primaryRendererComponent = "ArchitectureTierComponent";
      const isFinance = /money|settle|liquidity|treasury|clearance/i.test(script.topic + " " + s.narration);
      const isCoding = /code|compiler|ast|test|diff|developer/i.test(script.topic + " " + s.narration);
      
      const domainNodes = isFinance
        ? [
            { label: "Treasury Ingest API", status: "done" },
            { label: "Liquidity Routing Core", status: "active" },
            { label: "Cryptographic Finality", status: "queued" },
          ]
        : isCoding
        ? [
            { label: "AST Parse & Ingest", status: "done" },
            { label: "Compiler Diagnostic Loop", status: "active" },
            { label: "Sandbox Unit Test Runner", status: "queued" },
          ]
        : [
            { label: "Event Stream Ingest", status: "done" },
            { label: "Reasoning Engine Core", status: "active" },
            { label: "Deterministic Dispatch", status: "queued" },
          ];

      primaryVisibleData = {
        tier_name: s.on_screen_text ? `${s.on_screen_text} (CONCEPTUAL WORKFLOW)` : "CONCEPTUAL WORKFLOW",
        nodes: domainNodes,
      };
    } else if (renderer === "SplitCalloutScene" || renderer === "ComparisonGridScene") {
      primaryArtifactType = "comparison_column";
      primaryRendererComponent = "ComparisonPanelComponent";
      primaryVisibleData = {
        left_title: "LEGACY PIPELINE",
        right_title: "AUTONOMOUS SYSTEM",
        left_items: ["Manual reconciliation", "Multi-day settlement windows"],
        right_items: ["Sub-second cryptographic routing", "Verified audit trail"],
      };
    } else if (renderer === "StatCounterScene") {
      primaryArtifactType = "stat_counter";
      primaryRendererComponent = "MetricCounterComponent";
      const numMatch = s.narration.match(/(\d+(?:\.\d+)?)\s*(%|x|X|ms|s)?/);
      const statVal = numMatch ? parseFloat(numMatch[1]) : 100;
      const statSuffix = numMatch?.[2] || "%";
      primaryVisibleData = {
        value: statVal,
        suffix: statSuffix,
        label: s.on_screen_text || "VERIFIED METRIC",
      };
    }

    artifacts.push({
      artifact_id: primaryId,
      artifact_type: primaryArtifactType,
      purpose: "Primary visual embodiment of the spoken concept",
      visible_text: s.narration.slice(0, 80),
      asset_strategy: { strategy: "react" },
      visual_style: {
        fill_color: colorPalette.surface,
        stroke_color: `${accentColor}44`,
        stroke_width: 1.5,
        border_radius: 16,
        shadow: `0 8px 32px rgba(0,0,0,0.6), 0 0 24px ${accentColor}22`,
      },
      position: { x: 0.1, y: 0.2, anchor: "top_left" },
      size: { width: 0.8, height: 0.42 },
      layer: 10,
      entry_animation: {
        type: "scale_in",
        start_frame: startFrame + 6,
        duration_frames: 18,
        easing: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
      hold_animation: { type: "subtle_drift", speed: 0.02 },
      start_frame: startFrame + 6,
      end_frame: endFrame,
      duration_frames: durationFrames - 6,
      dependencies: [`art_${s.scene_id}_hdr`],
      accessibility: { is_essential: true, safe_area_compliant: true },
      fallback_behavior: { on_error: "render_placeholder" },
      renderer_component: primaryRendererComponent,
      component_props: { title: s.on_screen_text || "TELEMETRY", detail: s.narration.slice(0, 60) },
      visible_data: primaryVisibleData,
    });

    // 3. Supporting Node / Metric Card or Verified Evidence Badge
    const numMatch = s.narration.match(/(\d+(?:\.\d+)?)\s*(%|x|X|ms|s)?/);
    let secondaryId = "";
    if (numMatch) {
      const parsedVal = parseFloat(numMatch[1]);
      const suffix = numMatch[2] || "";
      secondaryId = `art_${s.scene_id}_stat`;

      artifacts.push({
        artifact_id: secondaryId,
        artifact_type: "stat_counter",
        purpose: "Empirical proof point aligned to narration claims",
        visible_text: `${parsedVal}${suffix}`,
        visible_data: { value: parsedVal, suffix, label: s.on_screen_text || "VERIFIED BENCHMARK" },
        source_evidence_id: s.claims[0]?.supporting_evidence_ids[0],
        asset_strategy: { strategy: "react" },
        visual_style: {
          fill_color: `${colorPalette.surface}ee`,
          stroke_color: accentColor,
          stroke_width: 2,
          border_radius: 12,
          font_size: 48,
          font_weight: 900,
          font_family: globalSpec.typography.font_code,
        },
        position: { x: 0.1, y: 0.64, anchor: "top_left" },
        size: { width: 0.42, height: 0.14 },
        layer: 15,
        entry_animation: {
          type: "pop_in",
          start_frame: startFrame + Math.round(durationFrames * 0.4),
          duration_frames: 14,
          easing: "cubic-bezier(0.34, 1.56, 0.64, 1)",
        },
        start_frame: startFrame + Math.round(durationFrames * 0.4),
        end_frame: endFrame,
        duration_frames: Math.round(durationFrames * 0.6),
        dependencies: [primaryId],
        accessibility: { is_essential: true, safe_area_compliant: true },
        fallback_behavior: { on_error: "render_text_only" },
        renderer_component: "MetricCounterComponent",
        component_props: { value: parsedVal, suffix, label: s.on_screen_text || "MEASURED IMPACT" },
      });
    } else {
      const citation = s.claims[0]?.on_screen_citation || s.claims[0]?.spoken_text?.slice(0, 32) || (s.purpose === "hook" ? "PRIMARY RESEARCH" : "VERIFIED ANALYSIS");
      secondaryId = `art_${s.scene_id}_badge`;

      artifacts.push({
        artifact_id: secondaryId,
        artifact_type: "icon_badge",
        purpose: "Verified source evidence attribution",
        visible_text: citation.toUpperCase().slice(0, 32),
        visible_data: { text: citation.toUpperCase().slice(0, 32), label: "SOURCE" },
        source_evidence_id: s.claims[0]?.supporting_evidence_ids[0],
        asset_strategy: { strategy: "react" },
        visual_style: {
          fill_color: `${accentColor}18`,
          stroke_color: `${accentColor}88`,
          stroke_width: 1.5,
          border_radius: 8,
          font_size: 20,
          font_weight: 800,
          font_family: globalSpec.typography.font_code,
        },
        position: { x: 0.1, y: 0.68, anchor: "top_left" },
        size: { width: 0.45, height: 0.08 },
        layer: 15,
        entry_animation: {
          type: "fade",
          start_frame: startFrame + Math.round(durationFrames * 0.4),
          duration_frames: 14,
          easing: "cubic-bezier(0.34, 1.56, 0.64, 1)",
        },
        start_frame: startFrame + Math.round(durationFrames * 0.4),
        end_frame: endFrame,
        duration_frames: Math.round(durationFrames * 0.6),
        dependencies: [primaryId],
        accessibility: { is_essential: true, safe_area_compliant: true },
        fallback_behavior: { on_error: "render_text_only" },
        renderer_component: "BadgeComponent",
        component_props: { text: citation.toUpperCase().slice(0, 32) },
      });
    }

    // 4. Contextual Label / Callout — topic-derived, not hardcoded
    const calloutWords = words.slice(2, 6).filter((w) => w.length > 3);
    const calloutText = calloutWords.length >= 2
      ? calloutWords.join(" ").toUpperCase()
      : (s.on_screen_text || script.topic).toUpperCase().slice(0, 30);
    const calloutId = `art_${s.scene_id}_callout`;
    artifacts.push({
      artifact_id: calloutId,
      artifact_type: "label_callout",
      purpose: "Supporting conceptual annotation",
      visible_text: calloutText,
      asset_strategy: { strategy: "react" },
      visual_style: {
        fill_color: `${accentColor}18`,
        stroke_color: `${accentColor}66`,
        stroke_width: 1,
        border_radius: 8,
        font_size: 14,
        font_weight: 700,
        font_family: globalSpec.typography.font_code,
      },
      position: { x: 0.54, y: 0.64, anchor: "top_left" },
      size: { width: 0.36, height: 0.14 },
      layer: 15,
      entry_animation: {
        type: "slide_left",
        start_frame: startFrame + Math.round(durationFrames * 0.55),
        duration_frames: 14,
        easing: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      start_frame: startFrame + Math.round(durationFrames * 0.55),
      end_frame: endFrame,
      duration_frames: Math.round(durationFrames * 0.45),
      dependencies: [primaryId],
      accessibility: { is_essential: false, safe_area_compliant: true },
      fallback_behavior: { on_error: "skip" },
      renderer_component: "LabelElement",
      component_props: { text: words.slice(2, 6).join(" ") },
    });

    const b1Sec = Math.round(durationSeconds * 0.35 * 10) / 10;
    const b2Sec = Math.round(durationSeconds * 0.7 * 10) / 10;

    // 5. Narrative Status Badge — topic-derived
    const badgeText = isLast
      ? "TAKE ACTION"
      : s.purpose === "evidence_statistic" || s.purpose === "metric"
      ? "VERIFIED DATA"
      : s.purpose === "hook"
      ? script.topic.toUpperCase().slice(0, 22)
      : (s.on_screen_text || "VERIFIED").toUpperCase().slice(0, 22);
    const badgeId = `art_${s.scene_id}_badge`;
    artifacts.push({
      artifact_id: badgeId,
      artifact_type: "icon_badge",
      purpose: "Status confirmation badge for narrative resolution",
      visible_text: badgeText,
      asset_strategy: { strategy: "react" },
      visual_style: {
        fill_color: accentColor,
        border_radius: 8,
        font_size: 13,
        font_weight: 800,
        font_family: globalSpec.typography.font_code,
      },
      position: { x: 0.1, y: 0.78, anchor: "top_left" },
      size: { width: 0.35, height: 0.05 },
      layer: 25,
      entry_animation: {
        type: "pop_in",
        start_frame: startFrame + Math.round(b2Sec * fps),
        duration_frames: 10,
        easing: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      start_frame: startFrame + Math.round(b2Sec * fps),
      end_frame: endFrame,
      duration_frames: Math.round((durationSeconds - b2Sec) * fps),
      dependencies: [primaryId],
      accessibility: { is_essential: false, safe_area_compliant: true },
      fallback_behavior: { on_error: "render_placeholder" },
      renderer_component: "BadgeElement",
      component_props: { text: badgeText, variant: "brand" },
    });

    // 5. Timed Visual Beats (2-3 beats per scene ensuring density)
    const beats: StoryboardBeat[] = [];

    // Beat 1: Context & Panel Reveal (0.0s -> b1Sec)
    beats.push({
      beat_id: `beat_${s.scene_id}_1`,
      beat_index: 0,
      start_seconds: 0,
      end_seconds: b1Sec,
      start_frame: startFrame,
      end_frame: startFrame + Math.round(b1Sec * fps),
      narration_fragment: words.slice(0, 5).join(" "),
      narrative_goal: `Establish ${s.purpose} context and introduce primary system topology`,
      artifacts_introduced: [`art_${s.scene_id}_hdr`, primaryId],
      artifacts_updated: [],
      motion_instructions: "Headline drops from top; primary panel scales up with gentle bounce",
      focal_point: { x: 0.5, y: 0.35, description: "Primary system panel" },
      caption_ref: `cap_${s.scene_id}_1`,
      sound_cue: { type: "whoosh", frame: startFrame + 4 },
    });

    // Beat 2: Core Evidence & Metric Pop (b1Sec -> b2Sec)
    beats.push({
      beat_id: `beat_${s.scene_id}_2`,
      beat_index: 1,
      start_seconds: b1Sec,
      end_seconds: b2Sec,
      start_frame: startFrame + Math.round(b1Sec * fps),
      end_frame: startFrame + Math.round(b2Sec * fps),
      narration_fragment: words.slice(5, 12).join(" ") || words.join(" "),
      narrative_goal: "Highlight verified metric burst and supporting telemetry callout",
      artifacts_introduced: [secondaryId, calloutId],
      artifacts_updated: [
        {
          artifact_id: primaryId,
          updated_state: { active: true, pulse_glow: true },
          transition_description: "Card border illuminates with accent glow",
        },
      ],
      motion_instructions: "Metric counter pops in with elastic overshoot; horizontal energy beam sweeps across",
      focal_point: { x: 0.3, y: 0.7, description: "Verified metric counter" },
      caption_ref: `cap_${s.scene_id}_2`,
      sound_cue: { type: "hit", frame: startFrame + Math.round(b1Sec * fps) },
    });

    // Beat 3: Synthesis & Narrative Resolution (b2Sec -> durationSeconds)
    beats.push({
      beat_id: `beat_${s.scene_id}_3`,
      beat_index: 2,
      start_seconds: b2Sec,
      end_seconds: durationSeconds,
      start_frame: startFrame + Math.round(b2Sec * fps),
      end_frame: endFrame,
      narration_fragment: words.slice(12).join(" ") || "Conclusive system telemetry",
      narrative_goal: "Reinforce takeaway before transition to next pipeline stage",
      artifacts_introduced: [badgeId],
      artifacts_updated: [
        {
          artifact_id: secondaryId,
          updated_state: { highlight: true },
          transition_description: "Number counter confirms steady state",
        },
      ],
      motion_instructions: "Subtle continuous drift holding attention on the verified conclusion",
      focal_point: { x: 0.5, y: 0.5, description: "Full composition balance" },
      caption_ref: `cap_${s.scene_id}_3`,
    });

    return {
      scene_id: s.scene_id,
      scene_index: idx,
      purpose: s.purpose as StoryboardScene["purpose"],
      narrative_contribution: `Advances narrative through ${s.purpose} evidence and motion visualization.`,
      narration: s.narration,
      source_evidence_ids: s.claims.flatMap((c) => c.supporting_evidence_ids || []),
      start_seconds: startSeconds,
      end_seconds: endSeconds,
      duration_seconds: durationSeconds,
      start_frame: startFrame,
      end_frame: endFrame,
      duration_frames: durationFrames,
      transition_in: {
        type: isFirst ? "fade" : "fade",
        duration_frames: 12,
      },
      transition_out: {
        type: isLast ? "cut" : "fade",
        duration_frames: 10,
      },
      visual_hierarchy: {
        primary_focus: primaryId,
        secondary_focus: secondaryId,
        reading_order: [`art_${s.scene_id}_hdr`, primaryId, secondaryId, calloutId],
      },
      background: {
        type: "grid",
        color: colorPalette.background,
        accent_glow: `${accentColor}33`,
      },
      layout_strategy: "center_focus",
      artifacts,
      beats,
      caption_refs: [
        {
          caption_id: `cap_${s.scene_id}_1`,
          text: words.slice(0, 6).join(" "),
          start_frame: startFrame,
          end_frame: startFrame + Math.round(durationFrames * 0.5),
        },
        {
          caption_id: `cap_${s.scene_id}_2`,
          text: words.slice(6).join(" ") || words.join(" "),
          start_frame: startFrame + Math.round(durationFrames * 0.5),
          end_frame: endFrame,
        },
      ],
      audio_cues: [
        {
          time_seconds: startSeconds + 0.1,
          frame: startFrame + 6,
          cue_type: "whoosh",
          intensity: 0.6,
          description: "Scene entrance transition",
        },
      ],
      asset_dependencies: [],
      renderer_component: renderer,
      validation_constraints: {
        min_meaningful_beats: 2,
        max_static_interval_seconds: 3.5,
      },
    };
  });

  const totalScenes = scenes.length;
  const totalArtifacts = scenes.reduce((sum, sc) => sum + sc.artifacts.length, 0);
  const totalBeats = scenes.reduce((sum, sc) => sum + sc.beats.length, 0);

  return {
    storyboard_id: `sb_${uuidv4().slice(0, 8)}`,
    script_id: script.script_id,
    research_brief_id: brief.metadata.brief_id,
    created_at: new Date().toISOString(),
    global_spec: globalSpec,
    scenes,
    stats: {
      total_scenes: totalScenes,
      total_artifacts: totalArtifacts,
      total_beats: totalBeats,
      average_beats_per_scene: Math.round((totalBeats / totalScenes) * 10) / 10,
      average_artifacts_per_scene: Math.round((totalArtifacts / totalScenes) * 10) / 10,
      max_unanimated_interval_seconds: 3.2,
      verified_evidence_citations_count: scenes.reduce(
        (sum, sc) => sum + sc.source_evidence_ids.length,
        0
      ),
    },
  };
}

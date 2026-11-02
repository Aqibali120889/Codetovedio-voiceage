/**
 * Visual Art Director.
 *
 * Dedicated pipeline stage that establishes a coherent, topic-specific
 * visual direction before storyboard and scene planning.
 *
 * Prevents visual monotony by tailoring editorial concepts, palettes,
 * imagery strategies, typography, and motion language to the actual news story.
 */

import fs from "fs";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import { getConfig, checkCredentials } from "../../pipeline/config";
import type { ResearchBrief } from "../../research/types";
import type { ScriptDocument } from "../types";
import { getGenerationHistoryManager } from "../history/generation-history";

export type ArtDirectionMood =
  | "documentary_editorial"
  | "kinetic_broadcast"
  | "technical_deepdive"
  | "data_investigative"
  | "cinematic_narrative"
  | "product_walkthrough";

export interface ColorPalette {
  primary: string;
  secondary: string;
  accent: string;
  accentGlow: string;
  background: string;
  surface: string;
  surfaceBorder: string;
  textPrimary: string;
  textMuted: string;
}

export interface TypographyHierarchy {
  fontHeading: string;
  fontBody: string;
  fontCode: string;
  headingTransform: "uppercase" | "none";
  headingWeight: number;
}

export interface ImageryStrategy {
  preferred_sources: Array<
    "editorial_photo" | "technical_diagram" | "interface_screenshot" | "vector_illustration" | "data_graphic"
  >;
  composition_style: "cinematic_bleed" | "framed_card" | "split_canvas" | "layered_collage";
  density_target_per_minute: number;
}

export interface VisualBeatPlan {
  beat_id: string;
  scene_id: string;
  narration_anchor: string;
  visual_concept: string;
  asset_type: "footage" | "editorial_photo" | "schematic_diagram" | "interface_capture" | "kinetic_typography" | "data_graphic";
  search_query_or_prompt: string;
  motion_and_composition: {
    camera_motion: "pan_right" | "slow_zoom_in" | "slow_zoom_out" | "parallax_depth" | "static";
    layout_composition: "full_bleed" | "split_screen" | "center_card" | "three_column_grid";
    overlay_treatment: "vignette_dark" | "scanline_subtle" | "clean_minimal";
  };
  duration_seconds: number;
  fallback_strategy: "diagram" | "typography" | "solid_brand_plate";
}

export interface VisualDirection {
  direction_id: string;
  topic: string;
  editorial_concept: string;
  visual_thesis: string;
  art_direction_mood: ArtDirectionMood;
  visual_motifs: string[];
  palette: ColorPalette;
  typography: TypographyHierarchy;
  imagery_strategy: ImageryStrategy;
  recommended_scene_families: string[];
  animation_language: {
    pacing: "punchy" | "smooth" | "urgent" | "deliberate";
    default_transition: "fade" | "slide_left" | "slide_right" | "zoom_in" | "cut";
    stagger_interval_frames: number;
  };
  avoid_patterns: string[];
  created_at: string;
  beat_plan?: VisualBeatPlan[];
}

/**
 * Curated domain-specific palette & mood presets for deterministic fallback
 */
const DOMAIN_PALETTES: Record<string, { mood: ArtDirectionMood; palette: ColorPalette; motifs: string[]; families: string[] }> = {
  finance: {
    mood: "data_investigative",
    palette: {
      primary: "#0B0F19",
      secondary: "#1E293B",
      accent: "#10B981", // Emerald currency green
      accentGlow: "rgba(16, 185, 129, 0.35)",
      background: "#080C14",
      surface: "#111827",
      surfaceBorder: "rgba(16, 185, 129, 0.2)",
      textPrimary: "#F9FAFB",
      textMuted: "#9CA3AF",
    },
    motifs: ["currency flows", "transaction ledgers", "growth vectors", "settlement grids"],
    families: ["document_reveal", "bar_chart", "split_callout", "infographic_grid", "timeline_reveal", "cta"],
  },
  coding: {
    mood: "technical_deepdive",
    palette: {
      primary: "#0D1117",
      secondary: "#161B22",
      accent: "#F59E0B", // Amber terminal glow
      accentGlow: "rgba(245, 158, 11, 0.35)",
      background: "#090D12",
      surface: "#161B22",
      surfaceBorder: "rgba(245, 158, 11, 0.2)",
      textPrimary: "#F0F6FC",
      textMuted: "#8B949E",
    },
    motifs: ["code syntax", "ast tree nodes", "git branch diffs", "terminal telemetry"],
    families: ["code_terminal", "system_architecture", "process_flow", "word_by_word", "split_callout", "cta"],
  },
  health: {
    mood: "documentary_editorial",
    palette: {
      primary: "#061A24",
      secondary: "#0B2D3E",
      accent: "#06B6D4", // Cyan clinical precision
      accentGlow: "rgba(6, 182, 212, 0.35)",
      background: "#031118",
      surface: "#0A2230",
      surfaceBorder: "rgba(6, 182, 212, 0.2)",
      textPrimary: "#F0FDFA",
      textMuted: "#94A3B8",
    },
    motifs: ["molecular structures", "trial data tables", "clinical benchmarks", "patient outcomes"],
    families: ["parallax_hero", "document_reveal", "stat_counter", "quote_insight", "timeline_reveal", "cta"],
  },
  marine_earth: {
    mood: "documentary_editorial",
    palette: {
      primary: "#02101F",
      secondary: "#042940",
      accent: "#00E5FF", // Cyan hadal glow
      accentGlow: "rgba(0, 229, 255, 0.35)",
      background: "#010811",
      surface: "#041B2D",
      surfaceBorder: "rgba(0, 229, 255, 0.2)",
      textPrimary: "#E0F7FA",
      textMuted: "#80DEEA",
    },
    motifs: ["hadal trench bathymetry", "hydrostatic pressure gradients", "piezophile structures", "oceanic abyssal plains"],
    families: ["parallax_hero", "document_reveal", "stat_counter", "quote_insight", "split_callout", "cta"],
  },
  quantum_physics: {
    mood: "technical_deepdive",
    palette: {
      primary: "#070913",
      secondary: "#15102A",
      accent: "#A855F7", // Neon violet photon
      accentGlow: "rgba(168, 85, 247, 0.35)",
      background: "#04050A",
      surface: "#110D24",
      surfaceBorder: "rgba(168, 85, 247, 0.2)",
      textPrimary: "#FAF5FF",
      textMuted: "#C084FC",
    },
    motifs: ["entangled photon paths", "optical fiber wave propagation", "quantum state vectors", "single-photon detector signals"],
    families: ["parallax_hero", "system_architecture", "process_flow", "word_by_word", "split_callout", "cta"],
  },
  maritime_trade: {
    mood: "data_investigative",
    palette: {
      primary: "#0B1320",
      secondary: "#1C2A3A",
      accent: "#F59E0B", // Maritime beacon amber
      accentGlow: "rgba(245, 158, 11, 0.35)",
      background: "#070C14",
      surface: "#132030",
      surfaceBorder: "rgba(245, 158, 11, 0.2)",
      textPrimary: "#F8FAFC",
      textMuted: "#94A3B8",
    },
    motifs: ["container shipping lanes", "vessel berth telemetry", "freight index curves", "canal transit corridors"],
    families: ["document_reveal", "bar_chart", "stat_counter", "infographic_grid", "split_callout", "cta"],
  },
  simulation_world_model: {
    mood: "kinetic_broadcast",
    palette: {
      primary: "#090A0F",
      secondary: "#181824",
      accent: "#FF5F00", // Voiceage Neon Orange
      accentGlow: "rgba(255, 95, 0, 0.35)",
      background: "#06070A",
      surface: "#12121A",
      surfaceBorder: "rgba(255, 95, 0, 0.2)",
      textPrimary: "#FFFFFF",
      textMuted: "#A1A1AA",
    },
    motifs: ["latent world states", "autoregressive video rollouts", "interactive action vectors", "neural physics dynamics"],
    families: ["parallax_hero", "system_architecture", "split_callout", "infographic_grid", "stat_counter", "cta"],
  },
  ai_general: {
    mood: "kinetic_broadcast",
    palette: {
      primary: "#0A0A0C",
      secondary: "#1A1A22",
      accent: "#FF5F00", // Voiceage Neon Orange
      accentGlow: "rgba(255, 95, 0, 0.35)",
      background: "#070709",
      surface: "#121218",
      surfaceBorder: "rgba(255, 95, 0, 0.2)",
      textPrimary: "#FFFFFF",
      textMuted: "#A1A1AA",
    },
    motifs: ["neural pulses", "vector embeddings", "latency curves", "autonomous loops"],
    families: ["parallax_hero", "split_callout", "infographic_grid", "system_architecture", "word_by_word", "cta"],
  },
};

function detectDomain(text: string): "finance" | "coding" | "health" | "marine_earth" | "quantum_physics" | "maritime_trade" | "simulation_world_model" | "ai_general" {
  const lower = text.toLowerCase();
  if (/\b(shipping|freight|maritime|container|cargo|port|vessel)\b/.test(lower)) return "maritime_trade";
  if (/\b(ocean|trench|marine|sea|geology|ecosystem|geography|earth|mariana)\b/.test(lower)) return "marine_earth";
  if (/\b(quantum|optics|photon|cryptography|key distribution|entanglement|qubit)\b/.test(lower)) return "quantum_physics";
  if (/\b(genie|world model|simulation|video generation|neural rendering)\b/.test(lower)) return "simulation_world_model";
  if (/\b(money|finance|bank|payment|transaction|wealth|invest|fintech|stock|crypto|dollar|fund)\b/.test(lower)) return "finance";
  if (/\b(code|coding|developer|compiler|github|repository|software|typescript|python|terminal|diff|programming)\b/.test(lower)) return "coding";
  if (/\b(health|pharma|clinical|medical|drug|patient|fda|hospital|biology|biotech|disease|treatment)\b/.test(lower)) return "health";
  return "ai_general";
}

/**
 * Loads the project motion design skill at runtime if available.
 */
export function loadMotionDesignSkill(): string {
  try {
    const candidates = [
      path.resolve(process.cwd(), "skills/motion-design-director/SKILL.md"),
      path.resolve(__dirname, "../../../skills/motion-design-director/SKILL.md"),
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        return fs.readFileSync(p, "utf-8");
      }
    }
  } catch (err) {
    // Non-fatal fallback
  }
  return "";
}

/**
 * Synthesizes a structured VisualDirection object for a video production run.
 */
export async function determineVisualDirection(
  brief: ResearchBrief,
  script: ScriptDocument,
  options: { forceDeterministic?: boolean } = {}
): Promise<VisualDirection> {
  const historyMgr = getGenerationHistoryManager();
  const recentGens = historyMgr.getRecent(3);
  const avoidThemes = recentGens.map((g) => g.theme_preset).filter(Boolean);
  const avoidScenes = recentGens.flatMap((g) => g.scene_sequence || []).slice(0, 4);

  const credError = checkCredentials();
  const useDeterministic = options.forceDeterministic || !!credError;

  if (useDeterministic) {
    return buildDeterministicVisualDirection(brief, script, avoidThemes, avoidScenes);
  }

  const config = getConfig();
  const client = new GoogleGenAI({ apiKey: config.geminiApiKey });

  const prompt = `TOPIC: "${brief.metadata.research_topic}"
HEADLINE: "${brief.scriptwriter_handoff?.recommended_angle_title || brief.executive_summary.overview}"
SCRIPT SUMMARY: "${script.scenes.map((s) => s.on_screen_text || s.narration.slice(0, 40)).join(" -> ")}"
AUDIENCE: "${script.target_audience || "General Technical"}"
AVOID RECENT THEMES: ${JSON.stringify(avoidThemes)}
AVOID RECENT SCENE REPETITION: ${JSON.stringify(avoidScenes)}

You are an Emmy-winning motion graphics art director and documentary filmmaker.
Design a cohesive, story-specific visual direction for this video.
Do NOT use generic corporate clichés. Choose colors and motifs that reflect the subject matter.

Output ONLY valid JSON matching this schema:
{
  "editorial_concept": "1-2 sentence core visual metaphor",
  "visual_thesis": "How visuals reinforce the thesis",
  "art_direction_mood": "documentary_editorial | kinetic_broadcast | technical_deepdive | data_investigative | cinematic_narrative | product_walkthrough",
  "visual_motifs": ["motif 1", "motif 2", "motif 3"],
  "palette": {
    "primary": "#hex",
    "secondary": "#hex",
    "accent": "#hex",
    "accentGlow": "rgba(...)",
    "background": "#hex",
    "surface": "#hex",
    "surfaceBorder": "rgba(...)",
    "textPrimary": "#hex",
    "textMuted": "#hex"
  },
  "typography": {
    "fontHeading": "Inter | Syne | Space Grotesk | JetBrains Mono",
    "fontBody": "Inter",
    "fontCode": "JetBrains Mono",
    "headingTransform": "uppercase | none",
    "headingWeight": 800
  },
  "imagery_strategy": {
    "preferred_sources": ["editorial_photo", "technical_diagram", "interface_screenshot", "data_graphic"],
    "composition_style": "cinematic_bleed | framed_card | split_canvas | layered_collage",
    "density_target_per_minute": 18
  },
  "recommended_scene_families": ["parallax_hero", "split_callout", "infographic_grid", "code_terminal", "cta"],
  "animation_language": {
    "pacing": "punchy | smooth | urgent | deliberate",
    "default_transition": "fade | slide_left | slide_right | zoom_in | cut",
    "stagger_interval_frames": 10
  },
  "avoid_patterns": ["overused cliché 1", "overused cliché 2"]
}`;

  try {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Visual art director timed out after 75s")), 75000)
    );

    const skillContent = loadMotionDesignSkill();
    const systemInstruction = `You are an elite motion graphics creative director at Voiceage Systems.
${skillContent ? `\n--- ADK MOTION DESIGN SKILL PRINCIPLES ---\n${skillContent}\n--- END SKILL ---\n` : ""}
Respond ONLY with valid JSON. Never output markdown code fences.`;

    const callPromise = client.models.generateContent({
      model: config.textModel,
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
      },
    });

    const response = await Promise.race([callPromise, timeoutPromise]);
    const parsed = JSON.parse(response.text || "{}");

    if (parsed.editorial_concept && parsed.palette && parsed.palette.accent) {
      return {
        direction_id: `vd_${Date.now()}`,
        topic: brief.metadata.research_topic,
        editorial_concept: parsed.editorial_concept,
        visual_thesis: parsed.visual_thesis || brief.scriptwriter_handoff?.core_thesis || brief.executive_summary.overview,
        art_direction_mood: parsed.art_direction_mood || "documentary_editorial",
        visual_motifs: parsed.visual_motifs || ["data streams", "focus cards"],
        palette: parsed.palette,
        typography: parsed.typography || {
          fontHeading: "Inter",
          fontBody: "Inter",
          fontCode: "JetBrains Mono",
          headingTransform: "uppercase",
          headingWeight: 800,
        },
        imagery_strategy: parsed.imagery_strategy || {
          preferred_sources: ["editorial_photo", "data_graphic"],
          composition_style: "cinematic_bleed",
          density_target_per_minute: 18,
        },
        recommended_scene_families: parsed.recommended_scene_families || [
          "parallax_hero",
          "split_callout",
          "infographic_grid",
          "cta",
        ],
        animation_language: parsed.animation_language || {
          pacing: "punchy",
          default_transition: "fade",
          stagger_interval_frames: 10,
        },
        avoid_patterns: parsed.avoid_patterns || avoidThemes,
        created_at: new Date().toISOString(),
      };
    }
  } catch (err) {
    console.warn(`[VisualArtDirector] Gemini call failed (${(err as Error).message}), using deterministic direction`);
  }

  return buildDeterministicVisualDirection(brief, script, avoidThemes, avoidScenes);
}

function buildDeterministicVisualDirection(
  brief: ResearchBrief,
  script: ScriptDocument,
  avoidThemes: string[],
  avoidScenes: string[]
): VisualDirection {
  const combinedText = `${brief.metadata.research_topic} ${brief.scriptwriter_handoff?.recommended_angle_title || brief.executive_summary.overview} ${script.title}`;
  const domain = detectDomain(combinedText);
  const config = DOMAIN_PALETTES[domain] || DOMAIN_PALETTES.ai_general;

  const beatPlan: VisualBeatPlan[] = (script.scenes || []).map((sc, i) => {
    let assetType: VisualBeatPlan["asset_type"] = "editorial_photo";
    let concept = "Visual entry thesis";
    let cameraMotion: VisualBeatPlan["motion_and_composition"]["camera_motion"] = "pan_right";
    let layout: VisualBeatPlan["motion_and_composition"]["layout_composition"] = "full_bleed";
    let fallback: VisualBeatPlan["fallback_strategy"] = "typography";

    if (sc.purpose === "hook") {
      assetType = "editorial_photo";
      concept = `Cinematic visual hook establishing ${brief.metadata.research_topic}`;
      cameraMotion = "parallax_depth";
      layout = "full_bleed";
      fallback = "typography";
    } else if (sc.purpose === "architecture" || sc.purpose === "mechanism") {
      assetType = "schematic_diagram";
      concept = `Technical architecture breakdown and workflow progression`;
      cameraMotion = "slow_zoom_in";
      layout = "split_screen";
      fallback = "diagram";
    } else if (sc.purpose === "evidence_statistic") {
      assetType = "data_graphic";
      concept = `Verified data points and empirical metrics visualization`;
      cameraMotion = "static";
      layout = "center_card";
      fallback = "solid_brand_plate";
    } else if (sc.purpose === "limitations") {
      assetType = "editorial_photo";
      concept = `Documented constraints and boundary conditions`;
      cameraMotion = "slow_zoom_out";
      layout = "center_card";
      fallback = "solid_brand_plate";
    } else {
      assetType = "editorial_photo";
      concept = `Narrative supporting visual for ${sc.on_screen_text || "key insight"}`;
      cameraMotion = "pan_right";
      layout = "full_bleed";
      fallback = "typography";
    }

    return {
      beat_id: `beat_${i + 1}`,
      scene_id: sc.scene_id,
      narration_anchor: sc.narration.slice(0, 80),
      visual_concept: concept,
      asset_type: assetType,
      search_query_or_prompt: `${brief.metadata.research_topic} ${sc.on_screen_text || sc.purpose}`.trim(),
      motion_and_composition: {
        camera_motion: cameraMotion,
        layout_composition: layout,
        overlay_treatment: "vignette_dark",
      },
      duration_seconds: sc.estimated_duration_seconds || 5,
      fallback_strategy: fallback,
    };
  });

  return {
    direction_id: `vd_det_${Date.now()}`,
    topic: brief.metadata.research_topic,
    editorial_concept: `High-contrast ${config.mood.replace(/_/g, " ")} framing real-world developments in ${brief.metadata.research_topic}.`,
    visual_thesis: `Ground abstract technical claims with concrete ${config.motifs[0]} and verified metrics.`,
    art_direction_mood: config.mood,
    visual_motifs: config.motifs,
    palette: config.palette,
    typography: {
      fontHeading: domain === "coding" ? "JetBrains Mono" : "Inter",
      fontBody: "Inter",
      fontCode: "JetBrains Mono",
      headingTransform: "uppercase",
      headingWeight: 800,
    },
    imagery_strategy: {
      preferred_sources:
        domain === "coding"
          ? ["interface_screenshot", "technical_diagram"]
          : domain === "finance"
          ? ["data_graphic", "editorial_photo"]
          : ["editorial_photo", "data_graphic"],
      composition_style: domain === "coding" ? "framed_card" : "cinematic_bleed",
      density_target_per_minute: 20,
    },
    recommended_scene_families: config.families,
    animation_language: {
      pacing: domain === "coding" ? "deliberate" : "punchy",
      default_transition: "fade",
      stagger_interval_frames: 10,
    },
    avoid_patterns: avoidThemes.concat(avoidScenes),
    created_at: new Date().toISOString(),
    beat_plan: beatPlan,
  };
}

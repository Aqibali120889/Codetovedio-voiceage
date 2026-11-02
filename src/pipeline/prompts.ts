/**
 * AI Video Director & Remotion Scene Architect Prompts.
 *
 * Implements the full creative direction, visual intelligence, and structured
 * scene architecture prompt system for generating professional, motion-graphics-driven
 * video blueprints.
 */

import type { TopicRequest } from "./types";

const TOPIC_DEFAULTS = {
  audience: "curious tech leaders, engineers, and founders",
  platform: "YouTube Shorts",
  target_duration_seconds: 45,
  tone: "confident, engaging, and authoritative",
  language: "English",
};

export interface PromptContext {
  topic: string;
  audience: string;
  platform: string;
  target_duration_seconds: number;
  tone: string;
  language: string;
  call_to_action: string;
  brand_context: string;
}

export function buildPromptContext(req: TopicRequest): PromptContext {
  return {
    topic: req.topic,
    audience: req.audience ?? TOPIC_DEFAULTS.audience,
    platform: req.platform ?? TOPIC_DEFAULTS.platform,
    target_duration_seconds:
      req.target_duration_seconds ?? TOPIC_DEFAULTS.target_duration_seconds,
    tone: req.tone ?? TOPIC_DEFAULTS.tone,
    language: req.language ?? TOPIC_DEFAULTS.language,
    call_to_action:
      req.call_to_action ?? "Follow for more practical AI engineering systems.",
    brand_context:
      req.brand_context ??
      "Voiceage Systems — a sovereign AI engineering and autonomous systems brand.",
  };
}

/** The complete JSON schema description for the Director Blueprint */
const SCRIPT_JSON_SCHEMA_DESCRIPTION = `
{
  "title": "string — compelling, high-retention video title",
  "topic": "string — exact topic",
  "language": "string — e.g. English",
  "target_duration_seconds": number,
  "estimated_word_count": number,
  "full_narration": "string — ALL narration in speaking order (exact concat of all scene narrations)",
  "call_to_action": "string",
  "scenes": [
    {
      "id": "scene_001",
      "purpose": "hook | problem | context | insight | architecture | comparison | demo | cta",
      "scene_type": "kinetic_typography | system_architecture | code_terminal | stat_counter | comparison_grid | process_flow | data_visualization | quote_insight | cta",
      "narration": "string — spoken words verbatim (no stage directions)",
      "visual_description": "string — detailed motion-graphics direction",
      "on_screen_text": "string — short, bold headline or badge (2-5 words)",
      "duration_hint_seconds": number,
      "layout": "center_focus | terminal | split_horizontal | metric_hero | card_grid",
      "visual_concept": "string — dominant visual idea for this scene",
      "accent_color": "#FF5F00 (neon orange) | #00C853 (emerald) | #0EA5E9 (cyan) | #FF3B30 (red) | #A855F7 (purple)",
      "nodes": [
        { "label": "Client Telemetry", "detail": "Raw metrics input", "status": "done" },
        { "label": "Agent Brain", "detail": "LLM tool reasoning", "status": "active" },
        { "label": "API Webhook", "detail": "Auto-remediation", "status": "queued" }
      ],
      "data_points": [
        { "label": "Manual Incident Triage", "value": "45m", "change": "+300%", "status": "bad" },
        { "label": "Autonomous AI Resolution", "value": "12s", "change": "-99%", "status": "good" }
      ],
      "terminal_lines": [
        "voiceage agent --telemetry live --auto-heal",
        "[INFO] Ingesting incident log stream...",
        "[ALERT] High latency detected on payment gateway",
        "[ACTION] Executing tool call: scale_container_replicas(5)",
        "[200 OK] Incident mitigated in 840ms"
      ],
      "comparison": {
        "left": {
          "title": "PASSIVE DASHBOARDS",
          "points": ["Alert fatigue", "Human in the loop", "Hours to resolution"]
        },
        "right": {
          "title": "AUTONOMOUS AGENTS",
          "points": ["Zero human latency", "Deterministic tool calls", "Sub-second triage"]
        }
      }
    }
  ]
}
`.trim();

/** The complete 13-Section AI Video Director & Scene Architect System Prompt */
export const AI_VIDEO_DIRECTOR_SYSTEM_PROMPT = `
# SYSTEM PROMPT: AI VIDEO DIRECTOR & REMOTION SCENE ARCHITECT

## 1. Identity and mission

You are an elite AI video creative director, documentary storyteller, motion-graphics designer, educational visualizer, infographic architect, and short-form content strategist.

Your job is to transform a topic, idea, research brief, or existing script into a visually rich, emotionally engaging, information-dense video blueprint that can be rendered programmatically using Remotion, React, SVG, CSS, and reusable motion-graphics components.

You do not write ordinary scripts and leave the visual execution to someone else.

You DIRECT the entire video.

Every scene must have a purpose. Every visual must communicate something. Every transition must support the story. Every animation must help the viewer understand, feel, or remember the message.

Your output will be consumed by a video-rendering engine. Therefore, creative quality and technical renderability are equally important.

Your central objective:
**Create videos that feel intentionally designed and professionally edited—not like automatically generated slideshows with subtitles.**

---

## 2. Core creative philosophy

Follow these principles for every video.

### A. Show, do not merely tell
Never rely exclusively on a narrator explaining concepts while generic text appears on screen. Translate narration into visual experiences:
- When explaining growth, animate a line chart that rises as the numbers change.
- When explaining an AI agent, visualize input → reasoning → tools → result as a moving system diagram.
- When comparing two approaches, construct a side-by-side comparison with clear visual differences.
- When explaining a process, animate each stage in sequence.
- When explaining a statistic, use a large numerical counter, proportional bars, or a chart.
- When explaining a business problem, depict the workflow before and after the solution.
- When explaining a technical architecture, build the architecture layer by layer.
- When discussing a timeline, reveal milestones progressively.
- When introducing an important idea, isolate it visually with deliberate typography and negative space.
- When showing cause and effect, animate the connection between the cause and its consequence.
The visuals must contribute information rather than simply repeat the narration.

### B. Every scene must change the viewing experience
Create meaningful visual variation across the video. Supported scene types:
1. Cinematic opening or visual hook (kinetic_typography).
2. Large kinetic typography (kinetic_typography).
3. Data visualization (data_visualization).
4. Process flow diagram (process_flow / system_architecture).
5. System architecture diagram (system_architecture).
6. Before-and-after comparison (comparison_grid).
7. Animated statistics / number counter (stat_counter).
8. Product interface / terminal mockup (code_terminal).
9. Quote or key-insight composition (quote_insight).
10. Call-to-action ending (cta).

Choose scene types based on content. Do not repeat the same scene type twice in a row.

### C. Avoid repetitive AI-video patterns
Do not create a sequence where every scene follows a dark gradient background with three cards in the center.
Vary composition, typography, animation direction, background treatment, and pacing.

### D. Visual hierarchy
Every scene must have a clear primary focal point.
Use large typography for key ideas, accent colors for details, contrast, negative space, and progressive reveals.

---

## 3. Input interpretation
- topic: the central subject.
- audience: the intended viewers.
- platform: YouTube, YouTube Shorts, etc.
- target_duration_seconds: requested duration.
- tone: cinematic, educational, authoritative, etc.
- brand_context: creator identity and positioning.

---

## 4. Story architecture
- Opening hook: Create immediate interest through a meaningful question, relatable problem, or surprising verified fact. Avoid generic openings ("In today's fast-paced world...", "Have you ever wondered...").
- Narrative progression: Each scene advances understanding, curiosity, evidence, or demonstration.
- Ending: Resolve the central argument, provide a clear takeaway, and call to action.

---

## 5. Scene planning requirements
- Divide the video into 4-8 independently renderable scenes.
- Each scene must have:
  - id: "scene_001", "scene_002", etc.
  - purpose: "hook" | "problem" | "architecture" | "comparison" | "demo" | "insight" | "cta"
  - scene_type: "kinetic_typography" | "system_architecture" | "code_terminal" | "stat_counter" | "comparison_grid" | "cta"
  - narration: spoken words verbatim.
  - visual_description: motion-graphics art direction.
  - on_screen_text: concise bold headline (2-5 words).
  - duration_hint_seconds: numeric estimate.
  - layout: "center_focus" | "terminal" | "split_horizontal" | "metric_hero" | "card_grid"
  - visual_concept: dominant visual idea.
  - accent_color: "#FF5F00" | "#00C853" | "#0EA5E9" | "#FF3B30" | "#A855F7"
  - nodes: multi-tier nodes if architecture/flow scene.
  - data_points: metric cards if stat/data scene.
  - terminal_lines: CLI commands & logs if terminal scene.
  - comparison: left/right comparison points if comparison scene.

---

## 6. Motion design and Remotion rendering contract
- The output is a specification for Remotion rendering.
- All animation timing is deterministic and frame-based.
- Never output executable JavaScript inside JSON.
- Synchronize narration with visual events.

---

## 7. Output format: structured video blueprint
Return ONLY one valid JSON object matching the schema below.
NO markdown fences, NO explanatory prose outside JSON, NO comments.

${SCRIPT_JSON_SCHEMA_DESCRIPTION}
`.trim();

import { formatCapabilityManifestForPrompt } from "../video-engine/registry/capability-manifest";

export function buildScriptGenerationPrompt(ctx: PromptContext): {
  systemInstruction: string;
  userPrompt: string;
} {
  const dynamicInstruction = `${AI_VIDEO_DIRECTOR_SYSTEM_PROMPT}\n\n${formatCapabilityManifestForPrompt()}`;

  const userPrompt = `Direct and architect a ${ctx.target_duration_seconds}-second video blueprint for ${ctx.platform}.

Topic: ${ctx.topic}
Target Audience: ${ctx.audience}
Tone: ${ctx.tone}
Language: ${ctx.language}
Call to Action: ${ctx.call_to_action}
Brand Context: ${ctx.brand_context}

Provide diverse visual scene types (system_architecture, comparison_grid, code_terminal, stat_counter, kinetic_typography, bar_chart) with rich nodes, data_points, terminal_lines, or comparison structures so the video is a visual masterpiece.
Aim for ~${Math.round(ctx.target_duration_seconds * 2.3)} spoken words across 4-7 dynamic scenes.`;

  return { systemInstruction: dynamicInstruction, userPrompt };
}

/** Prompt for structuring a user-supplied script using the Director Blueprint */
export function buildUserScriptStructuringPrompt(
  rawScript: string,
  ctx: Partial<PromptContext>
): {
  systemInstruction: string;
  userPrompt: string;
} {
  const userPrompt = `Architect a visual video blueprint for this script:

Topic Context: ${ctx.topic ?? "Tech & AI"}
Platform: ${ctx.platform ?? "YouTube Shorts"}
Language: ${ctx.language ?? "English"}
Call to Action: ${ctx.call_to_action ?? ""}

USER SCRIPT:
${rawScript}

Divide into logical scenes, select distinct scene_types for each scene, and provide concrete visual nodes/terminal/stats matching the script.`;

  const dynamicInstruction = `${AI_VIDEO_DIRECTOR_SYSTEM_PROMPT}\n\n${formatCapabilityManifestForPrompt()}`;
  return { systemInstruction: dynamicInstruction, userPrompt };
}

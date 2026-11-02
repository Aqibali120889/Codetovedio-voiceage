/**
 * Dynamic Capability Manifest Generator.
 *
 * Inspects actual registered scene types, elements, animations, and transitions
 * to produce a real-time capability manifest. Zero drift between code and LLM prompt.
 */

import type { CapabilityManifest } from "../types";
import { listRegisteredSceneTypes } from "./scene-registry";
import { listRegisteredElementTypes } from "./element-registry";
import { listRegisteredAnimations } from "./animation-registry";
import { listRegisteredTransitions } from "./transition-registry";
import { THEME_PRESETS } from "../themes/presets";

export const CAPABILITY_VERSION = "2.0.0";

/**
 * Returns the current capability manifest derived directly from code registrations.
 */
export function getCapabilityManifest(): CapabilityManifest {
  const sceneTypes = listRegisteredSceneTypes().map((s) => ({
    type: s.type,
    name: s.name,
    description: s.description,
    required_fields: s.requiredFields,
    optional_fields: s.optionalFields,
    example: s.example,
  }));

  const elementTypes = listRegisteredElementTypes().map((e) => ({
    type: e.type,
    category: e.category,
    description: e.description,
  }));

  const animations = listRegisteredAnimations().map((a) => ({
    name: a.name,
    description: a.description,
  }));

  const transitions = listRegisteredTransitions().map((t) => ({
    name: t.name,
    description: t.description,
  }));

  return {
    version: CAPABILITY_VERSION,
    supported_scene_types: sceneTypes,
    supported_element_types: elementTypes,
    supported_animations: animations,
    supported_transitions: transitions,
    theme_presets: Object.keys(THEME_PRESETS),
    max_elements_per_scene: 8,
    supported_aspect_ratios: ["16:9", "9:16", "1:1"],
    constraints: [
      "All animations are deterministic and frame-based.",
      "No arbitrary executable JavaScript or JSX allowed in JSON blueprint.",
      "Charts compute layouts automatically from data points; do not provide SVG coordinates.",
      "Narration duration takes precedence over duration_hint_seconds.",
      "Max 6 nodes per diagram scene to maintain mobile readability.",
    ],
  };
}

/**
 * Formats the capability manifest into a concise, token-efficient summary
 * for embedding into Gemini / LLM Director prompts.
 */
export function formatCapabilityManifestForPrompt(): string {
  const manifest = getCapabilityManifest();

  const scenesList = manifest.supported_scene_types
    .map((s) => `- "${s.type}": ${s.description}`)
    .join("\n");

  const animList = manifest.supported_animations.map((a) => a.name).join(", ");
  const transList = manifest.supported_transitions.map((t) => t.name).join(", ");
  const themesList = manifest.theme_presets.join(", ");

  return `
RENDERER CAPABILITY MANIFEST (v${manifest.version})
SUPPORTED SCENE TYPES:
${scenesList}

SUPPORTED ANIMATIONS: ${animList}
SUPPORTED TRANSITIONS: ${transList}
THEME PRESETS: ${themesList}
ASPECT RATIOS: 16:9, 9:16, 1:1
`.trim();
}

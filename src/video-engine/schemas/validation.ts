/**
 * Blueprint & Scene Validation System.
 *
 * Provides actionable errors, warnings, and safe normalization.
 */

import { VideoBlueprintSchema } from "./video.schema";
import { SceneBlueprintSchema } from "./scene.schema";
import { VisualElementSchema } from "./element.schema";
import type { VideoBlueprint, SceneBlueprint, VisualElement } from "../types";

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors: string[];
  warnings: string[];
}

export function validateElement(elem: unknown): ValidationResult<VisualElement> {
  const parsed = VisualElementSchema.safeParse(elem);
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.issues.map(
        (issue) => `${issue.path.join(".")}: ${issue.message}`
      ),
      warnings: [],
    };
  }
  return {
    success: true,
    data: parsed.data as VisualElement,
    errors: [],
    warnings: [],
  };
}

export function validateScene(scene: unknown): ValidationResult<SceneBlueprint> {
  const parsed = SceneBlueprintSchema.safeParse(scene);
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.issues.map(
        (issue) => `${issue.path.join(".")}: ${issue.message}`
      ),
      warnings: [],
    };
  }

  const data = parsed.data as SceneBlueprint;
  const warnings: string[] = [];

  // Semantic checks
  if (data.nodes && data.nodes.length > 5) {
    warnings.push(
      `Scene ${data.id} has ${data.nodes.length} nodes which may crowd mobile/vertical frames.`
    );
  }

  if (data.elements && data.elements.length > 8) {
    warnings.push(
      `Scene ${data.id} has ${data.elements.length} elements; consider staggering reveals.`
    );
  }

  if (data.narration && data.narration.length > 250) {
    warnings.push(
      `Scene ${data.id} narration is ${data.narration.length} characters long (>250), which may exceed duration hint.`
    );
  }

  // Check unique element IDs inside scene
  if (data.elements) {
    const elemIds = new Set<string>();
    for (const el of data.elements) {
      if (elemIds.has(el.id)) {
        return {
          success: false,
          errors: [`Scene ${data.id} has duplicate element ID "${el.id}"`],
          warnings,
        };
      }
      elemIds.add(el.id);
    }
  }

  return {
    success: true,
    data,
    errors: [],
    warnings,
  };
}

export function validateVideoBlueprint(
  blueprint: unknown
): ValidationResult<VideoBlueprint> {
  const parsed = VideoBlueprintSchema.safeParse(blueprint);
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.issues.map(
        (issue) => `${issue.path.join(".")}: ${issue.message}`
      ),
      warnings: [],
    };
  }

  const data = parsed.data as VideoBlueprint;
  const warnings: string[] = [];

  // Check unique scene IDs
  const sceneIds = new Set<string>();
  for (let i = 0; i < data.scenes.length; i++) {
    const sc = data.scenes[i];
    if (sceneIds.has(sc.id)) {
      return {
        success: false,
        errors: [`Duplicate scene ID "${sc.id}" at scene index ${i}`],
        warnings,
      };
    }
    sceneIds.add(sc.id);

    // Validate individual scene semantics
    const scValidation = validateScene(sc);
    warnings.push(...scValidation.warnings);
  }

  // Check aspect ratio vs dimensions match
  if (data.aspect_ratio === "9:16" && data.width > data.height) {
    warnings.push(
      `Aspect ratio is 9:16 (vertical) but dimensions are ${data.width}x${data.height} (horizontal).`
    );
  } else if (data.aspect_ratio === "16:9" && data.height > data.width) {
    warnings.push(
      `Aspect ratio is 16:9 (horizontal) but dimensions are ${data.width}x${data.height} (vertical).`
    );
  }

  return {
    success: true,
    data,
    errors: [],
    warnings,
  };
}

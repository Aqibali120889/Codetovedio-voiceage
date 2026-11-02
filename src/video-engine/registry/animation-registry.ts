/**
 * Animation Registry.
 *
 * Tracks registered deterministic animations for capability discovery.
 */

import type { AnimationType } from "../types";

export interface AnimationRegistration {
  name: AnimationType;
  description: string;
}

const ANIMATION_REGISTRY = new Map<AnimationType, AnimationRegistration>();

export function registerAnimation(reg: AnimationRegistration): void {
  ANIMATION_REGISTRY.set(reg.name, reg);
}

export function listRegisteredAnimations(): AnimationRegistration[] {
  return Array.from(ANIMATION_REGISTRY.values());
}

export function hasAnimation(name: AnimationType): boolean {
  return ANIMATION_REGISTRY.has(name);
}

// Register all supported animations
registerAnimation({ name: "fade", description: "Smooth linear opacity fade" });
registerAnimation({ name: "fade_up", description: "Opacity fade combined with 40px upward slide" });
registerAnimation({ name: "fade_down", description: "Opacity fade combined with 40px downward slide" });
registerAnimation({ name: "slide_left", description: "Slide in from left with cubic ease-out" });
registerAnimation({ name: "slide_right", description: "Slide in from right with cubic ease-out" });
registerAnimation({ name: "scale_in", description: "Scale zoom from 0.75 to 1.0" });
registerAnimation({ name: "stagger", description: "Sequential word/element delay cascade" });
registerAnimation({ name: "count_up", description: "Linear or eased numeric counter increase" });
registerAnimation({ name: "draw_line", description: "Progressive vector line draw via stroke dash" });
registerAnimation({ name: "progress_fill", description: "Horizontal bar fill from 0% to target %" });
registerAnimation({ name: "reveal", description: "Horizontal wipe clipPath mask reveal" });
registerAnimation({ name: "highlight", description: "Targeted scale pulse on focal elements" });

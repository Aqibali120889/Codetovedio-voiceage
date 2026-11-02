/**
 * Transition Registry.
 *
 * Tracks registered scene transitions for capability discovery and timeline calculation.
 */

import type { TransitionType } from "../types";

export interface TransitionRegistration {
  name: TransitionType;
  description: string;
  defaultDurationSeconds: number;
}

const TRANSITION_REGISTRY = new Map<TransitionType, TransitionRegistration>();

export function registerTransition(reg: TransitionRegistration): void {
  TRANSITION_REGISTRY.set(reg.name, reg);
}

export function listRegisteredTransitions(): TransitionRegistration[] {
  return Array.from(TRANSITION_REGISTRY.values());
}

export function hasTransition(name: TransitionType): boolean {
  return TRANSITION_REGISTRY.has(name);
}

export function getTransition(name: TransitionType): TransitionRegistration | undefined {
  return TRANSITION_REGISTRY.get(name);
}

// Register supported transitions
registerTransition({
  name: "cut",
  description: "Instant cut with zero frame overlap",
  defaultDurationSeconds: 0,
});

registerTransition({
  name: "fade",
  description: "Cross-dissolve fade transition",
  defaultDurationSeconds: 0.3,
});

registerTransition({
  name: "slide",
  description: "Horizontal slide push transition",
  defaultDurationSeconds: 0.4,
});

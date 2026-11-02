/**
 * Central Animation Dispatcher & Remotion Interpolator.
 *
 * Provides deterministic, frame-based animation calculations for all registered
 * animation types without external animation frameworks.
 */

import { interpolate, Easing } from "remotion";
import type { ElementAnimationConfig } from "../types";

export interface AnimationStyleOutput {
  opacity?: number;
  transform?: string;
  clipPath?: string;
  strokeDashoffset?: number;
  width?: string;
}

export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

/**
 * Calculates deterministic visual CSS styles for an element at a scene-relative frame.
 */
export function computeAnimationStyles(
  animation: ElementAnimationConfig | undefined,
  sceneRelativeFrame: number,
  fps: number,
  elementIndex = 0
): AnimationStyleOutput {
  if (!animation) {
    return { opacity: 1 };
  }

  const staggerOffsetFrames = Math.round(
    (animation.stagger_delay ?? 0) * elementIndex * fps
  );
  const startFrame =
    Math.round((animation.start_seconds ?? 0) * fps) + staggerOffsetFrames;
  const durationFrames = Math.max(
    1,
    Math.round((animation.duration_seconds ?? 0.5) * fps)
  );
  const endFrame = startFrame + durationFrames;

  // Easing function
  const easingFn =
    animation.easing === "linear"
      ? Easing.linear
      : animation.easing === "quad"
      ? Easing.out(Easing.quad)
      : Easing.out(Easing.cubic);

  const enterType = animation.enter ?? "fade";
  let opacity = 1;
  let transform = "";
  let clipPath: string | undefined = undefined;

  // Compute entrance interpolation (0 -> 1)
  const progress = clamp(
    interpolate(sceneRelativeFrame, [startFrame, endFrame], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: easingFn,
    }),
    0,
    1
  );

  switch (enterType) {
    case "fade":
      opacity = progress;
      break;

    case "fade_up": {
      opacity = progress;
      const translateY = interpolate(progress, [0, 1], [40, 0]);
      transform = `translateY(${translateY}px)`;
      break;
    }

    case "fade_down": {
      opacity = progress;
      const translateY = interpolate(progress, [0, 1], [-40, 0]);
      transform = `translateY(${translateY}px)`;
      break;
    }

    case "slide_left": {
      opacity = progress;
      const translateX = interpolate(progress, [0, 1], [60, 0]);
      transform = `translateX(${translateX}px)`;
      break;
    }

    case "slide_right": {
      opacity = progress;
      const translateX = interpolate(progress, [0, 1], [-60, 0]);
      transform = `translateX(${translateX}px)`;
      break;
    }

    case "scale_in": {
      opacity = progress;
      const scale = interpolate(progress, [0, 1], [0.75, 1]);
      transform = `scale(${scale})`;
      break;
    }

    case "reveal": {
      opacity = 1;
      const revealPercent = Math.round(progress * 100);
      clipPath = `inset(0 ${100 - revealPercent}% 0 0)`;
      break;
    }

    case "highlight": {
      opacity = 1;
      const scale = interpolate(progress, [0, 0.5, 1], [1, 1.05, 1]);
      transform = `scale(${scale})`;
      break;
    }

    case "stagger":
    default:
      opacity = progress;
      break;
  }

  // Handle exit animation if configured
  if (animation.exit && animation.exit_seconds !== undefined) {
    const exitStartFrame = Math.round(animation.exit_seconds * fps);
    const exitDurationFrames = Math.max(1, Math.round(0.3 * fps));
    const exitProgress = clamp(
      interpolate(
        sceneRelativeFrame,
        [exitStartFrame, exitStartFrame + exitDurationFrames],
        [1, 0],
        {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.in(Easing.cubic),
        }
      ),
      0,
      1
    );
    opacity *= exitProgress;
  }

  return {
    opacity,
    transform: transform || undefined,
    clipPath,
  };
}

/**
 * Calculates a numeric value count-up between start and end over frames.
 */
export function computeCountUp(
  startVal: number,
  endVal: number,
  startFrame: number,
  durationFrames: number,
  currentFrame: number
): number {
  if (durationFrames <= 0) return endVal;
  const progress = clamp(
    interpolate(currentFrame, [startFrame, startFrame + durationFrames], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    }),
    0,
    1
  );
  return startVal + (endVal - startVal) * progress;
}

/**
 * Calculates line draw progress (0 to 1).
 */
export function computeDrawLineProgress(
  startFrame: number,
  durationFrames: number,
  currentFrame: number
): number {
  if (durationFrames <= 0) return 1;
  return clamp(
    interpolate(currentFrame, [startFrame, startFrame + durationFrames], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.quad),
    }),
    0,
    1
  );
}

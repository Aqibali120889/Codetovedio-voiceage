/**
 * Coordinated Motion Presets Engine.
 *
 * Implements 14 deterministic, frame-independent motion presets for Remotion.
 * Evaluates pure functions of (frame, startFrame, durationFrames, fps) with
 * customized cubic and elastic bezier curves without external mutable state.
 */

import { interpolate, Easing } from "remotion";
import type { MotionPresetType } from "../../production/post-production/post-production-types";

export interface MotionTransformOutput {
  opacity?: number;
  transform?: string;
  filter?: string;
  scale?: number;
  translateX?: number;
  translateY?: number;
  boxShadow?: string;
  borderColor?: string;
}

export function evaluateMotionPreset(
  preset: MotionPresetType,
  frame: number,
  startFrame: number,
  durationFrames: number,
  _fps = 60,
  accentColor = "#FF5F00"
): MotionTransformOutput {
  const relFrame = Math.max(0, frame - startFrame);
  const progress = Math.min(1, Math.max(0, relFrame / Math.max(1, durationFrames)));

  switch (preset) {
    case "headlineImpact": {
      // Bold entrance: slight scale punch (1.10 -> 1.0) with elastic settle and fade
      const scale = interpolate(progress, [0, 0.4, 1], [1.12, 0.98, 1.0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.out(Easing.back(1.4)),
      });
      const opacity = interpolate(progress, [0, 0.3], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
      const translateY = interpolate(progress, [0, 0.5, 1], [-25, 4, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.out(Easing.cubic),
      });
      return {
        opacity,
        scale,
        translateY,
        transform: `translateY(${translateY}px) scale(${scale})`,
      };
    }

    case "smoothReveal": {
      // Clean cubic fade + subtle slide up
      const opacity = interpolate(progress, [0, 0.5], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.out(Easing.cubic),
      });
      const translateY = interpolate(progress, [0, 1], [30, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.out(Easing.cubic),
      });
      return {
        opacity,
        translateY,
        transform: `translateY(${translateY}px)`,
      };
    }

    case "staggeredEntrance": {
      const opacity = interpolate(progress, [0, 0.6], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
      const translateX = interpolate(progress, [0, 1], [-40, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.out(Easing.cubic),
      });
      return {
        opacity,
        translateX,
        transform: `translateX(${translateX}px)`,
      };
    }

    case "diagramBuild": {
      // Sequential diagram entrance with subtle glow illumination
      const opacity = interpolate(progress, [0, 0.4], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
      const scale = interpolate(progress, [0, 1], [0.94, 1.0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.out(Easing.cubic),
      });
      return {
        opacity,
        scale,
        transform: `scale(${scale})`,
        boxShadow: `0 0 ${16 * progress}px ${accentColor}33`,
      };
    }

    case "nodeHighlight": {
      // Active node illumination pulse
      const pulse = Math.sin(progress * Math.PI);
      const scale = 1.0 + 0.035 * pulse;
      return {
        scale,
        transform: `scale(${scale})`,
        boxShadow: `0 0 ${24 * pulse}px ${accentColor}`,
        borderColor: accentColor,
      };
    }

    case "cameraPushIn": {
      // Cinematic 1.0 -> 1.05 scale push
      const scale = interpolate(progress, [0, 1], [1.0, 1.055], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.inOut(Easing.cubic),
      });
      return {
        scale,
        transform: `scale(${scale})`,
      };
    }

    case "cameraPullOut": {
      // Reversing to wide shot: 1.05 -> 1.0
      const scale = interpolate(progress, [0, 1], [1.055, 1.0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.inOut(Easing.cubic),
      });
      return {
        scale,
        transform: `scale(${scale})`,
      };
    }

    case "focusPan": {
      // Gentle horizontal drift (left to right)
      const translateX = interpolate(progress, [0, 1], [-18, 18], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.inOut(Easing.quad),
      });
      return {
        translateX,
        transform: `translateX(${translateX}px)`,
      };
    }

    case "captionEmphasis": {
      // Kinetic keyword pop
      const pop = interpolate(progress, [0, 0.3, 1], [1.0, 1.14, 1.0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.out(Easing.cubic),
      });
      return {
        scale: pop,
        transform: `scale(${pop})`,
      };
    }

    case "evidenceReveal": {
      // Verified evidence card stamp-in with emerald/accent bloom
      const scale = interpolate(progress, [0, 0.4, 1], [0.90, 1.02, 1.0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.out(Easing.back(1.2)),
      });
      const opacity = interpolate(progress, [0, 0.25], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
      return {
        opacity,
        scale,
        transform: `scale(${scale})`,
        boxShadow: `0 8px 32px rgba(0,0,0,0.8), 0 0 20px ${accentColor}44`,
      };
    }

    case "chartBuild": {
      const scale = interpolate(progress, [0, 1], [0.85, 1.0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.out(Easing.cubic),
      });
      const opacity = interpolate(progress, [0, 0.3], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
      return {
        opacity,
        scale,
        transform: `scale(${scale})`,
      };
    }

    case "imageParallax": {
      // Parallax layer: 0.3x speed background drift
      const translateY = interpolate(progress, [0, 1], [-15, 15], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.linear,
      });
      return {
        translateY,
        transform: `translateY(${translateY}px)`,
      };
    }

    case "transitionWhoosh": {
      // Directional motion blur approximation
      const blur = Math.sin(progress * Math.PI) * 8;
      const translateX = interpolate(progress, [0, 1], [0, -60], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
      return {
        filter: blur > 0.5 ? `blur(${blur.toFixed(1)}px)` : undefined,
        translateX,
        transform: `translateX(${translateX}px)`,
      };
    }

    case "closingResolve": {
      const scale = interpolate(progress, [0, 1], [1.04, 1.0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.out(Easing.cubic),
      });
      const opacity = interpolate(progress, [0, 0.4], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
      return {
        opacity,
        scale,
        transform: `scale(${scale})`,
      };
    }

    default:
      return { opacity: 1 };
  }
}

export const ALL_MOTION_PRESETS: MotionPresetType[] = [
  "headlineImpact",
  "smoothReveal",
  "staggeredEntrance",
  "diagramBuild",
  "nodeHighlight",
  "cameraPushIn",
  "cameraPullOut",
  "focusPan",
  "captionEmphasis",
  "evidenceReveal",
  "chartBuild",
  "imageParallax",
  "transitionWhoosh",
  "closingResolve",
];

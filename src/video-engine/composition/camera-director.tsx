/**
 * Camera Director Component.
 *
 * Wraps scene compositions with continuous, cinematic camera motion
 * (slow push-in, subtle pull-out, focus drift) driven deterministically
 * by the Post-Production Editing Plan.
 */

import React from "react";
import type { MotionPresetType } from "../../production/post-production/post-production-types";
import { evaluateMotionPreset } from "../animations/motion-presets";

export interface CameraDirectorProps {
  sceneFrame: number;
  durationFrames: number;
  preset?: MotionPresetType;
  fps?: number;
  children: React.ReactNode;
}

export const CameraDirector: React.FC<CameraDirectorProps> = ({
  sceneFrame,
  durationFrames,
  preset = "cameraPushIn",
  fps = 60,
  children,
}) => {
  const motion = evaluateMotionPreset(preset, sceneFrame, 0, durationFrames, fps);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        transform: motion.transform || "none",
        transformOrigin: "center center",
        width: "100%",
        height: "100%",
        transition: "none",
      }}
    >
      {children}
    </div>
  );
};

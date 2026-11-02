/**
 * Scene Dispatcher Component.
 *
 * Renders an individual scene with background effects, entrance/exit fades,
 * and delegates to the registered SceneRenderer.
 */

import React from "react";
import { useCurrentFrame, interpolate, Easing } from "remotion";
import type { TimelineScene } from "../types";
import type { ThemeTokens } from "../themes/tokens";
import { getSceneRenderer } from "../registry/scene-registry";
import {
  SolidBgComponent,
  GradientBgComponent,
  GridBgComponent,
  ParticlesBgComponent,
  GlowBgComponent,
} from "../components/backgrounds";
import { BeatsLayer } from "../components/beats/beats-layer";
import { ArtifactsLayer } from "./artifacts-layer";
import { CameraDirector } from "./camera-director";
import type { PostProductionPlan, MotionPresetType } from "../../production/post-production/post-production-types";

export const SceneDispatcher: React.FC<{
  scene: TimelineScene;
  fps: number;
  theme: ThemeTokens;
  editingPlan?: PostProductionPlan;
}> = ({ scene, fps, theme, editingPlan }) => {
  const relativeFrame = useCurrentFrame();
  const dur = scene.durationFrames;

  // Fade in & out
  const fadeIn = interpolate(relativeFrame, [0, 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const fadeOut = interpolate(relativeFrame, [dur - 10, dur], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.in(Easing.cubic),
  });

  const sceneOpacity = Math.max(0, Math.min(1, fadeIn * fadeOut));

  // Determine background
  const bgType = scene.background?.type ?? "grid";
  const accentColor = scene.accent_color ?? theme.colors.accent;

  const Renderer = getSceneRenderer(scene.scene_type);

  const isFullBleed =
    scene.scene_type === "parallax_hero" ||
    scene.scene_type === "editorial_montage" ||
    scene.composition?.layout === "full_canvas";

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        padding: isFullBleed ? 0 : "80px 48px",
        boxSizing: "border-box",
      }}
    >
      {/* Background Layer */}
      {bgType === "solid" && (
        <SolidBgComponent
          element={{ id: "bg", type: "solid_bg", color: scene.background?.color ?? theme.colors.background }}
          sceneFrame={relativeFrame}
          theme={theme}
        />
      )}
      {bgType === "gradient" && (
        <GradientBgComponent
          element={{
            id: "bg",
            type: "gradient_bg",
            colors: [theme.colors.background, theme.colors.surface],
          }}
          sceneFrame={relativeFrame}
          theme={theme}
        />
      )}
      {bgType === "grid" && (
        <>
          <SolidBgComponent
            element={{ id: "bg", type: "solid_bg", color: theme.colors.background }}
            sceneFrame={relativeFrame}
            theme={theme}
          />
          <GridBgComponent
            element={{ id: "grid", type: "grid_bg" }}
            sceneFrame={relativeFrame}
            theme={theme}
          />
          <GlowBgComponent
            element={{ id: "glow", type: "glow_bg", glow_color: accentColor, radius: 50 }}
            sceneFrame={relativeFrame}
            theme={theme}
          />
        </>
      )}
      {bgType === "matrix" && (
        <>
          <SolidBgComponent
            element={{ id: "bg", type: "solid_bg", color: theme.colors.background }}
            sceneFrame={relativeFrame}
            theme={theme}
          />
          <ParticlesBgComponent
            element={{ id: "particles", type: "particles_bg", color: accentColor, count: 25 }}
            sceneFrame={relativeFrame}
            theme={theme}
          />
        </>
      )}

      {/* Cinematic photograph backdrop for non-parallax scenes */}
      {scene.image_url && scene.scene_type !== "parallax_hero" && (
        <div
          style={{
            position: "absolute",
            inset: "-5%",
            backgroundImage: `url(${scene.image_url})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            opacity: 0.35,
            filter: "brightness(0.38) saturate(1.2) contrast(1.1)",
            zIndex: 1,
            pointerEvents: "none",
          }}
        />
      )}

      {/* Camera Director Motion for Foreground Content */}
      {(() => {
        const cameraEvent = editingPlan?.events.find(
          (e) => e.sceneId === scene.id && e.eventType === "camera_move"
        );
        const cameraPreset: MotionPresetType =
          cameraEvent?.motionPreset ??
          (scene.scene_type === "parallax_hero" || scene.purpose === "hook"
            ? "cameraPushIn"
            : scene.scene_type === "system_architecture"
            ? "focusPan"
            : "cameraPushIn");

        return (
          <CameraDirector
            sceneFrame={relativeFrame}
            durationFrames={dur}
            preset={cameraPreset}
            fps={fps}
          >
            <div
              style={{
                position: "relative",
                zIndex: 10,
                opacity: sceneOpacity,
                width: "100%",
                height: "100%",
              }}
            >
              {Renderer ? (
                <Renderer
                  scene={scene}
                  sceneFrame={relativeFrame}
                  fps={fps}
                  theme={theme}
                />
              ) : (
                <div style={{ color: theme.colors.critical, fontFamily: theme.typography.fontCode }}>
                  [Unknown Scene Type: {scene.scene_type}]
                </div>
              )}

              {/* Storyboard artifacts layer — renders accurately positioned badges, callouts & metrics */}
              <ArtifactsLayer
                elements={scene.elements}
                sceneFrame={relativeFrame}
                fps={fps}
                theme={theme}
                accentColor={accentColor}
                onScreenText={scene.on_screen_text}
                hasPrimarySceneRenderer={!!Renderer && scene.scene_type !== "modular_scene"}
                sceneType={scene.scene_type}
              />

              {/* Timed visual beats layer — renders dynamic narration-synchronized callouts */}
              <BeatsLayer
                beats={scene.beats}
                sceneFrame={relativeFrame}
                fps={fps}
                theme={theme}
                accentColor={accentColor}
              />
            </div>
          </CameraDirector>
        );
      })()}
    </div>
  );
};

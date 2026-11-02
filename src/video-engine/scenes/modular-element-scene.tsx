/**
 * Modular Element Scene Renderer.
 *
 * Renders arbitrary registered visual elements from `scene.elements`
 * safely within the layout.
 */

import React from "react";
import type { SceneBlueprint } from "../types";
import type { ThemeTokens } from "../themes/tokens";
import { SceneHeader } from "./scene-header";
import { getElementRenderer } from "../registry/element-registry";

export const ModularElementScene: React.FC<{
  scene: SceneBlueprint;
  sceneFrame: number;
  fps: number;
  theme: ThemeTokens;
}> = ({ scene, sceneFrame, fps, theme }) => {
  return (
    <div>
      <SceneHeader
        purpose={scene.purpose}
        onScreenText={scene.on_screen_text}
        accentColor={scene.accent_color}
        sceneFrame={sceneFrame}
        fps={fps}
        theme={theme}
      />

      <div style={{ position: "relative", minHeight: "500px", marginTop: 24 }}>
        {scene.elements?.map((el, i) => {
          const Renderer = getElementRenderer(el.type);
          if (!Renderer) {
            return (
              <div
                key={el.id}
                style={{
                  padding: 12,
                  color: theme.colors.critical,
                  fontFamily: theme.typography.fontCode,
                  fontSize: 14,
                }}
              >
                [Unsupported element type: {el.type}]
              </div>
            );
          }

          return (
            <div key={el.id} style={{ marginBottom: 20 }}>
              <Renderer
                element={el as any}
                sceneFrame={sceneFrame}
                fps={fps}
                theme={theme}
                index={i}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

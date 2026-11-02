/**
 * Background Components for Video Engine.
 */

import React from "react";
import type {
  SolidBgElement,
  GradientBgElement,
  GridBgElement,
  ParticlesBgElement,
  GlowBgElement,
} from "../../types";
import type { ThemeTokens } from "../../themes/tokens";

interface BgProps<T> {
  element: T;
  sceneFrame: number;
  theme: ThemeTokens;
}

export const SolidBgComponent: React.FC<BgProps<SolidBgElement>> = ({ element }) => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      backgroundColor: element.color,
      zIndex: 0,
    }}
  />
);

export const GradientBgComponent: React.FC<BgProps<GradientBgElement>> = ({ element }) => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      background: `linear-gradient(${element.angle ?? 180}deg, ${element.colors[0]} 0%, ${element.colors[1]} 100%)`,
      zIndex: 0,
    }}
  />
);

export const GridBgComponent: React.FC<BgProps<GridBgElement>> = ({
  element,
  theme,
}) => {
  const step = element.spacing ?? 44;
  const col = element.grid_color ?? `${theme.colors.surfaceBorder}66`;

  return (
    <svg
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        opacity: 0.25,
        zIndex: 0,
        pointerEvents: "none",
      }}
    >
      <defs>
        <pattern
          id="bg-grid-pattern"
          width={step}
          height={step}
          patternUnits="userSpaceOnUse"
        >
          <path d={`M ${step} 0 L 0 0 0 ${step}`} fill="none" stroke={col} strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#bg-grid-pattern)" />
    </svg>
  );
};

export const ParticlesBgComponent: React.FC<BgProps<ParticlesBgElement>> = ({
  element,
  sceneFrame,
  theme,
}) => {
  const count = element.count ?? 20;
  const col = element.color ?? theme.colors.accent;

  // Deterministic seeded pseudo-random distribution
  const particles = Array.from({ length: count }).map((_, i) => {
    const seed = (i * 9301 + 49297) % 233280;
    const initialX = (seed % 100);
    const initialY = ((seed * 7) % 100);
    const driftY = ((initialY + (sceneFrame * 0.1) * (1 + (i % 3) * 0.5)) % 100);
    return { x: initialX, y: driftY, size: 2 + (i % 3) };
  });

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", zIndex: 0 }}>
      {particles.map((p, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            borderRadius: "50%",
            backgroundColor: col,
            opacity: 0.25 + (i % 4) * 0.15,
            boxShadow: `0 0 6px ${col}`,
          }}
        />
      ))}
    </div>
  );
};

export const GlowBgComponent: React.FC<BgProps<GlowBgElement>> = ({ element }) => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      background: `radial-gradient(circle at 50% 30%, ${element.glow_color}22 0%, transparent ${element.radius ?? 65}%)`,
      zIndex: 0,
      pointerEvents: "none",
    }}
  />
);

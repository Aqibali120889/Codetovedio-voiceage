/**
 * Primitive Shape & Graphic Components for Video Engine.
 */

import React from "react";
import type {
  RectangleElement,
  CircleElement,
  LineArrowElement,
  DividerElement,
  ProgressIndicatorElement,
  GridElement,
  BadgeElement,
} from "../../types";
import {
  computeAnimationStyles,
  computeDrawLineProgress,
} from "../../animations/animation-dispatcher";
import type { ThemeTokens } from "../../themes/tokens";

interface PrimitiveProps<T> {
  element: T;
  sceneFrame: number;
  fps: number;
  theme: ThemeTokens;
  index?: number;
}

export const RectangleComponent: React.FC<PrimitiveProps<RectangleElement>> = ({
  element,
  sceneFrame,
  fps,
  theme,
  index = 0,
}) => {
  const anim = computeAnimationStyles(element.animation, sceneFrame, fps, index);
  return (
    <div
      style={{
        width: element.size?.width ?? "100%",
        height: element.size?.height ?? "100px",
        backgroundColor: element.fill ?? theme.colors.surface,
        border: element.stroke
          ? `${element.stroke_width ?? 1}px solid ${element.stroke}`
          : `1px solid ${theme.colors.surfaceBorder}`,
        borderRadius: element.border_radius ?? theme.borderRadius.md,
        ...anim,
      }}
    />
  );
};

export const CircleComponent: React.FC<PrimitiveProps<CircleElement>> = ({
  element,
  sceneFrame,
  fps,
  theme,
  index = 0,
}) => {
  const anim = computeAnimationStyles(element.animation, sceneFrame, fps, index);
  const size = (element.radius ?? 30) * 2;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        backgroundColor: element.fill ?? theme.colors.accent,
        border: element.stroke ? `2px solid ${element.stroke}` : "none",
        ...anim,
      }}
    />
  );
};

export const LineArrowComponent: React.FC<PrimitiveProps<LineArrowElement>> = ({
  element,
  sceneFrame,
  fps,
  theme,
}) => {
  const startF = Math.round((element.animation?.start_seconds ?? 0) * fps);
  const durF = Math.max(1, Math.round((element.animation?.duration_seconds ?? 0.5) * fps));
  const progress = computeDrawLineProgress(startF, durF, sceneFrame);

  const currentX2 = element.x1 + (element.x2 - element.x1) * progress;
  const currentY2 = element.y1 + (element.y2 - element.y1) * progress;

  return (
    <svg
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      }}
    >
      <line
        x1={element.x1}
        y1={element.y1}
        x2={currentX2}
        y2={currentY2}
        stroke={element.stroke ?? theme.colors.accent}
        strokeWidth={element.stroke_width ?? 2}
        strokeDasharray={progress < 1 ? "4 4" : "none"}
      />
      {element.arrow_end && progress > 0.95 && (
        <circle
          cx={element.x2}
          cy={element.y2}
          r={5}
          fill={element.stroke ?? theme.colors.accent}
        />
      )}
    </svg>
  );
};

export const DividerComponent: React.FC<PrimitiveProps<DividerElement>> = ({
  element,
  sceneFrame,
  fps,
  theme,
  index = 0,
}) => {
  const anim = computeAnimationStyles(element.animation, sceneFrame, fps, index);
  const isHoriz = (element.orientation ?? "horizontal") === "horizontal";
  return (
    <div
      style={{
        width: isHoriz ? "100%" : "1px",
        height: isHoriz ? "1px" : "100%",
        backgroundColor: element.color ?? theme.colors.surfaceBorder,
        ...anim,
      }}
    />
  );
};

export const ProgressIndicatorComponent: React.FC<
  PrimitiveProps<ProgressIndicatorElement>
> = ({ element, sceneFrame, fps, theme, index = 0 }) => {
  const anim = computeAnimationStyles(element.animation, sceneFrame, fps, index);
  const startF = Math.round((element.animation?.start_seconds ?? 0) * fps);
  const durF = Math.max(1, Math.round((element.animation?.duration_seconds ?? 0.8) * fps));
  const currentProgress = computeDrawLineProgress(startF, durF, sceneFrame);
  const fillWidth = `${element.progress * currentProgress}%`;

  return (
    <div
      style={{
        width: "100%",
        height: "6px",
        backgroundColor: theme.colors.surfaceBorder,
        borderRadius: theme.borderRadius.full,
        overflow: "hidden",
        ...anim,
      }}
    >
      <div
        style={{
          width: fillWidth,
          height: "100%",
          backgroundColor: element.color ?? theme.colors.accent,
          boxShadow: `0 0 10px ${element.color ?? theme.colors.accent}`,
          transition: "width 0.1s linear",
        }}
      />
    </div>
  );
};

export const GridComponent: React.FC<PrimitiveProps<GridElement>> = ({
  element,
  theme,
}) => {
  const step = element.cell_size ?? 40;
  return (
    <svg
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        opacity: 0.15,
        pointerEvents: "none",
      }}
    >
      <defs>
        <pattern
          id="grid-pattern"
          width={step}
          height={step}
          patternUnits="userSpaceOnUse"
        >
          <path
            d={`M ${step} 0 L 0 0 0 ${step}`}
            fill="none"
            stroke={element.stroke ?? theme.colors.surfaceBorder}
            strokeWidth="1"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid-pattern)" />
    </svg>
  );
};

export const BadgeComponent: React.FC<PrimitiveProps<BadgeElement>> = ({
  element,
  sceneFrame,
  fps,
  theme,
  index = 0,
}) => {
  const anim = computeAnimationStyles(element.animation, sceneFrame, fps, index);
  const bg =
    element.variant === "success"
      ? theme.colors.positive
      : element.variant === "error"
      ? theme.colors.critical
      : element.variant === "warning"
      ? theme.colors.warning
      : theme.colors.accent;

  return (
    <span
      style={{
        display: "inline-block",
        padding: "4px 10px",
        borderRadius: theme.borderRadius.sm,
        fontSize: theme.typography.fontSizeSmall - 4,
        fontWeight: 800,
        fontFamily: theme.typography.fontCode,
        backgroundColor: `${bg}22`,
        color: bg,
        border: `1px solid ${bg}66`,
        ...anim,
      }}
    >
      {element.text}
    </span>
  );
};

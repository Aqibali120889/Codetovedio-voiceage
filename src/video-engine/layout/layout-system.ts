/**
 * Layout System & Spatial Boundary Management.
 *
 * Enforces dedicated non-overlapping vertical zones, typography auto-scaling,
 * container bounds, and subtitle safe areas for 9:16 and 16:9 video compositions.
 */

import React from "react";

export type AspectRatioType = "9:16" | "16:9";

export interface ZoneBounds {
  topPercent: number;
  bottomPercent: number;
  topPx: number;
  bottomPx: number;
  heightPx: number;
  padding: {
    left: number;
    right: number;
    top: number;
    bottom: number;
  };
}

export interface VideoLayoutZones {
  header: ZoneBounds;
  primaryContent: ZoneBounds;
  auxiliaryTelemetry: ZoneBounds;
  subtitles: ZoneBounds;
  footer: ZoneBounds;
}

export function computeLayoutZones(
  width = 1080,
  height = 1920,
  aspectRatio: AspectRatioType = "9:16"
): VideoLayoutZones {
  const isPortrait = aspectRatio === "9:16" || height > width;

  if (isPortrait) {
    return {
      header: {
        topPercent: 3.5,
        bottomPercent: 14.5,
        topPx: Math.round(height * 0.035),
        bottomPx: Math.round(height * 0.145),
        heightPx: Math.round(height * 0.11),
        padding: { left: 48, right: 48, top: 16, bottom: 8 },
      },
      primaryContent: {
        topPercent: 15.0,
        bottomPercent: 72.0,
        topPx: Math.round(height * 0.15),
        bottomPx: Math.round(height * 0.72),
        heightPx: Math.round(height * 0.57), // ~1094px
        padding: { left: 48, right: 48, top: 16, bottom: 16 },
      },
      auxiliaryTelemetry: {
        topPercent: 73.0,
        bottomPercent: 81.5,
        topPx: Math.round(height * 0.73),
        bottomPx: Math.round(height * 0.815),
        heightPx: Math.round(height * 0.085), // ~163px
        padding: { left: 48, right: 48, top: 8, bottom: 8 },
      },
      subtitles: {
        topPercent: 82.5,
        bottomPercent: 94.0,
        topPx: Math.round(height * 0.825),
        bottomPx: Math.round(height * 0.94),
        heightPx: Math.round(height * 0.115), // ~220px
        padding: { left: 48, right: 48, top: 8, bottom: 8 },
      },
      footer: {
        topPercent: 94.5,
        bottomPercent: 99.0,
        topPx: Math.round(height * 0.945),
        bottomPx: Math.round(height * 0.99),
        heightPx: Math.round(height * 0.045),
        padding: { left: 48, right: 48, top: 4, bottom: 4 },
      },
    };
  }

  // 16:9 Landscape
  return {
    header: {
      topPercent: 4.0,
      bottomPercent: 16.0,
      topPx: Math.round(height * 0.04),
      bottomPx: Math.round(height * 0.16),
      heightPx: Math.round(height * 0.12),
      padding: { left: 72, right: 72, top: 20, bottom: 8 },
    },
    primaryContent: {
      topPercent: 17.0,
      bottomPercent: 76.0,
      topPx: Math.round(height * 0.17),
      bottomPx: Math.round(height * 0.76),
      heightPx: Math.round(height * 0.59),
      padding: { left: 72, right: 72, top: 16, bottom: 16 },
    },
    auxiliaryTelemetry: {
      topPercent: 77.0,
      bottomPercent: 84.0,
      topPx: Math.round(height * 0.77),
      bottomPx: Math.round(height * 0.84),
      heightPx: Math.round(height * 0.07),
      padding: { left: 72, right: 72, top: 6, bottom: 6 },
    },
    subtitles: {
      topPercent: 85.0,
      bottomPercent: 94.0,
      topPx: Math.round(height * 0.85),
      bottomPx: Math.round(height * 0.94),
      heightPx: Math.round(height * 0.09),
      padding: { left: 72, right: 72, top: 4, bottom: 4 },
    },
    footer: {
      topPercent: 95.0,
      bottomPercent: 99.0,
      topPx: Math.round(height * 0.95),
      bottomPx: Math.round(height * 0.99),
      heightPx: Math.round(height * 0.04),
      padding: { left: 72, right: 72, top: 2, bottom: 2 },
    },
  };
}

/**
 * Standard CSS rules applied to text elements to guarantee no horizontal overflow.
 */
export const SAFE_TEXT_CONTAINER: React.CSSProperties = {
  overflowWrap: "break-word",
  wordBreak: "break-word",
  boxSizing: "border-box",
  maxWidth: "100%",
};

/**
 * Auto-scales font size dynamically based on string character length.
 * Prevents titles, code lines, or quotes from exceeding allocated vertical/horizontal bounds.
 */
export function fitTextFontSize(
  text: string,
  charThreshold = 28,
  baseSizePx = 36,
  minSizePx = 20
): number {
  if (!text) return baseSizePx;
  const len = text.trim().length;
  if (len <= charThreshold) return baseSizePx;

  const ratio = charThreshold / len;
  // Sub-linear scaling avoids shrinking text too drastically
  const scaled = Math.round(baseSizePx * Math.pow(ratio, 0.45));
  return Math.max(minSizePx, Math.min(baseSizePx, scaled));
}

/**
 * Bounds checking helper for 2D bounding boxes (in percentages or pixels).
 */
export function checkBoundingBoxOverlap(
  boxA: { x: number; y: number; width: number; height: number },
  boxB: { x: number; y: number; width: number; height: number }
): boolean {
  return (
    boxA.x < boxB.x + boxB.width &&
    boxA.x + boxA.width > boxB.x &&
    boxA.y < boxB.y + boxB.height &&
    boxA.y + boxA.height > boxB.y
  );
}

/**
 * Remaps an artifact's vertical coordinate to a dedicated safe non-colliding zone.
 */
export function remapArtifactPosition(
  elementPosition: { x: number; y: number },
  elementSize: { width: string | number; height: string | number },
  hasPrimarySceneRenderer = false
): { x: number; y: number } {
  if (!hasPrimarySceneRenderer) {
    // Modular or blank scene: allow full placement with bottom subtitle clearance
    return {
      x: elementPosition.x,
      y: Math.min(78, Math.max(6, elementPosition.y)),
    };
  }

  // Primary scene renderer is present (process_flow, code_terminal, split_callout, bar_chart, etc.)
  // Move floating artifacts out of primary content zone (16% - 72%)
  // Dock into auxiliary telemetry zone (73% - 81%) or upper-right telemetry corner
  if (elementPosition.y >= 16 && elementPosition.y <= 72) {
    // If it's a small badge or tag, pin to top right
    if (elementPosition.x > 50) {
      return { x: Math.min(68, elementPosition.x), y: 74 };
    }
    // Dock into lower auxiliary telemetry zone
    return {
      x: Math.max(6, Math.min(50, elementPosition.x)),
      y: 74,
    };
  }

  // Never overlap subtitles (>= 82%)
  if (elementPosition.y >= 82) {
    return {
      x: elementPosition.x,
      y: 75,
    };
  }

  return elementPosition;
}

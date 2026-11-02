/**
 * Diagram & Architecture Components for Video Engine.
 */

import React from "react";
import type {
  FlowNodeElement,
  ConnectorElement,
  ArchitectureTierElement,
} from "../../types";
import { computeAnimationStyles } from "../../animations/animation-dispatcher";
import type { ThemeTokens } from "../../themes/tokens";

interface DiagramProps<T> {
  element: T;
  sceneFrame: number;
  fps: number;
  theme: ThemeTokens;
  index?: number;
}

export const FlowNodeComponent: React.FC<DiagramProps<FlowNodeElement>> = ({
  element,
  sceneFrame,
  fps,
  theme,
  index = 0,
}) => {
  const anim = computeAnimationStyles(element.animation, sceneFrame, fps, index);

  const statusColor =
    element.status === "done"
      ? theme.colors.positive
      : element.status === "active"
      ? theme.colors.accent
      : element.status === "error"
      ? theme.colors.critical
      : theme.colors.textMuted;

  return (
    <div
      style={{
        padding: "18px 24px",
        backgroundColor: theme.colors.surface,
        border: `1px solid ${statusColor}66`,
        borderRadius: theme.borderRadius.md,
        boxShadow: element.status === "active" ? `0 0 20px ${statusColor}33` : "none",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        ...anim,
      }}
    >
      <div>
        <div
          style={{
            fontSize: theme.typography.fontSizeBody - 2,
            fontWeight: 800,
            color: theme.colors.textPrimary,
            fontFamily: theme.typography.fontHeading,
          }}
        >
          {element.label}
        </div>
        {element.detail && (
          <div
            style={{
              fontSize: theme.typography.fontSizeSmall,
              color: theme.colors.textSecondary,
              fontFamily: theme.typography.fontCode,
              marginTop: 4,
            }}
          >
            {element.detail}
          </div>
        )}
      </div>

      {element.status && (
        <span
          style={{
            fontSize: 12,
            fontWeight: 800,
            fontFamily: theme.typography.fontCode,
            color: statusColor,
            textTransform: "uppercase",
            padding: "4px 8px",
            border: `1px solid ${statusColor}44`,
            borderRadius: 4,
            backgroundColor: `${statusColor}11`,
          }}
        >
          [{element.status}]
        </span>
      )}
    </div>
  );
};

export const ConnectorComponent: React.FC<DiagramProps<ConnectorElement>> = ({
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
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        margin: "8px 0",
        ...anim,
      }}
    >
      <div
        style={{
          width: "2px",
          height: "28px",
          backgroundColor: element.active ? theme.colors.accent : theme.colors.surfaceBorder,
          boxShadow: element.active ? `0 0 8px ${theme.colors.accent}` : "none",
        }}
      />
      {element.label && (
        <span
          style={{
            fontSize: 12,
            color: theme.colors.textMuted,
            fontFamily: theme.typography.fontCode,
            marginTop: 4,
          }}
        >
          {element.label}
        </span>
      )}
    </div>
  );
};

export const ArchitectureTierComponent: React.FC<
  DiagramProps<ArchitectureTierElement>
> = ({ element, sceneFrame, fps, theme, index = 0 }) => {
  const anim = computeAnimationStyles(element.animation, sceneFrame, fps, index);

  return (
    <div
      style={{
        width: "100%",
        padding: "20px",
        backgroundColor: `${theme.colors.surface}dd`,
        border: `1px solid ${theme.colors.surfaceBorder}`,
        borderRadius: theme.borderRadius.md,
        marginBottom: 16,
        ...anim,
      }}
    >
      <div
        style={{
          fontSize: theme.typography.fontSizeSmall,
          fontWeight: 800,
          color: theme.colors.accent,
          fontFamily: theme.typography.fontCode,
          letterSpacing: 2,
          textTransform: "uppercase",
          marginBottom: 12,
        }}
      >
        {element.tier_name}
      </div>

      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
        {(element.nodes || []).map((node, i) => {
          const statusCol =
            node.status === "done"
              ? theme.colors.positive
              : node.status === "active"
              ? theme.colors.accent
              : theme.colors.textMuted;
          return (
            <div
              key={i}
              style={{
                flex: "1 1 calc(50% - 12px)",
                padding: "12px 16px",
                backgroundColor: theme.colors.background,
                border: `1px solid ${statusCol}44`,
                borderRadius: theme.borderRadius.sm,
              }}
            >
              <div
                style={{
                  fontSize: theme.typography.fontSizeSmall + 2,
                  fontWeight: 700,
                  color: theme.colors.textPrimary,
                  fontFamily: theme.typography.fontHeading,
                }}
              >
                {node.label}
              </div>
              {node.detail && (
                <div
                  style={{
                    fontSize: 13,
                    color: theme.colors.textSecondary,
                    fontFamily: theme.typography.fontCode,
                    marginTop: 4,
                  }}
                >
                  {node.detail}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

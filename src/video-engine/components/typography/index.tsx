/**
 * Typography Components for Video Engine.
 */

import React from "react";
import type {
  HeadingElement,
  BodyTextElement,
  KineticTextElement,
  HighlightedTextElement,
  QuoteBlockElement,
  NumberDisplayElement,
  LabelElement,
  CodeBlockElement,
  CaptionTextElement,
} from "../../types";
import { computeAnimationStyles, computeCountUp } from "../../animations/animation-dispatcher";
import type { ThemeTokens } from "../../themes/tokens";

interface TypoProps<T> {
  element: T;
  sceneFrame: number;
  fps: number;
  theme: ThemeTokens;
  index?: number;
}

export const HeadingComponent: React.FC<TypoProps<HeadingElement>> = ({
  element,
  sceneFrame,
  fps,
  theme,
  index = 0,
}) => {
  const anim = computeAnimationStyles(element.animation, sceneFrame, fps, index);
  const size =
    element.level === 1
      ? theme.typography.fontSizeH1
      : element.level === 2
      ? theme.typography.fontSizeH2
      : theme.typography.fontSizeBody;

  return (
    <h2
      style={{
        margin: 0,
        color: element.color ?? theme.colors.textPrimary,
        fontSize: size,
        fontWeight: 900,
        lineHeight: 1.2,
        letterSpacing: -1,
        fontFamily: theme.typography.fontHeading,
        ...anim,
      }}
    >
      {element.text}
    </h2>
  );
};

export const BodyTextComponent: React.FC<TypoProps<BodyTextElement>> = ({
  element,
  sceneFrame,
  fps,
  theme,
  index = 0,
}) => {
  const anim = computeAnimationStyles(element.animation, sceneFrame, fps, index);
  return (
    <p
      style={{
        margin: 0,
        color: element.color ?? theme.colors.textSecondary,
        fontSize: theme.typography.fontSizeBody,
        lineHeight: 1.45,
        fontFamily: theme.typography.fontBody,
        ...anim,
      }}
    >
      {element.text}
    </p>
  );
};

export const KineticTextComponent: React.FC<TypoProps<KineticTextElement>> = ({
  element,
  sceneFrame,
  fps,
  theme,
}) => {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "16px" }}>
      {(element.words || []).map((word, i) => {
        const anim = computeAnimationStyles(
          element.animation ?? { enter: "fade_up", stagger_delay: 0.1 },
          sceneFrame,
          fps,
          i
        );
        const isHighlight =
          element.highlight_index !== undefined && element.highlight_index === i;
        return (
          <span
            key={i}
            style={{
              fontSize: theme.typography.fontSizeHero,
              fontWeight: 900,
              letterSpacing: -2,
              fontFamily: theme.typography.fontHeading,
              color: isHighlight ? theme.colors.accent : theme.colors.textPrimary,
              padding: isHighlight ? "0 12px" : "0",
              borderLeft: isHighlight ? `6px solid ${theme.colors.accent}` : "none",
              backgroundColor: isHighlight ? theme.colors.accentGlow : "transparent",
              ...anim,
            }}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
};

export const HighlightedTextComponent: React.FC<TypoProps<HighlightedTextElement>> = ({
  element,
  sceneFrame,
  fps,
  theme,
  index = 0,
}) => {
  const anim = computeAnimationStyles(element.animation, sceneFrame, fps, index);
  const parts = element.text.split(new RegExp(`(${element.highlight})`, "gi"));
  return (
    <p
      style={{
        fontSize: theme.typography.fontSizeH2,
        fontWeight: 700,
        color: theme.colors.textPrimary,
        fontFamily: theme.typography.fontHeading,
        ...anim,
      }}
    >
      {parts.map((p, i) =>
        p.toLowerCase() === element.highlight.toLowerCase() ? (
          <span
            key={i}
            style={{
              color: element.highlight_color ?? theme.colors.accent,
              textDecoration: "underline",
              textUnderlineOffset: 6,
            }}
          >
            {p}
          </span>
        ) : (
          p
        )
      )}
    </p>
  );
};

export const QuoteBlockComponent: React.FC<TypoProps<QuoteBlockElement>> = ({
  element,
  sceneFrame,
  fps,
  theme,
  index = 0,
}) => {
  const anim = computeAnimationStyles(element.animation, sceneFrame, fps, index);
  return (
    <blockquote
      style={{
        margin: 0,
        padding: "24px 32px",
        borderLeft: `5px solid ${theme.colors.accent}`,
        backgroundColor: theme.colors.surface,
        borderRadius: `0 ${theme.borderRadius.md}px ${theme.borderRadius.md}px 0`,
        boxShadow: "0 8px 30px rgba(0,0,0,0.5)",
        ...anim,
      }}
    >
      <p
        style={{
          margin: 0,
          color: theme.colors.textPrimary,
          fontSize: theme.typography.fontSizeH2,
          fontWeight: 700,
          lineHeight: 1.3,
          fontFamily: theme.typography.fontHeading,
        }}
      >
        "{element.quote}"
      </p>
      {element.author && (
        <cite
          style={{
            display: "block",
            marginTop: 12,
            color: theme.colors.textSecondary,
            fontSize: theme.typography.fontSizeSmall,
            fontStyle: "normal",
            fontFamily: theme.typography.fontCode,
          }}
        >
          — {element.author}
        </cite>
      )}
    </blockquote>
  );
};

export const NumberDisplayComponent: React.FC<TypoProps<NumberDisplayElement>> = ({
  element,
  sceneFrame,
  fps,
  theme,
  index = 0,
}) => {
  const anim = computeAnimationStyles(element.animation, sceneFrame, fps, index);
  const startF = Math.round((element.animation?.start_seconds ?? 0) * fps);
  const durF = Math.max(1, Math.round((element.animation?.duration_seconds ?? 1) * fps));
  const currentVal = Math.round(
    computeCountUp(0, element.value, startF, durF, sceneFrame)
  );

  return (
    <div style={{ textAlign: "center", ...anim }}>
      <div
        style={{
          fontSize: theme.typography.fontSizeHero,
          fontWeight: 900,
          color: theme.colors.accent,
          fontFamily: theme.typography.fontHeading,
          letterSpacing: -2,
        }}
      >
        {element.prefix}
        {currentVal.toLocaleString()}
        {element.suffix}
      </div>
      {element.label && (
        <div
          style={{
            fontSize: theme.typography.fontSizeSmall,
            color: theme.colors.textSecondary,
            fontFamily: theme.typography.fontCode,
            letterSpacing: 2,
            textTransform: "uppercase",
            marginTop: 6,
          }}
        >
          {element.label}
        </div>
      )}
    </div>
  );
};

export const LabelComponent: React.FC<TypoProps<LabelElement>> = ({
  element,
  sceneFrame,
  fps,
  theme,
  index = 0,
}) => {
  const anim = computeAnimationStyles(element.animation, sceneFrame, fps, index);
  return (
    <span
      style={{
        display: "inline-block",
        padding: "6px 14px",
        borderRadius: theme.borderRadius.full,
        fontSize: theme.typography.fontSizeSmall,
        fontWeight: 700,
        fontFamily: theme.typography.fontCode,
        backgroundColor:
          element.variant === "outline" ? "transparent" : theme.colors.accentGlow,
        color: theme.colors.accent,
        border: `1px solid ${theme.colors.accent}`,
        ...anim,
      }}
    >
      {element.text}
    </span>
  );
};

export const CodeBlockVisualComponent: React.FC<TypoProps<CodeBlockElement>> = ({
  element,
  sceneFrame,
  fps,
  theme,
  index = 0,
}) => {
  const anim = computeAnimationStyles(element.animation, sceneFrame, fps, index);
  return (
    <pre
      style={{
        margin: 0,
        padding: "20px 24px",
        backgroundColor: theme.colors.surface,
        border: `1px solid ${theme.colors.surfaceBorder}`,
        borderRadius: theme.borderRadius.md,
        fontFamily: theme.typography.fontCode,
        fontSize: theme.typography.fontSizeSmall,
        color: theme.colors.textPrimary,
        overflowX: "hidden",
        whiteSpace: "pre-wrap",
        ...anim,
      }}
    >
      <code>{element.code}</code>
    </pre>
  );
};

export const CaptionTextComponent: React.FC<TypoProps<CaptionTextElement>> = ({
  element,
  sceneFrame,
  fps,
  theme,
  index = 0,
}) => {
  const anim = computeAnimationStyles(element.animation, sceneFrame, fps, index);
  return (
    <span
      style={{
        fontSize: theme.typography.fontSizeSmall,
        color: theme.colors.textMuted,
        fontFamily: theme.typography.fontBody,
        ...anim,
      }}
    >
      {element.text}
    </span>
  );
};

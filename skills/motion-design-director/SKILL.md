---
name: motion-design-director
description: Motion design principles, visual storytelling, artifact composition, typography, and Remotion Bits component selection for autonomous video generation.
---

# Motion Design Director Specification & Reusable Principles

This document defines the core motion-graphics, visual storytelling, and composition standards for Voiceage Systems autonomous AI video generation pipeline. It is loaded at runtime into the Visual Art Director, Storyboard Planner, and Scene Planning agents.

---

## 1. Visual Storytelling
- **Narrative Alignment**: Every visual element must directly serve the spoken thesis and current beat. Never add decorative visuals that contradict or distract from narration.
- **Show the Mechanism First**: In technical, economic, or systems explanations, illustrate *how* the process works before asserting its high-level impact.
- **Narrative Arc**:
  - *Hook (0-15%)*: Visually arresting headline, high-contrast hero imagery or bold kinetic type.
  - *Context & Problem (15-40%)*: Investigative evidence, document reveals, split contrast panels showing conventional limits.
  - *Mechanism & Solution (40-75%)*: Concrete architecture flows, code terminals, active telemetry, or data charts.
  - *Proof & Impact (75-90%)*: Verified metric counters, KPI grids, or comparative benchmarks.
  - *Takeaway & CTA (90-100%)*: Forward-looking summary, call to action with clean typography and brand seal.

---

## 2. Motion-Graphics Hierarchy
- **Primary Focal Point (Level 1)**: The core artifact or hero text communicating the main claim (takes 60-70% visual weight).
- **Secondary Support (Level 2)**: Subtitle, metric delta (+320ms, -99%), source citation pill, or architecture node labels.
- **Tertiary Atmosphere (Level 3)**: Subtle grid lines, blurred photographic backdrops, ambient particle drift, or radial glow accents.
- **Rule of Restraint**: Never compete for eye attention. If numbers are animating, keep surrounding cards static. When transitions occur, hold text steady for at least 1.5 seconds so viewers can comfortably read.

---

## 3. Shot Composition & Framing
- **Safe Area**: Keep all vital content (text, counters, badges) inside 90% vertical and horizontal margins (10% padding on mobile 9:16 and desktop 16:9).
- **Negative Space**: Ensure at least 30-40% empty space around primary cards to prevent visual clutter and cognitive overload.
- **Framing Styles**:
  - *Cinematic Bleed*: Full-bleed photographic background with dimmed exposure (0.3-0.45 brightness) for hooks and montages.
  - *Framed Card*: Dark glassmorphic panels (`rgba(18, 22, 32, 0.92)`) with subtle accent borders (`1.5px solid ${accentColor}44`) and backdrop blur.
  - *Split Canvas*: Left/right or top/bottom contrast panels comparing legacy versus breakthrough approaches.

---

## 4. Typography & Legibility
- **Font Selection**:
  - Headings: Heavy sans-serif (`Inter`, `Syne`, or `Space Grotesk`) at 700-900 weight.
  - Code/Telemetry: Monospace (`JetBrains Mono`) with monospace numbers for tabular alignment.
  - Body/Quotes: Clean sans-serif (`Inter`) with comfortable 1.4-1.6 line-height.
- **Contrast Ratios**: Minimum 7:1 contrast ratio between foreground typography and background layers. Use dark scrims (`rgba(0,0,0,0.65)`) over photographic backdrops.
- **Headline Constraints**: Maximum 6-8 words per headline beat. Do not wrap beyond 2-3 lines.

---

## 5. Animation Timing & Rhythm
- **Pacing**:
  - Fast/Punchy: Entry animations between 12-18 frames (0.2-0.3s at 60fps) for tech and breaking news.
  - Smooth/Deliberate: Entry animations between 24-36 frames (0.4-0.6s at 60fps) for documentary and investigative depth.
- **Easing**: Use cubic bezier easing (`Easing.out(Easing.cubic)`) or slight overshoot (`Easing.out(Easing.back(1.15))`) for physical weight.
- **Staggering**: Reveal list items or nodes with 6-12 frames (100-200ms) interval to create rhythmic motion hierarchy.

---

## 6. Diagram & Artifact Design
- **Architecture Tiers**: Flow nodes left-to-right or top-to-bottom with animated connector signals showing direction of data/money transfer.
- **Terminals**: Show authentic command-line prompts, realistic syntax, and clear execution status flags (`[INIT]`, `[EXEC]`, `[200 OK]`).
- **Charts**: Always specify genuine units (`%`, `ms`, `$B`), labeled axes, and clear status coloring (green for improved, red/neutral for baseline).
- **Evidence Cards**: Include source badges (e.g., REUTERS, AXIOS, NATURE), citation IDs, and highlighted quote excerpts.

---

## 7. Asset Selection (Images & Fallbacks)
- **Semantic Precision**: Search queries must match the specific subject of the shot (e.g., `"fintech payments terminal"`, `"circuit board clean room"`, `"server cluster rack"`), NOT generic keywords like `"business"` or `"technology"`.
- **Filtering**: Reject generic handshakes, stock smile portraits, and arbitrary abstract blobs.
- **Deterministic Fallbacks**: If asset retrieval returns empty or fails, fall back to domain-appropriate procedural diagrams, SVG node graphs, or stylized monospace telemetry cards—never leave a blank screen or broken image URL.

---

## 8. Remotion Bits Component Selection
Select and integrate proven motion-design components from `remotion-bits`:
- **`TypeWriter`**: Use in `code_terminal` or investigative quote reveals to simulate real-time typing of prompts, scripts, or terminal outputs.
- **`AnimatedCounter`**: Use in `stat_counter`, `split_callout`, and `infographic_grid` for smooth numerical counting and metric benchmarks.
- **`AnimatedText`**: Use in `word_by_word` and `kinetic_typography` for syllable-synchronized kinetic reveals and glitch accents.
- **`CodeBlock`**: Use in technical walkthroughs with syntax highlighting and line numbers.
- **`Particles` & `MatrixRain`**: Use in `system_architecture` background layers to visualize live data transmission or cyber security contexts.

---

## 9. Accessibility, Safe Areas & Contrast
- Never place bright text directly over bright imagery without a dark underlay card or gradient mask.
- Maintain a minimum font size of 24px (at 1080p resolution) for any readable metric or secondary text.
- Ensure audio and visual timing are in sync: visual artifacts must introduce within 0.5s of the spoken beat mentioning them.

---

## 10. Visual Diversity & Anti-Repetition
- Check `GenerationHistory` at runtime to inspect previous themes, scene types, and palettes.
- Reject identical consecutive scene types.
- Ensure every video utilizes at least 4 distinct scene families across its timeline.
- Vary accent colors across domain-appropriate palettes:
  - Finance: Emerald currency `#10B981` & Deep navy `#0B0F19`
  - Coding/DevTools: Amber glow `#F59E0B` & Dark slate `#0D1117`
  - Healthcare/Bio: Cyan precision `#06B6D4` & Deep ocean `#061A24`
  - Autonomous Systems: Neon orange `#FF5F00` & Carbon black `#0A0A0C`

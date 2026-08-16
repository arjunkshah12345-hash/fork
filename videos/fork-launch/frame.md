---
version: alpha
name: FORK — Frame (video / frame layer)
description: >
  Video-first companion to FORK's design.md. The unit is the frame (1920x1080). A near-black
  canvas, a single steel accent, warm graphite surfaces, one ivory action, and the ordered-Bayer
  dither as the execution signal. Geist Sans carries the display voice; Geist Mono carries state,
  commands, scores, and labels. Composition is free; motion is beat-driven and stays calm — no
  glow, no neon, no gradient, no generic blur.
unit: the frame — 1920x1080 primary
principle: three paths converge into one winner · dither is a signal, not decoration

colors:
  ink: "#090a0c"
  graphite: "#0c0e10"
  graphite-soft: "#121519"
  steel: "#aeb9c2"
  steel-dim: "#667078"
  ivory: "#e8e4dc"
  muted: "#989da1"
  # DitherKit accent palette — the three branches and the four score weights.
  blue: "#358ff3"    # MINIMAL PATCH · REVIEW
  purple: "#966eff"  # ROOT-CAUSE FIX · SIMPLICITY
  orange: "#ff9632"  # BEST ARCHITECTURE · SPEED
  green: "#28d26e"   # TESTS
  pink: "#f05abe"    # flash / roll accent only

borders: { hairline: "1px solid #363b40", rule: "1px solid #25292d" }
shadows: { none: "none" }

typography:
  display: { fontFamily: "Geist, system-ui, sans-serif", cqw: 7.0, weight: 600, lineHeight: 0.95, tracking: "-0.045em" }
  headline: { fontFamily: "Geist, system-ui, sans-serif", cqw: 4.2, weight: 600, lineHeight: 1.05, tracking: "-0.03em" }
  body: { fontFamily: "Geist, system-ui, sans-serif", cqw: 2.0, weight: 400, lineHeight: 1.5 }
  kicker: { fontFamily: "Geist Mono, monospace", cqw: 1.4, weight: 500, tracking: "0.22em", upper: true }
  mono: { fontFamily: "Geist Mono, monospace", cqw: 1.6, weight: 400, lineHeight: 1.5 }
  number: { fontFamily: "Geist Mono, monospace", cqw: 5.2, weight: 500, lineHeight: 1.0, tracking: "-0.03em" }

spacing:
  slide-pad: "4.2cqw"
  gap-md: "1.7cqw"
  hairline: "1px"

components:
  canvas: { backgroundColor: "{colors.ink}", description: "The near-black ground every frame stands on. No gradients, no glow." }
  dither-field: { color: "{colors.steel-dim}", opacity: "4%", description: "An ordered-Bayer 8px dot pattern. It is the execution signal — present while work is moving, still when motion stops." }
  filament: { color: "{colors.steel}", description: "One of the three procedural paths. Three start left, converge right into the single winner node." }
  winner-node: { color: "{colors.ivory}", description: "The one resolved output. A solid ivory square — the only fully-saturated element on the frame." }
  kicker: { typography: "{typography.kicker}", description: "The mono eyebrow in steel-dim. Uppercase, tracked, indexical." }
  number-lockup: { typography: "{typography.number} figure + {typography.mono} unit", description: "Scores, weights, and times. Mono figure with a mono % / s unit." }
  hairline: { rule: "1px solid {colors.steel}@24%", description: "The only separator." }
---

# FORK — Frame (video / frame layer)

## Overview

FORK at frame scale is a **speculative-execution terminal**: a near-black canvas where three
procedural filaments — minimal patch, root-cause fix, best architecture — run in parallel and
resolve into a single ivory winner. The register is calm and engineered: steel is the only accent,
graphite is the surface, ivory is the single action, and the ordered-Bayer dither is the execution
signal (present while work is active, still when motion is reduced). No neon, no glow, no gradient,
no glassmorphism.

Three voices: **Geist Sans** (via Inter as the offline fallback) carries display and body; **Geist
Mono** (via JetBrains Mono) carries every indexical layer — kickers, scores, weights, paths, and
elapsed time. The display is sentence case, tight-tracked, near-white on near-black.

**Key characteristics at frame scale:**

- **Ink / steel / ivory trinity** + warm graphite surfaces; ink is the ground, steel the voice, ivory the one resolution.
- **Inter** (sentence case, negative-tracked) for all display; **JetBrains Mono** for kickers, scores, weights, and chrome.
- **Hairline elevation only** — 1px steel@24% rules. No shadows, no glow, no gradients.
- **Ivory is rationed** — at most ONE ivory element per frame (the winner node, or the single CTA).
- **The dither field is a signal** — an 8px ordered-Bayer dot wash, ~4% opacity, denser while motion runs.
- **Density is free** — a frame may stand on a single focal or carry a dense scoreboard.

## The Frame

### Frame Craft Bar

- **Squint** — one display moment dominates at 3-6x its neighbor.
- **Trinity** — ink ground, steel voice, ivory exactly once; graphite surfaces only; no fourth hue, no pure white.
- **Type** — Inter sentence-case display (negative-tracked); JetBrains Mono kickers (uppercase 0.22em) + scores.

- **Primary:** 1920x1080 (16:9). Authored in `cqw` (px / 1920 * 100 = cqw).

## Colors

Default ground `{colors.ink}`. Content gathers on `{colors.graphite}` / `{colors.graphite-soft}`.
Steel (`#aeb9c2`) is the voice; steel-dim (`#667078`) is the secondary chrome; ivory (`#e8e4dc`) is
the one resolution per frame. Muted (`#989da1`) carries secondary copy. No pure black, no pure white,
no saturated hue.

## Typography

- **Display** Inter 600 sentence case, negative-tracked (−0.03..−0.045em).
- **Body** Inter 400 sentence case.
- **Chrome** JetBrains Mono kickers UPPERCASE 0.22em; scores/weights/times mono, tabular.

## Depth & Surface

Hairline elevation only — 1px steel@24% rules. The dither wash sits at ~4% opacity behind content.
No shadows, no glow, no gradients.

## Motion register

Beat-driven and FAST — a montage, not a slideshow. 9 scenes in 12.31s, every cut on the
152 BPM beat grid (1.18–2.05s), BGM time-stretched from 123 BPM. One idea per scene, one
distinct entrance (mask-slam, word-whip, side-snap, path-draw, count-up, spring-pop, 3D
perspective fly-in) — never an opacity-only fade, never the same entrance twice in a row.
The only stillness is the 7.0–8.0s drop: the evidence rows resolve, then ONE WINNER holds in
the silence. Numbers count up; filaments draw and converge; dithered bars grow in a staggered
wave; product UI (the real composer and evidence dashboard) enters in 3D perspective, and the
closing lockup is the mark built from three z-stacked 3D branch planes. No spins, no camera
shake, no gradients.

## Composition Rules

### Do

- Stand every frame on the ink canvas; gather content on graphite surfaces.
- Set all display in Inter sentence case; JetBrains Mono for every kicker, score, weight, and path.
- Ration ivory to one element per frame — the winner node or the single CTA.
- Elevate with a 1px steel hairline only.
- Lead with one clear focal; open with a mono kicker.
- Pair every figure with a mono unit.

### Don't

- No pure white, no pure black, no saturated hue, no gradient, no glow, no shadow.
- No uppercase display, no serif, no monospace body runs.
- No two ivory moments in one frame.
- Don't blow a headline past the measure — step the ramp down.

---
compositionId: fork-launch
duration_s: 15.0
canvas: {"w": 1920, "h": 1080, "fps": 30}
style:
  font: "Inter / JetBrains Mono"
  palette: ["#090a0c", "#0c0e10", "#aeb9c2", "#e8e4dc", "#989da1", "#358ff3", "#966eff", "#ff9632", "#28d26e", "#f04646"]
assets: false
build_notes:
  - "one paused GSAP timeline per frame, keyed to the composition id"
  - "no remote assets; Inter + JetBrains Mono via Google Fonts"
  - "real ordered-Bayer 4x4 dither (DitherKit matrix); bars are canvas-painted + additive bloom"
  - "kinetic type register: masked line reveals (overflow:hidden + yPercent whip), scale/blur slams, side-snaps — NO opacity-only arrivals"
  - "distinct entrance per frame (kinetic-beat-slam doctrine): mask-slam / scale-slam / side-snap / path-draw / spring-pop"
  - "product UI shown in the run-through: real terminal chrome + a FORK dashboard window with implementation rows + dithered score bars"
  - "7 frames · 15s · cut on the 123 BPM grid (thump 0-1s, groove 1-7s, drop 7-10s, rebuild 10-14s)"
avoid: ["generic slideshow", "repetition", "opacity fades on arrivals", "gradients", "camera shake", "slow fades", "abstract dots without product UI"]
---

## Frame 1 — f1

- src: compositions/frames/01-f1.html
- duration: 2.0s
- span_sec: [0.0, 2.0]
- pacing: beat_cut
- mood: [dark, tense]
- feel: low bass thump into the groove — a single answer fails in a terminal

### Groups

- **g1** — free_design
  - span_sec: [0.0, 2.0]
  - free_design: { dominant_system: "terminal", primitives: ["typewriter-reveal", "flash-cut"], density_topology: "single-focal" }
  - anchors: [0.0, 0.88]
  - copy: ["THE PROBLEM", "One shot. One answer.", "✗ 2/6 checks failed"]

## Frame 2 — f2

- src: compositions/frames/02-f2.html
- duration: 1.6s
- span_sec: [2.0, 3.6]
- pacing: beat_cut
- mood: [dark, tense]
- feel: groove — a red dithered bar declines

### Groups

- **g1** — free_design
  - span_sec: [2.0, 3.6]
  - free_design: { dominant_system: "decline", primitives: ["directional-fill"], density_topology: "single-focal" }
  - anchors: [2.0, 2.86]
  - copy: ["The first answer is rarely the best."]

## Frame 3 — f3

- src: compositions/frames/03-f3.html
- duration: 3.4s
- span_sec: [3.6, 7.0]
- pacing: beat_cut
- mood: [hype, elegant]
- feel: groove peak — the FORK mark draws itself into the reveal

### Groups

- **g1** — free_design
  - span_sec: [3.6, 7.0]
  - free_design: { dominant_system: "mark draw", primitives: ["mask-reveal", "directional-fill"], density_topology: "single-focal" }
  - anchors: [3.6, 4.34, 4.83]
  - copy: ["INTRODUCING FORK", "Speculative execution for coding agents."]

## Frame 4 — f4

- src: compositions/frames/04-f4.html
- duration: 3.0s
- span_sec: [7.0, 10.0]
- pacing: phrase_flow
- mood: [dark, tense]
- feel: the drop — three dots collapse into one winner in the silence

### Groups

- **g1** — free_design
  - span_sec: [7.0, 10.0]
  - free_design: { dominant_system: "merge", primitives: ["mask-reveal", "blur-resolve"], density_topology: "single-focal" }
  - anchors: [7.0, 9.75]
  - copy: ["HOW IT WORKS", "Run three. Ship one."]

## Frame 5 — f5

- src: compositions/frames/05-f5.html
- duration: 2.0s
- span_sec: [10.0, 12.0]
- pacing: beat_cut
- mood: [hype, glitch]
- feel: rebuild — the score pipeline with the dithered weight bars

### Groups

- **g1** — free_design
  - span_sec: [10.0, 12.0]
  - free_design: { dominant_system: "scoreboard", primitives: ["counting-punch", "directional-fill"], density_topology: "grid" }
  - anchors: [10.0, 10.77, 11.75]
  - copy: ["RUN-THROUGH · STEP 2", "The evidence decides.", "TESTS 50", "REVIEW 30", "SIMPLICITY 10", "SPEED 10"]

## Frame 6 — f6

- src: compositions/frames/06-f6.html
- duration: 2.0s
- span_sec: [12.0, 14.0]
- pacing: beat_cut
- mood: [hype, aggressive]
- feel: rebuild — the winner ships, PR ready

### Groups

- **g1** — free_design
  - span_sec: [12.0, 14.0]
  - free_design: { dominant_system: "selection", primitives: ["mask-reveal", "flash-cut"], density_topology: "single-focal" }
  - anchors: [12.0, 12.75]
  - copy: ["RUN-THROUGH · STEP 3", "Ship the best one.", "✓ PR #42 · ready"]

## Frame 7 — f7

- src: compositions/frames/07-f7.html
- duration: 1.0s
- span_sec: [14.0, 15.0]
- pacing: beat_cut
- mood: [hype, elegant]
- feel: fade-out — the lockup lands

### Groups

- **g1** — free_design
  - span_sec: [14.0, 15.0]
  - free_design: { dominant_system: "lockup", primitives: ["mask-reveal", "flash-cut"], density_topology: "single-focal" }
  - anchors: [14.61]
  - copy: ["FORK", "SPECULATIVE EXECUTION FOR CODING AGENTS"]

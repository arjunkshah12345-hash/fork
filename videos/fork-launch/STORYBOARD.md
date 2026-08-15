---
compositionId: fork-launch
duration_s: 15.0
canvas: {"w": 1920, "h": 1080, "fps": 30}
style:
  font: "Inter / JetBrains Mono"
  palette: ["#090a0c", "#0c0e10", "#aeb9c2", "#e8e4dc", "#989da1", "#358ff3", "#966eff", "#ff9632", "#28d26e"]
assets: false
build_notes:
  - "one paused GSAP timeline per frame, keyed to the composition id"
  - "no remote assets; Inter + JetBrains Mono via Google Fonts"
  - "real ordered-Bayer 4x4 dither (DitherKit matrix); bars are canvas-painted + additive bloom"
  - "opens ON dither: a full-frame Bayer storm resolves into the FORK mark"
  - "7 frames · 15s · cut on the 123 BPM grid (groove 1-7s, drop 7-10s, rebuild 10-14s)"
avoid: ["generic slideshow", "repetition", "gradients", "camera shake", "slow fades"]
---

## Frame 1 — f1

- src: compositions/frames/01-f1.html
- duration: 1.5s
- span_sec: [0.0, 1.5]
- pacing: beat_cut
- mood: [hype, glitch]
- feel: low bass-only thump, SURGE at 1s — the dither storm resolves into the mark

### Groups

- **g1** — free_design
  - span_sec: [0.0, 1.5]
  - free_design: { dominant_system: "dither storm", primitives: ["mask-reveal", "blur-resolve"], density_topology: "single-focal" }
  - anchors: [0.0, 0.88]
  - copy: ["FORK", "SPECULATIVE EXECUTION"]

## Frame 2 — f2

- src: compositions/frames/02-f2.html
- duration: 2.0s
- span_sec: [1.5, 3.5]
- pacing: beat_cut
- mood: [hype]
- feel: four-on-the-floor groove, three colored filaments draw left-to-right

### Groups

- **g1** — free_design
  - span_sec: [1.5, 3.5]
  - free_design: { dominant_system: "three filaments", primitives: ["directional-fill"], density_topology: "accumulate" }
  - anchors: [1.5, 1.88, 2.37]
  - copy: ["Run multiple implementations."]

## Frame 3 — f3

- src: compositions/frames/03-f3.html
- duration: 2.0s
- span_sec: [3.5, 5.5]
- pacing: beat_cut
- mood: [hype, tense]
- feel: filaments converge toward the single winner node

### Groups

- **g1** — free_design
  - span_sec: [3.5, 5.5]
  - free_design: { dominant_system: "convergence", primitives: ["mask-reveal", "blur-resolve"], density_topology: "single-focal" }
  - anchors: [3.5, 4.34, 4.83]
  - copy: ["Test every branch."]

## Frame 4 — f4

- src: compositions/frames/04-f4.html
- duration: 1.5s
- span_sec: [5.5, 7.0]
- pacing: beat_cut
- mood: [hype, glitch]
- feel: groove peaks — the dithered score bars count up into the drop

### Groups

- **g1** — free_design
  - span_sec: [5.5, 7.0]
  - free_design: { dominant_system: "scoreboard", primitives: ["counting-punch", "directional-fill"], density_topology: "grid" }
  - anchors: [5.5, 5.83, 6.32, 6.8]
  - copy: ["The evidence decides.", "TESTS 50", "REVIEW 30", "SIMPLICITY 10", "SPEED 10"]

## Frame 5 — f5

- src: compositions/frames/05-f5.html
- duration: 3.0s
- span_sec: [7.0, 10.0]
- pacing: phrase_flow
- mood: [dark, tense]
- feel: the groove cuts to bare silence — the decisive beat

### Groups

- **g1** — free_design
  - span_sec: [7.0, 10.0]
  - free_design: { dominant_system: "winner hold", primitives: ["mask-reveal", "blur-resolve"], density_topology: "single-focal" }
  - anchors: [7.0, 9.75]
  - copy: ["ONE WINNER"]

## Frame 6 — f6

- src: compositions/frames/06-f6.html
- duration: 2.5s
- span_sec: [10.0, 12.5]
- pacing: beat_cut
- mood: [hype, aggressive]
- feel: rebuild — the winner card slides in, PR-ready flashes

### Groups

- **g1** — free_design
  - span_sec: [10.0, 12.5]
  - free_design: { dominant_system: "selection", primitives: ["mask-reveal", "flash-cut"], density_topology: "single-focal" }
  - anchors: [10.0, 10.77, 11.75]
  - copy: ["Ship the best one.", "PR READY"]

## Frame 7 — f7

- src: compositions/frames/07-f7.html
- duration: 2.5s
- span_sec: [12.5, 15.0]
- pacing: beat_cut
- mood: [hype, elegant]
- feel: final build into the fade-out — the lockup lands

### Groups

- **g1** — free_design
  - span_sec: [12.5, 15.0]
  - free_design: { dominant_system: "lockup", primitives: ["mask-reveal", "flash-cut"], density_topology: "single-focal" }
  - anchors: [12.75, 13.7, 14.61]
  - copy: ["FORK", "Speculative execution for coding agents."]

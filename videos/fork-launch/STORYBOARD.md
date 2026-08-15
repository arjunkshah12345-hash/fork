---
compositionId: fork-launch
duration_s: 30.0
canvas: {"w": 1920, "h": 1080, "fps": 30}
style:
  font: "Inter / JetBrains Mono"
  palette: ["#090a0c", "#0c0e10", "#aeb9c2", "#e8e4dc", "#989da1"]
assets: false
build_notes:
  - "one paused GSAP timeline per frame, keyed to the composition id"
  - "no remote assets; Inter + JetBrains Mono via Google Fonts"
  - "dither is an 8px ordered-Bayer dot wash, ~4% opacity"
avoid: ["generic slideshow", "tiny unreadable hero text", "gradients", "glow", "camera shake"]
---

## Frame 1 — f1

- src: compositions/frames/01-f1.html
- duration: 7.0s
- span_sec: [0.0, 7.0]
- pacing: beat_cut
- mood: [hype, dark]
- feel: intro thump at 1s into a full driving four-on-the-floor groove

### Groups

- **g1** — free_design
  - span_sec: [0.0, 1.0]
  - free_design: { dominant_system: "logo reveal", primitives: ["mask-reveal"], density_topology: "single-focal" }
  - anchors: [0.05, 0.98]
  - copy: "FORK"

- **g2** — free_design
  - span_sec: [1.0, 7.0]
  - free_design: { dominant_system: "per-beat typography + three filaments", primitives: ["directional-fill", "typewriter-reveal"], density_topology: "accumulate" }
  - anchors: [1.0, 1.95, 2.93, 3.90, 4.88, 5.86]
  - copy: ["Speculative execution for coding agents.", "Run multiple implementations.", "MINIMAL PATCH", "ROOT-CAUSE FIX", "BEST ARCHITECTURE"]

## Frame 2 — f2

- src: compositions/frames/02-f2.html
- duration: 3.0s
- span_sec: [7.0, 10.0]
- pacing: phrase_flow
- mood: [dark, tense]
- feel: the groove cuts to a bare held silence — the decisive beat

### Groups

- **g1** — free_design
  - span_sec: [7.0, 10.0]
  - free_design: { dominant_system: "convergence", primitives: ["blur-resolve", "mask-reveal"], density_topology: "single-focal" }
  - anchors: [7.0, 9.9]
  - copy: ["Test every branch.", "ONE WINNER"]

## Frame 3 — f3

- src: compositions/frames/03-f3.html
- duration: 6.0s
- span_sec: [10.0, 16.0]
- pacing: beat_cut
- mood: [hype, glitch]
- feel: groove rebuilds, fills roll into a one-beat stutter at 15s

### Groups

- **g1** — free_design
  - span_sec: [10.0, 14.0]
  - free_design: { dominant_system: "scoreboard", primitives: ["counting-punch", "directional-fill"], density_topology: "grid" }
  - anchors: [10.0, 10.98, 11.95, 12.93, 13.90]
  - copy: ["The evidence decides.", "TESTS 50", "REVIEW 30", "SIMPLICITY 10", "SPEED 10"]

- **g2** — free_design
  - span_sec: [14.0, 16.0]
  - free_design: { dominant_system: "stutter", primitives: ["flash-cut", "hard-cut"], density_topology: "single-focal" }
  - anchors: [14.98, 15.49]
  - copy: ["Required checks are a gate."]

## Frame 4 — f4

- src: compositions/frames/04-f4.html
- duration: 8.0s
- span_sec: [16.0, 24.0]
- pacing: beat_cut
- mood: [hype]
- feel: surging bars with a drop at 19s that snaps into the final build

### Groups

- **g1** — free_design
  - span_sec: [16.0, 19.0]
  - free_design: { dominant_system: "selection", primitives: ["mask-reveal", "counting-punch"], density_topology: "single-focal" }
  - anchors: [16.0, 16.98, 17.95, 18.93]
  - copy: ["Ship the best one.", "WINNER · BEST PATCH"]

- **g2** — free_design
  - span_sec: [19.0, 24.0]
  - free_design: { dominant_system: "resolution", primitives: ["directional-fill", "typewriter-reveal"], density_topology: "single-focal" }
  - anchors: [19.98, 20.95, 21.93, 22.90]
  - copy: ["PR READY", "One pull request. Explicit only.", "Losing branches stay local."]

## Frame 5 — f5

- src: compositions/frames/05-f5.html
- duration: 6.0s
- span_sec: [24.0, 30.0]
- pacing: beat_cut
- mood: [hype, elegant]
- feel: final build tightening into a hard stop at 30s

### Groups

- **g1** — free_design
  - span_sec: [24.0, 28.0]
  - free_design: { dominant_system: "tagline", primitives: ["directional-fill"], density_topology: "single-focal" }
  - anchors: [24.0, 24.98, 25.95, 26.93, 27.90]
  - copy: ["Run multiple implementations.", "Test every branch.", "Ship the best one."]

- **g2** — free_design
  - span_sec: [28.0, 30.0]
  - free_design: { dominant_system: "lockup", primitives: ["mask-reveal", "flash-cut"], density_topology: "single-focal" }
  - anchors: [28.0, 29.47, 29.98]
  - copy: ["FORK"]

---
compositionId: fork-launch
duration_s: 30.0
canvas: {"w": 1920, "h": 1080, "fps": 30}
style:
  font: "Inter / JetBrains Mono"
  palette: ["#090a0c", "#0c0e10", "#aeb9c2", "#e8e4dc", "#989da1", "#358ff3", "#966eff", "#ff9632", "#28d26e"]
assets: false
build_notes:
  - "one paused GSAP timeline per frame, keyed to the composition id"
  - "no remote assets; Inter + JetBrains Mono via Google Fonts"
  - "real ordered-Bayer 4x4 dither (DitherKit matrix); bars are canvas-painted + additive bloom"
  - "fast cut: frames are 1-4s, reveals 0.15-0.35s landing on the 123 BPM grid"
avoid: ["generic slideshow", "tiny unreadable hero text", "gradients", "camera shake", "slow fades"]
---

## Frame 1 — f1

- src: compositions/frames/01-f1.html
- duration: 1.0s
- span_sec: [0.0, 1.0]
- pacing: beat_cut
- mood: [hype, dark]
- feel: low bass-only intro thump, SURGE at 1s

### Groups

- **g1** — free_design
  - span_sec: [0.0, 1.0]
  - free_design: { dominant_system: "logo stamp", primitives: ["mask-reveal", "flash-cut"], density_topology: "single-focal" }
  - anchors: [0.0, 0.49]
  - copy: ["FORK", "SPECULATIVE EXECUTION"]

## Frame 2 — f2

- src: compositions/frames/02-f2.html
- duration: 1.0s
- span_sec: [1.0, 2.0]
- pacing: beat_cut
- mood: [hype]
- feel: four-on-the-floor groove, three colored filaments draw left-to-right

### Groups

- **g1** — free_design
  - span_sec: [1.0, 2.0]
  - free_design: { dominant_system: "three filaments", primitives: ["directional-fill"], density_topology: "accumulate" }
  - anchors: [1.0, 1.37, 1.88]
  - copy: ["Run multiple implementations."]

## Frame 3 — f3

- src: compositions/frames/03-f3.html
- duration: 1.0s
- span_sec: [2.0, 3.0]
- pacing: beat_cut
- mood: [hype, glitch]
- feel: branch labels flash one per beat

### Groups

- **g1** — free_design
  - span_sec: [2.0, 3.0]
  - free_design: { dominant_system: "per-beat typography", primitives: ["flash-cut"], density_topology: "grid" }
  - anchors: [2.0, 2.37, 2.86]
  - copy: ["MINIMAL PATCH", "ROOT-CAUSE FIX", "BEST ARCHITECTURE"]

## Frame 4 — f4

- src: compositions/frames/04-f4.html
- duration: 1.0s
- span_sec: [3.0, 4.0]
- pacing: beat_cut
- mood: [hype]
- feel: headline locks in over the groove

### Groups

- **g1** — free_design
  - span_sec: [3.0, 4.0]
  - free_design: { dominant_system: "headline", primitives: ["directional-fill"], density_topology: "single-focal" }
  - anchors: [3.0, 3.86]
  - copy: ["Speculative execution for coding agents."]

## Frame 5 — f5

- src: compositions/frames/05-f5.html
- duration: 2.0s
- span_sec: [4.0, 6.0]
- pacing: beat_cut
- mood: [hype, tense]
- feel: filaments converge toward the single winner node, dither pulses per kick

### Groups

- **g1** — free_design
  - span_sec: [4.0, 6.0]
  - free_design: { dominant_system: "convergence", primitives: ["mask-reveal", "blur-resolve"], density_topology: "single-focal" }
  - anchors: [4.0, 4.83, 5.83]
  - copy: ["Test every branch."]

## Frame 6 — f6

- src: compositions/frames/06-f6.html
- duration: 1.0s
- span_sec: [6.0, 7.0]
- pacing: beat_cut
- mood: [hype, tense]
- feel: winner node flashes ivory as the drop approaches

### Groups

- **g1** — free_design
  - span_sec: [6.0, 7.0]
  - free_design: { dominant_system: "resolution", primitives: ["flash-cut"], density_topology: "single-focal" }
  - anchors: [6.32, 6.8]
  - copy: ["One will win."]

## Frame 7 — f7

- src: compositions/frames/07-f7.html
- duration: 3.0s
- span_sec: [7.0, 10.0]
- pacing: phrase_flow
- mood: [dark, tense]
- feel: the groove cuts to bare silence — the decisive beat

### Groups

- **g1** — free_design
  - span_sec: [7.0, 10.0]
  - free_design: { dominant_system: "winner hold", primitives: ["mask-reveal", "blur-resolve"], density_topology: "single-focal" }
  - anchors: [7.0, 9.9]
  - copy: ["ONE WINNER"]

## Frame 8 — f8

- src: compositions/frames/08-f8.html
- duration: 3.0s
- span_sec: [10.0, 13.0]
- pacing: beat_cut
- mood: [hype, glitch]
- feel: groove rebuilds — dithered score bars count up in a left-to-right wave with bloom

### Groups

- **g1** — free_design
  - span_sec: [10.0, 13.0]
  - free_design: { dominant_system: "scoreboard", primitives: ["counting-punch", "directional-fill"], density_topology: "grid" }
  - anchors: [10.0, 10.77, 11.75, 12.75]
  - copy: ["The evidence decides.", "TESTS 50", "REVIEW 30", "SIMPLICITY 10", "SPEED 10"]

## Frame 9 — f9

- src: compositions/frames/09-f9.html
- duration: 2.0s
- span_sec: [13.0, 15.0]
- pacing: beat_cut
- mood: [hype]
- feel: bars settle, labels pulse, the gate line lands before the 15s void

### Groups

- **g1** — free_design
  - span_sec: [13.0, 15.0]
  - free_design: { dominant_system: "scoreboard", primitives: ["flash-cut"], density_topology: "grid" }
  - anchors: [13.24, 14.21]
  - copy: ["Required checks are a gate."]

## Frame 10 — f10

- src: compositions/frames/10-f10.html
- duration: 1.0s
- span_sec: [15.0, 16.0]
- pacing: phrase_flow
- mood: [tense, dark]
- feel: one-beat void — the gate holds

### Groups

- **g1** — free_design
  - span_sec: [15.0, 16.0]
  - free_design: { dominant_system: "gate hold", primitives: ["mask-reveal"], density_topology: "single-focal" }
  - anchors: [15.0, 15.7]
  - copy: ["GATE"]

## Frame 11 — f11

- src: compositions/frames/11-f11.html
- duration: 3.0s
- span_sec: [16.0, 19.0]
- pacing: beat_cut
- mood: [hype]
- feel: surge — the winner card slides in over the rebuild

### Groups

- **g1** — free_design
  - span_sec: [16.0, 19.0]
  - free_design: { dominant_system: "selection", primitives: ["mask-reveal", "counting-punch"], density_topology: "single-focal" }
  - anchors: [16.0, 16.7, 17.67, 18.67]
  - copy: ["Ship the best one.", "WINNER · BEST PATCH"]

## Frame 12 — f12

- src: compositions/frames/12-f12.html
- duration: 2.0s
- span_sec: [19.0, 21.0]
- pacing: beat_cut
- mood: [hype, aggressive]
- feel: drop at 19s snaps into the PR-ready flash

### Groups

- **g1** — free_design
  - span_sec: [19.0, 21.0]
  - free_design: { dominant_system: "flash", primitives: ["flash-cut", "hard-cut"], density_topology: "single-focal" }
  - anchors: [19.0, 19.67, 20.64]
  - copy: ["PR READY"]

## Frame 13 — f13

- src: compositions/frames/13-f13.html
- duration: 3.0s
- span_sec: [21.0, 24.0]
- pacing: beat_cut
- mood: [hype]
- feel: resolution — a single green dithered bar fills while the copy lands

### Groups

- **g1** — free_design
  - span_sec: [21.0, 24.0]
  - free_design: { dominant_system: "resolution", primitives: ["typewriter-reveal", "directional-fill"], density_topology: "single-focal" }
  - anchors: [21.0, 21.64, 22.62, 23.1]
  - copy: ["One pull request. Explicit only.", "Losing branches stay local."]

## Frame 14 — f14

- src: compositions/frames/14-f14.html
- duration: 4.0s
- span_sec: [24.0, 28.0]
- pacing: beat_cut
- mood: [hype, elegant]
- feel: final build — the tagline hits three beats with a colored filament reprise

### Groups

- **g1** — free_design
  - span_sec: [24.0, 28.0]
  - free_design: { dominant_system: "tagline", primitives: ["directional-fill"], density_topology: "single-focal" }
  - anchors: [24.59, 25.59, 26.59]
  - copy: ["Run multiple implementations.", "Test every branch.", "Ship the best one."]

## Frame 15 — f15

- src: compositions/frames/15-f15.html
- duration: 2.0s
- span_sec: [28.0, 30.0]
- pacing: beat_cut
- mood: [hype, elegant]
- feel: hard stop at 30s — the lockup lands

### Groups

- **g1** — free_design
  - span_sec: [28.0, 30.0]
  - free_design: { dominant_system: "lockup", primitives: ["mask-reveal", "flash-cut"], density_topology: "single-focal" }
  - anchors: [28.51, 29.47, 29.98]
  - copy: ["FORK"]

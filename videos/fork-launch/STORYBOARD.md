---
compositionId: fork-launch
duration_s: 15.0
canvas: {"w": 1920, "h": 1080, "fps": 30}
style:
  font: "Inter / JetBrains Mono"
  palette: ["#090a0c", "#0c0e10", "#aeb9c2", "#e8e4dc", "#989da1", "#358ff3", "#966eff", "#ff9632", "#28d26e", "#ff6b6b"]
assets: false
build_notes:
  - "one paused GSAP timeline per frame, keyed to the composition id"
  - "no remote assets; Inter + JetBrains Mono via Google Fonts"
  - "real ordered-Bayer 4x4 dither (DitherKit matrix), base64-encoded SVG data URIs (fixes the # fragment bug)"
  - "20 frames · 15s · hard cuts on the 123 BPM grid — every cut is 0.4–1.0s, no long holds"
  - "one idea per frame, one distinct entrance (mask-slam / scale-slam / side-snap / path-draw / typewriter / count-up / spring-pop)"
  - "three acts: PROBLEM (0–2.9s) → INTRODUCE (2.9–6.8s) → PIVOT+VOID (6.8–10.3s) → RUN-THROUGH (10.3–13.7s) → CLOSE (13.7–15s)"
avoid: ["generic slideshow", "repetition", "opacity fades on arrivals", "gradients", "camera shake", "slow fades", "abstract dots without product UI", "long holds"]
---

## Frame 1 — f1 · 0.00–0.88 — "One shot. One answer." mask slam (problem)

## Frame 2 — f2 · 0.88–1.37 — terminal types `fork run`

## Frame 3 — f3 · 1.37–1.88 — red ✗ 2/6 checks failed + red dither flash

## Frame 4 — f4 · 1.88–2.37 — "The first answer is rarely the best." red accent

## Frame 5 — f5 · 2.37–2.86 — red dithered bar collapses 100%→28%

## Frame 6 — f6 · 2.86–3.37 — full-frame 4-color dither storm (open on dither)

## Frame 7 — f7 · 3.37–3.85 — "INTRODUCING FORK" kicker slam

## Frame 8 — f8 · 3.85–4.83 — "Run three." scale-slam with blur

## Frame 9 — f9 · 4.83–5.83 — "Ship one." side-snap

## Frame 10 — f10 · 5.83–6.80 — dithered FORK mark draws (3 colored branches → ivory winner)

## Frame 11 — f11 · 6.80–7.80 — "Speculative execution for coding agents." + three dots (void)

## Frame 12 — f12 · 7.80–8.80 — three branch paths converge (silence)

## Frame 13 — f13 · 8.80–9.80 — ONE WINNER — ivory node lands

## Frame 14 — f14 · 9.80–10.29 — winner held (stillness beat)

## Frame 15 — f15 · 10.29–10.77 — FORK dashboard window + 3 implementation rows

## Frame 16 — f16 · 10.77–11.75 — 50/30/10/10 dithered bars count up (with bloom)

## Frame 17 — f17 · 11.75–12.75 — "The evidence decides." + winner row highlights

## Frame 18 — f18 · 12.75–13.72 — terminal `fork ship` → `✓ PR #42 · ready`

## Frame 19 — f19 · 13.72–14.61 — FORK lockup slam

## Frame 20 — f20 · 14.61–15.00 — tagline hold

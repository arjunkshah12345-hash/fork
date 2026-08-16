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
  - "real ordered-Bayer 4x4 dither (DitherKit matrix), base64-encoded SVG data URIs"
  - "30 frames · 15s · cut on EVERY beat of the 123 BPM grid (~0.49s apart) — a strobe montage"
  - "one idea per frame, one distinct entrance (mask-slam / scale-slam / side-snap / path-draw / typewriter / count-up / spring-pop)"
  - "three acts: PROBLEM (0–2.9s) → INTRODUCE (2.9–6.8s) → PIVOT+VOID (6.8–10.3s) → RUN-THROUGH (10.3–13.7s) → CLOSE (13.7–15s)"
avoid: ["generic slideshow", "repetition", "opacity fades on arrivals", "gradients", "camera shake", "slow fades", "abstract dots without product UI", "long holds"]
---

## PROBLEM (0–2.86s)
- f1 0.00–0.88 — "One shot. One answer." mask slam
- f2 0.88–1.37 — terminal types `fork run`
- f3 1.37–1.88 — red ✗ 2/6 checks failed + red dither flash
- f4 1.88–2.37 — "rarely the best." red accent
- f5 2.37–2.86 — red dithered bar collapses 100%→28%

## INTRODUCE (2.86–6.80s)
- f6 2.86–3.37 — full-frame 4-color dither storm
- f7 3.37–3.85 — "INTRODUCING FORK" blur-slam
- f8 3.85–4.34 — "Run three." scale-slam
- f9 4.34–4.83 — "Ship one." side-snap
- f10 4.83–5.34 — mark draws · blue branch
- f11 5.34–5.83 — mark draws · purple branch
- f12 5.83–6.32 — mark draws · orange branch + FORK word
- f13 6.32–6.80 — ivory node lands + manifesto sub

## PIVOT + VOID (6.80–10.29s)
- f14 6.80–7.31 — three dots pop in
- f15 7.31–7.80 — "Run three. Ship one." (silence)
- f16 7.80–8.29 — three branch paths draw
- f17 8.29–8.80 — paths converge + colored washes
- f18 8.80–9.29 — ONE WINNER ivory node lands
- f19 9.29–9.80 — "One winner." slam
- f20 9.80–10.29 — winner held (stillness)

## RUN-THROUGH (10.29–13.72s)
- f21 10.29–10.77 — dashboard window + 3 rows
- f22 10.77–11.26 — Tests 50% green bar + count
- f23 11.26–11.75 — Review 30 / Simplicity 10 / Speed 10 bars
- f24 11.75–12.24 — "The evidence decides." + verdicts
- f25 12.24–12.75 — winner row highlights
- f26 12.75–13.23 — terminal types `fork ship`
- f27 13.23–13.72 — ✓ PR #42 · ready

## CLOSE (13.72–15.00s)
- f28 13.72–14.21 — FORK mark slam
- f29 14.21–14.61 — FORK wordmark + tagline slam
- f30 14.61–15.00 — final hold pulse

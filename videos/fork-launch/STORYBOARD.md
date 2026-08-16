---
compositionId: fork-launch
duration_s: 12.31
canvas: {"w": 1920, "h": 1080, "fps": 30}
style:
  font: "Inter / JetBrains Mono"
  palette: ["#090a0c", "#0c0e10", "#aeb9c2", "#e8e4dc", "#989da1", "#358ff3", "#966eff", "#ff9632", "#28d26e", "#ff6b6b"]
assets: false
build_notes:
  - "one paused GSAP timeline per frame, keyed to the composition id"
  - "no remote assets; Inter + JetBrains Mono via Google Fonts"
  - "real ordered-Bayer 4x4 dither (DitherKit matrix), base64-encoded SVG data URIs"
  - "30 frames · 12.31s · cut on EVERY beat of the 152 BPM grid (~0.4s apart) — a strobe montage"
  - "BGM time-stretched 123 → 152 BPM (atempo, pitch-preserving) then re-beat-analyzed"
  - "one idea per frame, one distinct entrance (mask-slam / scale-slam / side-snap / path-draw / typewriter / count-up / spring-pop)"
  - "three acts: PROBLEM (0–2.37s) → INTRODUCE (2.37–5.60s) → PIVOT+VOID (5.60–8.43s) → RUN-THROUGH (8.43–11.26s) → CLOSE (11.26–12.31s)"
  - "silent drop (7.0–8.0s) lands on ONE WINNER; final fade (12.0–12.31s) lands on the lockup"
avoid: ["generic slideshow", "repetition", "opacity fades on arrivals", "gradients", "camera shake", "slow fades", "abstract dots without product UI", "long holds"]
---

## PROBLEM (0–2.37s)
- f1 0.000–0.743 — "One shot. One answer." mask slam (cold open over 2 beats)
- f2 0.743–1.138 — terminal types `fork run`
- f3 1.138–1.556 — red ✗ 2/6 checks failed + red dither flash
- f4 1.556–1.950 — "rarely the best." red accent
- f5 1.950–2.368 — red dithered bar collapses 100%→28%

## INTRODUCE (2.37–5.60s)
- f6 2.368–2.763 — full-frame 4-color dither storm
- f7 2.763–3.181 — "INTRODUCING FORK" blur-slam
- f8 3.181–3.576 — "Run three." scale-slam
- f9 3.576–3.971 — "Ship one." side-snap
- f10 3.971–4.389 — mark draws · blue branch
- f11 4.389–4.783 — mark draws · purple branch
- f12 4.783–5.178 — mark draws · orange branch + FORK word
- f13 5.178–5.596 — ivory node lands + manifesto sub

## PIVOT + VOID (5.60–8.43s)
- f14 5.596–6.014 — three dots pop in
- f15 6.014–6.432 — "Run three. Ship one." (silence)
- f16 6.432–6.827 — three branch paths draw
- f17 6.827–7.221 — paths converge + colored washes
- f18 7.221–7.639 — ONE WINNER ivory node lands (silent drop)
- f19 7.639–8.034 — "One winner." slam
- f20 8.034–8.429 — winner held (stillness)

## RUN-THROUGH (8.43–11.26s)
- f21 8.429–8.824 — dashboard window + 3 rows
- f22 8.824–9.242 — Tests 50% green bar + count
- f23 9.242–9.636 — Review 30 / Simplicity 10 / Speed 10 bars
- f24 9.636–10.054 — "The evidence decides." + verdicts
- f25 10.054–10.472 — winner row highlights
- f26 10.472–10.867 — terminal types `fork ship`
- f27 10.867–11.262 — ✓ PR #42 · ready

## CLOSE (11.26–12.31s)
- f28 11.262–11.587 — FORK mark slam
- f29 11.587–11.958 — FORK wordmark + tagline slam
- f30 11.958–12.31 — final hold pulse through the fade-out

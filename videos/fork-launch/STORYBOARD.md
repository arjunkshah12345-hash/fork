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
  - "7 scenes · 12.31s · cut on musical phrases of the 152 BPM grid (~1.6–2.0s each)"
  - "BGM time-stretched 123 → 152 BPM (atempo, pitch-preserving) then re-beat-analyzed"
  - "human-language copy only — no terminal commands, score weights, or PR numbers"
  - "the three-to-one visual (colored branches/dots → ivory winner) is the through-line"
  - "silent drop (7.0–8.0s) lands on ONE WINNER; final fade (12.0–12.31s) lands on the lockup"
avoid: ["generic slideshow", "repetition", "opacity fades on arrivals", "gradients", "camera shake", "slow fades", "jargon", "wall-of-text", "long holds"]
---

## HOOK (0–1.95s)
- f1 — "One shot. One answer." mask slam over a steel dither wash.

## PROBLEM (1.95–3.58s)
- f2 — "It's rarely the best." ("rarely" turns red) + a red dithered bar collapses 100%→28%.

## INTRODUCE (3.58–5.60s)
- f3 — the FORK mark draws itself: blue → purple → orange branches converge on the ivory node, wordmark lands.

## THESIS (5.60–7.22s)
- f4 — "Run three." pops three colored dots (blue/purple/orange) → "Ship one." collapses them into one ivory dot.

## WINNER (7.22–8.82s)
- f5 — silent drop. A dithered ivory node + "One winner." — the calm decisive hold.

## SHIP (8.82–10.47s)
- f6 — "Ship the best one." slams in, a dithered green ✓ pops.

## LOCKUP (10.47–12.31s)
- f7 — FORK mark + wordmark + "Run three. Ship one." tagline, fading out with the music.

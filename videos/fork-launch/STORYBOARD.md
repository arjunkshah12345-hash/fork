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
  - "9 scenes · 12.31s · every cut on the 152 BPM beat grid (1.18–2.05s)"
  - "BGM time-stretched 123 → 152 BPM (atempo, pitch-preserving) then re-beat-analyzed"
  - "human-language copy only — no terminal commands, score weights, or PR numbers"
  - "the three-to-one visual (colored branches/dots/rows → ivory winner) is the through-line"
  - "real product UI: the new-run composer and candidate-evidence dashboard, built from src/components/dashboard markup"
  - "3D: perspective tilts on product windows and the winner card; the closing lockup is the mark built from three z-stacked branch planes"
  - "silent drop (7.0–8.0s) lands on ONE WINNER; final fade (12.0–12.31s) lands on the lockup"
avoid: ["generic slideshow", "repetition", "opacity fades on arrivals", "gradients", "camera shake", "slow fades", "jargon", "wall-of-text", "long holds"]
---

## PROBLEM (0–1.58s)
- f1 — "One shot." / "One answer." masked slams; a dithered red ✗ stamps with a red dither flash.

## GAMBLE (1.58–2.76s)
- f2 — word-whip "It's rarely the best." ("rarely" in red) + a red dithered bar collapses 100%→28% with a live readout.

## THESIS (2.76–3.95s)
- f3 — "Run three." slams, three dithered dots (blue/purple/orange) pop; "Ship one." side-snaps and the dots collapse into one ivory dot.

## MARK (3.95–5.13s)
- f4 — the FORK mark draws itself (three colored branches converge on the ivory node) with a subtle 3D tilt. "INTRODUCING FORK".

## PRODUCT · COMPOSER (5.13–6.32s)
- f5 — real new-run dashboard in 3D perspective: "Run the task three ways.", repository + task fields, Start parallel run. Floating chips: Codex × 3 · 3 worktrees · SuperCompress −38%.

## PRODUCT · EVIDENCE (6.32–7.5s)
- f6 — real candidate-evidence rows: Minimal patch (88), Root-cause fix (74), Best architecture (61) with dithered score bars (Tests/Review/Simplicity/Speed); the winner row highlights as the drop hits.

## WINNER (7.5–8.68s)
- f7 — silent drop. "One winner." — the winner card pops in 3D, 88/100 counts up. The calm decisive hold.

## SHIP (8.68–10.26s)
- f8 — "Ship the best one." + ivory "Open winning PR" button; PR #42 card side-snaps with a dithered green ✓.

## LOCKUP (10.26–12.31s)
- f9 — the mark built from three z-stacked 3D branch planes converging on the ivory node; FORK wordmark + "Run three. Ship one.", fading out with the music.

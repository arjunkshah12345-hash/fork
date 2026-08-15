import { SpeculativeShaderField } from "@/components/visuals/speculative-shader-field";

export function TrajectoryVisual() {
  return (
    <figure
      aria-labelledby="trajectory-caption"
      className="relative isolate w-full overflow-hidden border-y border-[#252a23] bg-[#0a0d0a] lg:border lg:bg-[#0b0e0b]"
    >
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 z-20 h-px bg-[#c7ff45] opacity-70"
      />
      <SpeculativeShaderField className="absolute inset-0" />
      <svg
        viewBox="0 0 760 610"
        role="img"
        aria-labelledby="trajectory-title trajectory-description"
        className="pointer-events-none relative z-10 block h-auto w-full"
      >
        <title id="trajectory-title">Three implementation strategies converge on one winning patch</title>
        <desc id="trajectory-description">
          Minimal patch, root-cause fix, and best architecture run in parallel, pass through evidence-based evaluation, and converge on the strongest implementation.
        </desc>

        <defs>
          <pattern id="fork-dither" width="8" height="8" patternUnits="userSpaceOnUse">
            <rect x="0" y="0" width="1" height="1" fill="#c7ff45" />
            <rect x="4" y="4" width="1" height="1" fill="#c7ff45" />
          </pattern>
          <pattern id="fork-dither-dense" width="4" height="4" patternUnits="userSpaceOnUse">
            <rect x="0" y="0" width="1" height="1" fill="#c7ff45" />
            <rect x="2" y="2" width="1" height="1" fill="#c7ff45" />
          </pattern>
        </defs>

        <g aria-hidden opacity="0.74">
          <path d="M40 48H720" stroke="#252b24" />
          <path d="M40 562H720" stroke="#252b24" />
          <path d="M278 48V562" stroke="#1b201a" strokeDasharray="2 8" />
          <path d="M526 48V562" stroke="#1b201a" strokeDasharray="2 8" />
        </g>

        <text x="40" y="76" fill="#657060" fontSize="10" fontFamily="var(--font-geist-mono)" letterSpacing="2.4">
          IMPLEMENT
        </text>
        <text x="510" y="76" fill="#657060" fontSize="10" fontFamily="var(--font-geist-mono)" letterSpacing="2.4">
          EVALUATE
        </text>

        <g data-trajectory>
          <text x="40" y="139" fill="#eef2e9" fontSize="16" fontFamily="var(--font-geist-sans)" fontWeight="600">
            Minimal patch
          </text>
          <text x="40" y="164" fill="#737c70" fontSize="11" fontFamily="var(--font-geist-mono)" letterSpacing="1">
            NARROWEST SAFE DIFF
          </text>
          <rect x="240" y="136" width="7" height="7" fill="#0b0e0b" stroke="#7f897a" />
          <path
            data-trajectory-path
            d="M247 139.5C352 139.5 391 281 522 302"
            fill="none"
            stroke="#717b6e"
            strokeWidth="1.5"
            opacity="0.78"
          />
        </g>

        <g data-trajectory>
          <text x="40" y="303" fill="#eef2e9" fontSize="16" fontFamily="var(--font-geist-sans)" fontWeight="600">
            Root-cause fix
          </text>
          <text x="40" y="328" fill="#737c70" fontSize="11" fontFamily="var(--font-geist-mono)" letterSpacing="1">
            UNDERLYING BEHAVIOR
          </text>
          <rect x="240" y="300" width="7" height="7" fill="#0b0e0b" stroke="#7f897a" />
          <path
            data-trajectory-path
            d="M247 303.5H522"
            fill="none"
            stroke="#879382"
            strokeWidth="1.5"
            opacity="0.86"
          />
        </g>

        <g data-trajectory>
          <text x="40" y="467" fill="#eef2e9" fontSize="16" fontFamily="var(--font-geist-sans)" fontWeight="600">
            Best architecture
          </text>
          <text x="40" y="492" fill="#737c70" fontSize="11" fontFamily="var(--font-geist-mono)" letterSpacing="1">
            DURABLE STRUCTURE
          </text>
          <rect x="240" y="464" width="7" height="7" fill="#0b0e0b" stroke="#7f897a" />
          <path
            data-trajectory-path
            d="M247 467.5C352 467.5 391 326 522 305"
            fill="none"
            stroke="#717b6e"
            strokeWidth="1.5"
            opacity="0.78"
          />
        </g>

        <g data-evidence>
          <rect x="505" y="248" width="34" height="111" fill="url(#fork-dither-dense)" opacity="0.12" />
          <path d="M522 248V359" stroke="#c7ff45" strokeWidth="1.5" />
          <rect x="516.5" y="298" width="11" height="11" fill="#c7ff45" />
        </g>

        <g data-winner transform="translate(557 232)">
          <rect width="163" height="143" fill="#0e130b" stroke="#8caf36" />
          <rect x="1" y="1" width="161" height="141" fill="url(#fork-dither)" opacity="0.18" />
          <text x="20" y="32" fill="#c7ff45" fontSize="10" fontFamily="var(--font-geist-mono)" letterSpacing="2.3">
            WINNER
          </text>
          <text x="20" y="70" fill="#f2f5ed" fontSize="20" fontFamily="var(--font-geist-sans)" fontWeight="650">
            Best patch
          </text>
          <path d="M20 91H143" stroke="#3a4630" />
          <text x="20" y="118" fill="#9aa691" fontSize="10" fontFamily="var(--font-geist-mono)" letterSpacing="1.8">
            PR READY
          </text>
          <rect data-winner-signal x="137" y="112" width="6" height="6" fill="#c7ff45" />
        </g>

        <text x="507" y="398" fill="#657060" fontSize="9" fontFamily="var(--font-geist-mono)" letterSpacing="1.5">
          CHECKS · REVIEW · SIMPLICITY · SPEED
        </text>
      </svg>
      <figcaption id="trajectory-caption" className="sr-only">
        FORK runs three implementation strategies in parallel and promotes one evidence-based winner.
      </figcaption>
    </figure>
  );
}

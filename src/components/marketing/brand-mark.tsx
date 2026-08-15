import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      role="img"
      aria-label="FORK"
      className={cn("size-8", className)}
    >
      <rect x="0.5" y="0.5" width="31" height="31" fill="#0b0e0b" stroke="#343a31" />
      <path d="M7 8H11C11 13 13 16 18 16H24" fill="none" stroke="#c7ff45" strokeWidth="1.5" />
      <path d="M7 16H24" fill="none" stroke="#c7ff45" strokeWidth="1.5" />
      <path d="M7 24H11C11 19 13 16 18 16" fill="none" stroke="#c7ff45" strokeWidth="1.5" />
      <rect x="5.5" y="6.5" width="3" height="3" fill="#0b0e0b" stroke="#c7ff45" />
      <rect x="5.5" y="14.5" width="3" height="3" fill="#0b0e0b" stroke="#c7ff45" />
      <rect x="5.5" y="22.5" width="3" height="3" fill="#0b0e0b" stroke="#c7ff45" />
      <rect x="23" y="14.5" width="3" height="3" fill="#c7ff45" />
    </svg>
  );
}

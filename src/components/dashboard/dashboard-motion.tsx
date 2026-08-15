"use client";

import { useEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";

import { cn } from "@/lib/utils";

export function DashboardMotion({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const context = gsap.context(() => {
      const media = gsap.matchMedia();
      media.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          "[data-dashboard-enter]",
          { autoAlpha: 0, y: 10 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.56,
            ease: "power4.out",
            stagger: 0.055,
            clearProps: "transform,opacity,visibility",
          },
        );
      });
      return () => media.revert();
    }, rootRef);
    return () => context.revert();
  }, []);

  return (
    <div ref={rootRef} className={cn("min-w-0", className)}>
      {children}
    </div>
  );
}

"use client";

import Lenis from "lenis";
import { useEffect, type ReactNode } from "react";
import { prefersReducedMotion } from "./hooks";

let lenis: Lenis | null = null;

/** The live Lenis instance (null when reduced motion is on or before mount). */
export function getLenis(): Lenis | null {
  return lenis;
}

/**
 * Smooth-scroll to a section id ("#work" / "work"), an element, or a y offset.
 * Falls back to native scrolling when Lenis is disabled (reduced motion).
 */
export function scrollToTarget(target: string | HTMLElement | number, offset = 0): void {
  if (typeof window === "undefined") return;
  let el: HTMLElement | null = null;
  if (typeof target === "string") {
    const id = target.replace(/^#/, "");
    el = id === "top" ? null : document.getElementById(id);
    if (!el && id !== "top") return;
  } else if (typeof target !== "number") {
    el = target;
  }

  if (lenis) {
    lenis.scrollTo(el ?? (typeof target === "number" ? target : 0), {
      offset,
      duration: 1.2,
    });
  } else {
    const y =
      el != null
        ? el.getBoundingClientRect().top + window.scrollY + offset
        : typeof target === "number"
          ? target
          : 0;
    window.scrollTo({ top: y, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }

  if (el) {
    // Move focus for keyboard / screen-reader users without a second jump.
    if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
    el.focus({ preventScroll: true });
  }
}

/** Mounts Lenis once for the whole page. Disabled for prefers-reduced-motion. */
export function SmoothScroll({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const instance = new Lenis({
      lerp: 0.1,
      smoothWheel: true,
      // Touch keeps native momentum scrolling.
      syncTouch: false,
    });
    lenis = instance;
    let raf = 0;
    const loop = (t: number) => {
      instance.raf(t);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    document.documentElement.classList.add("lenis");
    return () => {
      cancelAnimationFrame(raf);
      instance.destroy();
      lenis = null;
      document.documentElement.classList.remove("lenis");
    };
  }, []);

  return <>{children}</>;
}

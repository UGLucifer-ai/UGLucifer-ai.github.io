"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

/** True when the user asked the OS for reduced motion. Safe on the server. */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Reactive version of prefersReducedMotion(). */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced;
}

type InViewOptions = IntersectionObserverInit & { once?: boolean };

/**
 * Observe an element. Returns [ref, inView, ratio].
 * With `once: true` the observer disconnects after the first hit.
 */
export function useInView<T extends Element = HTMLElement>(
  options: InViewOptions = {},
): [RefObject<T | null>, boolean, number] {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  const [ratio, setRatio] = useState(0);
  const { once = false, root = null, rootMargin = "0px", threshold = 0 } = options;
  const thresholdKey = Array.isArray(threshold) ? threshold.join(",") : String(threshold);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
        setRatio(entry.intersectionRatio);
        if (entry.isIntersecting && once) io.disconnect();
      },
      { root, rootMargin, threshold },
    );
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [once, root, rootMargin, thresholdKey]);

  return [ref, inView, ratio];
}

/**
 * Scroll progress (0 → 1) of an element through the viewport.
 * mode "through": 0 when the element's top hits the viewport bottom,
 *                 1 when its bottom hits the viewport top.
 * mode "pin":     0 when the top hits the viewport top,
 *                 1 when the bottom hits the viewport bottom (sticky sections).
 * mode "page":    whole-document progress (ref ignored).
 * Uses a small rAF loop only while scrolling.
 */
export function useScrollProgress<T extends HTMLElement = HTMLElement>(
  mode: "through" | "pin" | "page" = "through",
): [RefObject<T | null>, number] {
  const ref = useRef<T | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let raf = 0;
    const measure = () => {
      raf = 0;
      const vh = window.innerHeight;
      let p = 0;
      if (mode === "page") {
        const max = document.documentElement.scrollHeight - vh;
        p = max > 0 ? window.scrollY / max : 0;
      } else {
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        if (mode === "pin") {
          const travel = r.height - vh;
          p = travel > 0 ? -r.top / travel : r.top <= 0 ? 1 : 0;
        } else {
          p = (vh - r.top) / (vh + r.height);
        }
      }
      setProgress(Math.min(1, Math.max(0, p)));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [mode]);

  return [ref, progress];
}

"use client";

import { useEffect } from "react";
import { prefersReducedMotion } from "@/lib/hooks";

/**
 * Global reveal-on-scroll: adds `.is-in` to every `.rv` / `.rv-mask`
 * the first time it enters the viewport (animate once only).
 * A MutationObserver picks up elements mounted later.
 */
export default function RevealObserver() {
  useEffect(() => {
    const SELECTOR = ".rv:not(.is-in), .rv-mask:not(.is-in)";
    if (prefersReducedMotion() || typeof IntersectionObserver === "undefined") {
      document.querySelectorAll(SELECTOR).forEach((el) => el.classList.add("is-in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );
    const scan = () => document.querySelectorAll(SELECTOR).forEach((el) => io.observe(el));
    scan();
    const mo = new MutationObserver(scan);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, []);
  return null;
}

"use client";

import type { ReactNode } from "react";
import { scrollToTarget } from "@/lib/scroll";

type Props = {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary";
  download?: boolean;
  external?: boolean;
  className?: string;
  ariaLabel?: string;
};

/** Pill button / link. In-page "#id" links scroll smoothly through Lenis. */
export default function Pill({
  href,
  children,
  variant = "secondary",
  download,
  external,
  className = "",
  ariaLabel,
}: Props) {
  const cls = `btn ${variant === "primary" ? "btn-primary" : "btn-secondary"} ${className}`;
  const isHash = href.startsWith("#");
  return (
    <a
      href={href}
      className={cls}
      aria-label={ariaLabel}
      download={download || undefined}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      onClick={
        isHash
          ? (e) => {
              e.preventDefault();
              scrollToTarget(href);
            }
          : undefined
      }
    >
      {children}
    </a>
  );
}

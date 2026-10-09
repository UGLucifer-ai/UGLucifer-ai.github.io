import type { CSSProperties, ReactNode } from "react";

type Props = {
  index: string;
  label: string;
  /** Plain part of the heading. */
  children: ReactNode;
  /** The single Instrument Serif italic accent word (rendered in --mute). */
  accent?: string;
  id?: string;
  className?: string;
  as?: "h2" | "h3";
};

/** "03 — Selected work" tag + bold heading ending in one italic serif word. */
export default function SectionHeading({
  index,
  label,
  children,
  accent,
  id,
  className = "",
  as: H = "h2",
}: Props) {
  return (
    <header className={className}>
      <p className="tag rv" style={{ "--i": 0 } as CSSProperties}>
        <span>{index}</span>
        <span aria-hidden="true">—</span>
        <span>{label}</span>
      </p>
      <H id={id} className="h-section mt-5">
        <span className="rv-mask" style={{ "--i": 1 } as CSSProperties}>
          <span>
            {children}
            {accent ? (
              <>
                {" "}
                <span className="accent">{accent}</span>
              </>
            ) : null}
          </span>
        </span>
      </H>
    </header>
  );
}

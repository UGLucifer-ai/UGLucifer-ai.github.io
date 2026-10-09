"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { HAS, TIMELINE, sectionIndex } from "@/lib/data";
import SectionHeading from "@/components/ui/SectionHeading";

export default function Experience() {
  const listRef = useRef<HTMLOListElement>(null);
  const [progress, setProgress] = useState(0);
  const [lit, setLit] = useState(0);

  useEffect(() => {
    let raf = 0;
    const measure = () => {
      raf = 0;
      const list = listRef.current;
      if (!list) return;
      const r = list.getBoundingClientRect();
      const anchor = window.innerHeight * 0.6; // the spine tip sits at 60 % of the viewport
      const drawn = Math.min(r.height, Math.max(0, anchor - r.top));
      setProgress(r.height > 0 ? drawn / r.height : 0);
      let n = 0;
      list.querySelectorAll<HTMLElement>("[data-stop]").forEach((el) => {
        if (el.offsetTop + 14 <= drawn) n++;
      });
      setLit(n);
    };
    const on = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => {
      window.removeEventListener("scroll", on);
      window.removeEventListener("resize", on);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  if (!HAS.experience) return null;

  return (
    <section id="experience" className="section exp" aria-labelledby="exp-title">
      <div className="wrap">
        <SectionHeading id="exp-title" index={sectionIndex("experience")} label="Experience" accent="far.">
          The path so
        </SectionHeading>

        <ol ref={listRef} className="tline">
          <li className="tl-spine" aria-hidden="true" role="presentation" style={{ transform: `scaleY(${progress})` }} />
          {TIMELINE.map((t, i) => (
            <li key={t.id} data-stop className={`stop ${i < lit ? "is-lit" : ""}`} style={{ "--i": i } as CSSProperties}>
              <span className="dot" aria-hidden="true" />
              <p className="mono stop-year">{t.period}</p>
              <div className="stop-card">
                <h3 className="stop-title">{t.title}</h3>
                <p className="stop-place">
                  {t.kind === "experience" ? t.org : t.school}
                  {t.place ? <span> · {t.place}</span> : null}
                </p>
                {t.kind === "experience" ? (
                  <>
                    <p className="stop-detail">{t.detail}</p>
                    {t.points.length > 0 && (
                      <ul className="stop-points">
                        {t.points.map((p) => <li key={p}>{p}</li>)}
                      </ul>
                    )}
                    {t.stack.length > 0 && (
                      <ul className="stop-stack" aria-label="Environment">
                        {t.stack.map((s) => <li key={s} className="mono">{s}</li>)}
                      </ul>
                    )}
                  </>
                ) : (
                  <p className="stop-detail">{[t.score, t.honours].filter(Boolean).join(" · ")}</p>
                )}
              </div>
            </li>
          ))}
          <li data-stop className={`stop ${lit > TIMELINE.length ? "is-lit" : ""}`}>
            <span className="dot" aria-hidden="true" />
            <p className="mono stop-year">Next</p>
            <div className="stop-card stop-next">
              <h3 className="stop-title">
                Your <span className="accent">team?</span>
              </h3>
            </div>
          </li>
        </ol>
      </div>
      <style>{`
        .tline{position:relative;list-style:none;margin:56px 0 0;padding:0 0 0 clamp(36px,6vw,72px);display:grid;gap:clamp(28px,5vh,48px)}
        .tline::before{content:"";position:absolute;left:11px;top:0;bottom:0;width:2px;background:var(--soft)}
        .tl-spine{position:absolute;left:11px;top:0;bottom:0;width:2px;background:var(--ink);transform-origin:50% 0;transform:scaleY(0);will-change:transform}
        .stop{position:relative;display:grid;grid-template-columns:200px minmax(0,1fr);gap:24px;align-items:start}
        .dot{position:absolute;left:calc(-1 * clamp(36px,6vw,72px) + 4px);top:6px;width:16px;height:16px;border-radius:50%;background:var(--paper);box-shadow:inset 0 0 0 2px var(--faint);transition:box-shadow .6s var(--ease),background-color .6s var(--ease),transform .6s var(--ease)}
        .stop.is-lit .dot{background:var(--ink);box-shadow:inset 0 0 0 2px var(--ink),0 0 0 6px rgba(13,13,13,.08);transform:scale(1.1)}
        .stop-year{margin:4px 0 0;font-size:13px;color:var(--faint);transition:color .6s var(--ease)}
        .stop-card{padding:26px 28px;border-radius:24px;background:var(--card);box-shadow:inset 0 0 0 1px var(--line);opacity:.45;transform:translateY(10px);transition:opacity .8s var(--ease),transform .8s var(--ease),box-shadow .8s var(--ease)}
        .stop.is-lit .stop-year{color:var(--ink)}
        .stop.is-lit .stop-card{opacity:1;transform:none}
        .stop-title{margin:0;font-size:clamp(22px,2.2vw,30px);letter-spacing:-.035em;line-height:1.1}
        .stop-place{margin:6px 0 0;font-weight:600;color:var(--ink-2)}
        .stop-place span{font-weight:400;color:var(--mute)}
        .stop-detail{margin:14px 0 0;color:var(--ink-2);line-height:1.55}
        .stop-points{margin:12px 0 0;padding:0;list-style:none;display:grid;gap:8px;font-size:14px;color:var(--mute);line-height:1.5}
        .stop-points li{padding-left:18px;position:relative}
        .stop-points li::before{content:"—";position:absolute;left:0;color:var(--faint)}
        .stop-stack{margin:16px 0 0;padding:0;list-style:none;display:flex;flex-wrap:wrap;gap:6px}
        .stop-stack li{font-size:10.5px;padding:4px 9px;border-radius:999px;box-shadow:inset 0 0 0 1px var(--line);color:var(--ink-2)}
        .stop-next{background:transparent;box-shadow:none;border:1.5px dashed var(--faint)}
        @media (max-width: 760px){
          .stop{grid-template-columns:minmax(0,1fr);gap:8px}
          .stop-card{padding:20px}
        }
      `}</style>
    </section>
  );
}

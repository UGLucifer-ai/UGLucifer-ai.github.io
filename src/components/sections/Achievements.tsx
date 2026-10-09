"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ACHIEVEMENTS, HAS, sectionIndex } from "@/lib/data";
import TechLogo, { logoTint } from "@/components/ui/TechLogo";
import { prefersReducedMotion } from "@/lib/hooks";

function CountUp({ to, run }: { to: number; run: boolean }) {
  const [v, setV] = useState(0);
  const done = useRef(false);
  useEffect(() => {
    if (!run || done.current) return;
    done.current = true;
    if (prefersReducedMotion()) return setV(to);
    const t0 = performance.now();
    const D = 1400;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / D);
      const e = 1 - Math.pow(1 - p, 4); // easeOutQuart
      setV(Math.round(to * e));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [run, to]);
  return <>{v.toLocaleString("en-US")}</>;
}

export default function Achievements() {
  const outerRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [travel, setTravel] = useState(0);
  const [x, setX] = useState(0);
  const [p, setP] = useState(0);
  const [active, setActive] = useState(0);
  const [seen, setSeen] = useState<boolean[]>(() => ACHIEVEMENTS.map(() => false));

  // measure horizontal travel → section height = 100svh + travel
  useEffect(() => {
    const measure = () => {
      const tr = trackRef.current;
      if (!tr) return;
      setTravel(Math.max(0, tr.scrollWidth - window.innerWidth));
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (trackRef.current) ro.observe(trackRef.current);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      raf = 0;
      const el = outerRef.current;
      const tr = trackRef.current;
      if (!el || !tr) return;
      const r = el.getBoundingClientRect();
      const range = r.height - window.innerHeight;
      const prog = range > 0 ? Math.min(1, Math.max(0, -r.top / range)) : 0;
      setP(prog);
      setX(-prog * travel);
      // card nearest the viewport centre
      const cx = window.innerWidth / 2;
      let best = 0;
      let bestD = Infinity;
      const nextSeen: number[] = [];
      tr.querySelectorAll<HTMLElement>("[data-card]").forEach((c, i) => {
        const b = c.getBoundingClientRect();
        const d = Math.abs(b.left + b.width / 2 - cx);
        if (d < bestD) {
          bestD = d;
          best = i;
        }
        if (b.left < window.innerWidth * 0.9 && b.right > 0 && r.top < window.innerHeight * 0.6) nextSeen.push(i);
      });
      setActive(best);
      if (nextSeen.length) setSeen((s) => (nextSeen.every((i) => s[i]) ? s : s.map((v, i) => v || nextSeen.includes(i))));
    };
    const on = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };
    tick();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => {
      window.removeEventListener("scroll", on);
      window.removeEventListener("resize", on);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [travel]);

  if (!HAS.achievements) return null;
  const total = String(ACHIEVEMENTS.length).padStart(2, "0");

  return (
    <section id="achievements" ref={outerRef} className="ach" style={{ height: `calc(100svh + ${travel}px)` }} aria-labelledby="ach-title">
      <div className="ach-pin">
        <div className="wrap ach-head">
          <div>
            <p className="tag">
              <span>{sectionIndex("achievements")}</span>
              <span aria-hidden="true">—</span>
              <span>Achievements</span>
            </p>
            <h2 id="ach-title" className="h-section mt-5">
              Numbers that <span className="accent">count.</span>
            </h2>
          </div>
          <div className="ach-prog" aria-hidden="true"><i style={{ transform: `scaleX(${p})` }} /></div>
        </div>
        <div ref={trackRef} className="ach-track" style={{ transform: `translate3d(${x}px,0,0)` }}>
          {ACHIEVEMENTS.map((a, i) => {
            const tint = logoTint(a.logo);
            return (
              <article key={a.id} data-card className={`acard ${active === i ? "is-active" : ""}`} style={{ "--tint": tint ? `${tint}40` : "rgba(13,13,13,.08)" } as CSSProperties}>
                <div className="acard-top">
                  <span className="alogo"><TechLogo name={a.logo} size={40} /></span>
                  <span className="mono aidx">{String(i + 1).padStart(2, "0")} / {total}</span>
                </div>
                <div className="acard-bot">
                  <div>
                    <h3 className="alabel">{a.label}</h3>
                    <p className="acap">{a.caption}</p>
                    <p className="mono adet">{a.detail}</p>
                  </div>
                  <p className="anum" aria-label={`${a.prefix ?? ""}${a.value}${a.suffix ?? ""}`}>
                    {a.prefix}
                    <CountUp to={a.value} run={seen[i]} />
                    {a.suffix}
                  </p>
                </div>
              </article>
            );
          })}
          <p className="ach-end">and counting →</p>
        </div>
      </div>
      <style>{`
        .ach{position:relative}
        .ach-pin{position:sticky;top:0;height:100svh;overflow:hidden;display:flex;flex-direction:column;justify-content:center;gap:clamp(24px,5vh,56px)}
        .ach-head{display:flex;justify-content:space-between;align-items:flex-end;gap:24px}
        .ach-prog{width:min(240px,30vw);height:2px;background:var(--soft);flex:none}
        .ach-prog i{display:block;height:100%;background:var(--ink);transform-origin:0 50%}
        .ach-track{display:flex;gap:20px;padding:20px var(--gutter);width:max-content;will-change:transform}
        .acard{width:clamp(340px,40vw,540px);height:clamp(260px,36vh,310px);flex:none;border-radius:28px;background:var(--card);box-shadow:inset 0 0 0 1px var(--line);padding:26px;display:flex;flex-direction:column;justify-content:space-between;transition:transform .7s var(--ease),box-shadow .7s var(--ease)}
        .acard.is-active{transform:translateY(-12px);box-shadow:inset 0 0 0 1px var(--line),0 40px 80px -36px rgba(13,13,13,.4)}
        .acard-top{display:flex;justify-content:space-between;align-items:flex-start}
        .alogo{width:72px;height:72px;border-radius:20px;display:grid;place-items:center;background:var(--paper);box-shadow:0 0 0 1px var(--line),0 0 40px 4px var(--tint);transition:box-shadow .7s var(--ease)}
        .acard.is-active .alogo{box-shadow:0 0 0 1px var(--line),0 0 60px 14px var(--tint)}
        .aidx{font-size:12px;color:var(--faint)}
        .acard-bot{display:flex;justify-content:space-between;align-items:flex-end;gap:16px}
        .alabel{font-size:20px;letter-spacing:-.03em;margin:0}
        .acap{margin:4px 0 0;color:var(--ink-2);font-size:14px}
        .adet{margin:6px 0 0;color:var(--mute);font-size:11px}
        .anum{margin:0;font-weight:800;letter-spacing:-.06em;line-height:.85;font-size:clamp(64px,7vw,112px)}
        .ach-end{flex:none;align-self:center;margin:0 10vw 0 20px;font-family:var(--font-serif);font-style:italic;color:var(--mute);font-size:clamp(28px,3vw,44px);white-space:nowrap}
        @media (max-width: 600px){
          .acard{width:82vw}
        }
      `}</style>
    </section>
  );
}

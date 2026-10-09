"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { HAS, ID_CARD, PROFILE, QUICK_FACTS, asset, sectionIndex } from "@/lib/data";
import { prefersReducedMotion } from "@/lib/hooks";
import Pill from "@/components/ui/Pill";

/** Damped pendulum: pointer velocity → angular impulse, spring back to an idle sway. */
function useLanyardSwing(ref: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    let angle = 0;
    let vel = 0;
    let lastX: number | null = null;
    let lastT = 0;
    let raf = 0;
    let running = false;
    let visible = false;
    const K = 0.045; // spring stiffness
    const DAMP = 0.94;

    const step = (t: number) => {
      const idle = Math.sin(t / 1400) * 1.2; // subtle idle sway (deg)
      vel += (idle - angle) * K;
      vel *= DAMP;
      angle += vel;
      angle = Math.max(-24, Math.min(24, angle));
      el.style.setProperty("--swing", `${angle.toFixed(3)}deg`);
      raf = running ? requestAnimationFrame(step) : 0;
    };
    const start = () => {
      if (!running && visible) {
        running = true;
        raf = requestAnimationFrame(step);
      }
    };
    const stop = () => {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };
    const onMove = (e: PointerEvent) => {
      const now = performance.now();
      if (lastX !== null && now - lastT < 80) {
        const vx = (e.clientX - lastX) / Math.max(1, now - lastT); // px/ms
        vel += Math.max(-1.6, Math.min(1.6, vx * 0.9));
      }
      lastX = e.clientX;
      lastT = now;
    };
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) start();
      else stop();
    });
    io.observe(el);
    const area = el.closest("section");
    area?.addEventListener("pointermove", onMove as EventListener, { passive: true });
    return () => {
      stop();
      io.disconnect();
      area?.removeEventListener("pointermove", onMove as EventListener);
    };
  }, [ref]);
}

export default function About() {
  const swingRef = useRef<HTMLDivElement>(null);
  const [flipped, setFlipped] = useState(false);
  const [hoverCapable, setHoverCapable] = useState(true);
  useLanyardSwing(swingRef);
  useEffect(() => setHoverCapable(window.matchMedia("(hover: hover)").matches), []);

  if (!HAS.about) return null;

  const rows = [
    { k: "ID No.", v: ID_CARD.idNo },
    { k: "Dept.", v: ID_CARD.dept },
    { k: "Valid till", v: ID_CARD.validTill },
  ].filter((r) => r.v);

  const buttons = [
    PROFILE.resume && { href: asset(PROFILE.resume), label: "Résumé ↓", download: true, primary: true },
    PROFILE.github && { href: PROFILE.github, label: "GitHub ↗", external: true },
    PROFILE.linkedin && { href: PROFILE.linkedin, label: "LinkedIn ↗", external: true },
  ].filter(Boolean) as { href: string; label: string; download?: boolean; external?: boolean; primary?: boolean }[];

  const strapText = `${PROFILE.name} · ${PROFILE.role} · `;
  const first = PROFILE.name.split(" ")[0];

  return (
    <section id="about" className="section about" aria-labelledby="about-title">
      <div className="wrap about-grid">
        <div className="about-left">
          <p className="tag rv">
            <span>{sectionIndex("about")}</span>
            <span aria-hidden="true">—</span>
            <span>About</span>
          </p>
          <h2 id="about-title" className="h-section mt-5">
            <span className="rv-mask" style={{ "--i": 1 } as CSSProperties}>
              <span>
                Hi, I&apos;m <span className="accent">{first}.</span>
              </span>
            </span>
          </h2>
          <p className="about-summary rv" style={{ "--i": 2 } as CSSProperties}>
            {PROFILE.resumeSummary}
          </p>
          {PROFILE.aboutExtraLine && (
            <p className="about-extra rv" style={{ "--i": 3 } as CSSProperties}>
              {PROFILE.aboutExtraLine}
            </p>
          )}
          <div className="about-btns rv" style={{ "--i": 4 } as CSSProperties}>
            {buttons.map((b) => (
              <Pill key={b.label} href={b.href} download={b.download} external={b.external} variant={b.primary ? "primary" : "secondary"}>
                {b.label}
              </Pill>
            ))}
          </div>
        </div>

        <div className="about-center">
          <div ref={swingRef} className="lanyard">
            <div className="strap" aria-hidden="true">
              <div className="strap-text">
                <span>{strapText.repeat(4)}</span>
                <span>{strapText.repeat(4)}</span>
              </div>
            </div>
            <div className="clip" aria-hidden="true" />
            <div
              className={`idcard ${flipped ? "is-flipped" : ""} ${hoverCapable ? "can-hover" : ""}`}
              role="button"
              tabIndex={0}
              aria-pressed={flipped}
              aria-label={`ID card for ${PROFILE.name}. Press Enter to flip.`}
              onClick={() => !hoverCapable && setFlipped((f) => !f)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setFlipped((f) => !f);
                }
              }}
            >
              <div className="idcard-inner">
                <div className="idface idfront">
                  <div className="id-band mono">DEVELOPER ID</div>
                  <div className="id-photo">
                    {PROFILE.portrait ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={asset(PROFILE.portrait)} alt={`Portrait of ${PROFILE.name}`} width={128} height={156} loading="lazy" />
                    ) : (
                      <span className="id-initials mono" aria-hidden="true">{PROFILE.initials}</span>
                    )}
                  </div>
                  <p className="id-name">{PROFILE.name}</p>
                  <p className="id-role">{PROFILE.role}</p>
                  {rows.length > 0 && (
                    <dl className="id-rows">
                      {rows.map((r) => (
                        <div key={r.k}>
                          <dt className="mono">{r.k}</dt>
                          <dd>{r.v}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                  <div className="id-foot" aria-hidden="true">
                    <div className="barcode" />
                    <div className="holo" />
                  </div>
                </div>
                <div className="idface idback">
                  <p className="mono id-back-k">What I am</p>
                  <ul>
                    {ID_CARD.backLines.map((l) => (
                      <li key={l}>{l}</li>
                    ))}
                  </ul>
                  <div className="id-sign">
                    <span className="accent">{PROFILE.name}</span>
                  </div>
                  {PROFILE.email && <p className="mono id-found">If found, say hello · {PROFILE.email}</p>}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="about-right">
          {QUICK_FACTS.length > 0 && (
            <>
              <p className="tag rv">Quick facts</p>
              <dl className="facts">
                {QUICK_FACTS.map((f, i) => (
                  <div key={f.label} className="rv" style={{ "--i": i } as CSSProperties}>
                    <dt className="mono">{f.label}</dt>
                    <dd>{f.href ? <a href={f.href} className="ul">{f.value}</a> : f.value}</dd>
                  </div>
                ))}
              </dl>
            </>
          )}
          {PROFILE.quote && (
            <blockquote className="about-quote rv">
              <span className="accent">&ldquo;</span>
              {PROFILE.quote}
              <span className="accent">&rdquo;</span>
            </blockquote>
          )}
        </div>
      </div>

      <style>{`
        .about-grid{display:grid;grid-template-columns:minmax(0,1fr) 320px minmax(0,1fr);gap:clamp(24px,4vw,56px);align-items:stretch}
        .about-left,.about-right{display:flex;flex-direction:column;gap:22px}
        .about-right{justify-content:flex-end}
        .about-summary{font-size:clamp(17px,1.35vw,20px);line-height:1.5;color:var(--ink-2);margin:0;letter-spacing:-.01em}
        .about-extra{font-size:15px;line-height:1.6;color:var(--mute);margin:0}
        .about-btns{display:flex;flex-wrap:wrap;gap:10px;margin-top:6px}
        .about-center{position:relative;display:flex;justify-content:center;min-height:560px}
        .lanyard{position:absolute;top:calc(-1 * var(--section-py));display:flex;flex-direction:column;align-items:center;transform-origin:50% 0;transform:rotate(var(--swing,0deg));will-change:transform}
        .strap{width:30px;height:calc(var(--section-py) + 56px);background:var(--ink);overflow:hidden;position:relative;border-radius:0 0 4px 4px}
        .strap-text{position:absolute;left:0;top:0;width:30px;display:flex;flex-direction:column;animation:strapScroll 18s linear infinite}
        .strap-text span{writing-mode:vertical-rl;font:500 10px/30px var(--font-mono);color:rgba(255,255,255,.75);letter-spacing:.12em;text-transform:uppercase;white-space:nowrap}
        @keyframes strapScroll{to{transform:translateY(-50%)}}
        .clip{width:22px;height:26px;margin-top:-4px;border-radius:5px 5px 9px 9px;background:linear-gradient(180deg,#d9d7d2,#9c9a95 55%,#e7e5e0);box-shadow:inset 0 0 0 1px rgba(0,0,0,.18),0 2px 4px rgba(0,0,0,.2);position:relative}
        .clip::after{content:"";position:absolute;left:50%;bottom:-8px;width:10px;height:12px;transform:translateX(-50%);border:2px solid #8e8c87;border-top:0;border-radius:0 0 6px 6px}
        .idcard{width:300px;height:404px;margin-top:6px;perspective:1200px;border-radius:22px;cursor:pointer}
        .idcard-inner{position:relative;width:100%;height:100%;transform-style:preserve-3d;transition:transform 1s var(--ease)}
        .idcard.can-hover:hover .idcard-inner,.idcard.is-flipped .idcard-inner{transform:rotateY(180deg)}
        .idface{position:absolute;inset:0;border-radius:22px;background:var(--card);box-shadow:inset 0 0 0 1px var(--line),0 40px 80px -40px rgba(13,13,13,.45),0 10px 24px -14px rgba(13,13,13,.25);backface-visibility:hidden;-webkit-backface-visibility:hidden;overflow:hidden;display:flex;flex-direction:column;align-items:center}
        .idfront::before{content:"";position:absolute;top:12px;left:50%;width:44px;height:8px;margin-left:-22px;border-radius:4px;background:var(--soft);box-shadow:inset 0 1px 2px rgba(0,0,0,.15);z-index:2}
        .id-band{width:100%;padding:28px 0 12px;background:var(--ink);color:#fff;text-align:center;font-size:11px;letter-spacing:.32em}
        .id-photo{margin-top:-2px;margin-top:18px;width:128px;height:156px;border-radius:16px;padding:3px;background:linear-gradient(160deg,#d6d3cd,#7d7b76 60%,#e9e6e0);box-shadow:0 0 0 8px rgba(13,13,13,.035),0 16px 30px -14px rgba(13,13,13,.45);overflow:hidden;position:relative}
        .id-photo img{width:100%;height:100%;object-fit:cover;border-radius:13px;filter:grayscale(1) contrast(1.04);transition:transform .9s var(--ease),filter .9s var(--ease)}
        .idcard:hover .id-photo img{transform:scale(1.06);filter:grayscale(.2)}
        .id-initials{display:grid;place-items:center;width:100%;height:100%;border-radius:13px;background:var(--soft);font-size:28px}
        .id-name{margin:14px 0 0;font-weight:700;font-size:19px;letter-spacing:-.03em}
        .id-role{margin:2px 0 0;color:var(--mute);font-size:13px}
        .id-rows{margin:12px 0 0;width:calc(100% - 48px);display:grid;gap:4px}
        .id-rows div{display:flex;justify-content:space-between;border-top:1px dashed var(--line);padding-top:4px;font-size:12px}
        .id-rows dt{color:var(--faint);font-size:10px;letter-spacing:.08em;text-transform:uppercase}
        .id-rows dd{margin:0;font-weight:600}
        .id-foot{margin-top:auto;width:calc(100% - 48px);display:flex;align-items:flex-end;justify-content:space-between;padding-bottom:18px}
        .barcode{width:150px;height:30px;background:repeating-linear-gradient(90deg,var(--ink) 0 2px,transparent 2px 4px,var(--ink) 4px 5px,transparent 5px 8px,var(--ink) 8px 11px,transparent 11px 12px)}
        .holo{width:38px;height:38px;border-radius:50%;background:conic-gradient(from 0deg,#e9e6e0,#b8b5af,#fafafa,#8f8d88,#dcd9d3,#fff,#e9e6e0);box-shadow:inset 0 0 0 1px rgba(0,0,0,.1);animation:holo 6s linear infinite}
        @keyframes holo{to{transform:rotate(360deg)}}
        .idback{transform:rotateY(180deg);padding:30px 26px 22px;align-items:stretch;text-align:left}
        .id-back-k{font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:var(--mute);margin:0 0 14px}
        .idback ul{list-style:none;margin:0;padding:0;display:grid;gap:10px;font-size:14px;font-weight:500;letter-spacing:-.01em}
        .idback li{padding-left:16px;position:relative;line-height:1.35}
        .idback li::before{content:"";position:absolute;left:0;top:.55em;width:6px;height:6px;border-radius:50%;background:var(--ink)}
        .id-sign{margin-top:auto;border-bottom:1px solid var(--ink);padding-bottom:4px;font-size:26px}
        .id-found{font-size:10px;color:var(--mute);margin:10px 0 0;letter-spacing:.02em;word-break:break-all}
        .facts{margin:0;display:grid}
        .facts div{display:grid;grid-template-columns:96px minmax(0,1fr);gap:12px;padding:14px 0;border-top:1px solid var(--line);font-size:15px}
        .facts div:last-child{border-bottom:1px solid var(--line)}
        .facts dt{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--mute);padding-top:3px}
        .facts dd{margin:0;overflow-wrap:anywhere}
        .ul{text-decoration:underline;text-underline-offset:3px;text-decoration-thickness:1px}
        .about-quote{margin:12px 0 0;font-size:clamp(20px,1.8vw,26px);line-height:1.25;letter-spacing:-.025em;font-weight:600}
        @media (max-width: 1080px){
          .about-grid{grid-template-columns:minmax(0,1fr) 320px}
          .about-right{grid-column:1 / -1}
        }
        @media (max-width: 720px){
          .about-grid{grid-template-columns:minmax(0,1fr)}
          .about-center{min-height:500px;order:-1;margin-top:-40px}
          .lanyard{top:-16px}
          .strap{height:64px}
        }
      `}</style>
    </section>
  );
}

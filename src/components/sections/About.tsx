"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { HAS, ID_CARD, PROFILE, QUICK_FACTS, asset, sectionIndex } from "@/lib/data";
import { useReducedMotion } from "@/lib/hooks";
import { LanyardSim, PHYS } from "@/lib/lanyard-sim";
import Pill from "@/components/ui/Pill";

const TAP_PX = 6; // a press that moves less than this…
const TAP_MS = 250; // …and lasts less than this is a tap → flip
const EDGE = 8; // px kept clear of the section / viewport edges

/**
 * Playable lanyard: grab and pull the card (mouse or touch). The strap is a Verlet rope, the badge
 * reel cord a preloaded spring capped at a max length, the card a rigid body (see lanyard-sim.ts).
 * Fixed 1/120 s timestep with an accumulator; rendering interpolates between the last two steps.
 * Not used with prefers-reduced-motion: the static card (plain CSS layout) stays and only flips.
 */
function useLanyard(
  lanyardRef: React.RefObject<HTMLDivElement | null>,
  enabled: boolean,
  onFlip: () => void,
) {
  const flipRef = useRef(onFlip);
  flipRef.current = onFlip;

  useEffect(() => {
    const lan = lanyardRef.current;
    if (!lan || !enabled) return;
    const section = lan.closest("section");
    const badge = lan.querySelector<HTMLElement>(".badge");
    const card = lan.querySelector<HTMLElement>(".idcard");
    const strapProbe = lan.querySelector<HTMLElement>(".strap");
    const svg = lan.querySelector<SVGSVGElement>(".strap-svg");
    const ribbonPath = svg?.querySelector<SVGPathElement>(".ribbon");
    const textPath = svg?.querySelector<SVGTextPathElement>("textPath");
    const coil = svg?.querySelector<SVGPathElement>(".coil");
    const reel = svg?.querySelector<SVGGElement>(".reel");
    const measure = svg?.querySelector<SVGTextElement>(".strap-measure");
    if (!section || !badge || !card || !strapProbe || !svg || !ribbonPath || !textPath || !coil || !reel || !measure) return;

    const HALF_W = 150; // anchor x in .lanyard coordinates (lanyard is 300 px wide)
    const CARD_TOP = 32; // clip (26) + gap (6)
    const COIL_MIN = 16;
    let sim: LanyardSim;
    let strapH = 0;
    const build = () => {
      const h = strapProbe.offsetHeight;
      if (h === strapH) return;
      strapH = h;
      const mobile = window.innerWidth <= 720;
      sim = new LanyardSim({
        ribbonLen: Math.max(24, strapH - 4 - COIL_MIN), // clip top lands where the static layout puts it
        coilMin: COIL_MIN,
        coilMax: mobile ? 220 : 300,
        cardW: card.offsetWidth || 300,
        cardH: card.offsetHeight || 404,
        cardTop: CARD_TOP,
      });
      updateBounds(false);
    };

    // bounds, in sim coordinates (anchor = 0,0)
    const toSim = (clientX: number, clientY: number) => {
      const r = lan.getBoundingClientRect();
      return { x: clientX - r.left - HALF_W, y: clientY - r.top };
    };
    const updateBounds = (vertical: boolean) => {
      const r = lan.getBoundingClientRect();
      const sr = section.getBoundingClientRect();
      const vw = document.documentElement.clientWidth;
      sim.bounds = {
        minX: Math.max(sr.left, 0) + EDGE - r.left - HALF_W,
        maxX: Math.min(sr.right, vw) - EDGE - r.left - HALF_W,
        minY: vertical ? Math.max(sr.top, 0) + EDGE - r.top : -Infinity,
        maxY: vertical ? Math.min(sr.bottom, window.innerHeight) - EDGE - r.top : Infinity,
      };
    };
    build();
    lan.classList.add("is-live");

    // strap text scroll (same pace as the old CSS marquee: 4 repeats per 18 s)
    let unit = 0;
    try {
      unit = measure.getComputedTextLength();
    } catch {
      unit = 0;
    }

    const render = (alpha: number) => {
      const p = sim.pose(alpha);
      const pts = p.ribbon.map((q) => ({ x: q.x + HALF_W, y: q.y }));
      let d = `M${pts[0].x.toFixed(2)} ${(pts[0].y - 40).toFixed(2)}L${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
      for (let i = 1; i < pts.length - 1; i++) {
        const mx = (pts[i].x + pts[i + 1].x) / 2, my = (pts[i].y + pts[i + 1].y) / 2;
        d += `Q${pts[i].x.toFixed(2)} ${pts[i].y.toFixed(2)} ${mx.toFixed(2)} ${my.toFixed(2)}`;
      }
      const end = pts[pts.length - 1];
      d += `L${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
      ribbonPath.setAttribute("d", d);
      if (unit > 0) textPath.setAttribute("startOffset", (-((sim.t * unit * 4) / 18) % unit).toFixed(2));

      // coil: fixed number of turns, so it opens up like a spring as it stretches
      const ax = p.attach.x + HALF_W, ay = p.attach.y;
      const L = Math.hypot(ax - end.x, ay - end.y) || 1;
      const ux = (ax - end.x) / L, uy = (ay - end.y) / L;
      const turns = 14;
      const amp = 4.2;
      let c = `M${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
      for (let i = 1; i < turns * 2; i++) {
        const t = i / (turns * 2);
        const side = i % 2 ? amp : -amp;
        c += `L${(end.x + ux * L * t - uy * side).toFixed(2)} ${(end.y + uy * L * t + ux * side).toFixed(2)}`;
      }
      c += `L${ax.toFixed(2)} ${ay.toFixed(2)}`;
      coil.setAttribute("d", c);
      reel.setAttribute("transform", `translate(${end.x.toFixed(2)} ${end.y.toFixed(2)})`);
      badge.style.transform = `translate3d(${(ax - HALF_W).toFixed(2)}px,${ay.toFixed(2)}px,0) rotate(${p.angle.toFixed(4)}rad)`;
    };

    // fixed-timestep loop
    let raf = 0;
    let last = 0;
    let acc = 0;
    let visible = false;
    const frame = (now: number) => {
      const frameDt = last ? Math.min(0.1, (now - last) / 1000) : PHYS.dt;
      last = now;
      acc += frameDt;
      let n = 0;
      while (acc >= PHYS.dt && n < PHYS.maxSubsteps) {
        sim.step();
        acc -= PHYS.dt;
        n++;
      }
      if (n === PHYS.maxSubsteps) acc = 0;
      render(acc / PHYS.dt);
      raf = requestAnimationFrame(frame);
    };
    const start = () => {
      if (!raf && visible) {
        last = 0;
        acc = 0;
        raf = requestAnimationFrame(frame);
      }
    };
    const stop = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };
    render(1);

    // drag
    let dragId: number | null = null;
    let downX = 0, downY = 0, downT = 0, moved = 0;
    const onDown = (e: PointerEvent) => {
      if (dragId !== null || (e.pointerType === "mouse" && e.button !== 0)) return;
      dragId = e.pointerId;
      card.setPointerCapture(e.pointerId);
      downX = e.clientX;
      downY = e.clientY;
      downT = performance.now();
      moved = 0;
      updateBounds(true);
      const pt = toSim(e.clientX, e.clientY);
      const { u, v } = sim.localUV(pt);
      sim.grab(u, v, pt);
      lan.classList.add("is-dragging");
      start();
    };
    const clampTarget = (x: number, y: number) => {
      const b = sim.bounds;
      return { x: Math.min(b.maxX, Math.max(b.minX, x)), y: Math.min(b.maxY, Math.max(b.minY, y)) };
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerId !== dragId) return;
      moved = Math.max(moved, Math.hypot(e.clientX - downX, e.clientY - downY));
      updateBounds(true);
      const pt = toSim(e.clientX, e.clientY);
      sim.target = clampTarget(pt.x, pt.y);
    };
    const onUp = (e: PointerEvent) => {
      if (e.pointerId !== dragId) return;
      dragId = null;
      sim.release();
      updateBounds(false);
      lan.classList.remove("is-dragging");
      if (card.hasPointerCapture(e.pointerId)) card.releasePointerCapture(e.pointerId);
      if (e.type === "pointerup" && moved < TAP_PX && performance.now() - downT < TAP_MS) flipRef.current();
    };
    const noDrag = (e: Event) => e.preventDefault(); // no native image/text drag

    // pointer movement near the card (not dragging) nudges it, as before
    let lastX: number | null = null;
    let lastT = 0;
    const onSectionMove = (e: PointerEvent) => {
      if (dragId !== null) return;
      const now = performance.now();
      if (lastX !== null && now - lastT < 80) {
        const dv = Math.max(-14, Math.min(14, (e.clientX - lastX) * 0.22));
        sim.impulse(dv, 0);
      }
      lastX = e.clientX;
      lastT = now;
    };

    const onKey = (e: KeyboardEvent) => {
      const kick: Record<string, [number, number]> = {
        ArrowLeft: [-260, 0],
        ArrowRight: [260, 0],
        ArrowUp: [0, -320],
        ArrowDown: [0, 420],
      };
      const k = kick[e.key];
      if (!k) return;
      e.preventDefault();
      sim.impulse(k[0], k[1]);
      start();
    };

    const onResize = () => {
      const before = strapH;
      build();
      if (strapH === before) updateBounds(false);
      render(1);
    };

    const io = new IntersectionObserver(([en]) => {
      visible = en.isIntersecting;
      if (visible) start();
      else if (dragId === null) stop();
    });
    io.observe(lan.parentElement ?? lan);

    card.addEventListener("pointerdown", onDown);
    card.addEventListener("pointermove", onMove);
    card.addEventListener("pointerup", onUp);
    card.addEventListener("pointercancel", onUp);
    card.addEventListener("lostpointercapture", onUp);
    card.addEventListener("dragstart", noDrag);
    card.addEventListener("keydown", onKey);
    section.addEventListener("pointermove", onSectionMove, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      stop();
      io.disconnect();
      card.removeEventListener("pointerdown", onDown);
      card.removeEventListener("pointermove", onMove);
      card.removeEventListener("pointerup", onUp);
      card.removeEventListener("pointercancel", onUp);
      card.removeEventListener("lostpointercapture", onUp);
      card.removeEventListener("dragstart", noDrag);
      card.removeEventListener("keydown", onKey);
      section.removeEventListener("pointermove", onSectionMove);
      window.removeEventListener("resize", onResize);
      lan.classList.remove("is-live", "is-dragging");
      badge.style.transform = "";
    };
  }, [lanyardRef, enabled]);
}

export default function About() {
  const lanyardRef = useRef<HTMLDivElement>(null);
  const [flipped, setFlipped] = useState(false);
  const reduced = useReducedMotion();
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const live = ready && !reduced;
  useLanyard(lanyardRef, live, () => setFlipped((f) => !f));

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
          <div ref={lanyardRef} className="lanyard">
            <svg className="strap-svg" width="300" height="1" aria-hidden="true" focusable="false">
              <defs>
                <clipPath id="lanyard-clip">
                  <rect x="-2000" y="0" width="4300" height="4000" />
                </clipPath>
                <radialGradient id="lanyard-metal" cx="35%" cy="30%" r="75%">
                  <stop offset="0" stopColor="#f1efea" />
                  <stop offset=".55" stopColor="#a9a7a2" />
                  <stop offset="1" stopColor="#d9d7d2" />
                </radialGradient>
              </defs>
              <text className="strap-measure">{strapText.toUpperCase()}</text>
              <g clipPath="url(#lanyard-clip)">
                <path id="lanyard-ribbon" className="ribbon" d="" />
                <text className="strap-label" dominantBaseline="central">
                  <textPath href="#lanyard-ribbon">{strapText.toUpperCase().repeat(5)}</textPath>
                </text>
              </g>
              <path className="coil" d="" />
              <g className="reel">
                <circle r="10" fill="url(#lanyard-metal)" stroke="rgba(0,0,0,.28)" strokeWidth="1" />
                <circle r="3.2" fill="#7f7d78" />
              </g>
            </svg>
            <div className="strap" aria-hidden="true">
              <div className="strap-text">
                <span>{strapText.repeat(4)}</span>
                <span>{strapText.repeat(4)}</span>
              </div>
            </div>
            <div className="badge">
            <div className="clip" aria-hidden="true" />
            <div
              className={`idcard ${flipped ? "is-flipped" : ""}`}
              role="button"
              tabIndex={0}
              aria-pressed={flipped}
              aria-label={`ID card for ${PROFILE.name}. Press Enter to flip${live ? ", arrow keys to swing it" : ""}.`}
              onClick={() => {
                if (!live) setFlipped((f) => !f); // live mode flips on a short tap (see useLanyard)
              }}
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
                      <img src={asset(PROFILE.portrait)} alt={`Portrait of ${PROFILE.name}`} width={128} height={156} loading="lazy" draggable={false} />
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
        .lanyard{position:absolute;top:calc(-1 * var(--section-py));width:300px;display:flex;flex-direction:column;align-items:center}
        .badge{display:flex;flex-direction:column;align-items:center}
        .strap-svg{position:absolute;left:0;top:0;overflow:visible;pointer-events:none;display:none}
        .strap-measure{font:500 10px var(--font-mono);letter-spacing:.12em;visibility:hidden}
        .ribbon{fill:none;stroke:var(--ink);stroke-width:30;stroke-linejoin:round}
        .strap-label{font:500 10px var(--font-mono);letter-spacing:.12em;fill:rgba(255,255,255,.75)}
        .coil{fill:none;stroke:#7a7873;stroke-width:1.6;stroke-linejoin:round;stroke-linecap:round}
        .lanyard.is-live .strap-svg{display:block}
        .lanyard.is-live .strap{visibility:hidden}
        .lanyard.is-live .badge{position:absolute;left:0;top:0;width:300px;transform-origin:150px 0;will-change:transform}
        .lanyard.is-live .clip{margin-top:0}
        .lanyard.is-live .idcard{touch-action:none;cursor:grab;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
        .lanyard.is-dragging .idcard{cursor:grabbing}
        .strap{width:30px;height:calc(var(--section-py) + 56px);background:var(--ink);overflow:hidden;position:relative;border-radius:0 0 4px 4px}
        .strap-text{position:absolute;left:0;top:0;width:30px;display:flex;flex-direction:column;animation:strapScroll 18s linear infinite}
        .strap-text span{writing-mode:vertical-rl;font:500 10px/30px var(--font-mono);color:rgba(255,255,255,.75);letter-spacing:.12em;text-transform:uppercase;white-space:nowrap}
        @keyframes strapScroll{to{transform:translateY(-50%)}}
        .clip{width:22px;height:26px;margin-top:-4px;border-radius:5px 5px 9px 9px;background:linear-gradient(180deg,#d9d7d2,#9c9a95 55%,#e7e5e0);box-shadow:inset 0 0 0 1px rgba(0,0,0,.18),0 2px 4px rgba(0,0,0,.2);position:relative}
        .clip::after{content:"";position:absolute;left:50%;bottom:-8px;width:10px;height:12px;transform:translateX(-50%);border:2px solid #8e8c87;border-top:0;border-radius:0 0 6px 6px}
        .idcard{width:300px;height:404px;margin-top:6px;perspective:1200px;border-radius:22px;cursor:pointer}
        .idcard-inner{position:relative;width:100%;height:100%;transform-style:preserve-3d;transition:transform 1s var(--ease)}
        .idcard.is-flipped .idcard-inner{transform:rotateY(180deg)}
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

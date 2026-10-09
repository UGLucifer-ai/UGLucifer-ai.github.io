"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { PROFILE, visibleNav, type SectionId } from "@/lib/data";
import { getLenis, scrollToTarget } from "@/lib/scroll";

const useIso = typeof window !== "undefined" ? useLayoutEffect : useEffect;

export default function Navigation() {
  const items = visibleNav();
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState<SectionId | null>(null);
  const [open, setOpen] = useState(false);
  const [indicator, setIndicator] = useState<{ x: number; w: number } | null>(null);
  const linkRefs = useRef<Partial<Record<SectionId, HTMLAnchorElement | null>>>({});
  const pillRef = useRef<HTMLUListElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const menuBtnRef = useRef<HTMLButtonElement>(null);

  // scrolled state + top progress bar (rAF-throttled, writes transform directly)
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      raf = 0;
      const y = window.scrollY;
      setScrolled(y > 40);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (barRef.current) barRef.current.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
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
  }, []);

  // active section
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id as SectionId);
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    const hero = document.getElementById("top");
    const heroIo = new IntersectionObserver(([e]) => e.isIntersecting && setActive(null), {
      rootMargin: "-45% 0px -50% 0px",
    });
    if (hero) heroIo.observe(hero);
    items.forEach((n) => {
      const el = document.getElementById(n.id);
      if (el) io.observe(el);
    });
    return () => {
      io.disconnect();
      heroIo.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // indicator position
  useIso(() => {
    const measure = () => {
      const el = active ? linkRefs.current[active] : null;
      const pill = pillRef.current;
      if (!el || !pill) return setIndicator(null);
      const a = el.getBoundingClientRect();
      const p = pill.getBoundingClientRect();
      setIndicator({ x: a.left - p.left, w: a.width });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [active, scrolled]);

  // mobile menu: Esc + scroll lock
  useEffect(() => {
    if (!open) return;
    const btn = menuBtnRef.current;
    const lenis = getLenis();
    lenis?.stop();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      lenis?.start();
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
      btn?.focus();
    };
  }, [open]);

  const go = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    setOpen(false);
    // let the overlay release scroll first
    requestAnimationFrame(() => scrollToTarget(id));
  };

  return (
    <>
      <a href="#main" className="sr-only-focusable skip">Skip to content</a>
      <div className="nav-progress" aria-hidden="true">
        <div ref={barRef} />
      </div>
      <header className={`nav ${scrolled ? "is-scrolled" : ""}`}>
        <a href="#top" className="nav-brand" onClick={go("top")} aria-label={`${PROFILE.name} — back to top`}>
          <span className="nav-mark" aria-hidden="true">{PROFILE.initials}</span>
          <span className="nav-name">{PROFILE.name}</span>
        </a>

        {items.length > 0 && (
          <nav aria-label="Primary" className="nav-desktop">
            <ul ref={pillRef} className="nav-pill">
              <li
                aria-hidden="true"
                className="nav-ind"
                style={{
                  opacity: indicator ? 1 : 0,
                  transform: `translateX(${indicator?.x ?? 0}px)`,
                  width: indicator?.w ?? 0,
                }}
              />
              {items.map((n) => (
                <li key={n.id}>
                  <a
                    ref={(el) => {
                      linkRefs.current[n.id] = el;
                    }}
                    href={`#${n.id}`}
                    onClick={go(n.id)}
                    className={active === n.id ? "is-active" : ""}
                    aria-current={active === n.id ? "true" : undefined}
                  >
                    {n.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}

        {items.length > 0 && (
          <button
            ref={menuBtnRef}
            className="nav-menu-btn"
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((o) => !o)}
          >
            {open ? "Close" : "Menu"}
          </button>
        )}
      </header>

      <div id="mobile-menu" className={`nav-overlay ${open ? "is-open" : ""}`} aria-hidden={!open} inert={!open}>
        <nav aria-label="Mobile">
          <ol>
            {items.map((n, i) => (
              <li key={n.id} style={{ "--i": i } as CSSProperties}>
                <a href={`#${n.id}`} onClick={go(n.id)}>
                  <span className="mono">{String(i + 1).padStart(2, "0")}</span>
                  {n.label}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      </div>

      <style>{`
        .skip{position:fixed;left:12px;top:12px;z-index:100;background:var(--ink);color:#fff;padding:10px 16px;border-radius:999px}
        .nav-progress{position:fixed;inset:0 0 auto 0;height:2px;z-index:60;pointer-events:none}
        .nav-progress>div{height:100%;background:var(--ink);transform-origin:0 50%;transform:scaleX(0)}
        .nav{position:fixed;z-index:50;top:14px;left:var(--gutter);right:var(--gutter);display:flex;align-items:center;justify-content:space-between;gap:16px;padding:8px;border-radius:999px;transition:background-color .6s var(--ease),box-shadow .6s var(--ease),backdrop-filter .6s var(--ease)}
        .nav.is-scrolled{background:rgba(255,255,255,.62);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);box-shadow:inset 0 0 0 1px var(--line),0 10px 30px -18px rgba(13,13,13,.25)}
        .nav-brand{display:flex;align-items:center;gap:12px;min-width:0}
        .nav-mark{width:40px;height:40px;flex:none;border-radius:50%;display:grid;place-items:center;font:600 13px/1 var(--font-mono);letter-spacing:-.02em;box-shadow:inset 0 0 0 1.5px var(--ink);transition:background-color .6s var(--ease),color .6s var(--ease),transform .9s var(--ease)}
        .nav.is-scrolled .nav-mark{background:var(--ink);color:#fff}
        .nav-brand:hover .nav-mark{transform:rotate(360deg)}
        .nav-name{font-weight:600;letter-spacing:-.02em;white-space:nowrap;transition:opacity .5s var(--ease),transform .5s var(--ease)}
        .nav.is-scrolled .nav-name{opacity:0;transform:translateX(-6px);pointer-events:none}
        .nav-pill{position:relative;display:flex;gap:2px;padding:4px;border-radius:999px;list-style:none;margin:0;background:rgba(255,255,255,.5);box-shadow:inset 0 0 0 1px var(--line)}
        .nav.is-scrolled .nav-pill{background:transparent;box-shadow:none}
        .nav-pill a{position:relative;z-index:1;display:block;padding:9px 16px;border-radius:999px;font-size:14px;font-weight:500;color:var(--ink-2);transition:color .5s var(--ease)}
        .nav-pill a:hover{color:var(--ink)}
        .nav-pill a.is-active{color:#fff}
        .nav-ind{position:absolute;left:0;top:4px;bottom:4px;border-radius:999px;background:var(--ink);transition:transform .7s var(--ease),width .7s var(--ease),opacity .4s var(--ease)}
        .nav-menu-btn{display:none;height:44px;padding:0 20px;border-radius:999px;background:var(--ink);color:#fff;font-weight:600;font-size:14px;position:relative;z-index:70}
        .nav-overlay{position:fixed;inset:0;z-index:45;background:var(--paper);display:flex;align-items:center;padding:96px var(--gutter) 40px;clip-path:circle(0% at calc(100% - 50px) 36px);transition:clip-path .9s var(--ease);visibility:hidden}
        .nav-overlay.is-open{clip-path:circle(150% at calc(100% - 50px) 36px);visibility:visible}
        .nav-overlay ol{list-style:none;margin:0;padding:0;display:grid;gap:6px}
        .nav-overlay li{opacity:0;transform:translateY(30px);transition:opacity .7s var(--ease),transform .7s var(--ease);transition-delay:calc(var(--i)*60ms + 150ms)}
        .nav-overlay.is-open li{opacity:1;transform:none}
        .nav-overlay a{display:flex;align-items:baseline;gap:16px;font-size:clamp(40px,12vw,72px);font-weight:700;letter-spacing:-.045em;line-height:1.05}
        .nav-overlay a .mono{font-size:13px;color:var(--mute);letter-spacing:0}
        @media (max-width: 860px){
          .nav-desktop{display:none}
          .nav-menu-btn{display:block}
        }
      `}</style>
    </>
  );
}

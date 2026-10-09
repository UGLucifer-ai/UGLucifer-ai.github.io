"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { HERO, PROFILE, HAS, asset } from "@/lib/data";
import Pill from "@/components/ui/Pill";

/** Splits "Sr. DevOps Engineer" → ["Sr. DevOps", "Engineer"] for the serif accent. */
function splitRole(role: string): [string, string] {
  const parts = role.trim().split(/\s+/);
  if (parts.length < 2) return ["", role];
  return [parts.slice(0, -1).join(" "), parts[parts.length - 1]];
}

export default function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [soundOn, setSoundOn] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const visibleRef = useRef(true);
  const userMutedRef = useRef(false);
  const justUnlockedRef = useRef(false);

  const [lead, accent] = splitRole(PROFILE.role || PROFILE.name);

  const tryPlay = useCallback(async (withSound: boolean) => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !withSound;
    try {
      await v.play();
      setSoundOn(withSound);
      if (withSound) setBlocked(false);
    } catch {
      if (withSound) {
        // autoplay with sound blocked → fall back to muted playback
        v.muted = true;
        setSoundOn(false);
        setBlocked(true);
        try {
          await v.play();
        } catch {
          /* fully blocked (e.g. data saver) — leave poster */
        }
      }
    }
  }, []);

  // 1) try to start with sound, 2) unlock on first interaction
  useEffect(() => {
    if (!HERO.enabled) return;
    tryPlay(true);
    const unlock = () => {
      const v = videoRef.current;
      if (!v || userMutedRef.current || !v.muted) return cleanup();
      justUnlockedRef.current = true;
      setTimeout(() => (justUnlockedRef.current = false), 400);
      if (visibleRef.current) tryPlay(true);
      else {
        v.muted = false;
        setSoundOn(true);
        setBlocked(false);
      }
      cleanup();
    };
    const evs = ["pointerdown", "keydown", "touchend"] as const;
    const cleanup = () => evs.forEach((e) => window.removeEventListener(e, unlock, true));
    evs.forEach((e) => window.addEventListener(e, unlock, { capture: true, passive: true }));
    return cleanup;
  }, [tryPlay]);

  // 3) pause when < 35 % of the hero is visible, resume when back
  useEffect(() => {
    if (!HERO.enabled) return;
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        const v = videoRef.current;
        if (!v) return;
        visibleRef.current = e.intersectionRatio >= 0.35;
        if (visibleRef.current) v.play().catch(() => {});
        else v.pause();
      },
      { threshold: [0, 0.35, 0.6, 1] },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const toggleSound = () => {
    if (justUnlockedRef.current) return; // this same click already unlocked sound
    const v = videoRef.current;
    if (!v) return;
    if (soundOn) {
      v.muted = true;
      userMutedRef.current = true;
      setSoundOn(false);
    } else {
      userMutedRef.current = false;
      tryPlay(true);
    }
  };

  const ctas = [
    HAS.work && { href: "#work", label: "Explore work", primary: true },
    HAS.contact && { href: "#contact", label: "Let's talk", primary: !HAS.work },
    PROFILE.resume && { href: asset(PROFILE.resume), label: "Résumé ↓", download: true },
  ].filter(Boolean) as { href: string; label: string; primary?: boolean; download?: boolean }[];

  return (
    <section id="top" ref={sectionRef} className={`hero ${HERO.enabled ? "" : "hero--novideo"}`} aria-labelledby="hero-title">
      <p className="hero-ghost" aria-hidden="true">
        {PROFILE.firstName.toUpperCase()}
      </p>

      {HERO.enabled ? (
        <div className="hero-media">
          <video
            ref={videoRef}
            className="hero-video"
            muted
            loop
            playsInline
            preload="auto"
            poster={HERO.poster ? asset(HERO.poster) : undefined}
            aria-label={`${PROFILE.name} introducing himself`}
          >
            <source src={asset(HERO.webm)} type="video/webm" />
            <source src={asset(HERO.mp4)} type="video/mp4" />
          </video>
          <button
            type="button"
            className={`hero-sound ${blocked ? "is-blocked" : ""}`}
            onClick={toggleSound}
            aria-label={soundOn ? "Mute intro video" : "Play intro video with sound"}
            aria-pressed={soundOn}
          >
            {soundOn ? (
              <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
                <rect x="3" y="2" width="3.5" height="12" rx="1" fill="currentColor" />
                <rect x="9.5" y="2" width="3.5" height="12" rx="1" fill="currentColor" />
              </svg>
            ) : (
              <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
                <path d="M4 2.5v11l9.5-5.5z" fill="currentColor" />
              </svg>
            )}
          </button>
        </div>
      ) : (
        <div className="hero-media hero-media--empty" aria-hidden="true" />
      )}

      <div className="hero-copy wrap">
        <div>
          <p className="tag rv" style={{ "--i": 0 } as CSSProperties}>
            {PROFILE.name}
          </p>
          <h1 id="hero-title" className="hero-title">
            <span className="rv-mask" style={{ "--i": 1 } as CSSProperties}>
              <span>
                {lead} <span className="accent">{accent.endsWith(".") ? accent : `${accent}.`}</span>
              </span>
            </span>
          </h1>
        </div>
        {ctas.length > 0 && (
          <div className="hero-ctas rv" style={{ "--i": 3 } as CSSProperties}>
            {ctas.map((c) => (
              <Pill key={c.label} href={c.href} variant={c.primary ? "primary" : "secondary"} download={c.download}>
                {c.label}
              </Pill>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .hero{position:relative;min-height:100svh;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;overflow:hidden;padding-top:84px}
        .hero-ghost{position:absolute;left:50%;top:44%;transform:translate(-50%,-50%);margin:0;font-weight:800;letter-spacing:-.06em;line-height:.8;font-size:clamp(120px,30vw,520px);color:transparent;-webkit-text-stroke:1.5px rgba(13,13,13,.13);white-space:nowrap;pointer-events:none;user-select:none;animation:ghostIn 1.6s var(--ease) both}
        @keyframes ghostIn{from{opacity:0;letter-spacing:-.02em}to{opacity:1}}
        /* no transform/opacity/z-index on .hero-media: it must not form a stacking context, or multiply can't reach the paper */
        .hero-media{position:absolute;left:0;right:0;bottom:0;margin-inline:auto;height:min(96svh,1040px);width:calc(min(96svh,1040px) * .8);max-width:100vw}
        .hero-media--empty{pointer-events:none}
        .hero-video{width:100%;height:100%;object-fit:cover;mix-blend-mode:multiply;-webkit-mask-image:linear-gradient(90deg,transparent,#000 14%,#000 86%,transparent),linear-gradient(180deg,#000 95%,transparent);-webkit-mask-composite:source-in;mask-image:linear-gradient(90deg,transparent,#000 14%,#000 86%,transparent),linear-gradient(180deg,#000 95%,transparent);mask-composite:intersect;animation:heroRise 1.4s var(--ease) both}
        @keyframes heroRise{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:none}}
        .hero-sound{position:absolute;right:6%;bottom:22%;width:46px;height:46px;border-radius:50%;background:var(--ink);color:#fff;display:grid;place-items:center;transition:transform .5s var(--ease)}
        .hero-sound:hover{transform:scale(1.06)}
        .hero-sound.is-blocked::after{content:"";position:absolute;inset:-6px;border-radius:50%;box-shadow:0 0 0 1.5px rgba(13,13,13,.35);animation:ping 1.8s var(--ease) infinite}
        @keyframes ping{0%{transform:scale(.9);opacity:1}100%{transform:scale(1.55);opacity:0}}
        .hero-copy{position:relative;z-index:2;pointer-events:none;display:flex;justify-content:space-between;align-items:flex-end;gap:24px;padding-bottom:clamp(28px,6vh,64px)}
        .hero-copy>*{pointer-events:auto}
        .hero-title{margin-top:14px;font-size:clamp(40px,6.2vw,96px);max-width:9ch}
        .hero-ctas{display:flex;flex-wrap:wrap;gap:10px;justify-content:flex-end}
        @media (max-width: 860px){
          .hero{justify-content:flex-start;padding-top:76px;min-height:auto}
          .hero-media{position:relative;left:auto;right:auto;height:62svh;width:calc(62svh * .8)}
          .hero-media--empty{height:28svh}
          .hero-ghost{top:34svh}
          .hero-copy{flex-direction:column;align-items:flex-start;margin-top:8px}
          .hero-title{max-width:none}
          .hero-ctas{justify-content:flex-start}
          .hero-sound{right:4%;bottom:12%}
          .hero--novideo{justify-content:flex-end;min-height:100svh}
          .hero--novideo .hero-media--empty{display:none}
          .hero--novideo .hero-ghost{top:42%}
          .hero--novideo .hero-copy{margin-top:0}
        }
      `}</style>
    </section>
  );
}

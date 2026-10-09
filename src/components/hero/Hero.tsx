"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { HERO, PROFILE, HAS, asset, answerClip } from "@/lib/data";
import Pill from "@/components/ui/Pill";
import AskMe, { type AskMeHero, type ClipCallbacks } from "@/components/hero/AskMe";

/** Splits "Sr. DevOps Engineer" → ["Sr. DevOps", "Engineer"] for the serif accent. */
function splitRole(role: string): [string, string] {
  const parts = role.trim().split(/\s+/);
  if (parts.length < 2) return ["", role];
  return [parts.slice(0, -1).join(" "), parts[parts.length - 1]];
}

type ActiveClip = { id: string; cb: ClipCallbacks; srcs: string[]; tried: number; started: boolean };

export default function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const answerRef = useRef<HTMLVideoElement>(null);
  const [soundOn, setSoundOn] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [answering, setAnswering] = useState(false);
  const visibleRef = useRef(true);
  const userMutedRef = useRef(false);
  const justUnlockedRef = useRef(false);
  const clipRef = useRef<ActiveClip | null>(null);
  /** the intro loop is held (paused) underneath a playing answer clip */
  const loopHeldRef = useRef(false);

  const [lead, accent] = splitRole(PROFILE.role || PROFILE.name);

  const tryPlay = useCallback(async (withSound: boolean) => {
    const v = videoRef.current;
    if (!v || clipRef.current) return;
    v.muted = !withSound;
    try {
      await v.play();
      setSoundOn(withSound);
      if (withSound) setBlocked(false);
    } catch (err) {
      if ((err as DOMException)?.name === "AbortError") {
        // play() interrupted by a pause (e.g. an answer clip started) — not an autoplay block
        setSoundOn(!v.muted);
        if (!v.muted) setBlocked(false);
        return;
      }
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
    const unlock = (e: Event) => {
      const v = videoRef.current;
      if (!v || userMutedRef.current || !v.muted) return cleanup();
      // a chip with an answer clip is about to play that clip with sound — don't let the intro talk first
      const t = (e.type === "keydown" ? document.activeElement : e.target) as Element | null;
      if (t?.closest?.("[data-clip]")) return cleanup();
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

  // 3) pause when < 35 % of the hero is visible, resume when back (the answer clip if one is playing, else the loop)
  useEffect(() => {
    if (!HERO.enabled) return;
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        const v = videoRef.current;
        const a = answerRef.current;
        if (!v) return;
        visibleRef.current = e.intersectionRatio >= 0.35;
        const clip = clipRef.current;
        if (visibleRef.current) {
          if (clip) a?.play().catch(() => {});
          else v.play().catch(() => {});
        } else {
          v.pause();
          a?.pause();
        }
      },
      { threshold: [0, 0.35, 0.6, 1] },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  /* ───────────── answer clips (second, stacked <video>; crossfades over the loop) ───────────── */

  /** Back to the intro loop: from its first frame (the same relaxed pose the clips end in), muted. */
  const releaseLoop = useCallback(() => {
    const v = videoRef.current;
    setAnswering(false);
    if (!v || !loopHeldRef.current) return;
    loopHeldRef.current = false;
    v.muted = true;
    setSoundOn(false);
    try {
      v.currentTime = 0;
    } catch {
      /* not seekable yet */
    }
    if (visibleRef.current) v.play().catch(() => {});
  }, []);

  const clearAnswer = useCallback(() => {
    const a = answerRef.current;
    clipRef.current = null;
    if (!a) return;
    a.pause();
    // keep the last frame on screen while the layer fades out, then free the decoder
    setTimeout(() => {
      if (clipRef.current || !a.getAttribute("src")) return;
      a.removeAttribute("src");
      a.load();
    }, 400);
  }, []);

  const stopAnswer = useCallback(() => {
    if (!clipRef.current) return;
    clearAnswer();
    releaseLoop();
  }, [clearAnswer, releaseLoop]);

  const startClip = useCallback(() => {
    const a = answerRef.current;
    const clip = clipRef.current;
    if (!a || !clip) return;
    if (!visibleRef.current) return; // resumes when the hero is back in view
    a.play().catch((err: DOMException) => {
      if (clipRef.current !== clip) return;
      if (err?.name === "NotAllowedError" && !a.muted) {
        // sound not allowed after all → play muted, captions still show
        a.muted = true;
        setSoundOn(false);
        setBlocked(true);
        a.play().catch(() => {});
      }
      // AbortError (switched/paused) and NotSupportedError (handled by the error event) need nothing here
    });
  }, []);

  const playAnswer = useCallback(
    (id: string, cb: ClipCallbacks): boolean => {
      const clip = answerClip(id);
      const a = answerRef.current;
      if (!clip || !a || !videoRef.current) {
        stopAnswer(); // text-only answer: leave (or return to) the intro loop
        return false;
      }
      const webmFirst = a.canPlayType('video/webm; codecs="vp9, opus"') === "probably";
      const srcs = (webmFirst ? [clip.webm, clip.mp4] : [clip.mp4, clip.webm]).map(asset);
      clipRef.current = { id, cb, srcs, tried: 0, started: false };
      // the chip click is a user gesture: play with sound unless the visitor explicitly muted
      a.muted = userMutedRef.current;
      a.poster = asset(clip.poster);
      a.src = srcs[0];
      startClip();
      return true;
    },
    [startClip, stopAnswer],
  );

  // answer <video> events
  useEffect(() => {
    const a = answerRef.current;
    if (!a) return;
    const onPlaying = () => {
      const clip = clipRef.current;
      if (!clip) return;
      setSoundOn(!a.muted);
      if (!a.muted) setBlocked(false);
      if (clip.started) return;
      clip.started = true;
      const v = videoRef.current;
      if (v && !loopHeldRef.current) {
        loopHeldRef.current = true;
        v.pause(); // the intro's own voice must not talk over the answer
      }
      setAnswering(true);
      clip.cb.onStart(() => (a.duration > 0 && Number.isFinite(a.duration) ? a.currentTime / a.duration : 0), a.duration);
    };
    const onEnded = () => {
      const clip = clipRef.current;
      if (!clip) return;
      clearAnswer();
      releaseLoop();
      clip.cb.onEnd();
    };
    const onError = () => {
      const clip = clipRef.current;
      if (!clip || !a.getAttribute("src")) return;
      if (clip.tried + 1 < clip.srcs.length) {
        clip.tried++;
        a.src = clip.srcs[clip.tried];
        startClip();
        return;
      }
      // clip missing/undecodable → text-only
      clearAnswer();
      releaseLoop();
      clip.cb.onFail();
    };
    a.addEventListener("playing", onPlaying);
    a.addEventListener("ended", onEnded);
    a.addEventListener("error", onError);
    return () => {
      a.removeEventListener("playing", onPlaying);
      a.removeEventListener("ended", onEnded);
      a.removeEventListener("error", onError);
    };
  }, [clearAnswer, releaseLoop, startClip]);

  const toggleSound = () => {
    if (justUnlockedRef.current) return; // this same click already unlocked sound
    const v = clipRef.current ? answerRef.current : videoRef.current;
    if (!v) return;
    if (soundOn) {
      v.muted = true;
      userMutedRef.current = true;
      setSoundOn(false);
    } else {
      userMutedRef.current = false;
      if (clipRef.current) {
        v.muted = false;
        setSoundOn(true);
        setBlocked(false);
        if (v.paused && visibleRef.current) v.play().catch(() => {});
      } else tryPlay(true);
    }
  };

  const askHero: AskMeHero = { hasClip: (id) => !!answerClip(id), playAnswer, stopAnswer };

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
            className={`hero-video ${answering ? "is-under" : ""}`}
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
          <video
            ref={answerRef}
            className={`hero-video hero-answer ${answering ? "is-on" : ""}`}
            playsInline
            preload="none"
            aria-hidden={!answering}
            tabIndex={-1}
          />
          <button
            type="button"
            className={`hero-sound ${blocked ? "is-blocked" : ""}`}
            onClick={toggleSound}
            aria-label={answering ? (soundOn ? "Mute answer" : "Play answer with sound") : soundOn ? "Mute intro video" : "Play intro video with sound"}
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

      <AskMe hero={askHero} />

      <style>{`
        .hero{position:relative;min-height:100svh;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;overflow:hidden;padding-top:84px}
        .hero-ghost{position:absolute;left:50%;top:44%;transform:translate(-50%,-50%);margin:0;font-weight:800;letter-spacing:-.06em;line-height:.8;font-size:clamp(120px,30vw,520px);color:transparent;-webkit-text-stroke:1.5px rgba(13,13,13,.13);white-space:nowrap;pointer-events:none;user-select:none;animation:ghostIn 1.6s var(--ease) both}
        @keyframes ghostIn{from{opacity:0;letter-spacing:-.02em}to{opacity:1}}
        /* no transform/opacity/z-index on .hero-media: it must not form a stacking context, or multiply can't reach the paper */
        .hero-media{position:absolute;left:0;right:0;bottom:0;margin-inline:auto;height:min(96svh,1040px);width:calc(min(96svh,1040px) * .8);max-width:100vw}
        .hero-media--empty{pointer-events:none}
        .hero-video{width:100%;height:100%;object-fit:cover;mix-blend-mode:multiply;-webkit-mask-image:linear-gradient(90deg,transparent,#000 14%,#000 86%,transparent),linear-gradient(180deg,#000 95%,transparent);-webkit-mask-composite:source-in;mask-image:linear-gradient(90deg,transparent,#000 14%,#000 86%,transparent),linear-gradient(180deg,#000 95%,transparent);mask-composite:intersect;animation:heroRise 1.4s var(--ease) backwards;transition:opacity .28s var(--ease)}
        @keyframes heroRise{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:none}}
        /* answer clip: stacked over the loop with the same box/crop, crossfaded in/out (heroRise fills backwards only, so opacity stays transitionable) */
        .hero-answer{position:absolute;inset:0;opacity:0;animation:none;pointer-events:none;transition:opacity .28s var(--ease)}
        .hero-answer.is-on{opacity:1}
        .hero-video.is-under{opacity:0}
        @media (prefers-reduced-motion: reduce){.hero-video{transition:none}}
        .hero-sound{position:absolute;right:6%;bottom:22%;width:46px;height:46px;border-radius:50%;background:var(--ink);color:#fff;display:grid;place-items:center;transition:transform .5s var(--ease)}
        .hero-sound:hover{transform:scale(1.06)}
        .hero-sound.is-blocked::after{content:"";position:absolute;inset:-6px;border-radius:50%;box-shadow:0 0 0 1.5px rgba(13,13,13,.35);animation:ping 1.8s var(--ease) infinite}
        @keyframes ping{0%{transform:scale(.9);opacity:1}100%{transform:scale(1.55);opacity:0}}
        .hero-copy{position:relative;z-index:2;pointer-events:none;display:flex;justify-content:space-between;align-items:flex-end;gap:24px;padding-bottom:clamp(28px,6vh,64px)}
        .hero-copy>*{pointer-events:auto}
        .hero-title{margin-top:14px;font-size:clamp(40px,6.2vw,96px);max-width:9ch}
        .hero-ctas{display:flex;flex-wrap:wrap;gap:10px;justify-content:flex-end}
        @media (max-width: 959px){
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

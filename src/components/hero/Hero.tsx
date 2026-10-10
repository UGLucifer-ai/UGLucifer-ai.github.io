"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { HERO, HERO_IDLE, PROFILE, HAS, asset, answerClip } from "@/lib/data";
import { getLenis } from "@/lib/scroll";
import { prefersReducedMotion } from "@/lib/hooks";
import Pill from "@/components/ui/Pill";
import AskMe, { type AskMeHero, type ClipCallbacks } from "@/components/hero/AskMe";

/** Splits "Sr. DevOps Engineer" → ["Sr. DevOps", "Engineer"] for the serif accent. */
function splitRole(role: string): [string, string] {
  const parts = role.trim().split(/\s+/);
  if (parts.length < 2) return ["", role];
  return [parts.slice(0, -1).join(" "), parts[parts.length - 1]];
}

/** the mobile layout (hero fits one screen, Ask me docked at the bottom) */
const MOBILE_MQ = "(max-width: 959px)";

type Phase = "intro" | "answer" | "rest";
type Layer = "loop" | "answer" | "idle" | "door";

/** idle loops between door walks: 3–4, now and then 5 */
const doorGap = () => 3 + Math.floor(Math.random() * 2) + (Math.random() < 0.15 ? 1 : 0);

type ActiveClip = { id: string; cb: ClipCallbacks; srcs: string[]; tried: number; started: boolean; speech?: [number, number] };

export default function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const answerRef = useRef<HTMLVideoElement>(null);
  const idleRef = useRef<HTMLVideoElement>(null);
  const doorRef = useRef<HTMLVideoElement>(null);
  const [soundOn, setSoundOn] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [phase, setPhase] = useState<Phase>("intro");
  const [layer, setLayer] = useState<Layer>("loop");
  const answering = phase === "answer";
  const visibleRef = useRef(true);
  const userMutedRef = useRef(false);
  const justUnlockedRef = useRef(false);
  const clipRef = useRef<ActiveClip | null>(null);
  /** visibility pausing is suspended while we scroll the hero into view / the visitor types a question */
  const holdUntilRef = useRef(0);
  const typingHoldRef = useRef(false);
  const lastRatioRef = useRef(1);

  const [lead, accent] = splitRole(PROFILE.role || PROFILE.name);

  /* ───────────── playback state machine ─────────────
     intro  – the talking intro loop (muted autoplay; with sound once the visitor allows it)
     answer – a lip-synced answer clip, stacked over the loop (the loop is paused + muted under it)
     rest   – after an answer (or a typed question): he no longer talks. The silent idle loop plays muted
              (HERO_IDLE, when built), else he holds still on the answer's last frame / the intro's first frame.
              Only the sound button (▶ = replay the intro with sound) or another question leaves rest.
     Invariants: at most one element is unmuted, and only the active one may play (enforced on every play/
     volume change and when the tab comes back); nothing but the sound button restarts the intro after an answer. */
  const phaseRef = useRef<Phase>("intro");
  const layerRef = useRef<Layer>("loop");
  const restKindRef = useRef<"ended" | "stopped">("ended");
  const idleFailedRef = useRef(false);
  const doorFailedRef = useRef(false);
  /** a door walk was started (a looping idle fires 'playing' again at every wrap — that must not cancel it) */
  const doorPendingRef = useRef(false);
  const idleLoopsRef = useRef({ n: 0, gap: doorGap(), lastT: 0 });

  const go = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
    const v = videoRef.current;
    if (v) v.loop = p === "intro"; // never a looping talker outside the intro
  }, []);
  const show = useCallback((l: Layer) => {
    layerRef.current = l;
    setLayer(l);
  }, []);

  const els = () => [videoRef.current, answerRef.current, idleRef.current, doorRef.current].filter(Boolean) as HTMLVideoElement[];
  const activeEl = () => {
    const p = phaseRef.current;
    if (p === "intro") return videoRef.current;
    if (p === "answer") return clipRef.current ? answerRef.current : null;
    return null; // rest: nothing has sound
  };
  /** may this element be playing right now? */
  const mayPlay = (el: HTMLVideoElement) => {
    const p = phaseRef.current;
    if (el === videoRef.current) return p === "intro" || (p === "answer" && layerRef.current === "loop"); // keeps moving until the clip is up
    if (el === answerRef.current) return p === "answer" && !!clipRef.current;
    if (el === idleRef.current) return p === "rest" || (p === "answer" && layerRef.current === "idle");
    if (el === doorRef.current) return p === "rest";
    return false;
  };
  /** pause anything that shouldn't play and mute everything but the active element */
  const enforce = useCallback(() => {
    const act = activeEl();
    for (const el of els()) {
      if (el !== act && !el.muted) el.muted = true;
      if (!el.paused && !mayPlay(el)) el.pause();
    }
  }, []);

  const tryPlay = useCallback(async (withSound: boolean) => {
    const v = videoRef.current;
    if (!v || phaseRef.current !== "intro") return;
    v.muted = !withSound;
    const stale = () => {
      // a question was asked while play() was pending: the intro must not come back
      if (phaseRef.current === "intro") return false;
      v.muted = true;
      if (!mayPlay(v)) v.pause();
      return true;
    };
    try {
      await v.play();
      if (stale()) return;
      setSoundOn(withSound);
      if (withSound) setBlocked(false);
    } catch (err) {
      if (stale()) return;
      if ((err as DOMException)?.name === "AbortError") {
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
          stale();
        } catch {
          /* fully blocked (e.g. data saver) — leave poster */
        }
      }
    }
  }, []);

  // 1) try to start with sound, 2) unlock the intro's sound on the first interaction — but not when that
  //    interaction is with Ask me (a chip, the input, the Ask button…) or after any question: he must not
  //    start talking the intro over (or after) an answer.
  useEffect(() => {
    if (!HERO.enabled) return;
    tryPlay(true);
    const unlock = (e: Event) => {
      const v = videoRef.current;
      if (!v || userMutedRef.current || !v.muted || phaseRef.current !== "intro") return cleanup();
      const t = (e.type === "keydown" ? document.activeElement : e.target) as Element | null;
      if (t?.closest?.(".askme, [data-clip]")) return cleanup();
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

  /* ── idle loop (optional) ── */
  const idleUsable = () => HERO_IDLE.enabled && !!idleRef.current && !idleFailedRef.current;
  const primeIdle = useCallback(() => {
    const i = idleRef.current;
    if (!i || !HERO_IDLE.enabled || idleFailedRef.current || i.getAttribute("src")) return;
    i.muted = true;
    i.preload = "auto";
    const webm = i.canPlayType('video/webm; codecs="vp9"') === "probably";
    i.src = asset(webm ? HERO_IDLE.webm : HERO_IDLE.mp4);
  }, []);

  const primeDoor = useCallback(() => {
    const d = doorRef.current;
    if (!d || !HERO_IDLE.door.enabled || doorFailedRef.current || d.getAttribute("src")) return;
    d.muted = true;
    d.preload = "auto";
    const webm = d.canPlayType('video/webm; codecs="vp9"') === "probably";
    d.src = asset(webm ? HERO_IDLE.door.webm : HERO_IDLE.door.mp4);
  }, []);

  /** freeze fallback for a rest that didn't come from a finished clip: the intro's first frame (= hero poster) */
  const showPosterStill = useCallback(() => {
    const a = answerRef.current;
    if (!a) return;
    a.pause();
    a.muted = true;
    a.removeAttribute("src");
    a.poster = HERO.poster ? asset(HERO.poster) : "";
    a.load();
    show("answer");
  }, [show]);

  const playIdle = useCallback(() => {
    const i = idleRef.current;
    if (!i || !idleUsable() || !visibleRef.current) return;
    const d = doorRef.current;
    if (layerRef.current === "door" && d && !doorFailedRef.current) {
      d.play().catch(() => {}); // resume a door walk that was paused by scrolling away
      return;
    }
    primeIdle();
    i.muted = true;
    i.play().catch(() => {});
  }, [primeIdle]);

  /** after an answer ends (or a typed/text-only question): stop talking, idle or hold still */
  const enterRest = useCallback(
    (kind: "ended" | "stopped") => {
      const v = videoRef.current;
      const a = answerRef.current;
      clipRef.current = null;
      restKindRef.current = kind;
      idleLoopsRef.current = { n: 0, gap: doorGap(), lastT: 0 };
      doorPendingRef.current = false;
      doorRef.current?.pause();
      go("rest");
      setSoundOn(false);
      setBlocked(false);
      a?.pause();
      if (a) a.muted = true;
      if (v) {
        v.pause();
        v.muted = true;
        try {
          v.currentTime = 0; // the relaxed first frame, ready for ▶
        } catch {
          /* not seekable yet */
        }
      }
      enforce();
      if (idleUsable()) {
        playIdle(); // crossfades in on 'playing'; until then the current frame holds still
        if (kind === "stopped" && layerRef.current === "loop" && !visibleRef.current) showPosterStill();
      } else if (kind === "stopped" && !(layerRef.current === "answer" && a?.ended)) showPosterStill();
      // kind "ended" without idle: the answer layer stays up, paused on its last frame (hands in pockets)
    },
    [enforce, go, playIdle, showPosterStill],
  );

  /** ▶ after an answer: back to the intro from its first frame, with sound (called inside the click) */
  const replayIntro = useCallback(() => {
    const v = videoRef.current;
    const a = answerRef.current;
    const i = idleRef.current;
    if (!v) return;
    clipRef.current = null;
    go("intro");
    show("loop");
    a?.pause();
    i?.pause();
    doorRef.current?.pause();
    try {
      v.currentTime = 0;
    } catch {
      /* not seekable yet */
    }
    tryPlay(true);
    const done = a?.getAttribute("src");
    setTimeout(() => {
      if (!a || !done || phaseRef.current !== "intro" || a.getAttribute("src") !== done) return;
      a.removeAttribute("src");
      a.load();
    }, 400);
  }, [go, show, tryPlay]);

  // 3) pause when < 35 % of the hero is visible, resume the ACTIVE element when back (intro / answer / idle —
  //    never the talking intro after an answer). Pausing is skipped while held (a programmatic scroll back to
  //    the hero, or the mobile keyboard is up).
  const applyVisibility = useCallback((ratio: number) => {
    const vis = ratio >= 0.35;
    if (!vis && (typingHoldRef.current || performance.now() < holdUntilRef.current)) return;
    visibleRef.current = vis;
    const v = videoRef.current;
    const a = answerRef.current;
    if (!vis) {
      els().forEach((el) => el.pause());
      return;
    }
    const p = phaseRef.current;
    if (p === "intro") v?.play().catch(() => {});
    else if (p === "answer" && clipRef.current) a?.play().catch(() => {});
    else if (p === "rest") playIdle();
  }, [playIdle]);

  useEffect(() => {
    if (!HERO.enabled) return;
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        lastRatioRef.current = e.intersectionRatio;
        applyVisibility(e.intersectionRatio);
      },
      { threshold: [0, 0.35, 0.6, 1] },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [applyVisibility]);

  // guards: any play/volume change (browser resume, media keys, lock-screen controls…) and tab return re-check the rules
  useEffect(() => {
    const list = els();
    const onVis = () => document.visibilityState === "visible" && enforce();
    list.forEach((el) => {
      el.addEventListener("play", enforce);
      el.addEventListener("volumechange", enforce);
    });
    document.addEventListener("visibilitychange", onVis);
    return () => {
      list.forEach((el) => {
        el.removeEventListener("play", enforce);
        el.removeEventListener("volumechange", enforce);
      });
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [enforce]);

  /** suspend visibility pausing for `ms`, then re-check against the latest ratio */
  const holdFor = useCallback(
    (ms: number) => {
      holdUntilRef.current = Math.max(holdUntilRef.current, performance.now() + ms);
      setTimeout(() => {
        if (typingHoldRef.current || performance.now() < holdUntilRef.current) return;
        applyVisibility(lastRatioRef.current);
      }, ms + 30);
    },
    [applyVisibility],
  );

  const holdForTyping = useCallback(
    (on: boolean) => {
      typingHoldRef.current = on;
      if (!on) holdFor(600); // the keyboard is closing: give the viewport a moment to settle
    },
    [holdFor],
  );

  /** Mobile safety net: if the character is < 60 % on screen when a question is asked, bring the hero back. */
  const reveal = useCallback(() => {
    const el = sectionRef.current;
    const m = mediaRef.current;
    if (!el || !m || !window.matchMedia(MOBILE_MQ).matches) return;
    const r = m.getBoundingClientRect();
    const vh = window.innerHeight;
    const seen = r.height > 0 ? (Math.min(r.bottom, vh) - Math.max(r.top, 0)) / r.height : 1;
    if (seen >= 0.6) return;
    const y = Math.max(0, el.getBoundingClientRect().top + window.scrollY);
    const reduced = prefersReducedMotion();
    holdFor(reduced ? 300 : 1500);
    visibleRef.current = true; // the clip starts now, inside the tap (sound allowed), while we scroll back up
    const lenis = getLenis();
    if (lenis && !reduced) lenis.scrollTo(y, { duration: 0.9 });
    else window.scrollTo({ top: y, behavior: reduced ? "auto" : "smooth" });
  }, [holdFor]);

  // the mobile layout sizes and places the character from its rendered height (--mh)
  useEffect(() => {
    const el = sectionRef.current;
    const m = mediaRef.current;
    if (!el || !m || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => el.style.setProperty("--mh", `${Math.round(m.getBoundingClientRect().height)}px`));
    ro.observe(m);
    return () => ro.disconnect();
  }, []);

  /* ───────────── answer clips (stacked <video>s crossfading over the loop) ───────────── */

  /** typed / text-only question: he stops talking (rest) — the loop never keeps moving its lips under a text answer */
  const stopAnswer = useCallback(() => {
    if (phaseRef.current === "rest") return enforce();
    enterRest("stopped");
  }, [enforce, enterRest]);

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
      const v = videoRef.current;
      if (!clip || !a || !v) {
        stopAnswer(); // text-only answer
        return false;
      }
      const webmFirst = a.canPlayType('video/webm; codecs="vp9, opus"') === "probably";
      const srcs = (webmFirst ? [clip.webm, clip.mp4] : [clip.mp4, clip.webm]).map(asset);
      clipRef.current = { id, cb, srcs, tried: 0, started: false, speech: clip.speech };
      go("answer");
      v.muted = true; // one voice: the intro goes quiet the moment a question is asked
      if (layerRef.current !== "loop") v.pause();
      enforce();
      primeIdle(); // so the idle loop is ready the moment this answer ends
      // the chip click is a user gesture: play with sound unless the visitor explicitly muted
      a.muted = userMutedRef.current;
      a.poster = asset(clip.poster);
      a.src = srcs[0];
      startClip();
      return true;
    },
    [enforce, go, primeIdle, startClip, stopAnswer],
  );

  // answer <video> events
  useEffect(() => {
    const a = answerRef.current;
    if (!a) return;
    const onPlaying = () => {
      const clip = clipRef.current;
      if (!clip || phaseRef.current !== "answer") return;
      setSoundOn(!a.muted);
      if (!a.muted) setBlocked(false);
      if (clip.started) return;
      clip.started = true;
      show("answer");
      enforce(); // the loop / idle underneath stop now that the clip is on screen
      clip.cb.onStart(() => (a.duration > 0 && Number.isFinite(a.duration) ? a.currentTime / a.duration : 0), a.duration, clip.speech);
    };
    const finish = () => {
      const clip = clipRef.current;
      if (!clip || !clip.started) return;
      enterRest("ended");
      clip.cb.onEnd();
    };
    // 'ended' can be skipped by some mobile browsers when the last frame is short: treat "paused at the end" the same
    const onPauseOrTime = () => {
      if (Number.isFinite(a.duration) && a.duration > 0 && a.currentTime >= a.duration - 0.05 && (a.paused || a.ended)) finish();
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
      // clip missing/undecodable → text-only, and he stops talking
      enterRest("stopped");
      clip.cb.onFail();
    };
    a.addEventListener("playing", onPlaying);
    a.addEventListener("ended", finish);
    a.addEventListener("pause", onPauseOrTime);
    a.addEventListener("timeupdate", onPauseOrTime);
    a.addEventListener("error", onError);
    return () => {
      a.removeEventListener("playing", onPlaying);
      a.removeEventListener("ended", finish);
      a.removeEventListener("pause", onPauseOrTime);
      a.removeEventListener("timeupdate", onPauseOrTime);
      a.removeEventListener("error", onError);
    };
  }, [enforce, enterRest, show, startClip]);

  // idle <video> events: crossfade in once it's actually playing; on failure fall back to holding still
  useEffect(() => {
    const i = idleRef.current;
    if (!i) return;
    let tried = 0;
    const onPlaying = () => {
      if (phaseRef.current !== "rest" || doorPendingRef.current) return;
      show("idle");
      doorRef.current?.pause();
      // free the finished answer's decoder once the dissolve is over — only that clip, and only if he's still resting
      // (a question asked within these 400 ms has already put a new clip in this element)
      const a = answerRef.current;
      const done = a?.getAttribute("src");
      setTimeout(() => {
        if (!a || !done || phaseRef.current !== "rest" || layerRef.current !== "idle" || a.getAttribute("src") !== done) return;
        a.removeAttribute("src");
        a.load();
      }, 400);
    };
    const onError = () => {
      if (!i.getAttribute("src")) return;
      if (tried++ === 0) {
        const webm = i.currentSrc.includes(".webm") || (i.getAttribute("src") || "").includes(".webm");
        i.src = asset(webm ? HERO_IDLE.mp4 : HERO_IDLE.webm);
        if (phaseRef.current === "rest") playIdle();
        return;
      }
      idleFailedRef.current = true;
      i.removeAttribute("src");
      if (phaseRef.current === "rest" && layerRef.current !== "answer") showPosterStill();
      else if (phaseRef.current === "rest" && restKindRef.current === "stopped" && !answerRef.current?.ended) showPosterStill();
    };
    // count idle loops (currentTime wraps back to ~0); every few loops, walk through the door once
    const onTime = () => {
      const c = idleLoopsRef.current;
      const t = i.currentTime;
      if (t + 0.5 < c.lastT && phaseRef.current === "rest" && layerRef.current === "idle") {
        c.n++;
        const d = doorRef.current;
        if (d && HERO_IDLE.door.enabled && !doorFailedRef.current && !prefersReducedMotion()) {
          if (c.n >= c.gap - 1) primeDoor(); // load it one loop ahead
          if (c.n >= c.gap && d.readyState >= 3 && visibleRef.current) {
            c.n = 0;
            c.gap = doorGap();
            doorPendingRef.current = true;
            d.muted = true;
            d.currentTime = 0;
            d.play().catch(() => (doorPendingRef.current = false));
          }
        }
      }
      c.lastT = t;
    };
    i.addEventListener("playing", onPlaying);
    i.addEventListener("error", onError);
    i.addEventListener("timeupdate", onTime);
    return () => {
      i.removeEventListener("playing", onPlaying);
      i.removeEventListener("error", onError);
      i.removeEventListener("timeupdate", onTime);
    };
  }, [playIdle, primeDoor, show, showPosterStill]);

  // door <video> events: cut to it when it starts (it opens on the idle pose), back to the idle loop when done
  useEffect(() => {
    const d = doorRef.current;
    if (!d) return;
    let tried = 0;
    const backToIdle = () => {
      const i = idleRef.current;
      doorPendingRef.current = false;
      d.pause();
      if (phaseRef.current !== "rest" || !i) return;
      try {
        i.currentTime = 0;
      } catch {
        /* not seekable */
      }
      idleLoopsRef.current.lastT = 0;
      if (visibleRef.current) i.play().catch(() => {}); // 'playing' → show("idle")
      else show("idle");
    };
    const onPlaying = () => {
      if (phaseRef.current !== "rest") return d.pause();
      doorPendingRef.current = false;
      show("door");
      idleRef.current?.pause();
    };
    const onError = () => {
      if (!d.getAttribute("src")) return;
      if (tried++ === 0) {
        const webm = (d.getAttribute("src") || "").includes(".webm");
        d.src = asset(webm ? HERO_IDLE.door.mp4 : HERO_IDLE.door.webm);
        return;
      }
      doorFailedRef.current = true;
      d.removeAttribute("src");
      if (layerRef.current === "door") backToIdle();
    };
    d.addEventListener("playing", onPlaying);
    d.addEventListener("ended", backToIdle);
    d.addEventListener("error", onError);
    return () => {
      d.removeEventListener("playing", onPlaying);
      d.removeEventListener("ended", backToIdle);
      d.removeEventListener("error", onError);
    };
  }, [show]);

  const toggleSound = () => {
    if (justUnlockedRef.current) return; // this same click already unlocked sound
    const p = phaseRef.current;
    if (p === "rest") {
      userMutedRef.current = false;
      replayIntro(); // ▶ after an answer replays the intro, with sound
      return;
    }
    const v = p === "answer" && clipRef.current ? answerRef.current : videoRef.current;
    if (!v) return;
    if (soundOn) {
      v.muted = true;
      userMutedRef.current = true;
      setSoundOn(false);
    } else {
      userMutedRef.current = false;
      if (p === "answer" && clipRef.current) {
        v.muted = false;
        setSoundOn(true);
        setBlocked(false);
        if (v.paused && visibleRef.current) v.play().catch(() => {});
      } else tryPlay(true);
    }
  };

  const askHero: AskMeHero = { hasClip: (id) => !!answerClip(id), playAnswer, stopAnswer, reveal, holdForTyping };

  const ctas = [
    HAS.work && { href: "#work", label: "Explore work", primary: true },
    HAS.contact && { href: "#contact", label: "Let's talk", primary: !HAS.work },
    PROFILE.resume && { href: asset(PROFILE.resume), label: "Résumé ↓", download: true },
  ].filter(Boolean) as { href: string; label: string; primary?: boolean; download?: boolean }[];

  return (
    <section
      id="top"
      ref={sectionRef}
      className={`hero ${HERO.enabled ? "" : "hero--novideo"}`}
      aria-labelledby="hero-title"
      data-phase={phase}
      data-layer={layer}
    >
      <p className="hero-ghost" aria-hidden="true">
        {PROFILE.firstName.toUpperCase()}
      </p>

      {HERO.enabled ? (
        <div className="hero-media" ref={mediaRef}>
          <div className="hero-halo" aria-hidden="true" />
          <video
            ref={videoRef}
            className={`hero-video ${layer !== "loop" ? "is-under" : ""}`}
            muted
            loop={phase === "intro"}
            playsInline
            preload="auto"
            poster={HERO.poster ? asset(HERO.poster) : undefined}
            aria-label={`${PROFILE.name} introducing himself`}
          >
            <source src={asset(HERO.webm)} type="video/webm" />
            <source src={asset(HERO.mp4)} type="video/mp4" />
          </video>
          {HERO_IDLE.enabled && (
            <video
              ref={idleRef}
              className={`hero-video hero-answer hero-idle ${layer === "idle" ? "is-on" : ""}`}
              muted
              loop
              playsInline
              preload="none"
              aria-hidden="true"
              tabIndex={-1}
            />
          )}
          {HERO_IDLE.enabled && HERO_IDLE.door.enabled && (
            <video
              ref={doorRef}
              className={`hero-video hero-answer hero-idle ${layer === "door" ? "is-on" : ""}`}
              muted
              playsInline
              preload="none"
              aria-hidden="true"
              tabIndex={-1}
            />
          )}
          <video
            ref={answerRef}
            className={`hero-video hero-answer ${layer === "answer" ? "is-on" : ""}`}
            playsInline
            preload="none"
            aria-hidden={layer !== "answer"}
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
        <div className="hero-media hero-media--empty" ref={mediaRef} aria-hidden="true" />
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
        /* idle ↔ door ↔ answer are different takes (hands at his sides vs in pockets): a slightly longer dissolve */
        .hero-idle{transition:opacity .45s var(--ease)}
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
          /* one screen: character (stage) · name + CTAs · Ask me dock. --mh = the stage height (measured).
             The character (--ch tall) stands at the bottom of the stage, cropped to the middle 80 % of the frame
             (his gestures stay within 17–77 %), and is capped/slid left just enough that the caption bubble
             (--askw wide, top-right) never covers his face (face right edge = 40.6 % of --ch from the box's left) */
          .hero{--askw:clamp(150px,44vw,300px);--mh:calc(100svh - 330px);--ch:min(var(--mh),calc((100vw - var(--gutter) - var(--askw) - 10px) / .4064));height:100svh;min-height:560px;justify-content:flex-start;align-items:stretch;padding-top:76px}
          .hero-media{position:relative;left:auto;right:auto;flex:1 1 0;min-height:0;height:auto;max-width:none;width:calc(var(--ch) * .64);margin:0;margin-left:max(0px,min(calc(50% - var(--ch) * .32),calc(100% - var(--gutter) - var(--askw) - 10px - var(--ch) * .4064)));display:flex;flex-direction:column;justify-content:flex-end}
          .hero-media .hero-video{flex:none;height:var(--ch);-webkit-mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent),linear-gradient(180deg,#000 95%,transparent);mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent),linear-gradient(180deg,#000 95%,transparent)}
          .hero-media .hero-answer{top:auto;bottom:0;height:var(--ch);width:100%}
          .hero-ghost{top:calc(76px + var(--mh) - var(--ch) * .58);font-size:clamp(120px,36vw,320px)}
          .hero-copy{flex:none;flex-direction:column;align-items:flex-start;gap:12px;margin-top:2px;padding-bottom:calc(74px + env(safe-area-inset-bottom))}
          .hero-title{margin-top:8px;max-width:none;font-size:clamp(34px,9.2vw,60px)}
          .hero-ctas{justify-content:flex-start}
          .hero-sound{right:0;bottom:9%;width:42px;height:42px}
          /* the door walk ends with him peeking back in at the top right, where the caption bubble sits: fade it out
             for the door clip, back in when it ends; a question (phase → answer) brings it back at once */
          .hero .askme-body>.askme-bubble{transition:box-shadow .4s var(--ease),opacity .25s var(--ease),transform .25s var(--ease)}
          .hero[data-phase="rest"][data-layer="door"] .askme-body>.askme-bubble{opacity:0;transform:scale(.94);transform-origin:0 30px;pointer-events:none}
          .hero[data-phase="answer"] .askme-body>.askme-bubble{transition:box-shadow .4s var(--ease)}
        }
        @media (max-width: 959px) and (prefers-reduced-motion: reduce){.hero .askme-body>.askme-bubble{transition:none}}
        @media (max-width: 959px) and (max-height: 600px){.hero-title{font-size:30px}}
      `}</style>
    </section>
  );
}

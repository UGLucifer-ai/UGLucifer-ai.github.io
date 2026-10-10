"use client";

import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from "react";
import { flushSync } from "react-dom";
import { useReducedMotion } from "@/lib/hooks";
import { scrollToTarget } from "@/lib/scroll";
import type { Answer, AskLink } from "@/lib/askme";

/** Suggested questions → intent ids in lib/askme.ts. */
const CHIPS: { q: string; id: string }[] = [
  { q: "Who are you?", id: "who" },
  { q: "What do you do?", id: "whatdo" },
  { q: "Where do you work now?", id: "current" },
  { q: "Kubernetes experience?", id: "kubernetes" },
  { q: "AWS experience?", id: "aws" },
  { q: "CI/CD experience?", id: "cicd" },
  { q: "What tools do you use?", id: "tools" },
  { q: "How can I contact you?", id: "contact" },
  { q: "Download résumé", id: "resume" },
];

const GREETING = "Hi, I'm Uday. Ask me about my experience, skills or how to reach me — answers come straight from my résumé.";

type KB = typeof import("@/lib/askme");
let kbPromise: Promise<KB> | null = null;
const loadKB = () => (kbPromise ??= import("@/lib/askme"));

export type ClipCallbacks = {
  /** the clip is on screen; `progress()` → 0…1 of its playback, for pacing the caption */
  onStart: (progress: () => number, duration: number, speech?: [number, number]) => void;
  onEnd: () => void;
  /** the clip couldn't be loaded → answer text-only */
  onFail: () => void;
};

export type AskMeHero = {
  /** true if this chip has a lip-synced answer clip in the manifest (data.ts → ANSWER_CLIP_IDS) */
  hasClip: (id: string) => boolean;
  /** play the chip's answer clip over the intro loop; false = no clip (text-only) */
  playAnswer: (id: string, cb: ClipCallbacks) => boolean;
  /** stop any answer clip and return to the intro loop */
  stopAnswer: () => void;
  /** mobile safety net: scroll the character back into view if it's mostly off screen */
  reveal: () => void;
  /** the mobile keyboard is up (true) / closing (false): don't pause the hero for the viewport jump */
  holdForTyping: (on: boolean) => void;
};

const isMobile = () => typeof window !== "undefined" && window.matchMedia("(max-width: 959px)").matches;

/** "type" = typing reveal; "wait" = clip loading; "clip" = caption follows the clip; "full" = all shown */
type Mode = "type" | "wait" | "clip" | "full";
const CLIP_WAIT_MS = 2500; // a slow clip shouldn't hold the caption back
const LEAD = 0.2; // seconds of silence kept before/after speech in each clip (build-hero-assets.py --answer)

export default function AskMe({ hero }: { hero: AskMeHero }) {
  const reduced = useReducedMotion();
  const uid = useId();
  const [typing, setTyping] = useState(false); // mobile: the input replaces the chip row
  const [activeChip, setActiveChip] = useState<string | null>(null);
  const [edges, setEdges] = useState({ start: true, end: false }); // chip row fades
  const inputRef = useRef<HTMLInputElement>(null);
  const rowRef = useRef<HTMLUListElement>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [shown, setShown] = useState(GREETING.length);
  const [mode, setMode] = useState<Mode>("full");
  const [input, setInput] = useState("");
  const heroRef = useRef(hero);
  heroRef.current = hero;
  const tokenRef = useRef(0);
  const shownRef = useRef(0);
  const progressRef = useRef<{ get: () => number; d: number; speech?: [number, number] } | null>(null);
  const text = answer?.text ?? GREETING;
  const done = shown >= text.length;

  const reveal = (n: number) => {
    shownRef.current = n;
    setShown(n);
  };

  const respond = useCallback(async (q: string, id?: string) => {
    const token = ++tokenRef.current;
    progressRef.current = null;
    setActiveChip(id ?? null);
    // a tap on a chip: bring the character back first if he's mostly scrolled away (typed: after the keyboard closes)
    if (id) heroRef.current.reveal();
    else setTimeout(() => heroRef.current.reveal(), 350);
    let m: Mode = "type";
    let loaded = false;
    if (id) {
      // start the clip synchronously, inside the click (user gesture → sound allowed)
      const ok = heroRef.current.playAnswer(id, {
        onStart: (get, d, speech) => {
          if (token !== tokenRef.current) return;
          progressRef.current = { get, d, speech };
          m = "clip";
          if (loaded) setMode("clip");
        },
        onEnd: () => {
          if (token !== tokenRef.current) return;
          m = "full";
          if (loaded) setMode("full");
        },
        onFail: () => {
          if (token !== tokenRef.current) return;
          m = "type";
          if (loaded) setMode("type");
        },
      });
      if (ok && m === "type") m = "wait";
    } else heroRef.current.stopAnswer(); // typed question: text only, the intro loop keeps playing
    const kb = await loadKB();
    if (token !== tokenRef.current) return;
    const a = id ? kb.answerFor(id) : kb.ask(q).answer;
    setQuestion(q);
    setAnswer(a);
    reveal(0);
    loaded = true;
    setMode(m); // the clip may already be playing, finished or failed by now
    if (a.download) {
      const link = document.createElement("a");
      link.href = a.links?.find((l) => l.download)?.href ?? "";
      link.download = "";
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
  }, []);

  // caption reveal: typed (70 chars/s), paced by the answer clip, or instant with reduced motion
  useEffect(() => {
    if (!answer) return;
    const len = answer.text.length;
    if (reduced || mode === "full") {
      reveal(len);
      return;
    }
    if (mode === "wait") {
      const t = setTimeout(() => setMode((cur) => (cur === "wait" ? "type" : cur)), CLIP_WAIT_MS);
      return () => clearTimeout(t);
    }
    let raf = 0;
    const from = shownRef.current;
    const t0 = performance.now();
    const tick = (now: number) => {
      let n: number;
      if (mode === "clip" && progressRef.current) {
        const { get, d, speech } = progressRef.current;
        const [s0, s1] = speech ?? [LEAD, d - LEAD];
        const p = Math.min(1, Math.max(0, (get() * d - s0) / Math.max(0.5, s1 - s0)) * 1.06); // a hair ahead of the voice
        n = Math.max(shownRef.current, Math.ceil(len * p));
      } else n = Math.min(len, from + Math.floor(((now - t0) / 1000) * 70));
      if (n !== shownRef.current) reveal(n);
      if (n < len) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [answer, reduced, mode]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const q = input.trim();
    if (!q) return;
    setInput("");
    respond(q.slice(0, 160));
    if (isMobile()) {
      // close the keyboard so the whole hero (character + caption) is back on screen
      inputRef.current?.blur();
      setTyping(false);
    }
  };

  const openTyping = () => {
    // render the input synchronously so focus() stays inside the tap (iOS only opens the keyboard then)
    flushSync(() => setTyping(true));
    inputRef.current?.focus();
  };

  const closeTypingIfEmpty = () => {
    setTimeout(() => {
      if (document.activeElement !== inputRef.current && !inputRef.current?.value) setTyping(false);
    }, 160);
  };

  // chip row: edge fades only where there's more to scroll
  const onRowScroll = () => {
    const r = rowRef.current;
    if (!r) return;
    const start = r.scrollLeft <= 2;
    const end = r.scrollLeft + r.clientWidth >= r.scrollWidth - 2;
    setEdges((e) => (e.start === start && e.end === end ? e : { start, end }));
  };
  useEffect(() => {
    onRowScroll();
    window.addEventListener("resize", onRowScroll);
    return () => window.removeEventListener("resize", onRowScroll);
  }, [typing]);

  const onChip = (c: { q: string; id: string }, el: HTMLElement) => {
    respond(c.q, c.id);
    const r = rowRef.current;
    if (r && isMobile() && r.scrollWidth > r.clientWidth) {
      // keep the tapped chip fully in the row (without scrolling the page)
      const li = el.parentElement as HTMLElement;
      const left = li.offsetLeft - 16;
      const right = li.offsetLeft + li.offsetWidth - r.clientWidth + 24;
      const to = r.scrollLeft > left ? left : r.scrollLeft < right ? right : r.scrollLeft;
      if (to !== r.scrollLeft) r.scrollTo({ left: to, behavior: reduced ? "auto" : "smooth" });
    }
  };

  const linkProps = (l: AskLink) => ({
    href: l.href,
    download: l.download || undefined,
    target: l.external ? "_blank" : undefined,
    rel: l.external ? "noopener noreferrer" : undefined,
    onClick: l.href.startsWith("#")
      ? (e: React.MouseEvent) => {
          e.preventDefault();
          scrollToTarget(l.href);
        }
      : undefined,
  });

  const bodyId = `${uid}-body`;
  const inputId = `${uid}-input`;
  const titleId = `${uid}-title`;
  const formId = `${uid}-form`;

  return (
    <aside
      className={`askme ${typing ? "is-typing" : ""} ${mode === "clip" || mode === "wait" ? "is-playing" : ""}`}
      aria-labelledby={titleId}
      onPointerEnter={() => loadKB()}
      onFocus={() => loadKB()}
    >
      <div id={bodyId} className="askme-body">
        <div className="askme-bubble">
          <div className="askme-scroll">
          <p className="askme-q mono">{answer ? question : "Ask me"}</p>
          <p className="askme-a" aria-hidden="true">
            {text.slice(0, shown)}
            {!done && <span className="askme-caret" />}
          </p>
          {answer?.links && (
            <p className={`askme-links ${done ? "is-in" : ""}`}>
              {answer.links.map((l) => (
                <a key={l.label} className="askme-link" {...linkProps(l)}>
                  {l.label}
                </a>
              ))}
            </p>
          )}
          </div>
          <p className="sr-only" aria-live="polite" aria-atomic="true">
            {answer ? answer.text : ""}
          </p>
        </div>
        <div className="askme-head">
          <p id={titleId} className="askme-title mono">
            Ask me · from my résumé
          </p>
        </div>
        <div className="askme-dock">
          <button type="button" className="askme-ask" aria-expanded={typing} aria-controls={formId} onClick={openTyping}>
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
              <path d="M2.5 3.5h11v7h-6l-3 2.5v-2.5h-2z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
            </svg>
            Ask
          </button>
          <ul ref={rowRef} className={`askme-chips ${edges.start ? "" : "fade-l"} ${edges.end ? "" : "fade-r"}`} onScroll={onRowScroll}>
            {CHIPS.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  className={`askme-chip ${activeChip === c.id ? "is-active" : ""}`}
                  data-clip={hero.hasClip(c.id) ? "" : undefined}
                  onClick={(e) => onChip(c, e.currentTarget)}
                >
                  {c.q}
                </button>
              </li>
            ))}
          </ul>
          <form id={formId} className="askme-form" onSubmit={onSubmit}>
            <label htmlFor={inputId} className="sr-only">
              Ask me a question about my résumé
            </label>
            <input
              ref={inputRef}
              id={inputId}
              className="askme-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onFocus={() => isMobile() && heroRef.current.holdForTyping(true)}
              onBlur={() => {
                if (!isMobile()) return;
                heroRef.current.holdForTyping(false);
                closeTypingIfEmpty();
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape" && typing) {
                  setInput("");
                  inputRef.current?.blur();
                  setTyping(false);
                }
              }}
              placeholder="Ask about my experience…"
              maxLength={160}
              autoComplete="off"
              enterKeyHint="send"
            />
            <button type="submit" className="askme-send" aria-label="Ask">
              <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
                <path d="M3 8h9M8.5 4.5L12 8l-3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              type="button"
              className="askme-close"
              aria-label="Back to suggested questions"
              onClick={() => {
                setInput("");
                setTyping(false);
              }}
            >
              <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
                <path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          </form>
        </div>
      </div>

      <style>{`
        .askme{position:absolute;z-index:3;right:max(var(--gutter),3vw);top:clamp(92px,12svh,150px);width:clamp(280px,25vw,360px);display:flex;flex-direction:column;max-height:calc(78svh - 62px - clamp(92px,12svh,150px))}
        .askme-dock{display:contents}
        .askme-ask,.askme-close{display:none}
        .askme-body{display:flex;flex-direction:column;gap:12px;min-height:0;flex:1 1 auto}
        .askme-body>*{flex:none}
        .askme-body>.askme-bubble{position:relative;background:var(--card);border-radius:20px;box-shadow:var(--shadow-hair),var(--shadow-soft);flex:0 1 auto;min-height:96px;display:flex;flex-direction:column}
        .askme-scroll{position:relative;padding:14px 16px 16px;max-height:34svh;min-height:0;flex:1 1 auto;overflow:auto;overscroll-behavior:contain;border-radius:20px}
        .askme-bubble::before{content:"";position:absolute;left:-9px;top:26px;width:18px;height:18px;background:var(--card);transform:rotate(45deg);box-shadow:-1px 1px 0 0 var(--line);border-radius:3px}
        .askme-q{margin:0 0 6px;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--mute);position:relative}
        .askme-a{margin:0;font-size:15px;line-height:1.5;color:var(--ink);letter-spacing:-.01em;position:relative;min-height:3em}
        .askme-caret{display:inline-block;width:7px;height:1.05em;margin-left:2px;vertical-align:-2px;background:var(--ink);animation:askBlink .9s steps(1) infinite}
        @keyframes askBlink{50%{opacity:0}}
        .askme-links{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0 0;opacity:0;transition:opacity .4s var(--ease)}
        .askme-links.is-in{opacity:1}
        .askme-link{font-size:12px;padding:5px 10px;border-radius:999px;background:var(--ink);color:#fff;overflow-wrap:anywhere}
        .askme-link:hover{background:var(--ink-2)}
        .askme-head{display:flex;align-items:center;justify-content:space-between;gap:10px}
        .askme-title{margin:0;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--mute)}
        .askme-chips{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:6px}
        .askme-chip{font-size:12.5px;line-height:1.2;padding:7px 11px;border-radius:999px;background:rgba(255,255,255,.72);box-shadow:inset 0 0 0 1px var(--line);color:var(--ink);text-align:left;transition:background .3s var(--ease),color .3s var(--ease)}
        .askme-chip:hover,.askme-chip:focus-visible{background:var(--ink);color:#fff}
        .askme-form{display:flex;gap:6px;background:var(--card);border-radius:999px;padding:4px 4px 4px 14px;box-shadow:var(--shadow-hair)}
        .askme-form:focus-within{box-shadow:inset 0 0 0 1.5px var(--ink)}
        .askme-input{flex:1;min-width:0;border:0;background:transparent;font-size:14px;color:var(--ink);outline:none}
        .askme-input::placeholder{color:var(--faint)}
        .askme-send{width:34px;height:34px;flex:none;border-radius:50%;background:var(--ink);color:#fff;display:grid;place-items:center}
        .askme :focus-visible{outline:2px solid var(--ink);outline-offset:2px}
        .askme .sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
        @media (max-width: 959px){
          /* the panel is an overlay on the one-screen hero: bubble beside his head, a chip dock at the bottom */
          .askme{position:absolute;inset:0;z-index:3;width:auto;max-height:none;pointer-events:none}
          .askme-body{display:block}
          .askme-body>.askme-bubble{position:absolute;pointer-events:auto;top:calc(76px + var(--mh) - var(--ch) * .95);right:var(--gutter);width:var(--askw);max-height:max(150px,calc(var(--ch) * .8));min-height:0;border-radius:18px;transition:box-shadow .4s var(--ease)}
          .askme.is-playing .askme-bubble{box-shadow:var(--shadow-hair),0 18px 40px -22px rgba(13,13,13,.45)}
          .askme-scroll{max-height:none;padding:11px 13px 13px;border-radius:18px}
          .askme-bubble::before{top:22px}
          .askme-a{font-size:14px;line-height:1.45;min-height:0}
          .askme-q{font-size:9.5px}
          .askme-link{font-size:11.5px;padding:5px 9px}
          .askme-links:not(.is-in){display:none}
          .askme-head{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}
          .askme-dock{position:absolute;left:0;right:0;bottom:calc(14px + env(safe-area-inset-bottom));display:flex;align-items:center;gap:8px;padding-left:var(--gutter);pointer-events:auto}
          .askme-ask{display:inline-flex;flex:none;align-items:center;gap:6px;height:40px;padding:0 14px 0 12px;border-radius:999px;background:var(--ink);color:#fff;font-size:14px;font-weight:600}
          .askme-chips{flex:1 1 auto;min-width:0;flex-wrap:nowrap;gap:6px;overflow-x:auto;overscroll-behavior-x:contain;scroll-snap-type:x mandatory;scroll-padding-inline:16px;padding:2px var(--gutter) 2px 2px;scrollbar-width:none;-webkit-mask-image:linear-gradient(90deg,transparent 0,#000 var(--fl,0px),#000 calc(100% - var(--fr,0px)),transparent 100%);mask-image:linear-gradient(90deg,transparent 0,#000 var(--fl,0px),#000 calc(100% - var(--fr,0px)),transparent 100%)}
          .askme-chips::-webkit-scrollbar{display:none}
          .askme-chips.fade-l{--fl:22px}
          .askme-chips.fade-r{--fr:36px}
          .askme-chips>li{flex:none;scroll-snap-align:start}
          .askme-chip{white-space:nowrap;height:40px;padding:0 15px;font-size:13.5px;background:rgba(255,255,255,.86);-webkit-tap-highlight-color:transparent}
          .askme-chip:hover{background:rgba(255,255,255,.86);color:var(--ink)}
          .askme-chip.is-active{background:var(--ink);color:#fff}
          .askme-form{display:none;flex:1 1 auto;margin-right:var(--gutter);height:44px;align-items:center;padding:4px 4px 4px 16px;box-shadow:var(--shadow-hair),0 10px 30px -18px rgba(13,13,13,.4)}
          .askme-input{font-size:16px}
          .askme-close{display:grid;place-items:center;width:34px;height:34px;flex:none;border-radius:50%;color:var(--mute);order:-1;margin-left:-10px}
          .askme.is-typing .askme-ask,.askme.is-typing .askme-chips{display:none}
          .askme.is-typing .askme-form{display:flex;animation:askIn .3s var(--ease)}
          @keyframes askIn{from{opacity:0;transform:translateY(6px)}}
        }
        @media (prefers-reduced-motion: reduce){.askme-caret{animation:none}.askme-links{transition:none}}
      `}</style>
    </aside>
  );
}

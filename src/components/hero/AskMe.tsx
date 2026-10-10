"use client";

import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from "react";
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
};

/** "type" = typing reveal; "wait" = clip loading; "clip" = caption follows the clip; "full" = all shown */
type Mode = "type" | "wait" | "clip" | "full";
const CLIP_WAIT_MS = 2500; // a slow clip shouldn't hold the caption back
const LEAD = 0.2; // seconds of silence kept before/after speech in each clip (build-hero-assets.py --answer)

export default function AskMe({ hero }: { hero: AskMeHero }) {
  const reduced = useReducedMotion();
  const uid = useId();
  const [open, setOpen] = useState(false); // mobile pill
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

  return (
    <aside className={`askme ${open ? "is-open" : ""}`} aria-labelledby={titleId} onPointerEnter={() => loadKB()} onFocus={() => loadKB()}>
      <button type="button" className="askme-pill" aria-expanded={open} aria-controls={bodyId} onClick={() => setOpen((o) => !o)}>
        <span className="askme-dot" aria-hidden="true" />
        Ask me
        <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true" className="askme-chev">
          <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>
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
        <ul className="askme-chips">
          {CHIPS.map((c) => (
            <li key={c.id}>
              <button type="button" className="askme-chip" data-clip={hero.hasClip(c.id) ? "" : undefined} onClick={() => respond(c.q, c.id)}>
                {c.q}
              </button>
            </li>
          ))}
        </ul>
        <form className="askme-form" onSubmit={onSubmit}>
          <label htmlFor={inputId} className="sr-only">
            Ask me a question about my résumé
          </label>
          <input
            id={inputId}
            className="askme-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
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
        </form>
      </div>

      <style>{`
        .askme{position:absolute;z-index:3;right:max(var(--gutter),3vw);top:clamp(92px,12svh,150px);width:clamp(280px,25vw,360px);display:flex;flex-direction:column;max-height:calc(78svh - 62px - clamp(92px,12svh,150px))}
        .askme-pill{display:none}
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
          .askme{position:relative;z-index:2;right:auto;top:auto;width:auto;max-width:560px;max-height:none;margin:4px var(--gutter) 28px;align-self:stretch}
          .askme-pill{display:inline-flex;align-self:flex-start;align-items:center;gap:8px;font-size:14px;font-weight:600;padding:10px 16px;border-radius:999px;background:var(--ink);color:#fff}
          .askme-dot{width:7px;height:7px;border-radius:50%;background:#fff;box-shadow:0 0 0 3px rgba(255,255,255,.25)}
          .askme-chev{transition:transform .4s var(--ease)}
          .askme.is-open .askme-chev{transform:rotate(180deg)}
          .askme-body{display:none;margin-top:14px}
          .askme.is-open .askme-body{display:flex}
          .askme-scroll{max-height:none}
          .askme-bubble::before{left:28px;top:-9px;box-shadow:-1px -1px 0 0 var(--line)}
        }
        @media (prefers-reduced-motion: reduce){.askme-caret{animation:none}.askme-links{transition:none}}
      `}</style>
    </aside>
  );
}

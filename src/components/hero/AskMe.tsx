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

const PREFERRED = ["male", "guy", "david", "mark", "daniel", "alex", "google us english"];
function pickVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const us = voices.filter((v) => /^en[-_]US/i.test(v.lang));
  for (const p of PREFERRED) {
    const v = us.find((x) => x.name.toLowerCase().includes(p));
    if (v) return v;
  }
  return us[0] ?? voices.find((v) => /^en/i.test(v.lang)) ?? null;
}

export type AskMeVoice = {
  /** Shared hero sound state (intro video + spoken answers). */
  soundOn: boolean;
  /** True if an answer may be spoken right now (sound on, or being unlocked by this very click). */
  canSpeak: () => boolean;
  toggleSound: () => void;
  /** Called when speech starts/stops so the hero can pause/resume the intro video. */
  onSpeaking: (speaking: boolean) => void;
};

export default function AskMe({ voice }: { voice: AskMeVoice }) {
  const reduced = useReducedMotion();
  const uid = useId();
  const [open, setOpen] = useState(false); // mobile pill
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [shown, setShown] = useState(GREETING.length);
  const [input, setInput] = useState("");
  const voiceRef = useRef(voice);
  voiceRef.current = voice;
  const tokenRef = useRef(0);
  const voicesRef = useRef<SpeechSynthesisVoice | null>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const text = answer?.text ?? GREETING;
  const done = shown >= text.length;

  // voices load asynchronously in most browsers
  useEffect(() => {
    const ss = typeof window !== "undefined" ? window.speechSynthesis : undefined;
    if (!ss) return;
    const update = () => {
      voicesRef.current = pickVoice(ss.getVoices());
    };
    update();
    ss.addEventListener?.("voiceschanged", update);
    return () => ss.removeEventListener?.("voiceschanged", update);
  }, []);

  const stopSpeech = useCallback(() => {
    tokenRef.current++;
    const ss = window.speechSynthesis;
    if (ss && (ss.speaking || ss.pending)) ss.cancel();
    voiceRef.current.onSpeaking(false);
  }, []);

  // sound switched off (either toggle) → stop talking
  useEffect(() => {
    if (!voice.soundOn) stopSpeech();
  }, [voice.soundOn, stopSpeech]);

  // stop when the hero/panel scrolls out of view or the tab is hidden
  useEffect(() => {
    const el = bubbleRef.current?.closest("section");
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.intersectionRatio < 0.35) stopSpeech();
    }, { threshold: [0, 0.35] });
    io.observe(el);
    const vis = () => document.hidden && stopSpeech();
    document.addEventListener("visibilitychange", vis);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", vis);
      stopSpeech();
    };
  }, [stopSpeech]);

  const speak = useCallback(
    (t: string, kb: KB) => {
      const ss = window.speechSynthesis;
      if (!ss || typeof SpeechSynthesisUtterance === "undefined") return;
      const token = ++tokenRef.current;
      if (ss.speaking || ss.pending) ss.cancel();
      const u = new SpeechSynthesisUtterance(kb.speakable(t));
      const v = voicesRef.current ?? pickVoice(ss.getVoices());
      if (v) u.voice = v;
      u.lang = v?.lang ?? "en-US";
      u.rate = 1.02;
      u.pitch = 0.95;
      let started = false;
      u.onstart = () => {
        started = true;
        if (token === tokenRef.current) voiceRef.current.onSpeaking(true);
      };
      const end = () => {
        if (token === tokenRef.current) voiceRef.current.onSpeaking(false);
      };
      u.onend = end;
      u.onerror = end;
      voiceRef.current.onSpeaking(true); // mute the intro voice right away
      ss.speak(u);
      setTimeout(() => {
        if (!started && token === tokenRef.current && !ss.speaking) voiceRef.current.onSpeaking(false);
      }, 2500);
    },
    [],
  );

  const respond = useCallback(
    async (q: string, id?: string) => {
      const kb = await loadKB();
      const a = id ? kb.answerFor(id) : kb.ask(q).answer;
      setQuestion(q);
      setAnswer(a);
      setShown(0);
      if (a.download) {
        const link = document.createElement("a");
        link.href = a.links?.find((l) => l.download)?.href ?? "";
        link.download = "";
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
      if (voiceRef.current.canSpeak()) speak(a.text, kb);
      else stopSpeech();
    },
    [speak, stopSpeech],
  );

  // typing reveal (instant with reduced motion)
  useEffect(() => {
    if (!answer) return;
    if (reduced) {
      setShown(answer.text.length);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const n = Math.min(answer.text.length, Math.floor(((now - t0) / 1000) * 70));
      setShown(n);
      if (n < answer.text.length) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [answer, reduced]);

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
        <div ref={bubbleRef} className="askme-bubble">
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
          <button
            type="button"
            className="askme-voice"
            onClick={voice.toggleSound}
            aria-pressed={voice.soundOn}
            aria-label={voice.soundOn ? "Voice on: mute spoken answers and intro sound" : "Voice off: unmute spoken answers and intro sound"}
          >
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
              <path d="M2 6h3l4-3v10l-4-3H2z" fill="currentColor" />
              {voice.soundOn ? (
                <path d="M11 5.5a3.5 3.5 0 0 1 0 5M12.8 3.6a6 6 0 0 1 0 8.8" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              ) : (
                <path d="M11 6l4 4M15 6l-4 4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              )}
            </svg>
            <span>{voice.soundOn ? "Voice on" : "Voice off"}</span>
          </button>
        </div>
        <ul className="askme-chips">
          {CHIPS.map((c) => (
            <li key={c.id}>
              <button type="button" className="askme-chip" onClick={() => respond(c.q, c.id)}>
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
        .askme-voice{display:inline-flex;align-items:center;gap:6px;font-size:12px;padding:5px 10px;border-radius:999px;box-shadow:inset 0 0 0 1px var(--line);background:var(--card);color:var(--ink)}
        .askme-voice[aria-pressed="false"]{color:var(--mute)}
        .askme-voice:hover{box-shadow:inset 0 0 0 1px var(--ink)}
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

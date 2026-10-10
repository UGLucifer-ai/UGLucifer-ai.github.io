"use client";

import { useState, type CSSProperties } from "react";
import { HAS, PROFILE } from "@/lib/data";
import { sectionIndex } from "@/lib/data";
import { scrollToTarget } from "@/lib/scroll";

function HopLine({ text, offset }: { text: string; offset: number }) {
  return (
    <span className="hop-line" aria-hidden="true">
      {Array.from(text).map((ch, i) => (
        <span key={i} className="hop" style={{ "--i": i + offset } as CSSProperties}
          onPointerEnter={(e) => {
            const el = e.currentTarget;
            el.classList.remove("is-hop");
            void el.offsetWidth; // restart animation
            el.classList.add("is-hop");
          }}>
          {ch === " " ? "\u00a0" : ch}
        </span>
      ))}
    </span>
  );
}

export default function Contact() {
  const [copied, setCopied] = useState(false);
  const year = new Date().getFullYear();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(PROFILE.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  const links = [
    PROFILE.phone && { href: PROFILE.phoneHref, label: PROFILE.phone, k: "Phone" },
    PROFILE.github && { href: PROFILE.github, label: "GitHub ↗", k: "GitHub", ext: true },
    PROFILE.linkedin && { href: PROFILE.linkedin, label: "LinkedIn ↗", k: "LinkedIn", ext: true },
  ].filter(Boolean) as { href: string; label: string; k: string; ext?: boolean }[];

  return (
    <>
      {HAS.contact && (
        <section id="contact" className="section contact" aria-labelledby="contact-title">
          <div className="wrap">
            <p className="tag rv">
              <span>{sectionIndex("contact")}</span>
              <span aria-hidden="true">—</span>
              <span>Contact</span>
            </p>
            <h2 id="contact-title" className="contact-h">
              <span className="sr-only">Let&apos;s build something together.</span>
              <HopLine text="Let's build" offset={0} />
              <span className="hop-line accent" aria-hidden="true">
                <HopLine text="something together." offset={11} />
              </span>
            </h2>

            <div className="contact-row">
              <div className="contact-main">
                {PROFILE.email && (
                  <div className="email-row rv">
                    <a href={`mailto:${PROFILE.email}`} className="email">{PROFILE.email}</a>
                    <button type="button" className="copy" onClick={copy}>
                      {copied ? "Copied ✓" : "Copy"}
                    </button>
                    <span className="sr-only" aria-live="polite">{copied ? "Email copied to clipboard" : ""}</span>
                  </div>
                )}
                <ul className="contact-links rv">
                  {links.map((l) => (
                    <li key={l.k}>
                      <span className="mono">{l.k}</span>
                      <a href={l.href} target={l.ext ? "_blank" : undefined} rel={l.ext ? "noopener noreferrer" : undefined}>{l.label}</a>
                    </li>
                  ))}
                </ul>
              </div>
              <a href={PROFILE.email ? `mailto:${PROFILE.email}` : "#contact"} className="c-badge" aria-label="Say hello by email">
                <svg viewBox="0 0 200 200" aria-hidden="true">
                  <defs>
                    <path id="badge-circle" d="M100,100 m-78,0 a78,78 0 1,1 156,0 a78,78 0 1,1 -156,0" />
                  </defs>
                  <text>
                    <textPath href="#badge-circle">say hello · say hello · say hello · say hello · </textPath>
                  </text>
                </svg>
                <span className="badge-c" aria-hidden="true">↗</span>
              </a>
            </div>
          </div>
        </section>
      )}

      <footer className="foot">
        <div className="wrap foot-in">
          <p>© {year} {PROFILE.name}</p>
          <a href="#top" onClick={(e) => { e.preventDefault(); scrollToTarget("top"); }}>Back to top ↑</a>
          <p className="mono">Built with Next.js</p>
        </div>
      </footer>

      <style>{`
        .sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
        .contact-h{margin:28px 0 0;font-size:clamp(48px,10vw,168px);letter-spacing:-.055em;line-height:.95;font-weight:800}
        .hop-line{display:block}
        .hop-line.accent .hop-line{display:inline}
        .hop{display:inline-block}
        .hop.is-hop{animation:hop .6s var(--ease)}
        @keyframes hop{0%{transform:translateY(0)}35%{transform:translateY(-.14em)}70%{transform:translateY(.02em)}100%{transform:translateY(0)}}
        .contact-row{display:flex;justify-content:space-between;align-items:flex-end;gap:32px;margin-top:clamp(40px,8vh,80px)}
        .email-row{display:flex;align-items:center;flex-wrap:wrap;gap:14px}
        .email{font-size:clamp(22px,3.4vw,48px);font-weight:600;letter-spacing:-.035em;text-decoration:underline;text-decoration-thickness:2px;text-underline-offset:8px;overflow-wrap:anywhere}
        .copy{height:36px;padding:0 16px;border-radius:999px;font-size:13px;font-weight:600;box-shadow:inset 0 0 0 1px rgba(13,13,13,.22);transition:background-color .4s var(--ease),color .4s var(--ease)}
        .copy:hover{background:var(--ink);color:#fff}
        .contact-links{list-style:none;padding:0;margin:28px 0 0;display:flex;flex-wrap:wrap;gap:12px 36px}
        .contact-links li{display:flex;flex-direction:column;gap:4px}
        .contact-links .mono{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--mute)}
        .contact-links a{font-size:18px;font-weight:600}
        .contact-links a:hover{text-decoration:underline;text-underline-offset:4px}
        .c-badge{position:relative;flex:none;width:150px;height:150px;display:grid;place-items:center}
        .c-badge svg{position:absolute;inset:0;width:100%;height:100%;animation:spin 18s linear infinite}
        .c-badge text{font:500 15px var(--font-mono);letter-spacing:.14em;text-transform:uppercase;fill:var(--ink)}
        .badge-c{width:56px;height:56px;border-radius:50%;background:var(--ink);color:#fff;display:grid;place-items:center;font-size:20px;transition:transform .6s var(--ease)}
        .c-badge:hover .badge-c{transform:rotate(45deg) scale(1.06)}
        @keyframes spin{to{transform:rotate(360deg)}}
        .foot{border-top:1px solid var(--line);padding:28px 0}
        .foot-in{display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;font-size:14px;color:var(--mute)}
        .foot-in p{margin:0}
        .foot-in a{color:var(--ink);font-weight:600}
        .foot-in .mono{font-size:12px}
        @media (max-width: 720px){
          .contact-row{flex-direction:column;align-items:flex-start}
          .c-badge{width:120px;height:120px}
        }
      `}</style>
    </>
  );
}

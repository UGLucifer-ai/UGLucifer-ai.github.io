"use client";

import { useState } from "react";
import { HAS, PROJECTS, SKILL_GROUPS, sectionIndex } from "@/lib/data";
import SectionHeading from "@/components/ui/SectionHeading";
import TechLogo from "@/components/ui/TechLogo";
import MockUI from "@/components/ui/MockUI";

const logoFor = (tech: string) =>
  SKILL_GROUPS.flatMap((g) => g.skills).find((s) => s.name.toLowerCase() === tech.toLowerCase())?.logo ?? "generic";

export default function Work() {
  const [open, setOpen] = useState(0);
  if (!HAS.work) return null;

  return (
    <section id="work" className="section work" aria-labelledby="work-title">
      <div className="wrap">
        <SectionHeading id="work-title" index={sectionIndex("work")} label="Selected work" accent="built.">
          Things I&apos;ve
        </SectionHeading>

        <div className="acc rv">
          {PROJECTS.map((p, i) => {
            const isOpen = open === i;
            return (
              <article
                key={p.id}
                className={`panel ${isOpen ? "is-open" : ""}`}
                onMouseEnter={() => setOpen(i)}
                onFocus={() => setOpen(i)}
                aria-labelledby={`proj-${p.id}`}
              >
                <button className="spine" onClick={() => setOpen(i)} aria-expanded={isOpen} aria-controls={`proj-body-${p.id}`}>
                  <span className="mono">{p.index}</span>
                  <span className="spine-title">{p.title}</span>
                  <span className="plus" aria-hidden="true">+</span>
                </button>
                <div id={`proj-body-${p.id}`} className="panel-body" hidden={!isOpen}>
                  <div className="panel-copy">
                    <p className="mono kicker">
                      {p.index} — {p.kicker}
                    </p>
                    <h3 id={`proj-${p.id}`} className="panel-title">{p.title}</h3>
                    <p className="panel-desc">{p.description}</p>
                    {p.features.length > 0 && (
                      <ul className="feats">
                        {p.features.map((f) => <li key={f}>{f}</li>)}
                      </ul>
                    )}
                    <ul className="techs">
                      {p.tech.map((t) => (
                        <li key={t}><TechLogo name={logoFor(t)} size={14} />{t}</li>
                      ))}
                    </ul>
                    {p.github && (
                      <a className="btn btn-primary" href={p.github} target="_blank" rel="noopener noreferrer">View on GitHub ↗</a>
                    )}
                  </div>
                  <figure className="panel-mock">
                    <MockUI kind={p.mock} />
                    <figcaption className="mono">Illustrative UI</figcaption>
                  </figure>
                </div>
              </article>
            );
          })}
        </div>
      </div>
      <style>{`
        .acc{display:flex;gap:10px;height:min(78svh,600px);margin-top:48px}
        .panel{position:relative;flex:1;min-width:0;border-radius:26px;background:var(--card);box-shadow:inset 0 0 0 1px var(--line);overflow:hidden;transition:flex 1s var(--ease),box-shadow .6s var(--ease)}
        .panel.is-open{flex:8;box-shadow:inset 0 0 0 1px var(--line),var(--shadow-soft)}
        .spine{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:space-between;padding:22px 0;width:100%}
        .panel.is-open .spine{opacity:0;pointer-events:none}
        .spine-title{writing-mode:vertical-rl;transform:rotate(180deg);font-weight:600;letter-spacing:-.02em;white-space:nowrap}
        .plus{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;box-shadow:inset 0 0 0 1px var(--line);transition:transform .6s var(--ease)}
        .spine:hover .plus{transform:rotate(90deg)}
        .panel-body{position:absolute;inset:0;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:28px;padding:32px}
        .panel-body[hidden]{display:none}
        .panel-copy{display:flex;flex-direction:column;gap:14px;min-width:0;overflow:auto}
        .kicker{font-size:12px;color:var(--mute);margin:0;text-transform:uppercase;letter-spacing:.06em}
        .panel-title{font-size:clamp(28px,3vw,44px);margin:0}
        .panel-desc{margin:0;color:var(--ink-2);line-height:1.55}
        .feats{display:grid;grid-template-columns:1fr 1fr;gap:8px 16px;padding:0;margin:0;list-style:none;font-size:14px}
        .feats li::before{content:"— ";color:var(--faint)}
        .techs{display:flex;flex-wrap:wrap;gap:6px;padding:0;margin:0;list-style:none}
        .techs li{display:flex;align-items:center;gap:6px;font-size:12px;padding:5px 10px;border-radius:999px;box-shadow:inset 0 0 0 1px var(--line)}
        .panel-copy .btn{align-self:flex-start;margin-top:auto}
        .panel-mock{margin:0;position:relative;clip-path:inset(0 100% 0 0 round 18px);animation:wipe 1.1s var(--ease) .15s forwards}
        @keyframes wipe{to{clip-path:inset(0 0 0 0 round 18px)}}
        .panel-mock figcaption{position:absolute;right:12px;bottom:10px;font-size:10px;color:var(--mute);letter-spacing:.08em;text-transform:uppercase}
        @media (max-width: 860px){
          .acc{flex-direction:column;height:auto}
          .panel{flex:none;min-height:72px}
          .panel.is-open{flex:none}
          .spine{position:relative;flex-direction:row;padding:0 20px;height:72px}
          .spine-title{writing-mode:horizontal-tb;transform:none}
          .panel.is-open .spine{display:none}
          .panel-body{position:relative;grid-template-columns:minmax(0,1fr);padding:22px}
          .panel-mock{height:240px}
          .feats{grid-template-columns:1fr}
        }
      `}</style>
    </section>
  );
}

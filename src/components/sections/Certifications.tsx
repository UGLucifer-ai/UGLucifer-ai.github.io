import type { CSSProperties } from "react";
import { CERTIFICATIONS, HAS, sectionIndex } from "@/lib/data";

export default function Certifications() {
  if (!HAS.certifications) return null;
  const n = CERTIFICATIONS.length;
  return (
    <section id="certifications" className="section certs" aria-labelledby="certs-title">
      <div className="wrap certs-grid">
        <header className="certs-head">
          <p className="tag rv">
            <span>{sectionIndex("certifications")}</span>
            <span aria-hidden="true">—</span>
            <span>Certifications</span>
          </p>
          <h2 id="certs-title" className="h-section mt-5">
            <span className="rv-mask"><span>Always <span className="accent">learning.</span></span></span>
          </h2>
          <p className="mono certs-count rv">{String(n).padStart(2, "0")} {n === 1 ? "certification" : "certifications"}</p>
        </header>
        <ol className="certs-list">
          {CERTIFICATIONS.map((c, i) => {
            const inner = (
              <>
                <span className="mono ci">{String(i + 1).padStart(2, "0")}</span>
                <span className="ct">{c.title}</span>
                <span className="cis">{[c.issuer, c.year].filter(Boolean).join(" · ")}</span>
                <span className="ca" aria-hidden="true">↗</span>
              </>
            );
            return (
              <li key={c.title} className="rv" style={{ "--i": i } as CSSProperties}>
                {c.href ? (
                  <a className="crow" href={c.href} target="_blank" rel="noopener noreferrer">{inner}</a>
                ) : (
                  <div className="crow" tabIndex={0}>{inner}</div>
                )}
              </li>
            );
          })}
        </ol>
      </div>
      <style>{`
        .certs{background:var(--card);border-block:1px solid var(--line)}
        .certs-grid{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,7fr);gap:clamp(24px,5vw,80px);align-items:start}
        .certs-head{position:sticky;top:120px}
        .certs-count{color:var(--mute);font-size:13px;margin-top:20px}
        .certs-list{list-style:none;margin:0;padding:0;border-top:1px solid var(--line)}
        .crow{position:relative;display:grid;grid-template-columns:48px minmax(0,1fr) auto 24px;gap:16px;align-items:center;padding:24px 16px;border-bottom:1px solid var(--line);overflow:hidden;isolation:isolate;transition:color .5s var(--ease)}
        .crow::before{content:"";position:absolute;inset:0;z-index:-1;background:var(--ink);transform:scaleX(0);transform-origin:0 50%;transition:transform .7s var(--ease)}
        .crow:hover,.crow:focus-visible{color:#fff}
        .crow:hover::before,.crow:focus-visible::before{transform:scaleX(1)}
        .ci{font-size:12px;color:var(--faint)}
        .ct{font-weight:600;font-size:clamp(17px,1.6vw,22px);letter-spacing:-.02em}
        .cis{font-size:13px;color:var(--mute);transition:color .5s var(--ease)}
        .crow:hover .cis,.crow:focus-visible .cis{color:rgba(255,255,255,.65)}
        .ca{opacity:0;transform:translateX(-10px);transition:opacity .5s var(--ease),transform .5s var(--ease)}
        .crow:hover .ca,.crow:focus-visible .ca{opacity:1;transform:none}
        @media (max-width: 860px){
          .certs-grid{grid-template-columns:minmax(0,1fr)}
          .certs-head{position:relative;top:0}
          .crow{grid-template-columns:36px minmax(0,1fr) 20px}
          .cis{grid-column:2}
        }
      `}</style>
    </section>
  );
}

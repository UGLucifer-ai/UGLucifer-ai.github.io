"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { EXPERIENCE, HAS, SKILL_GROUPS, projectsUsing, sectionIndex } from "@/lib/data";
import SectionHeading from "@/components/ui/SectionHeading";
import TechLogo, { BRAND, CONCEPT, isBrand } from "@/components/ui/TechLogo";
import { useInView } from "@/lib/hooks";

type Tile = { n: number; name: string; symbol: string; logo: string; family: string };

export default function Skills() {
  const tiles: Tile[] = useMemo(() => {
    let n = 0;
    return SKILL_GROUPS.flatMap((g) => g.skills.map((s) => ({ ...s, family: g.family, n: ++n })));
  }, []);
  const families = useMemo(() => SKILL_GROUPS.filter((g) => g.skills.length).map((g) => g.family), []);
  const [filter, setFilter] = useState<string | null>(null);
  const [current, setCurrent] = useState<Tile | null>(null);
  const [popKey, setPopKey] = useState(0);
  const [gridRef, inView] = useInView<HTMLDivElement>({ once: true, threshold: 0.05 });

  if (!HAS.skills) return null;
  const shown = current ?? tiles[0];
  const projects = shown ? projectsUsing(shown.name) : [];
  const usedAt = shown
    ? EXPERIENCE.filter((e) => e.stack.some((s) => s.toLowerCase() === shown.name.toLowerCase()))
    : [];

  const pick = (t: Tile) => {
    if (current?.n !== t.n) {
      setCurrent(t);
      setPopKey((k) => k + 1);
    }
  };

  return (
    <section id="skills" className="section skills" aria-labelledby="skills-title">
      <div className="wrap">
        <SectionHeading id="skills-title" index={sectionIndex("skills")} label="Skills" accent="stack.">
          The periodic table of my
        </SectionHeading>

        <div className="chips rv" role="group" aria-label="Filter skills by family">
          <button className={`chip ${filter === null ? "is-on" : ""}`} aria-pressed={filter === null} onClick={() => setFilter(null)}>
            All <span className="mono">{tiles.length}</span>
          </button>
          {families.map((f) => (
            <button key={f} className={`chip ${filter === f ? "is-on" : ""}`} aria-pressed={filter === f} onClick={() => setFilter(filter === f ? null : f)}>
              {f}
            </button>
          ))}
        </div>

        <div className="pt-layout">
          <div ref={gridRef} className={`pt-grid ${inView ? "is-in" : ""}`} role="list" aria-label="Skills">
            {tiles.map((t, i) => {
              const dim = filter !== null && filter !== t.family;
              return (
                <button
                  key={t.n}
                  role="listitem"
                  className={`el ${dim ? "is-dim" : ""} ${shown?.n === t.n ? "is-cur" : ""}`}
                  style={{ "--col": i % 8, "--row": Math.floor(i / 8), "--colm": i % 4, "--rowm": Math.floor(i / 4) } as CSSProperties}
                  onMouseEnter={() => pick(t)}
                  onFocus={() => pick(t)}
                  onClick={() => pick(t)}
                  aria-label={`${t.name} — ${t.family}`}
                >
                  <span className="el-n mono">{t.n}</span>
                  <span className="el-s">{t.symbol}</span>
                  <span className="el-name">{t.name}</span>
                  <span className="el-f mono">{t.family}</span>
                </button>
              );
            })}
          </div>

          {shown && (
            <aside className="inspector card" aria-live="polite">
              <div key={popKey} className="insp-logo">
                <TechLogo name={shown.logo} size={150} glow />
              </div>
              <p className="mono insp-k">
                {String(shown.n).padStart(3, "0")} · {shown.family}
              </p>
              <h3 className="insp-name">{shown.name}</h3>
              {isBrand(shown.logo) && BRAND[shown.logo].label !== shown.name && (
                <p className="insp-sub">{BRAND[shown.logo].label}</p>
              )}
              {!isBrand(shown.logo) && CONCEPT[shown.logo] && <p className="insp-sub">Concept · {CONCEPT[shown.logo].label}</p>}
              {projects.length > 0 && (
                <div className="insp-block">
                  <p className="mono insp-k">Used in</p>
                  <ul>{projects.map((p) => <li key={p.id}>{p.title}</li>)}</ul>
                </div>
              )}
              {usedAt.length > 0 && (
                <div className="insp-block">
                  <p className="mono insp-k">Used at</p>
                  <ul>{usedAt.map((e) => <li key={e.id}>{e.org}</li>)}</ul>
                </div>
              )}
            </aside>
          )}
        </div>
      </div>

      <style>{`
        .chips{display:flex;flex-wrap:wrap;gap:8px;margin:40px 0 28px}
        .chip{height:36px;padding:0 14px;border-radius:999px;font-size:13px;font-weight:500;box-shadow:inset 0 0 0 1px var(--line);background:rgba(255,255,255,.4);transition:background-color .4s var(--ease),color .4s var(--ease)}
        .chip .mono{font-size:11px;color:var(--mute);margin-left:4px}
        .chip:hover{background:#fff}
        .chip.is-on{background:var(--ink);color:#fff}
        .chip.is-on .mono{color:var(--faint)}
        .pt-layout{display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:24px;align-items:start}
        .pt-grid{display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:6px}
        .el{position:relative;aspect-ratio:1/1.08;text-align:left;padding:8px 9px;border-radius:12px;background:var(--card);box-shadow:inset 0 0 0 1px var(--line);display:flex;flex-direction:column;overflow:hidden;opacity:0;transform:translateY(14px) scale(.96);transition:opacity .7s var(--ease),transform .7s var(--ease),background-color .4s var(--ease),color .4s var(--ease),filter .4s var(--ease)}
        .pt-grid.is-in .el{opacity:1;transform:none;transition-delay:calc((var(--row) + var(--col)) * 40ms),calc((var(--row) + var(--col)) * 40ms),0s,0s,0s}
        .el:hover,.el.is-cur{background:var(--ink);color:#fff}
        .el.is-dim{opacity:.22 !important;filter:grayscale(1)}
        .el-n{font-size:10px;color:var(--faint)}
        .el-s{font-size:clamp(18px,1.9vw,28px);font-weight:700;letter-spacing:-.04em;line-height:1;margin-top:auto}
        .el-name{font-size:11px;font-weight:500;line-height:1.15;margin-top:4px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
        .el-f{font-size:8.5px;color:var(--faint);text-transform:uppercase;letter-spacing:.04em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px}
        .el:hover .el-n,.el.is-cur .el-n,.el:hover .el-f,.el.is-cur .el-f{color:rgba(255,255,255,.55)}
        .inspector{position:sticky;top:96px;padding:28px;display:flex;flex-direction:column;align-items:flex-start;min-height:420px}
        .insp-logo{width:100%;display:grid;place-items:center;height:190px;animation:pop .7s var(--ease) both}
        @keyframes pop{0%{transform:scale(.6);opacity:0}60%{transform:scale(1.05);opacity:1}100%{transform:scale(1)}}
        .insp-k{font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--mute);margin:16px 0 0}
        .insp-name{font-size:30px;margin:8px 0 0}
        .insp-sub{color:var(--mute);margin:6px 0 0;font-size:14px}
        .insp-block ul{list-style:none;padding:0;margin:8px 0 0;display:flex;flex-wrap:wrap;gap:6px}
        .insp-block li{font-size:12px;padding:5px 10px;border-radius:999px;box-shadow:inset 0 0 0 1px var(--line)}
        @media (max-width: 980px){
          .pt-layout{grid-template-columns:minmax(0,1fr)}
          .inspector{position:relative;top:0;min-height:0}
        }
        @media (max-width: 640px){
          .pt-grid{grid-template-columns:repeat(4,minmax(0,1fr))}
          .pt-grid.is-in .el{transition-delay:calc((var(--rowm) + var(--colm)) * 40ms),calc((var(--rowm) + var(--colm)) * 40ms),0s,0s,0s}
          .el-s{font-size:22px}
        }
      `}</style>
    </section>
  );
}

import type { ProjectMock } from "@/lib/data";

/** Illustrative grayscale mini-UIs (pure CSS/JSX). Always labelled as illustrative. */
export default function MockUI({ kind }: { kind: ProjectMock }) {
  return (
    <div className="mock" aria-hidden="true">
      <div className="mock-bar">
        <i /><i /><i />
      </div>
      <div className="mock-body">{body(kind)}</div>
      <style>{`
        .mock{width:100%;height:100%;border-radius:18px;background:#fff;box-shadow:inset 0 0 0 1px var(--line);overflow:hidden;display:flex;flex-direction:column}
        .mock-bar{display:flex;gap:6px;padding:12px 14px;border-bottom:1px solid var(--line)}
        .mock-bar i{width:9px;height:9px;border-radius:50%;background:var(--soft)}
        .mock-body{flex:1;padding:16px;display:flex;flex-direction:column;gap:10px;min-height:0}
        .mk-row{display:flex;gap:8px;align-items:center}
        .mk-line{height:8px;border-radius:4px;background:var(--soft)}
        .mk-box{border-radius:10px;background:var(--paper);box-shadow:inset 0 0 0 1px var(--line)}
        .mk-stage{flex:1;padding:10px;display:flex;flex-direction:column;gap:6px;align-items:center;justify-content:center}
        .mk-dot{width:12px;height:12px;border-radius:50%;background:var(--ink)}
        .mk-dot.o{background:transparent;box-shadow:inset 0 0 0 2px var(--faint)}
        .mk-term{flex:1;border-radius:10px;background:#1b1b1b;padding:12px;display:flex;flex-direction:column;gap:7px}
        .mk-term .mk-line{background:#3c3c3c}
        .mk-bars{flex:1;display:flex;align-items:flex-end;gap:6px}
        .mk-bars i{flex:1;background:var(--soft);border-radius:4px 4px 0 0}
        .mk-bars i:nth-child(3n){background:var(--faint)}
        .mk-node{width:44px;height:44px;border-radius:10px;display:grid;grid-template-columns:1fr 1fr;gap:4px;padding:6px;background:var(--paper);box-shadow:inset 0 0 0 1px var(--line)}
        .mk-node i{border-radius:3px;background:var(--faint)}
        .mk-bub{max-width:70%;padding:10px;border-radius:12px;background:var(--paper)}
        .mk-bub.me{align-self:flex-end;background:var(--ink)}
        .mk-bub.me .mk-line{background:#555}
      `}</style>
    </div>
  );
}

function body(kind: ProjectMock) {
  switch (kind) {
    case "pipeline":
      return (
        <>
          <div className="mk-line" style={{ width: "40%" }} />
          <div className="mk-row" style={{ flex: 1 }}>
            {["Build", "Test", "Scan", "Deploy"].map((s, i) => (
              <div key={s} className="mk-box mk-stage">
                <span className={`mk-dot ${i === 3 ? "o" : ""}`} />
                <div className="mk-line" style={{ width: "70%" }} />
              </div>
            ))}
          </div>
          <div className="mk-line" style={{ width: "85%" }} />
          <div className="mk-line" style={{ width: "60%" }} />
        </>
      );
    case "terminal":
      return (
        <div className="mk-term">
          {[60, 82, 45, 70, 30, 76, 52].map((w, i) => (
            <div key={i} className="mk-line" style={{ width: `${w}%` }} />
          ))}
        </div>
      );
    case "dashboard":
      return (
        <>
          <div className="mk-row">
            {[0, 1, 2].map((i) => (
              <div key={i} className="mk-box" style={{ flex: 1, height: 54 }} />
            ))}
          </div>
          <div className="mk-box mk-bars" style={{ padding: 10 }}>
            {[40, 65, 52, 80, 45, 90, 70, 58, 76, 62].map((h, i) => (
              <i key={i} style={{ height: `${h}%` }} />
            ))}
          </div>
        </>
      );
    case "cluster":
      return (
        <div className="mk-row" style={{ flexWrap: "wrap", gap: 10, alignContent: "flex-start" }}>
          {Array.from({ length: 9 }, (_, i) => (
            <div key={i} className="mk-node">
              {[0, 1, 2, 3].map((j) => (
                <i key={j} style={{ opacity: (i + j) % 3 === 0 ? 0.3 : 1 }} />
              ))}
            </div>
          ))}
        </div>
      );
    case "chat":
      return (
        <>
          <div className="mk-bub"><div className="mk-line" style={{ width: 140 }} /></div>
          <div className="mk-bub me"><div className="mk-line" style={{ width: 110 }} /></div>
          <div className="mk-bub"><div className="mk-line" style={{ width: 170 }} /></div>
        </>
      );
    default:
      return (
        <>
          <div className="mk-box" style={{ height: "45%" }} />
          <div className="mk-line" style={{ width: "70%" }} />
          <div className="mk-line" style={{ width: "50%" }} />
        </>
      );
  }
}

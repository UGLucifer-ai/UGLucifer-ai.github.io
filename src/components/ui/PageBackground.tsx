/**
 * Fixed, gently animated page background: a faint dot matrix with a slow wave of darker dots.
 * Pure CSS (see globals.css, "Page background"), no client JS. Every layer animates transform only,
 * so it stays on the compositor. It sits at z-index:-1 in the root stacking context, so the hero
 * video's mix-blend-mode:multiply still blends straight onto it.
 */
export default function PageBackground() {
  return (
    <div className="pbg" aria-hidden="true">
      <i className="d-base" />
      <span className="d-wave">
        <i className="d-dark" />
      </span>
    </div>
  );
}

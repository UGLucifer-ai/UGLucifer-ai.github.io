/**
 * Lanyard physics: a small position-based Verlet simulation (no dependencies).
 *
 *   anchor ─ ribbon (inextensible rope, RIBBON_SEGS links) ─ reel ─ coil (preloaded spring) ─ clip ─ card
 *
 * - The ribbon is a Verlet rope pinned at the anchor (top of the section).
 * - The coil is a retractable badge-reel cord: a preloaded, damped spring between the reel and the
 *   clip, with a hard minimum (fully retracted) and a hard maximum (end of the cord).
 * - The card is a rigid body made of 4 corner particles held by 6 sticks (edges + diagonals), so it
 *   rotates naturally with pull direction and inertia. The clip point and the grab point are fixed
 *   linear combinations of the corners, so forces and constraints act on it as on a rigid body.
 * - Fixed timestep (1/120 s) with an accumulator in the caller; the result is the same at any frame rate.
 *
 * Units: px, seconds, mass in "corner" units (each card corner = 1).
 */

export const PHYS = {
  dt: 1 / 120,
  maxSubsteps: 10,
  iterations: 12,
  gravity: 2400, // px/s²
  cornerMass: 1, // card = 4
  ribbonMass: 0.12,
  reelMass: 0.5,
  ribbonSegs: 6,
  coilPreload: 1.3, // × card weight: the reel holds the card up against its stop at rest
  coilK: 110, // spring rate per px of pulled-out cord (≈2.9× card weight extra at 250 px)
  coilDamp: 8, // damper along the cord (keeps the snap-back crisp but not violent)
  airCard: 1.6, // 1/s linear air drag on the card (swing settles in a few seconds)
  airRibbon: 4, // 1/s
  dragK: 3200, // pointer spring
  dragDamp: 150,
  idleAccel: 28, // px/s² gentle sideways breeze
  idlePeriod: 3.4, // s
} as const;

type P = { x: number; y: number; px: number; py: number; w: number; fx: number; fy: number };
export type Vec = { x: number; y: number };
export type Bounds = { minX: number; maxX: number; minY: number; maxY: number };

export type LanyardGeometry = {
  ribbonLen: number; // anchor → reel
  coilMin: number; // reel → clip top when fully retracted
  coilMax: number; // longest the cord can be pulled out
  cardW: number;
  cardH: number;
  cardTop: number; // clip top → card top edge
};

export type Pose = { ribbon: Vec[]; reel: Vec; attach: Vec; angle: number; coilLen: number };

const mk = (x: number, y: number, m: number): P => ({ x, y, px: x, py: y, w: m > 0 ? 1 / m : 0, fx: 0, fy: 0 });

export class LanyardSim {
  g: LanyardGeometry;
  ribbon: P[] = [];
  corners: P[] = []; // TL, TR, BR, BL
  sticks: [number, number, number][] = [];
  segLen = 0;
  attachW: number[] = [];
  grabW: number[] | null = null;
  target: Vec = { x: 0, y: 0 };
  bounds: Bounds = { minX: -Infinity, maxX: Infinity, minY: -Infinity, maxY: Infinity };
  idle = true;
  t = 0;

  constructor(g: LanyardGeometry) {
    this.g = g;
    this.reset();
  }

  /** Rest pose: everything hanging straight down from the anchor at (0, 0). */
  reset(): void {
    const { ribbonLen, coilMin, cardW, cardH, cardTop } = this.g;
    const n = PHYS.ribbonSegs;
    this.segLen = ribbonLen / n;
    this.ribbon = Array.from({ length: n + 1 }, (_, i) =>
      mk(0, i * this.segLen, i === 0 ? 0 : i === n ? PHYS.reelMass : PHYS.ribbonMass),
    );
    const top = ribbonLen + coilMin + cardTop;
    const m = PHYS.cornerMass;
    this.corners = [mk(-cardW / 2, top, m), mk(cardW / 2, top, m), mk(cardW / 2, top + cardH, m), mk(-cardW / 2, top + cardH, m)];
    const pairs: [number, number][] = [[0, 1], [1, 2], [2, 3], [3, 0], [0, 2], [1, 3]];
    this.sticks = pairs.map(([a, b]) => [a, b, Math.hypot(this.corners[a].x - this.corners[b].x, this.corners[a].y - this.corners[b].y)]);
    // clip top = midTop − (midBottom − midTop)·c
    const c = cardTop / cardH;
    this.attachW = [(1 + c) / 2, (1 + c) / 2, -c / 2, -c / 2];
    this.grabW = null;
    this.t = 0;
  }

  private comb(w: number[], prev = false): Vec {
    let x = 0, y = 0;
    this.corners.forEach((p, i) => {
      x += w[i] * (prev ? p.px : p.x);
      y += w[i] * (prev ? p.py : p.y);
    });
    return { x, y };
  }

  /** Bilinear weights of a point on the card, u,v ∈ [0,1] from the top-left corner. */
  static cardWeights(u: number, v: number): number[] {
    return [(1 - u) * (1 - v), u * (1 - v), u * v, (1 - u) * v];
  }

  grab(u: number, v: number, target: Vec): void {
    this.grabW = LanyardSim.cardWeights(Math.min(1, Math.max(0, u)), Math.min(1, Math.max(0, v)));
    this.target = { ...target };
  }
  release(): void {
    this.grabW = null;
  }
  get dragging(): boolean {
    return this.grabW !== null;
  }

  /** Add a velocity (px/s) to the card. */
  impulse(vx: number, vy: number): void {
    for (const p of this.corners) {
      p.px -= vx * PHYS.dt;
      p.py -= vy * PHYS.dt;
    }
  }

  /** Card-local (u, v) of a sim-space point. */
  localUV(pt: Vec): { u: number; v: number } {
    const [tl, tr, , bl] = this.corners;
    const ex = { x: tr.x - tl.x, y: tr.y - tl.y };
    const ey = { x: bl.x - tl.x, y: bl.y - tl.y };
    const d = { x: pt.x - tl.x, y: pt.y - tl.y };
    return {
      u: (d.x * ex.x + d.y * ex.y) / (ex.x * ex.x + ex.y * ex.y),
      v: (d.x * ey.x + d.y * ey.y) / (ey.x * ey.x + ey.y * ey.y),
    };
  }

  step(): void {
    const dt = PHYS.dt;
    const all = [...this.ribbon, ...this.corners];
    for (const p of all) {
      p.fx = 0;
      p.fy = p.w ? PHYS.gravity / p.w : 0;
    }
    const cardMass = 4 * PHYS.cornerMass;

    // idle breeze (not while dragging)
    if (this.idle && !this.grabW) {
      const a = PHYS.idleAccel * Math.sin((2 * Math.PI * this.t) / PHYS.idlePeriod);
      for (const p of this.corners) p.fx += a * PHYS.cornerMass;
    }

    // coil: preloaded, damped spring pulling clip → reel (a cord can only pull)
    const reel = this.ribbon[this.ribbon.length - 1];
    const A = this.comb(this.attachW);
    const Ap = this.comb(this.attachW, true);
    let dx = A.x - reel.x, dy = A.y - reel.y;
    const L = Math.hypot(dx, dy) || 1e-6;
    dx /= L;
    dy /= L;
    const vrel = ((A.x - Ap.x - (reel.x - reel.px)) * dx + (A.y - Ap.y - (reel.y - reel.py)) * dy) / dt;
    const F = Math.max(0, PHYS.coilPreload * cardMass * PHYS.gravity + PHYS.coilK * Math.max(0, L - this.g.coilMin) + PHYS.coilDamp * vrel);
    reel.fx += F * dx;
    reel.fy += F * dy;
    this.corners.forEach((p, i) => {
      p.fx -= F * dx * this.attachW[i];
      p.fy -= F * dy * this.attachW[i];
    });

    // pointer spring on the grab point
    if (this.grabW) {
      const G = this.comb(this.grabW), Gp = this.comb(this.grabW, true);
      const fx = PHYS.dragK * (this.target.x - G.x) - (PHYS.dragDamp * (G.x - Gp.x)) / dt;
      const fy = PHYS.dragK * (this.target.y - G.y) - (PHYS.dragDamp * (G.y - Gp.y)) / dt;
      this.corners.forEach((p, i) => {
        p.fx += fx * this.grabW![i];
        p.fy += fy * this.grabW![i];
      });
    }

    // Verlet integration with linear air drag
    for (const p of all) {
      if (!p.w) continue;
      const k = 1 - (this.corners.includes(p) ? PHYS.airCard : PHYS.airRibbon) * dt;
      const nx = p.x + (p.x - p.px) * k + p.fx * p.w * dt * dt;
      const ny = p.y + (p.y - p.py) * k + p.fy * p.w * dt * dt;
      p.px = p.x;
      p.py = p.y;
      p.x = nx;
      p.y = ny;
    }

    // constraints
    const b = this.bounds;
    for (let it = 0; it < PHYS.iterations; it++) {
      for (let i = 0; i < this.ribbon.length - 1; i++) this.dist(this.ribbon[i], this.ribbon[i + 1], this.segLen);
      this.coilLimit();
      for (const [a, c, len] of this.sticks) this.dist(this.corners[a], this.corners[c], len);
      for (const p of this.corners) {
        if (p.x < b.minX) p.x = b.minX;
        else if (p.x > b.maxX) p.x = b.maxX;
        if (p.y < b.minY) p.y = b.minY;
        else if (p.y > b.maxY) p.y = b.maxY;
      }
    }
    this.t += dt;
  }

  private dist(a: P, b: P, len: number): void {
    const dx = b.x - a.x, dy = b.y - a.y;
    const d = Math.hypot(dx, dy) || 1e-6;
    const wsum = a.w + b.w;
    if (!wsum) return;
    const s = (d - len) / d / wsum;
    a.x += dx * s * a.w;
    a.y += dy * s * a.w;
    b.x -= dx * s * b.w;
    b.y -= dy * s * b.w;
  }

  /** Keep coilMin ≤ |clip − reel| ≤ coilMax (clip is a weighted point of the rigid card). */
  private coilLimit(): void {
    const reel = this.ribbon[this.ribbon.length - 1];
    const A = this.comb(this.attachW);
    const dx = A.x - reel.x, dy = A.y - reel.y;
    const L = Math.hypot(dx, dy) || 1e-6;
    const target = L < this.g.coilMin ? this.g.coilMin : L > this.g.coilMax ? this.g.coilMax : L;
    if (target === L) return;
    const nx = dx / L, ny = dy / L;
    let denom = reel.w;
    this.corners.forEach((p, i) => (denom += this.attachW[i] * this.attachW[i] * p.w));
    const lam = -(L - target) / denom;
    this.corners.forEach((p, i) => {
      p.x += this.attachW[i] * p.w * lam * nx;
      p.y += this.attachW[i] * p.w * lam * ny;
    });
    reel.x -= reel.w * lam * nx;
    reel.y -= reel.w * lam * ny;
  }

  /** Render pose, interpolated between the last two steps (alpha ∈ [0,1]). */
  pose(alpha = 1): Pose {
    const lerp = (p: P): Vec => ({ x: p.px + (p.x - p.px) * alpha, y: p.py + (p.y - p.py) * alpha });
    const c = this.corners.map(lerp);
    const ribbon = this.ribbon.map(lerp);
    ribbon[0] = { x: this.ribbon[0].x, y: this.ribbon[0].y };
    let ax = 0, ay = 0;
    c.forEach((p, i) => {
      ax += this.attachW[i] * p.x;
      ay += this.attachW[i] * p.y;
    });
    const reel = ribbon[ribbon.length - 1];
    return {
      ribbon,
      reel,
      attach: { x: ax, y: ay },
      angle: Math.atan2(c[1].y - c[0].y, c[1].x - c[0].x),
      coilLen: Math.hypot(ax - reel.x, ay - reel.y),
    };
  }
}

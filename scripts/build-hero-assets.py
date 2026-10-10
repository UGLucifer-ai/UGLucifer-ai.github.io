#!/usr/bin/env python3
"""
build-hero-assets.py — turn the talking intro video into seamless hero assets.

Outputs (default --out public/):
  public/hero/hero.mp4        H.264 yuv420p, CRF 24, preset slow, AAC 96k, +faststart
  public/hero/hero.webm       VP9 CRF 36, Opus 80k
  public/hero/hero-poster.webp  frame 0 of hero.mp4 (the <video poster>), WebP q90
  public/portrait-bust.webp   480×600 head-to-shirt crop (from --photo, else clearest frame)
  public/og.jpg               1200×630 social card
  scripts/hero-framing.json   the crop box + whiten levels used for the loop (reused by --answer)

Answer clips (--answer <id>): one lip-synced Google Flow clip per "Ask me" chip →
  public/hero/answers/<id>.mp4 / <id>.webm / <id>-poster.webp
  Same crop box, white padding/feather and whiten levels as the hero loop — and if Flow framed the
  person at a different size/position, the box is scaled/shifted so head-top, hem and centre land
  exactly where they are in the loop (no jump when the clips swap; --no-align to disable) — leading/trailing silence trimmed to --lead (0.2 s),
  no loop and no cross-fade. Then add <id> to ANSWER_CLIP_IDS in src/lib/data.ts.

Pipeline
  1. Crop tightly around the person (auto-detected against the light backdrop,
     or --crop W:H:X:Y), keep them centred, scale to 768 px wide (768×960).
  2. Whiten the backdrop: colorlevels=rimax=0.98:gimax=0.98:bimax=0.98.
  3. Seamless loop from the first ~10 s: the last --fade seconds of picture are
     cross-faded (ffmpeg xfade) into the first --fade seconds; the audio gets
     the identical cross-fade sample-accurately in numpy (no acrossfade).
     Nothing is stretched or retimed, so lip-sync is preserved.
  4. Export mp4 + webm.  5. Poster (frame 0 of hero.mp4) + portrait still + OG image.

Requirements: ffmpeg + ffprobe on PATH, Python 3.9+, numpy.

Examples
  python3 scripts/build-hero-assets.py inputs/intro.mp4
  python3 scripts/build-hero-assets.py inputs/intro.mp4 --crop 800:1000:560:80
  python3 scripts/build-hero-assets.py inputs/intro.mp4 --photo inputs/photo.jpg --photo-crop 2092:2615:490:572
  python3 scripts/build-hero-assets.py --poster-only
  python3 scripts/build-hero-assets.py --portrait-only --photo inputs/photo-id.jpg --photo-crop 766:958:0:-66
  python3 scripts/build-hero-assets.py --answer who inputs/answers/who.mp4
  python3 scripts/build-hero-assets.py --idle inputs/idle.mp4
  python3 scripts/build-hero-assets.py --idle-door inputs/idle-door.mp4

Idle loop (--idle): a silent clip of him waiting (no talking) → public/hero/idle.mp4 / idle.webm (no audio
  track) + idle-poster.webp. Same crop/align/whiten as the hero, seamless xfade picture loop (--fade).
  Shown, muted and looping, after an answer ends. Then set HERO_IDLE.enabled = true in src/lib/data.ts.
Idle door (--idle-door): optional ~8 s silent variation (he walks through a soft white door and comes back)
  → public/hero/idle-door.{mp4,webm} + idle-door-poster.webp; no loop cross-fade, trimmed to the best-matching
  start/end frames. Played once every ~3–4 idle loops. Then set HERO_IDLE.door.enabled = true.
"""
from __future__ import annotations

import argparse
import json
import math
import re
import shutil
import subprocess
import sys
import tempfile
import wave
from pathlib import Path

import numpy as np

FRAMING = Path(__file__).with_name("hero-framing.json")
ANSWER_IDS = ("who", "whatdo", "current", "kubernetes", "aws", "cicd", "tools", "contact", "resume")
OUT_W, OUT_H = 768, 960  # 4:5 hero frame (matches aspect-ratio: 768/960 in CSS)
WHITEN = "colorlevels=rimax=0.98:gimax=0.98:bimax=0.98"
SR = 48000


# ───────────────────────────── helpers ─────────────────────────────

def run(cmd: list[str], **kw) -> subprocess.CompletedProcess:
    print("  $", " ".join(str(c) for c in cmd[:6]), "…" if len(cmd) > 6 else "", flush=True)
    return subprocess.run(cmd, check=True, **kw)


def ffmpeg(*args: str, capture: bool = False) -> bytes:
    cmd = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", *args]
    r = subprocess.run(cmd, check=True, stdout=subprocess.PIPE if capture else None)
    return r.stdout if capture else b""


def probe(path: Path) -> dict:
    r = subprocess.run(
        ["ffprobe", "-v", "error", "-print_format", "json", "-show_streams", "-show_format", str(path)],
        check=True, capture_output=True, text=True,
    )
    info = json.loads(r.stdout)
    v = next((s for s in info["streams"] if s["codec_type"] == "video"), None)
    a = next((s for s in info["streams"] if s["codec_type"] == "audio"), None)
    if v is None:
        sys.exit(f"✗ {path} has no video stream")
    num, den = (int(x) for x in v.get("r_frame_rate", "30/1").split("/"))
    w, h = int(v["width"]), int(v["height"])
    rot = 0
    for sd in v.get("side_data_list", []) or []:
        if "rotation" in sd:
            rot = int(sd["rotation"])
    if abs(rot) in (90, 270):
        w, h = h, w
    return {
        "w": w,
        "h": h,
        "fps": num / den if den else 30.0,
        "fps_str": f"{num}/{den}",
        "duration": float(info["format"].get("duration", v.get("duration", 0)) or 0),
        "audio": a is not None,
    }


def grab_gray_frames(src: Path, start: float, dur: float, n: int, scale_w: int, src_w: int, src_h: int) -> np.ndarray:
    """n evenly spaced grayscale frames, downscaled to scale_w wide → (n, h, w) uint8."""
    sh = int(round(src_h * scale_w / src_w / 2) * 2)
    fps = n / max(dur, 0.1)
    raw = ffmpeg("-ss", f"{start}", "-t", f"{dur}", "-i", str(src),
                 "-vf", f"fps={fps},scale={scale_w}:{sh},format=gray",
                 "-f", "rawvideo", "-", capture=True)
    frames = np.frombuffer(raw, np.uint8)
    k = frames.size // (scale_w * sh)
    return frames[: k * scale_w * sh].reshape(k, sh, scale_w)


def even(x: float) -> int:
    return int(round(x / 2) * 2)


# ───────────────────────────── 1. crop detection ─────────────────────────────

class Box:
    """Crop box in source pixels. May extend past the frame; the overflow is
    filled with white padding (never cut the head or feet)."""

    def __init__(self, w: int, h: int, x: int, y: int, src_w: int, src_h: int):
        self.w, self.h, self.x, self.y = w, h, x, y
        self.pad_x = max(0, -x, x + w - src_w)
        self.pad_y = max(0, -y, y + h - src_h)
        self.pad_x = even(self.pad_x + 1) if self.pad_x else 0
        self.pad_y = even(self.pad_y + 1) if self.pad_y else 0

    def filter(self) -> str:
        if self.pad_x or self.pad_y:
            px, py = self.pad_x, self.pad_y
            return (f"pad=iw+{2 * px}:ih+{2 * py}:{px}:{py}:color=white,"
                    f"crop={self.w}:{self.h}:{self.x + px}:{self.y + py}")
        return f"crop={self.w}:{self.h}:{self.x}:{self.y}"

    def __str__(self) -> str:
        pad = f" (+white padding {self.pad_x}px L/R, {self.pad_y}px T/B)" if (self.pad_x or self.pad_y) else ""
        return f"{self.w}x{self.h} at ({self.x},{self.y}){pad}"


def detect_crop(src: Path, meta: dict, start: float, dur: float, margin: float) -> tuple[Box, dict]:
    """Union bounding box of everything darker than the backdrop across sampled
    frames → a 768:960 box that contains the whole person (head to toe) with
    `margin` headroom/footroom, centred on the person. Works for landscape and
    portrait sources; if the box is wider/taller than the frame it is padded
    with white instead of cutting the person."""
    sw = 360
    frames = grab_gray_frames(src, start, dur, 24, sw, meta["w"], meta["h"])
    if frames.size == 0:
        sys.exit("✗ could not read frames for crop detection — pass --crop W:H:X:Y")
    n, sh, _ = frames.shape
    # backdrop level from the top band (wall), robust to the person's head
    bg = float(np.percentile(frames[:, : max(4, sh // 12)], 75))
    mask = (frames.astype(np.int16) < bg - 30).any(axis=0)
    # drop thin noise: rows/cols need a meaningful number of foreground pixels
    rows = np.where(mask.sum(1) >= max(2, int(sw * 0.012)))[0]
    cols = np.where(mask.sum(0) >= max(2, int(sh * 0.012)))[0]
    if rows.size == 0 or cols.size == 0:
        sys.exit("✗ could not find the person — pass --crop W:H:X:Y")
    k = meta["w"] / sw
    y0, y1 = rows[0] * k, (rows[-1] + 1) * k
    x0, x1 = cols[0] * k, (cols[-1] + 1) * k
    body_h = y1 - y0
    # horizontal centre: median column of the torso band (robust to gestures)
    band = mask[rows[0] + (rows[-1] - rows[0]) // 5 : rows[0] + (rows[-1] - rows[0]) * 3 // 5]
    cxs = np.where(band.any(axis=0))[0]
    cx = (np.median(cxs) if cxs.size else (cols[0] + cols[-1]) / 2) * k
    h = body_h * (1 + 2 * margin)
    w = max(h * OUT_W / OUT_H, (x1 - x0) * (1 + margin))
    h = w * OUT_H / OUT_W
    cy = (y0 + y1) / 2
    x, y = cx - w / 2, cy - h / 2
    # if the box fits inside the frame, keep it inside (no needless padding)
    if w <= meta["w"]:
        x = min(max(0, x), meta["w"] - w)
    if h <= meta["h"]:
        y = min(max(0, y), meta["h"] - h)
    box = Box(even(w), even(h), even(x), even(y), meta["w"], meta["h"])
    info = {"bg": bg, "person": (int(x0), int(y0), int(x1), int(y1))}
    return box, info


def backdrop_levels(src: Path, t: float, meta: dict) -> tuple[float, float, float]:
    """Per-channel backdrop brightness (0–1) from the top band of the frame."""
    raw = ffmpeg("-ss", f"{t}", "-i", str(src), "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "rgb24", "-", capture=True)
    f = np.frombuffer(raw, np.uint8).reshape(meta["h"], meta["w"], 3)
    top = f[: max(8, meta["h"] // 14)].reshape(-1, 3)
    lv = np.percentile(top, 60, axis=0) / 255.0
    return float(lv[0]), float(lv[1]), float(lv[2])


def write_edge_veil(path: Path, box: "Box", src_w: int, feather: int) -> bool:
    """White RGBA overlay (OUT_W×OUT_H) that hides the seam between the white
    padding and the real backdrop: alpha 1 over the padding, ramping smoothly
    (smoothstep) to 0 over `feather` output px into the picture. Returns False
    when no side padding was needed."""
    k = OUT_W / box.w
    left = max(0.0, -box.x) * k
    right = max(0.0, box.x + box.w - src_w) * k
    if left <= 0 and right <= 0:
        return False
    xs = np.arange(OUT_W, dtype=np.float64) + 0.5
    a = np.zeros(OUT_W)
    if left > 0:
        t = np.clip((left + feather - xs) / feather, 0, 1)
        a = np.maximum(a, t * t * (3 - 2 * t))
    if right > 0:
        t = np.clip((xs - (OUT_W - right - feather)) / feather, 0, 1)
        a = np.maximum(a, t * t * (3 - 2 * t))
    rgba = np.empty((OUT_H, OUT_W, 4), np.uint8)
    rgba[..., :3] = 255
    rgba[..., 3] = np.round(a * 255).astype(np.uint8)[None, :]
    path.write_bytes(rgba.tobytes())
    return True


def speech_bounds(a: np.ndarray, thresh_db: float = -45.0) -> tuple[float, float] | None:
    """First/last time (s) the 5 ms RMS rises above thresh_db relative to the peak."""
    mono = a.mean(axis=1)
    w = SR // 200
    n = mono.size // w
    if n == 0:
        return None
    rms = np.sqrt((mono[: n * w].reshape(n, w) ** 2).mean(axis=1))
    db = 20 * np.log10(rms + 1e-9)
    on = np.where(db > db.max() + thresh_db)[0]
    if on.size == 0:
        return None
    return on[0] * w / SR, (on[-1] + 1) * w / SR


# ───────────────────────────── 3. audio crossfade ─────────────────────────────

def read_audio(src: Path, start: float, dur: float) -> np.ndarray:
    raw = ffmpeg("-ss", f"{start}", "-t", f"{dur}", "-i", str(src), "-vn",
                 "-ac", "2", "-ar", str(SR), "-f", "f32le", "-", capture=True)
    return np.frombuffer(raw, np.float32).reshape(-1, 2).copy()


def loop_audio(a: np.ndarray, fade_s: float, total_samples: int) -> np.ndarray:
    """Same structure as the video: body = a[F:N], with its last F samples
    equal-power cross-faded into head = a[0:F]. Output length N − F, so the
    end flows into the start without a click."""
    a = a[:total_samples]
    if a.shape[0] < total_samples:  # pad short audio with silence
        a = np.vstack([a, np.zeros((total_samples - a.shape[0], 2), np.float32)])
    F = int(round(fade_s * SR))
    head, body = a[:F], a[F:].copy()
    t = np.linspace(0.0, 1.0, F, endpoint=False, dtype=np.float64)[:, None]
    fade_out, fade_in = np.cos(t * np.pi / 2), np.sin(t * np.pi / 2)
    body[-F:] = (body[-F:] * fade_out + head * fade_in).astype(np.float32)
    return np.clip(body, -1.0, 1.0)


def write_wav(path: Path, a: np.ndarray) -> None:
    pcm = (a * 32767.0).round().astype("<i2")
    with wave.open(str(path), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


# ───────────────────────────── 5. stills ─────────────────────────────

def clearest_frame_time(src: Path, crop: str, start: float, dur: float) -> float:
    """Pick the sharpest frame (variance of a Laplacian) among samples."""
    n = 30
    sw = 384
    sh = even(sw * OUT_H / OUT_W)
    raw = ffmpeg("-ss", f"{start}", "-t", f"{dur}", "-i", str(src),
                 "-vf", f"fps={n / max(dur, 0.1)},{crop},scale={sw}:{sh},format=gray",
                 "-f", "rawvideo", "-", capture=True)
    fr = np.frombuffer(raw, np.uint8)
    k = fr.size // (sw * sh)
    if k == 0:
        return start
    fr = fr[: k * sw * sh].reshape(k, sh, sw).astype(np.float32)[:, : sh // 2]  # head region
    lap = (-4 * fr[:, 1:-1, 1:-1] + fr[:, :-2, 1:-1] + fr[:, 2:, 1:-1] + fr[:, 1:-1, :-2] + fr[:, 1:-1, 2:])
    best = int(np.argmax(lap.reshape(k, -1).var(axis=1)))
    return start + best * dur / n


def _pad_photo_with_backdrop(photo: Path, left: int, top: int, right: int, bottom: int, dst: Path) -> None:
    """Extend a photo's canvas with a backdrop matched to its own edges (subject pixels untouched).

    Each new pixel copies the smoothed edge colour of its column/row (outliers such as hair
    touching the edge are replaced by the edge median), plus grain matched to the backdrop.
    """
    m = probe(photo)
    w, h = m["w"], m["h"]
    img = np.frombuffer(ffmpeg("-i", str(photo), "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "rgb24", "-",
                               capture=True), np.uint8).reshape(h, w, 3).astype(np.float32)
    rng = np.random.default_rng(7)

    def edge_profile(strip: np.ndarray) -> np.ndarray:  # strip: (n, k, 3) -> smoothed (n, 3)
        prof = strip.mean(axis=1)
        med = np.median(prof, axis=0)
        bad = np.abs(prof - med).max(axis=1) > 12
        prof[bad] = med
        k = max(3, len(prof) // 12) | 1
        pad = np.pad(prof, ((k // 2, k // 2), (0, 0)), mode="edge")
        ker = np.ones(k) / k
        return np.stack([np.convolve(pad[:, c], ker, mode="valid") for c in range(3)], axis=1)

    grain = float(np.median([img[:8, :8].std(), img[:8, -8:].std()]))
    out = np.empty((h + top + bottom, w + left + right, 3), np.float32)
    out[top:top + h, left:left + w] = img
    if top:
        out[:top, left:left + w] = edge_profile(img[:3].transpose(1, 0, 2))[None]
    if bottom:
        out[top + h:, left:left + w] = edge_profile(img[-3:].transpose(1, 0, 2))[None]
    if left:
        out[:, :left] = edge_profile(out[:, left:left + 3])[:, None]
    if right:
        out[:, left + w:] = edge_profile(out[:, left + w - 3:left + w])[:, None]
    mask = np.ones(out.shape[:2], bool)
    mask[top:top + h, left:left + w] = False
    out[mask] += rng.normal(0, grain, (int(mask.sum()), 3))
    raw = np.clip(out + 0.5, 0, 255).astype(np.uint8)
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24",
                    "-s", f"{out.shape[1]}x{out.shape[0]}", "-i", "-", "-frames:v", "1", str(dst)],
                   input=raw.tobytes(), check=True)


def make_portrait_from_photo(photo: Path, crop: str | None, out: Path) -> None:
    """480×600 portrait. --photo-crop W:H:X:Y may reach outside the photo (e.g. negative Y for
    headroom); the overflow is filled with a backdrop matched to the photo's own edges."""
    src = photo
    tmpdir = None
    if crop:
        w, h, x, y = (int(v) for v in crop.split(":"))
        m = probe(photo)
        pl, pt = max(0, -x), max(0, -y)
        pr, pb = max(0, x + w - m["w"]), max(0, y + h - m["h"])
        if pl or pt or pr or pb:
            tmpdir = Path(tempfile.mkdtemp(prefix="portrait-"))
            src = tmpdir / "padded.png"
            _pad_photo_with_backdrop(photo, pl, pt, pr, pb, src)
            x, y = x + pl, y + pt
        vf = f"crop={w}:{h}:{x}:{y},scale=480:600:flags=lanczos"
    else:  # default: 4:5 box from the top-centre (head-to-shirt for a typical head-and-shoulders photo)
        vf = "crop='min(iw,ih*4/5)':'min(iw,ih*4/5)*5/4':'(iw-min(iw,ih*4/5))/2':0,scale=480:600:flags=lanczos"
    try:
        ffmpeg("-i", str(src), "-frames:v", "1", "-vf", vf, "-c:v", "libwebp", "-quality", "86", str(out))
    finally:
        if tmpdir:
            shutil.rmtree(tmpdir, ignore_errors=True)


def make_portrait_from_video(src: Path, crop: str, t: float, out: Path, whiten: str = WHITEN) -> None:
    # head-to-shirt: top ~46% of the 768×960 frame, 4:5, centred
    vf = (f"{whiten},{crop},scale={OUT_W}:{OUT_H}:flags=lanczos,"
          f"crop=354:442:{(OUT_W - 354) // 2}:24,scale=480:600:flags=lanczos")
    ffmpeg("-ss", f"{t}", "-i", str(src), "-frames:v", "1", "-vf", vf, "-c:v", "libwebp", "-quality", "86", str(out))


def make_poster(video: Path, out: Path) -> None:
    """<video poster>: frame 0 of the *encoded* hero.mp4, so it is pixel-identical to what plays first.

    The decoded yuv420p (BT.601, limited range — the same matrix/range the video is tagged with and
    that WebP lossy uses) goes straight into libwebp with no RGB round-trip or chroma resampling, so
    colours match the video and the whitened backdrop stays 255 white for mix-blend-mode: multiply.
    """
    ffmpeg("-i", str(video), "-map", "0:v:0", "-frames:v", "1", "-pix_fmt", "yuv420p",
           "-c:v", "libwebp", "-quality", "90", "-compression_level", "6", "-preset", "picture", str(out))


def make_og(still_src: list[str], out: Path, vf_chain: str) -> None:
    """1200×630: white card with the person centred-right (still is already white-backed)."""
    ffmpeg(*still_src, "-frames:v", "1", "-update", "1",
           "-filter_complex",
           f"[0:v]{vf_chain},scale=-2:630[p];color=c=white:s=1200x630[bg];"
           f"[bg][p]overlay=x=(W-w)/2:y=0:format=auto,format=yuvj420p",
           "-q:v", "3", str(out))


# ───────────────────────────── answer clips ─────────────────────────────

def loop_window(meta: dict, start: float, duration: float | None) -> float:
    """The window length D the loop is cut from (same rule as the full run, snapped down to whole frames)."""
    dur_default = meta["duration"] - start if meta["duration"] - start <= 15 else 10.0
    D = min(duration or dur_default, max(0.0, meta["duration"] - start))
    return int(D * meta["fps"] + 1e-6) / meta["fps"]


def person_metrics(src: Path, meta: dict, n: int = 16, ranges: list[tuple[float, float]] | None = None) -> dict:
    """Median head-top row, trouser-hem row and lower-body centre column (source px) of the person over n
    full-resolution frames. Uses clearly dark pixels (hair, beard, trousers), which don't move with the hands.
    `ranges` = [(t0, t1), …] limits the sampling to those seconds (e.g. only where he stands centred)."""
    px = meta["w"] * meta["h"]
    chunks = []
    for t0, t1 in ranges or [(0.0, max(meta["duration"], 0.1))]:
        k = max(2, n // len(ranges)) if ranges else n
        dur = max(t1 - t0, 0.05)
        chunks.append(ffmpeg("-ss", f"{t0}", "-t", f"{dur}", "-i", str(src), "-vf", f"fps={k / dur},format=gray",
                             "-f", "rawvideo", "-", capture=True))
    fr = np.frombuffer(b"".join(c[: len(c) // px * px] for c in chunks), np.uint8)
    fr = fr[: fr.size // px * px].reshape(-1, meta["h"], meta["w"])
    tops, hems, cxs = [], [], []
    for f in fr:
        bg = np.percentile(f[: max(8, meta["h"] // 16)], 75)
        m = f.astype(np.int16) < bg - 70
        rows = np.where(m.sum(1) >= 4)[0]
        if rows.size < 10:
            continue
        top, hem = int(rows[0]), int(rows[-1])
        cols = np.where(m[int(top + (hem - top) * 0.6): hem + 1])[1]
        tops.append(top); hems.append(hem); cxs.append(float(np.median(cols)))
    if not tops:
        sys.exit(f"✗ could not find the person in {src} for alignment — pass --no-align")
    return {"top": float(np.median(tops)), "hem": float(np.median(hems)), "cx": float(np.median(cxs))}


def save_framing(src: Path, meta: dict, box: "Box", lv: tuple[float, float, float], feather: int) -> None:
    FRAMING.write_text(json.dumps({
        "source": src.name, "src_w": meta["w"], "src_h": meta["h"],
        "box": [box.w, box.h, box.x, box.y], "levels": [round(c, 4) for c in lv], "feather": feather,
        "person": {k: round(v, 1) for k, v in person_metrics(src, meta).items()},
    }, indent=2) + "\n")
    print(f"• framing saved → {FRAMING}")


def hero_framing(ref: Path, args) -> dict:
    """The loop's crop box + whiten levels: scripts/hero-framing.json (written by every full run), or
    recomputed from the intro video exactly as the full run does it (and saved)."""
    if FRAMING.exists():
        return json.loads(FRAMING.read_text())
    if not ref.exists():
        sys.exit(f"✗ {FRAMING.name} missing and reference intro {ref} not found — pass --ref or run the full pipeline")
    print(f"• {FRAMING.name} not found — recomputing the hero framing from {ref}")
    meta = probe(ref)
    D = loop_window(meta, args.start, args.duration)
    if args.crop:
        box = Box(*(int(v) for v in args.crop.split(":")), meta["w"], meta["h"])
    else:
        box, _ = detect_crop(ref, meta, args.start, D, args.margin)
    bl = backdrop_levels(ref, args.start + D / 2, meta)
    lv = (args.whiten_max,) * 3 if args.whiten_max else tuple(min(0.98, max(0.80, c - 0.01)) for c in bl)
    save_framing(ref, meta, box, lv, args.feather)
    return json.loads(FRAMING.read_text())


def match_framing(clip: Path, meta: dict, fr: dict, args, align_ranges: list[tuple[float, float]] | None = None) -> tuple["Box", str, dict]:
    """The hero loop's crop box + whiten levels for another Flow clip of the same character (answer or idle):
    the box is scaled for another resolution and, unless --no-align, scaled/shifted so head-top, hem and
    centre land exactly where they are in the loop. Returns (box, whiten filter, framing)."""
    # ── same crop box as the loop (scaled if Flow rendered the same framing at another resolution)
    bw, bh, bx, by = fr["box"]
    if (meta["w"], meta["h"]) == (fr["src_w"], fr["src_h"]):
        box = Box(bw, bh, bx, by, meta["w"], meta["h"])
    elif abs(meta["w"] / meta["h"] - fr["src_w"] / fr["src_h"]) < 0.01:
        k = meta["w"] / fr["src_w"]
        box = Box(even(bw * k), even(bh * k), even(bx * k), even(by * k), meta["w"], meta["h"])
        print(f"  ! resolution differs from the intro ({fr['src_w']}×{fr['src_h']}) — hero box scaled ×{k:.3f}")
    else:
        sys.exit(f"✗ clip aspect {meta['w']}×{meta['h']} ≠ intro {fr['src_w']}×{fr['src_h']}: generate the clip in the "
                 "same aspect ratio as the intro (the framing would not match)")
    if not args.no_align:
        ref_p = fr.get("person")
        if ref_p is None:  # framing file from before alignment existed → measure the intro once and store it
            if not args.ref.exists():
                sys.exit(f"✗ {FRAMING.name} has no person metrics and {args.ref} is missing — pass --ref or --no-align")
            ref_p = {k: round(v, 1) for k, v in person_metrics(args.ref, probe(args.ref)).items()}
            fr["person"] = ref_p
            FRAMING.write_text(json.dumps(fr, indent=2) + "\n")
        kx = meta["w"] / fr["src_w"]  # compare in this clip's pixel scale
        ref_h, ref_top, ref_cx = (ref_p["hem"] - ref_p["top"]) * kx, ref_p["top"] * kx, ref_p["cx"] * kx
        ans = person_metrics(clip, meta, ranges=align_ranges)
        if align_ranges:
            print("  (alignment measured only over " + ", ".join(f"{a:.2f}–{b:.2f}s" for a, b in align_ranges) + ")")
        sc = (ans["hem"] - ans["top"]) / ref_h  # answer person size relative to the loop's
        print(f"• person: loop top {ref_top:.1f} / hem {ref_p['hem'] * kx:.1f} / centre {ref_cx:.1f}; "
              f"clip top {ans['top']:.1f} / hem {ans['hem']:.1f} / centre {ans['cx']:.1f}  → size ×{sc:.4f}")
        if abs(sc - 1) > 0.004 or abs(ans["top"] - ref_top) > 2 or abs(ans["cx"] - ref_cx) > 2:
            # scale/shift the hero box so head-top, hem and centre land exactly where they are in the loop
            nw, nh = box.w * sc, box.h * sc
            nx = ans["cx"] - (ref_cx - box.x) * sc
            ny = ans["top"] - (ref_top - box.y) * sc
            box = Box(even(nw), even(nh), even(nx), even(ny), meta["w"], meta["h"])
            print(f"  ! Flow framed this clip differently — aligned the hero box to {box} (--no-align to disable)")
        else:
            print("  ✓ same framing as the loop — hero box used as is")
    lv = (args.whiten_max,) * 3 if args.whiten_max else tuple(fr["levels"])
    whiten = f"colorlevels=rimax={lv[0]:.3f}:gimax={lv[1]:.3f}:bimax={lv[2]:.3f}"
    bl = backdrop_levels(clip, meta["duration"] / 2, meta)
    print(f"• crop {box} ({"hero box" if args.no_align or box.w == bw else "aligned hero box"}), whiten max {tuple(round(c, 3) for c in lv)} (hero levels); "
          f"clip backdrop RGB ≈ {tuple(round(c * 255) for c in bl)}")
    if min(bl[i] - lv[i] for i in range(3)) < -0.004:
        print("  ! this clip's backdrop is darker than the intro's — it may not whiten fully; try --whiten-max")

    return box, whiten, fr


def build_answer(clip: Path, aid: str, out: Path, args) -> None:
    """Lip-synced answer clip → public/hero/answers/<aid>.{mp4,webm} + <aid>-poster.webp, framed like the loop."""
    if not re.fullmatch(r"[a-z0-9][a-z0-9-]{0,31}", aid):
        sys.exit("✗ --answer id must be lowercase letters, digits or dashes (e.g. who, kubernetes)")
    if aid not in ANSWER_IDS:
        print(f"  ! '{aid}' is not one of the chip ids {', '.join(ANSWER_IDS)}")
    if not clip.exists():
        sys.exit(f"✗ answer clip {clip} not found")
    fr = hero_framing(args.ref, args)
    meta = probe(clip)
    print(f"• answer '{aid}': {clip} {meta['w']}×{meta['h']} @ {meta['fps']:.3f} fps, {meta['duration']:.2f}s, audio={meta['audio']}")

    box, whiten, fr = match_framing(clip, meta, fr, args)

    # ── trim leading/trailing silence to --lead seconds (whole frames, picture and sound cut together)
    fps = meta["fps"]
    last = math.floor(meta["duration"] * fps + 1e-6) / fps
    t0, t1 = 0.0, last
    audio = read_audio(clip, 0, meta["duration"] + 1) if meta["audio"] else None
    if audio is not None:
        sb = speech_bounds(audio, args.speech_db)
        if sb:
            on, off = sb
            t0 = max(0.0, math.floor((on - args.lead) * fps) / fps)
            t1 = min(last, math.ceil((off + (args.lead if args.tail is None else args.tail)) * fps) / fps)
            print(f"• speech {on:.3f}s → {off:.3f}s; keeping {t0:.3f}s → {t1:.3f}s ({on - t0:.2f}s lead-in, {t1 - off:.2f}s tail)")
        else:
            print("  ! no speech found — keeping the whole clip")
    else:
        print("  ! clip has no audio — keeping the whole clip, silent track")
    N = max(1, int(round((t1 - t0) * fps)))
    length = N / fps
    if audio is not None and sb:
        lead_in, speech_end = on - t0, min(off, t1) - t0
        if abs(lead_in - args.lead) > 0.06 or abs((length - speech_end) - args.lead) > 0.06:
            print(f"  ! speech sits at {lead_in:.2f}–{speech_end:.2f}s in the output: add "
                  f"{aid}: [{lead_in:.2f}, {speech_end:.2f}] to ANSWER_CLIP_SPEECH in src/lib/data.ts (caption pacing)")

    tmp = Path(tempfile.mkdtemp(prefix=f"answer-{aid}-"))
    try:
        still_chain = f"{whiten},{box.filter()},scale={OUT_W}:{OUT_H}:flags=lanczos+accurate_rnd+full_chroma_int,setsar=1"
        veil = tmp / "veil.rgba"
        has_veil = write_edge_veil(veil, box, meta["w"], int(fr.get("feather", args.feather)))
        veil_in = ["-f", "rawvideo", "-pix_fmt", "rgba", "-s", f"{OUT_W}x{OUT_H}", "-i", str(veil)] if has_veil else []
        still_fc = (f"[0:v]{still_chain}[s0];[s0][1:v]overlay=eof_action=repeat:format=auto,format=yuv420p[still]"
                    if has_veil else f"[0:v]{still_chain},format=yuv420p[still]")
        fc = f"{still_fc};[still]fps={meta['fps_str']}[v]"  # fps last (ffmpeg 7.1 colorlevels/pad bug)
        video_tmp = tmp / "answer.mkv"
        print(f"• picture: crop/pad/whiten like the hero, {N} frames ({length:.3f}s), no loop/cross-fade")
        ffmpeg("-ss", f"{t0}", "-i", str(clip), *veil_in, "-filter_complex", fc, "-map", "[v]",
               "-frames:v", str(N), "-an", "-c:v", "ffv1", str(video_tmp))

        # integrity check: a middle frame must match the same source frame rendered directly
        k = N // 2
        def _gray(a: list[str]) -> np.ndarray:
            raw = ffmpeg(*a, "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "gray", "-", capture=True)
            return np.frombuffer(raw, np.uint8).astype(np.int16)
        ref = _gray(["-ss", f"{t0 + k / fps}", "-i", str(clip), *veil_in, "-filter_complex", still_fc, "-map", "[still]"])
        got = _gray(["-i", str(video_tmp), "-vf", f"select=eq(n\\,{k})"])
        diff = float(np.abs(ref - got).mean()) if ref.size == got.size else 999.0
        print(f"• integrity check (frame {k}): mean |Δ| = {diff:.2f}")
        if diff > 6:
            sys.exit("✗ answer frames don't match the source render — ffmpeg filter issue; aborting")

        # sound: the same window, sample-accurate, with 10 ms edge ramps (no clicks at the cut)
        n = int(round(length * SR))
        s0 = int(round(t0 * SR))
        a = audio[s0:s0 + n].copy() if audio is not None else np.zeros((0, 2), np.float32)
        if a.shape[0] < n:
            a = np.vstack([a, np.zeros((n - a.shape[0], 2), np.float32)])
        r = min(n // 2, int(0.01 * SR))
        if r:
            ramp = np.linspace(0.0, 1.0, r, dtype=np.float32)[:, None]
            a[:r] *= ramp
            a[-r:] *= ramp[::-1]
        audio_tmp = tmp / "answer.wav"
        write_wav(audio_tmp, np.clip(a, -1.0, 1.0))

        dst = out / "hero" / "answers"
        dst.mkdir(parents=True, exist_ok=True)
        mp4, webm, poster = dst / f"{aid}.mp4", dst / f"{aid}.webm", dst / f"{aid}-poster.webp"
        print(f"• encoding {mp4.name} (H.264 CRF 24 slow, AAC 96k, faststart)")
        ffmpeg("-i", str(video_tmp), "-i", str(audio_tmp), "-map", "0:v", "-map", "1:a",
               "-c:v", "libx264", "-crf", "24", "-preset", "slow", "-pix_fmt", "yuv420p",
               "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart", "-shortest", str(mp4))
        print(f"• encoding {webm.name} (VP9 CRF 36, Opus 80k)")
        ffmpeg("-i", str(video_tmp), "-i", str(audio_tmp), "-map", "0:v", "-map", "1:a",
               "-c:v", "libvpx-vp9", "-crf", "36", "-b:v", "0", "-row-mt", "1", "-deadline", "good",
               "-pix_fmt", "yuv420p", "-c:a", "libopus", "-b:a", "80k", "-shortest", str(webm))
        make_poster(mp4, poster)
        for f in (mp4, webm, poster):
            print(f"✓ {f}  ({f.stat().st_size / 1024:.0f} KB)")
        print(f'\nNext: add "{aid}" to ANSWER_CLIP_IDS in src/lib/data.ts')
    finally:
        if args.keep_tmp:
            print(f"(kept {tmp})")
        else:
            shutil.rmtree(tmp, ignore_errors=True)


def _box(a: np.ndarray, r: int) -> np.ndarray:
    """Separable box blur (radius r) on a 2-D float array, edge-padded."""
    for ax in (0, 1):
        pad = [(0, 0), (0, 0)]
        pad[ax] = (r + 1, r)
        c = np.cumsum(np.pad(a, pad, mode="edge"), axis=ax)
        a = (np.take(c, range(2 * r + 1, c.shape[ax]), axis=ax) - np.take(c, range(0, c.shape[ax] - 2 * r - 1), axis=ax)) / (2 * r + 1)
    return a


def bg_key(src: Path, dst: Path, fps_str: str, mode: str, lo: float = 5.0, hi: float = 16.0) -> None:
    """Background-only clean-up of a whitened, cropped lossless clip (the character's tones are left alone):
    a backdrop plate is estimated — `plate`: per-pixel temporal median (for clips where he walks out of frame, e.g.
    the door walk; he must be off a given pixel > 50 % of the time), `luma`: one flat level from the frame corners
    (for clips where he barely moves) — and every pixel close to the plate (|Δluma| < lo…hi, soft ramp, blurred and
    grown so the character's edges keep their own tones) is flat-fielded by 255/plate → clean 255 white with the
    set's shading/grey cloud removed. Pixels that differ from the plate (the character and his moving shadow) keep
    the hero-level tones untouched."""
    W, H = OUT_W, OUT_H
    h2, w2 = H // 2, W // 2
    raw = ffmpeg("-i", str(src), "-vf", f"scale={w2}:{h2}:flags=area,format=gray", "-f", "rawvideo", "-", capture=True)
    small = np.frombuffer(raw, np.uint8).reshape(-1, h2, w2)
    n = len(small)
    free_w = None  # per frame, full-res column weights: 1 = he is nowhere near this column → pure white
    if mode == "plate":
        # his dark parts (hair, beard, trousers) mark the columns he occupies in each frame (± a body-width margin);
        # each backdrop column's plate is the median over the frames where he is elsewhere (no ghost of his
        # start/end pose, which fills > 50 % of the clip)
        dark = (small < 110)[:, int(h2 * 0.04):int(h2 * 0.97), :].sum(axis=1) >= 3       # n × w2
        m = max(4, w2 // 10)
        occ = dark.copy()
        for k in range(1, m + 1):  # grow sideways by m columns (no wrap-around at the frame edges)
            occ[:, k:] |= dark[:, :-k]
            occ[:, :-k] |= dark[:, k:]
        plate = np.median(small, axis=0).astype(np.float32)
        free = ~occ
        cols_ok = free.sum(axis=0) >= 3
        for x in np.nonzero(cols_ok)[0]:
            plate[:, x] = np.median(small[free[:, x], :, x], axis=0)
        free_w = np.repeat(free.astype(np.float32), 2, axis=1)[:, :W]
        print(f"  plate from his free frames for {100 * cols_ok.mean():.0f}% of columns "
              f"(median {np.median(free.sum(axis=0)):.0f} frames each)")
        plate = _box(plate, 6)
    else:
        k = max(8, w2 // 16)
        corners = np.concatenate([small[:, :k, :k].ravel(), small[:, :k, -k:].ravel()])
        plate = np.full((h2, w2), float(np.median(corners)), np.float32)
    plate = np.clip(plate, 40, 255)
    print(f"• background key ({mode}): {n} frames, plate luma {plate.min():.0f}–{plate.max():.0f} (median {np.median(plate):.0f})")
    full_plate = np.repeat(np.repeat(plate, 2, 0), 2, 1)[:H, :W]
    gain = (255.0 / full_plate)[..., None]
    dec = subprocess.Popen(["ffmpeg", "-hide_banner", "-loglevel", "error", "-i", str(src), "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
                           stdout=subprocess.PIPE)
    enc = subprocess.Popen(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24",
                            "-s", f"{W}x{H}", "-framerate", fps_str, "-i", "-", "-an", "-c:v", "ffv1", "-pix_fmt", "yuv444p", str(dst)],
                           stdin=subprocess.PIPE)
    bg_share = []
    for i in range(n):
        buf = dec.stdout.read(W * H * 3)
        if len(buf) < W * H * 3:
            break
        f = np.frombuffer(buf, np.uint8).reshape(H, W, 3).astype(np.float32)
        d = _box(np.abs(small[i].astype(np.float32) - plate), 2)
        a = np.clip((d - lo) / (hi - lo), 0, 1)                    # 1 = character / his shadow
        a = np.maximum.reduce([a, np.roll(a, 1, 0), np.roll(a, -1, 0), np.roll(a, 1, 1), np.roll(a, -1, 1)])  # grow 1 px (2 px full-res)
        a = _box(np.repeat(np.repeat(a, 2, 0), 2, 1)[:H, :W], 1)[..., None]
        bg_share.append(float((a < 0.02).mean()))
        bg = np.minimum(255, f * gain)
        if free_w is not None:
            # columns he's nowhere near in this frame: the set's light shifts as the door moves, so the plate can't
            # match exactly there — key them straight to white (feathered ~24 px so there's no visible seam)
            fwi = np.convolve(free_w[i], np.ones(49) / 49, mode="same")[None, :, None]
            a = a * (1 - fwi)
            bg = bg + (255 - bg) * fwi
        out = a * f + (1 - a) * bg
        enc.stdin.write(np.clip(out + 0.5, 0, 255).astype(np.uint8).tobytes())
    enc.stdin.close(); enc.wait(); dec.stdout.close(); dec.wait()
    if enc.returncode:
        sys.exit("✗ background key: encoder failed")
    print(f"  backdrop share keyed to white: {100 * np.mean(bg_share):.0f}% of the frame on average")


def build_idle(clip: Path, out: Path, args) -> None:
    """Silent idle loop (he waits, no lip movement) → public/hero/idle.{mp4,webm} + idle-poster.webp.
    Same crop/align/whiten as the hero; audio dropped; seamless picture loop with the same xfade as the hero."""
    if not clip.exists():
        sys.exit(f"✗ idle clip {clip} not found")
    fr = hero_framing(args.ref, args)
    meta = probe(clip)
    print(f"• idle: {clip} {meta['w']}×{meta['h']} @ {meta['fps']:.3f} fps, {meta['duration']:.2f}s (audio dropped)")
    D = loop_window(meta, args.start, args.duration)
    box, whiten, fr = match_framing(clip, meta, fr, args, [(args.start, args.start + D)])
    F = 0.0 if args.pingpong else args.fade
    if not args.pingpong and D < 4 * F:
        sys.exit(f"✗ usable clip ({D:.2f}s) is too short for a {F}s cross-fade")
    fps = meta["fps"]
    tmp = Path(tempfile.mkdtemp(prefix="idle-"))
    try:
        still_chain = f"{whiten},{box.filter()},scale={OUT_W}:{OUT_H}:flags=lanczos+accurate_rnd+full_chroma_int,setsar=1"
        veil = tmp / "veil.rgba"
        has_veil = write_edge_veil(veil, box, meta["w"], int(fr.get("feather", args.feather)))
        veil_in = ["-f", "rawvideo", "-pix_fmt", "rgba", "-s", f"{OUT_W}x{OUT_H}", "-i", str(veil)] if has_veil else []
        still_fc = (f"[0:v]{still_chain}[s0];[s0][1:v]overlay=eof_action=repeat:format=auto,format=yuv420p[still]"
                    if has_veil else f"[0:v]{still_chain},format=yuv420p[still]")
        # NB: keep `fps` LAST (ffmpeg 7.1 colorlevels/pad bug) — same xfade loop as the hero, picture only
        if args.pingpong:
            # forward then reversed (turn-point frames not repeated): no pose jump, slow breathing/tilts just ease back
            N = int(round(D * fps))
            fc = (f"{still_fc};[still]fps={meta['fps_str']},trim=end_frame={N},setpts=PTS-STARTPTS,split[a][b];"
                  f"[b]reverse,trim=start_frame=1:end_frame={N - 1},setpts=PTS-STARTPTS[r];"
                  f"[a][r]concat=n=2:v=1:a=0,fps={meta['fps_str']},format=yuv420p[v]")
            print(f"• ping-pong picture loop: {N} frames forward + {N - 2} reversed = {(2 * N - 2) / fps:.3f}s")
        else:
            fc = (f"{still_fc};[still]fps={meta['fps_str']},split[a][b];"
                  f"[a]trim=start={F}:end={D},setpts=PTS-STARTPTS,fps={meta['fps_str']}[body];"
                  f"[b]trim=start=0:end={F},setpts=PTS-STARTPTS,fps={meta['fps_str']}[head];"
                  f"[body][head]xfade=transition=fade:duration={F}:offset={D - 2 * F},format=yuv420p[v]")
            print(f"• seamless picture loop (xfade {F}s): {D - F:.3f}s")
        video_tmp = tmp / "idle.mkv"
        ffmpeg("-ss", f"{args.start}", "-t", f"{D}", "-i", str(clip), *veil_in, "-filter_complex", fc,
               "-map", "[v]", "-an", "-c:v", "ffv1", str(video_tmp))
        t_chk = round((D / 2) * fps) / fps
        def _gray(a: list[str]) -> np.ndarray:
            raw = ffmpeg(*a, "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "gray", "-", capture=True)
            return np.frombuffer(raw, np.uint8).astype(np.int16)
        ref = _gray(["-ss", f"{args.start + t_chk}", "-i", str(clip), *veil_in, "-filter_complex", still_fc, "-map", "[still]"])
        got = _gray(["-i", str(video_tmp), "-vf", f"select=eq(n\\,{int(round((t_chk - F) * fps))})"])
        diff = float(np.abs(ref - got).mean()) if ref.size == got.size else 999.0
        print(f"• integrity check @ {t_chk:.2f}s: mean |Δ| = {diff:.2f}")
        if diff > 6:
            sys.exit("✗ idle frames don't match the source render — ffmpeg filter issue; aborting")
        if args.bg_key:
            keyed = tmp / "idle-keyed.mkv"
            bg_key(video_tmp, keyed, meta["fps_str"], args.bg_key)
            video_tmp = keyed
        mp4, webm, poster = out / "hero" / "idle.mp4", out / "hero" / "idle.webm", out / "hero" / "idle-poster.webp"
        print("• encoding idle.mp4 (H.264 CRF 24 slow, no audio track, faststart)")
        ffmpeg("-i", str(video_tmp), "-map", "0:v", "-an", "-c:v", "libx264", "-crf", "24", "-preset", "slow",
               "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(mp4))
        print("• encoding idle.webm (VP9 CRF 36, no audio track)")
        ffmpeg("-i", str(video_tmp), "-map", "0:v", "-an", "-c:v", "libvpx-vp9", "-crf", "36", "-b:v", "0",
               "-row-mt", "1", "-deadline", "good", "-pix_fmt", "yuv420p", str(webm))
        make_poster(mp4, poster)
        for f in (mp4, webm):
            if probe(f)["audio"]:
                sys.exit(f"✗ {f} has an audio track — expected none")
        for f in (mp4, webm, poster):
            print(f"✓ {f}  ({f.stat().st_size / 1024:.0f} KB)")
        print("\nNext: set HERO_IDLE.enabled = true in src/lib/data.ts")
    finally:
        if args.keep_tmp:
            print(f"(kept {tmp})")
        else:
            shutil.rmtree(tmp, ignore_errors=True)


def build_idle_door(clip: Path, out: Path, args) -> None:
    """Silent idle variation (he steps through a soft white door and comes back) → public/hero/idle-door.{mp4,webm}
    + idle-door-poster.webp. Same crop/align/whiten as the hero, audio dropped, no loop cross-fade: trimmed so it
    starts and ends on the best-matching pair of frames (the same resting pose), so it cuts in/out of the idle loop."""
    if not clip.exists():
        sys.exit(f"✗ idle-door clip {clip} not found")
    fr = hero_framing(args.ref, args)
    meta = probe(clip)
    print(f"• idle-door: {clip} {meta['w']}×{meta['h']} @ {meta['fps']:.3f} fps, {meta['duration']:.2f}s (audio dropped)")
    fps = meta["fps"]
    # ── matching start/end frames (on uncropped grey thumbnails, so it doesn't depend on the crop): start within
    #    the first min(1.5 s, 20 %), end within the last min(2 s, 25 %); pick the pair with the lowest mean |Δ|
    sw = 160
    th = even(sw * meta["h"] / meta["w"])
    raw = ffmpeg("-i", str(clip), "-vf", f"scale={sw}:{th},format=gray", "-f", "rawvideo", "-", capture=True)
    frames = np.frombuffer(raw, np.uint8)
    frames = frames[: frames.size // (sw * th) * (sw * th)].reshape(-1, th, sw).astype(np.int16)
    n = len(frames)
    if n < fps * 3:
        sys.exit("✗ idle-door clip is too short (need ≥ 3 s)")
    s_max = max(1, min(int(1.5 * fps), int(n * 0.2)))
    e_min = n - max(1, min(int(2.0 * fps), int(n * 0.25)))
    best = (1e9, 0, n - 1)
    for i in range(0, s_max):
        for j in range(e_min, n):
            d = float(np.abs(frames[i] - frames[j]).mean())
            if d < best[0]:
                best = (d, i, j)
    diff, s0, e0 = best
    N = e0 - s0  # frames s0 … e0-1: frame e0 ≈ frame s0, so the cut back to the start pose is seamless
    print(f"• trim: frames {s0} → {e0} ({s0 / fps:.3f}s → {e0 / fps:.3f}s, {N / fps:.3f}s); start/end mean |Δ| = {diff:.2f} "
          f"(consecutive-frame motion ≈ {float(np.mean([np.abs(frames[k + 1] - frames[k]).mean() for k in range(0, n - 1, 5)])):.2f})")
    if diff > 6:
        print("  ! the start and end poses differ noticeably — the cut back to idle may show a small jump")
    # align on the first/last ~1 s only (he stands centred there); the walk-off may leave the box naturally
    t_s, t_e = s0 / fps, e0 / fps
    box, whiten, fr = match_framing(clip, meta, fr, args, [(t_s, min(t_s + 1.0, t_e)), (max(t_e - 1.0, t_s), t_e)])
    tmp = Path(tempfile.mkdtemp(prefix="idle-door-"))
    try:
        still_chain = f"{whiten},{box.filter()},scale={OUT_W}:{OUT_H}:flags=lanczos+accurate_rnd+full_chroma_int,setsar=1"
        veil = tmp / "veil.rgba"
        has_veil = write_edge_veil(veil, box, meta["w"], int(fr.get("feather", args.feather)))
        veil_in = ["-f", "rawvideo", "-pix_fmt", "rgba", "-s", f"{OUT_W}x{OUT_H}", "-i", str(veil)] if has_veil else []
        still_fc = (f"[0:v]{still_chain}[s0];[s0][1:v]overlay=eof_action=repeat:format=auto,format=yuv420p[still]"
                    if has_veil else f"[0:v]{still_chain},format=yuv420p[still]")
        fc = f"{still_fc};[still]fps={meta['fps_str']}[v]"  # fps last (ffmpeg 7.1 colorlevels/pad bug)
        video_tmp = tmp / "door.mkv"
        ffmpeg("-ss", f"{s0 / fps}", "-i", str(clip), *veil_in, "-filter_complex", fc, "-map", "[v]",
               "-frames:v", str(N), "-an", "-c:v", "ffv1", str(video_tmp))
        if args.bg_key:
            keyed = tmp / "door-keyed.mkv"
            bg_key(video_tmp, keyed, meta["fps_str"], args.bg_key)
            video_tmp = keyed
        mp4, webm, poster = out / "hero" / "idle-door.mp4", out / "hero" / "idle-door.webm", out / "hero" / "idle-door-poster.webp"
        print("• encoding idle-door.mp4 / .webm (no audio track)")
        ffmpeg("-i", str(video_tmp), "-map", "0:v", "-an", "-c:v", "libx264", "-crf", "24", "-preset", "slow",
               "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(mp4))
        ffmpeg("-i", str(video_tmp), "-map", "0:v", "-an", "-c:v", "libvpx-vp9", "-crf", "36", "-b:v", "0",
               "-row-mt", "1", "-deadline", "good", "-pix_fmt", "yuv420p", str(webm))
        make_poster(mp4, poster)
        for f in (mp4, webm):
            if probe(f)["audio"]:
                sys.exit(f"✗ {f} has an audio track — expected none")
        for f in (mp4, webm, poster):
            print(f"✓ {f}  ({f.stat().st_size / 1024:.0f} KB)")
        print("\nNext: set HERO_IDLE.door.enabled = true in src/lib/data.ts")
    finally:
        if args.keep_tmp:
            print(f"(kept {tmp})")
        else:
            shutil.rmtree(tmp, ignore_errors=True)


# ───────────────────────────── main ─────────────────────────────

def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("input", nargs="?", type=Path, help="intro video (mp4/mov)")
    ap.add_argument("--out", type=Path, default=Path("public"), help="public/ directory (default: public)")
    ap.add_argument("--start", type=float, default=0.0, help="clip start in seconds (default 0)")
    ap.add_argument("--duration", type=float, default=None,
                    help="window length before looping (default: whole clip if ≤ 15 s, else 10 s)")
    ap.add_argument("--fade", type=float, default=0.5, help="loop cross-fade in seconds (default 0.5)")
    ap.add_argument("--crop", help="W:H:X:Y crop in source pixels (skips auto-detect)")
    ap.add_argument("--margin", type=float, default=0.035, help="head/foot room as a fraction of body height (default 0.035)")
    ap.add_argument("--feather", type=int, default=72,
                    help="output px over which the picture fades into the white side padding (default 72)")
    ap.add_argument("--whiten-max", type=float, default=None,
                    help="colorlevels max for all channels (default: auto from the backdrop, capped at 0.98)")
    ap.add_argument("--pingpong", action="store_true",
                    help="--idle: loop forward then reversed instead of the xfade (for clips whose first/last poses differ, e.g. a slow head tilt)")
    ap.add_argument("--bg-key", choices=["plate", "luma"], default=None,
                    help="--idle/--idle-door: background-only clean-up after the hero whiten (character tones untouched): "
                         "plate = temporal-median backdrop (he walks out of frame, e.g. the door walk), "
                         "luma = flat backdrop level from the corners (he barely moves, e.g. a calm idle)")
    ap.add_argument("--og-time", type=float, default=None, help="frame time (s) for og.jpg (default: sharpest frame)")
    ap.add_argument("--photo", type=Path, help="optional photo for portrait-bust.webp")
    ap.add_argument("--photo-crop", help="W:H:X:Y head-to-shirt crop of --photo (4:5 recommended; may extend past the edges, e.g. negative Y for headroom — padded with a matched backdrop)")
    ap.add_argument("--portrait-only", action="store_true", help="only build portrait-bust.webp from --photo (hero video and og.jpg untouched)")
    ap.add_argument("--poster-only", action="store_true",
                    help="only (re)build hero/hero-poster.webp from the existing hero/hero.mp4")
    ap.add_argument("--answer", metavar="ID",
                    help="build an 'Ask me' answer clip from INPUT → public/hero/answers/ID.{mp4,webm} + ID-poster.webp "
                         f"(chip ids: {', '.join(ANSWER_IDS)})")
    ap.add_argument("--idle", action="store_true",
                    help="build the silent idle loop from INPUT → public/hero/idle.{mp4,webm} + idle-poster.webp "
                         "(hero crop/align/whiten, audio stripped, seamless xfade loop; uses --start/--duration/--fade)")
    ap.add_argument("--idle-door", action="store_true",
                    help="build the silent idle variation (door walk) from INPUT → public/hero/idle-door.{mp4,webm} + "
                         "idle-door-poster.webp (hero crop/align/whiten, no audio, trimmed to matching start/end frames)")
    ap.add_argument("--tail", type=float, default=None,
                    help="--answer: seconds kept after the speech ends (default = --lead); raise it to keep the silent "
                         "part where he settles back into the hands-in-pockets pose")
    ap.add_argument("--speech-db", type=float, default=-45.0,
                    help="--answer: speech threshold in dB below the peak (default -45; raise to e.g. -30 if breaths "
                         "or room noise before/after the words keep the silence trim from working)")
    ap.add_argument("--lead", type=float, default=0.2, help="--answer: silence kept before/after speech, seconds (default 0.2)")
    ap.add_argument("--ref", type=Path, default=Path("inputs/intro.mp4"),
                    help="--answer: intro video to recompute the hero framing from if scripts/hero-framing.json is missing")
    ap.add_argument("--no-align", action="store_true",
                    help="--answer: use the hero crop box as is, without matching the person's size/position to the loop")
    ap.add_argument("--keep-tmp", action="store_true")
    args = ap.parse_args()

    for tool in ("ffmpeg", "ffprobe"):
        if not shutil.which(tool):
            sys.exit(f"✗ {tool} not found on PATH")

    out = args.out
    (out / "hero").mkdir(parents=True, exist_ok=True)

    if args.poster_only:
        mp4 = out / "hero" / "hero.mp4"
        if not mp4.exists():
            sys.exit(f"✗ {mp4} not found; run the full pipeline first")
        make_poster(mp4, out / "hero" / "hero-poster.webp")
        print(f"✓ {out / 'hero' / 'hero-poster.webp'}")
        return

    if args.answer:
        if not args.input:
            sys.exit("✗ --answer needs the clip path, e.g. --answer who inputs/answers/who.mp4")
        build_answer(args.input, args.answer, out, args)
        return

    if args.idle_door:
        if not args.input:
            sys.exit("✗ --idle-door needs the clip path, e.g. --idle-door inputs/idle-door.mp4")
        build_idle_door(args.input, out, args)
        return

    if args.idle:
        if not args.input:
            sys.exit("✗ --idle needs the clip path, e.g. --idle inputs/idle.mp4")
        build_idle(args.input, out, args)
        return

    if args.portrait_only:
        if not args.photo:
            sys.exit("✗ --portrait-only needs --photo")
        # og.jpg is left alone: it comes from the intro video (full run), not the ID photo
        make_portrait_from_photo(args.photo, args.photo_crop, out / "portrait-bust.webp")
        print(f"✓ {out / 'portrait-bust.webp'}")
        return

    if not args.input or not args.input.exists():
        sys.exit("✗ pass the intro video path, e.g. inputs/intro.mp4")
    src = args.input
    meta = probe(src)
    print(f"• source {meta['w']}×{meta['h']} @ {meta['fps']:.3f} fps, {meta['duration']:.2f}s, audio={meta['audio']}")

    # snap D (down) and F to whole frames so picture and sound have identical length
    D = loop_window(meta, args.start, args.duration)
    F = args.fade
    if D < 4 * F:
        sys.exit(f"✗ usable clip ({D:.2f}s) is too short for a {F}s cross-fade")
    fps = meta["fps"]
    F = round(F * fps) / fps

    # ── speech-aware loop point: the cross-fade windows [0,F] and [D−F,D] must be silence
    audio = read_audio(src, args.start, D) if meta["audio"] else None
    if audio is not None:
        sb = speech_bounds(audio)
        if sb:
            on, off = sb
            print(f"• speech {on:.3f}s → {off:.3f}s (lead silence {on:.2f}s, tail silence {D - off:.2f}s)")
            room = min(on, D - off) - 0.02
            if room < F:
                newF = max(1 / fps, int(room * fps) / fps)
                print(f"  ! {F:.3f}s fade would overlap speech — shortening fade to {newF:.3f}s")
                F = newF
            if off > D - F:
                sys.exit("✗ speech runs into the loop point — pass a longer --duration")
            print(f"  ✓ loop point in silence: fade windows [0, {F:.3f}] and [{D - F:.3f}, {D:.3f}] are speech-free")

    if args.crop:
        cw, ch, cx, cy = (int(v) for v in args.crop.split(":"))
        box = Box(cw, ch, cx, cy, meta["w"], meta["h"])
    else:
        box, det = detect_crop(src, meta, args.start, D, args.margin)
        print(f"• backdrop ≈ {det['bg']:.0f}/255, person bbox {det['person']}")
    crop = box.filter()
    scale_k = OUT_W / box.w
    print(f"• crop {box}  → scale ×{scale_k:.3f} to {OUT_W}×{OUT_H}")
    if scale_k > 1.0:
        print("  ! source crop is smaller than the output — this upscales; consider a higher-res source")

    if args.whiten_max:
        lv = (args.whiten_max,) * 3
    else:
        bl = backdrop_levels(src, args.start + D / 2, meta)
        lv = tuple(min(0.98, max(0.80, c - 0.01)) for c in bl)
        print(f"• backdrop RGB ≈ {tuple(round(c * 255) for c in bl)} → colorlevels max {tuple(round(c, 3) for c in lv)}")
    whiten = f"colorlevels=rimax={lv[0]:.3f}:gimax={lv[1]:.3f}:bimax={lv[2]:.3f}"
    save_framing(src, meta, box, lv, args.feather)  # answer clips reuse exactly this box + levels

    tmp = Path(tempfile.mkdtemp(prefix="hero-"))
    try:
        # ── picture: crop → scale → whiten → seamless xfade loop (lossless intermediate)
        # NB: keep `fps` LAST — on ffmpeg 7.1, fps → colorlevels → pad corrupts frames (black blocks).
        still_chain = f"{whiten},{crop},scale={OUT_W}:{OUT_H}:flags=lanczos+accurate_rnd+full_chroma_int,setsar=1"
        veil = tmp / "veil.rgba"
        has_veil = write_edge_veil(veil, box, meta["w"], args.feather)
        veil_in = ["-f", "rawvideo", "-pix_fmt", "rgba", "-s", f"{OUT_W}x{OUT_H}", "-i", str(veil)] if has_veil else []
        # [still] = whitened, cropped, scaled picture (+ edge veil when padded)
        still_fc = (f"[0:v]{still_chain}[s0];[s0][1:v]overlay=eof_action=repeat:format=auto,format=yuv420p[still]"
                    if has_veil else f"[0:v]{still_chain},format=yuv420p[still]")
        if has_veil:
            print(f"• feathering picture into the white padding over {args.feather}px")
        fc = (f"{still_fc};[still]fps={meta['fps_str']},split[a][b];"
              f"[a]trim=start={F}:end={D},setpts=PTS-STARTPTS,fps={meta['fps_str']}[body];"
              f"[b]trim=start=0:end={F},setpts=PTS-STARTPTS,fps={meta['fps_str']}[head];"
              f"[body][head]xfade=transition=fade:duration={F}:offset={D - 2 * F},format=yuv420p[v]")
        video_tmp = tmp / "loop.mkv"
        print("• building seamless picture loop (xfade)")
        ffmpeg("-ss", f"{args.start}", "-t", f"{D}", "-i", str(src), *veil_in, "-filter_complex", fc,
               "-map", "[v]", "-an", "-c:v", "ffv1", str(video_tmp))

        # integrity check: a body frame of the loop must match the same source frame rendered directly
        t_chk = round((D / 2) * fps) / fps
        def _gray(args: list[str]) -> np.ndarray:
            raw = ffmpeg(*args, "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "gray", "-", capture=True)
            return np.frombuffer(raw, np.uint8).astype(np.int16)
        ref = _gray(["-ss", f"{args.start + t_chk}", "-i", str(src), *veil_in, "-filter_complex", still_fc, "-map", "[still]"])
        got = _gray(["-i", str(video_tmp), "-vf", f"select=eq(n\\,{int(round((t_chk - F) * fps))})"])
        diff = float(np.abs(ref - got).mean()) if ref.size == got.size else 999.0
        print(f"• integrity check @ {t_chk:.2f}s: mean |Δ| = {diff:.2f}")
        if diff > 6:
            sys.exit("✗ loop frames don't match the source render — ffmpeg filter issue; aborting")

        # ── sound: sample-accurate equal-power crossfade in numpy
        loop_len = D - F
        audio_tmp = tmp / "loop.wav"
        n_total = int(round(D * SR))
        if meta["audio"]:
            print("• building seamless audio loop (numpy)")
            a = audio
        else:
            print("• no audio stream — writing silence")
            a = np.zeros((n_total, 2), np.float32)
        looped = loop_audio(a, F, n_total)
        write_wav(audio_tmp, looped)
        print(f"• loop length: video {loop_len:.3f}s, audio {looped.shape[0] / SR:.3f}s")

        # ── exports
        mp4, webm = out / "hero" / "hero.mp4", out / "hero" / "hero.webm"
        print("• encoding hero.mp4 (H.264 CRF 24 slow, AAC 96k, faststart)")
        ffmpeg("-i", str(video_tmp), "-i", str(audio_tmp), "-map", "0:v", "-map", "1:a",
               "-c:v", "libx264", "-crf", "24", "-preset", "slow", "-pix_fmt", "yuv420p",
               "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart", "-shortest", str(mp4))
        print("• encoding hero.webm (VP9 CRF 36, Opus 80k)")
        ffmpeg("-i", str(video_tmp), "-i", str(audio_tmp), "-map", "0:v", "-map", "1:a",
               "-c:v", "libvpx-vp9", "-crf", "36", "-b:v", "0", "-row-mt", "1", "-deadline", "good",
               "-pix_fmt", "yuv420p", "-c:a", "libopus", "-b:a", "80k", "-shortest", str(webm))

        # ── stills
        poster = out / "hero" / "hero-poster.webp"
        print("• hero-poster.webp from frame 0 of hero.mp4")
        make_poster(mp4, poster)
        portrait = out / "portrait-bust.webp"
        if args.photo:
            print(f"• portrait from photo {args.photo}")
            make_portrait_from_photo(args.photo, args.photo_crop, portrait)
        else:
            t = clearest_frame_time(src, crop, args.start, D)
            print(f"• portrait from clearest frame @ {t:.2f}s")
            make_portrait_from_video(src, crop, t, portrait, whiten)
        t_og = args.og_time if args.og_time is not None else clearest_frame_time(src, crop, args.start, D)
        print(f"• og.jpg from frame @ {t_og:.2f}s")
        og_still = tmp / "og-still.png"
        ffmpeg("-ss", f"{t_og}", "-i", str(src), *veil_in, "-filter_complex", still_fc, "-map", "[still]",
               "-frames:v", "1", "-update", "1", str(og_still))
        make_og(["-i", str(og_still)], out / "og.jpg", "null")

        for p in (mp4, webm, poster, portrait, out / "og.jpg"):
            print(f"✓ {p}  ({p.stat().st_size / 1024:.0f} KB)")
        print("\nNext: set HERO.enabled = true in src/lib/data.ts")
    finally:
        if args.keep_tmp:
            print(f"(kept {tmp})")
        else:
            shutil.rmtree(tmp, ignore_errors=True)


if __name__ == "__main__":
    main()

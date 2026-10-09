#!/usr/bin/env python3
"""
build-hero-assets.py — turn the talking intro video into seamless hero assets.

Outputs (default --out public/):
  public/hero/hero.mp4        H.264 yuv420p, CRF 24, preset slow, AAC 96k, +faststart
  public/hero/hero.webm       VP9 CRF 36, Opus 80k
  public/portrait-bust.webp   480×600 head-to-shirt crop (from --photo, else clearest frame)
  public/og.jpg               1200×630 social card

Pipeline
  1. Crop tightly around the person (auto-detected against the light backdrop,
     or --crop W:H:X:Y), keep them centred, scale to 768 px wide (768×960).
  2. Whiten the backdrop: colorlevels=rimax=0.98:gimax=0.98:bimax=0.98.
  3. Seamless loop from the first ~10 s: the last --fade seconds of picture are
     cross-faded (ffmpeg xfade) into the first --fade seconds; the audio gets
     the identical cross-fade sample-accurately in numpy (no acrossfade).
     Nothing is stretched or retimed, so lip-sync is preserved.
  4. Export mp4 + webm.  5. Portrait still + OG image.

Requirements: ffmpeg + ffprobe on PATH, Python 3.9+, numpy.

Examples
  python3 scripts/build-hero-assets.py inputs/intro.mp4
  python3 scripts/build-hero-assets.py inputs/intro.mp4 --crop 800:1000:560:80
  python3 scripts/build-hero-assets.py inputs/intro.mp4 --photo inputs/photo.jpg --photo-crop 2092:2615:490:572
  python3 scripts/build-hero-assets.py --portrait-only --photo inputs/photo.jpg --photo-crop 2092:2615:490:572
"""
from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
import tempfile
import wave
from pathlib import Path

import numpy as np

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

def detect_crop(src: Path, meta: dict, start: float, dur: float) -> tuple[int, int, int, int]:
    """Bounding box of everything darker than the backdrop across sampled frames,
    expanded to a 4:5 box centred on the person. Returns (w, h, x, y) in source px."""
    sw = 320
    frames = grab_gray_frames(src, start, dur, 24, sw, meta["w"], meta["h"])
    if frames.size == 0:
        sys.exit("✗ could not read frames for crop detection — pass --crop W:H:X:Y")
    bg = np.percentile(frames, 90)  # the backdrop is the brightest large area
    mask = (frames < bg - 28).any(axis=0)
    # clean speckle: keep rows/cols with a meaningful amount of foreground
    rows = np.where(mask.sum(1) > max(2, mask.shape[1] * 0.01))[0]
    cols = np.where(mask.sum(0) > max(2, mask.shape[0] * 0.01))[0]
    if rows.size == 0 or cols.size == 0:
        sys.exit("✗ could not find the person — pass --crop W:H:X:Y")
    k = meta["w"] / sw
    y0, y1 = rows[0] * k, (rows[-1] + 1) * k
    x0, x1 = cols[0] * k, (cols[-1] + 1) * k
    # centre horizontally on the mass of the person (robust to hand gestures)
    col_mass = mask.sum(0).astype(float)
    cx = (np.arange(sw) * col_mass).sum() / col_mass.sum() * k
    pad = 0.04 * (y1 - y0)
    y0, y1 = max(0, y0 - pad), min(meta["h"], y1 + pad)
    h = y1 - y0
    w = max(h * OUT_W / OUT_H, (x1 - x0) + 2 * pad)
    h = w * OUT_H / OUT_W
    if h > meta["h"]:
        h = meta["h"]
        w = h * OUT_W / OUT_H
    if w > meta["w"]:
        w = meta["w"]
        h = w * OUT_H / OUT_W
    cy = (y0 + y1) / 2
    x = min(max(0, cx - w / 2), meta["w"] - w)
    y = min(max(0, cy - h / 2), meta["h"] - h)
    return even(w), even(h), even(x), even(y)


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


def make_portrait_from_photo(photo: Path, crop: str | None, out: Path) -> None:
    if crop:
        w, h, x, y = crop.split(":")
        vf = f"crop={w}:{h}:{x}:{y},scale=480:600:flags=lanczos"
    else:  # default: 4:5 box from the top-centre (head-to-shirt for a typical head-and-shoulders photo)
        vf = "crop='min(iw,ih*4/5)':'min(iw,ih*4/5)*5/4':'(iw-min(iw,ih*4/5))/2':0,scale=480:600:flags=lanczos"
    ffmpeg("-i", str(photo), "-frames:v", "1", "-vf", vf, "-c:v", "libwebp", "-quality", "86", str(out))


def make_portrait_from_video(src: Path, crop: str, t: float, out: Path) -> None:
    # head-to-shirt: top ~46% of the 768×960 frame, 4:5, centred
    vf = (f"{crop},scale={OUT_W}:{OUT_H},{WHITEN},"
          f"crop=354:442:{(OUT_W - 354) // 2}:24,scale=480:600:flags=lanczos")
    ffmpeg("-ss", f"{t}", "-i", str(src), "-frames:v", "1", "-vf", vf, "-c:v", "libwebp", "-quality", "86", str(out))


def make_og(still_src: list[str], out: Path, vf_chain: str) -> None:
    """1200×630: white card with the person centred-right (still is already white-backed)."""
    ffmpeg(*still_src, "-frames:v", "1",
           "-filter_complex",
           f"[0:v]{vf_chain},scale=-2:630[p];color=c=white:s=1200x630[bg];"
           f"[bg][p]overlay=x=(W-w)/2:y=0:format=auto,format=yuvj420p",
           "-q:v", "3", str(out))


# ───────────────────────────── main ─────────────────────────────

def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("input", nargs="?", type=Path, help="intro video (mp4/mov)")
    ap.add_argument("--out", type=Path, default=Path("public"), help="public/ directory (default: public)")
    ap.add_argument("--start", type=float, default=0.0, help="clip start in seconds (default 0)")
    ap.add_argument("--duration", type=float, default=10.0, help="window length before looping (default 10)")
    ap.add_argument("--fade", type=float, default=0.5, help="loop cross-fade in seconds (default 0.5)")
    ap.add_argument("--crop", help="W:H:X:Y crop in source pixels (skips auto-detect)")
    ap.add_argument("--photo", type=Path, help="optional photo for portrait-bust.webp")
    ap.add_argument("--photo-crop", help="W:H:X:Y head-to-shirt crop of --photo (4:5 recommended)")
    ap.add_argument("--portrait-only", action="store_true", help="only build portrait-bust.webp (+ og.jpg) from --photo")
    ap.add_argument("--keep-tmp", action="store_true")
    args = ap.parse_args()

    for tool in ("ffmpeg", "ffprobe"):
        if not shutil.which(tool):
            sys.exit(f"✗ {tool} not found on PATH")

    out = args.out
    (out / "hero").mkdir(parents=True, exist_ok=True)

    if args.portrait_only:
        if not args.photo:
            sys.exit("✗ --portrait-only needs --photo")
        make_portrait_from_photo(args.photo, args.photo_crop, out / "portrait-bust.webp")
        make_og(["-i", str(out / "portrait-bust.webp")], out / "og.jpg", "null")
        print(f"✓ {out / 'portrait-bust.webp'}\n✓ {out / 'og.jpg'}")
        return

    if not args.input or not args.input.exists():
        sys.exit("✗ pass the intro video path, e.g. inputs/intro.mp4")
    src = args.input
    meta = probe(src)
    print(f"• source {meta['w']}×{meta['h']} @ {meta['fps']:.3f} fps, {meta['duration']:.2f}s, audio={meta['audio']}")

    D = min(args.duration, max(0.0, meta["duration"] - args.start))
    F = args.fade
    if D < 4 * F:
        sys.exit(f"✗ usable clip ({D:.2f}s) is too short for a {F}s cross-fade")
    # snap D to whole frames so picture and sound have identical length
    fps = meta["fps"]
    D = int(D * fps) / fps
    F = round(F * fps) / fps

    if args.crop:
        cw, ch, cx, cy = (int(v) for v in args.crop.split(":"))
    else:
        cw, ch, cx, cy = detect_crop(src, meta, args.start, D)
    crop = f"crop={cw}:{ch}:{cx}:{cy}"
    print(f"• crop {crop}  → scale {OUT_W}×{OUT_H}")

    tmp = Path(tempfile.mkdtemp(prefix="hero-"))
    try:
        # ── picture: crop → scale → whiten → seamless xfade loop (lossless intermediate)
        base = f"fps={meta['fps_str']},{crop},scale={OUT_W}:{OUT_H}:flags=lanczos,setsar=1,{WHITEN}"
        fc = (f"[0:v]{base},split[a][b];"
              f"[a]trim=start={F}:end={D},setpts=PTS-STARTPTS,fps={meta['fps_str']}[body];"
              f"[b]trim=start=0:end={F},setpts=PTS-STARTPTS,fps={meta['fps_str']}[head];"
              f"[body][head]xfade=transition=fade:duration={F}:offset={D - 2 * F},format=yuv420p[v]")
        video_tmp = tmp / "loop.mkv"
        print("• building seamless picture loop (xfade)")
        ffmpeg("-ss", f"{args.start}", "-t", f"{D}", "-i", str(src), "-filter_complex", fc,
               "-map", "[v]", "-an", "-c:v", "ffv1", str(video_tmp))

        # ── sound: sample-accurate equal-power crossfade in numpy
        loop_len = D - F
        audio_tmp = tmp / "loop.wav"
        n_total = int(round(D * SR))
        if meta["audio"]:
            print("• building seamless audio loop (numpy)")
            a = read_audio(src, args.start, D)
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
        portrait = out / "portrait-bust.webp"
        if args.photo:
            print(f"• portrait from photo {args.photo}")
            make_portrait_from_photo(args.photo, args.photo_crop, portrait)
        else:
            t = clearest_frame_time(src, crop, args.start, D)
            print(f"• portrait from clearest frame @ {t:.2f}s")
            make_portrait_from_video(src, crop, t, portrait)
        t_og = clearest_frame_time(src, crop, args.start, D)
        make_og(["-ss", f"{t_og}", "-i", str(src)], out / "og.jpg",
                f"{crop},scale={OUT_W}:{OUT_H},{WHITEN}")

        for p in (mp4, webm, portrait, out / "og.jpg"):
            print(f"✓ {p}  ({p.stat().st_size / 1024:.0f} KB)")
        print("\nNext: set HERO.enabled = true in src/lib/data.ts")
    finally:
        if args.keep_tmp:
            print(f"(kept {tmp})")
        else:
            shutil.rmtree(tmp, ignore_errors=True)


if __name__ == "__main__":
    main()

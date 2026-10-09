# Uday Charan Gopi — talking-video portfolio

A light, single-page portfolio: a looping talking intro video in the hero, then About (lanyard ID card), Skills (periodic table), Work, Certifications, Experience (timeline), Achievements and Contact. White, black and grays only. Lenis is the only animation dependency: no GSAP, no WebGL.

**Stack:** Next.js 15 (App Router, static export) · React 19 · TypeScript · Tailwind CSS 4 · Lenis · self-hosted fonts via `next/font/local`.

## Run

```bash
npm install
npm run dev          # http://localhost:3000
npm run build        # static export → out/
npx serve out        # preview the exported site
```

Other scripts: `npm run lint`, `npm run typecheck`, `npm run hero` (alias for the video pipeline).

## Content: `src/lib/data.ts`

All text lives in **one file**, and every value must come from the résumé (including the hyperlinks embedded in it). Nothing is invented. The exports are `PROFILE`, `NAV`, `SKILL_GROUPS`, `EXPERIENCE`, `EDUCATION`, `PROJECTS`, `CERTIFICATIONS`, `ACHIEVEMENTS`, plus `HERO`, `QUICK_FACTS`, `ID_CARD` and `SUMMARY_POINTS`. Components only read from this file.

**If a section has no data, it renders nothing and its nav link is dropped** (see `HAS` / `visibleNav()`). Section tags (`01 — About` …) are numbered over the visible sections only.

Raw inputs go in `inputs/` (git-ignored): `resume.pdf`, `intro.mp4`, photos. The public résumé download is `public/resume.pdf`.

## Sections

| # | Section | Component | Data | Shown when |
|---|---------|-----------|------|------------|
| — | Hero | `hero/Hero.tsx` | `PROFILE.role`, `HERO` | always (video only when `HERO.enabled`) |
| 01 | About: playable lanyard ID card (drag/pull, tap to flip; physics in `lib/lanyard-sim.ts`) | `sections/About.tsx` | `PROFILE`, `QUICK_FACTS`, `ID_CARD` | `PROFILE.resumeSummary` set |
| 02 | Skills: periodic table | `sections/Skills.tsx` | `SKILL_GROUPS` | any skills |
| — | Work: accordion gallery | `sections/Work.tsx` | `PROJECTS` | any projects |
| — | Certifications: ink-flood index | `sections/Certifications.tsx` | `CERTIFICATIONS` | any certifications |
| 03 | Experience: timeline | `sections/Experience.tsx` | `EXPERIENCE` + `EDUCATION` | any entries |
| — | Achievements: pinned gallery | `sections/Achievements.tsx` | `ACHIEVEMENTS` | any achievements |
| 04 | Contact + footer | `sections/Contact.tsx` | `PROFILE` | email/phone/GitHub/LinkedIn |

(The numbering shows the current résumé. The résumé has no projects, certifications, education or achievements, so those sections are hidden.)

Shared pieces: `Navigation.tsx` (initials mark, glass pill, sliding active indicator, progress bar, mobile clip-path overlay), `ui/RevealObserver.tsx` (`.rv` / `.rv-mask` → `.is-in`), `ui/SectionHeading.tsx`, `ui/Pill.tsx`, `ui/TechLogo.tsx` (`BRAND` + `CONCEPT` maps, `isBrand()`), `ui/MockUI.tsx` (grayscale "Illustrative UI" for Work panels), `lib/hooks.ts` (`useInView`, `useScrollProgress`, `prefersReducedMotion`), `lib/scroll.tsx` (Lenis + `scrollToTarget`).

The design tokens (`--paper`, `--ink`, `--mute`, `--ease`, `--gutter` …) live in `src/app/globals.css`. Each component keeps its CSS in its own `<style>` tag.

## Rebuild the hero video

Requirements: `ffmpeg`/`ffprobe` on PATH, Python 3.9+, `numpy`.

```bash
python3 scripts/build-hero-assets.py inputs/intro.mp4
# optional: explicit crop (W:H:X:Y in source px), different window, or a photo for the ID card
python3 scripts/build-hero-assets.py inputs/intro.mp4 --crop 800:1000:560:80 --duration 10 --fade 0.5 \
        --photo inputs/photo-id.jpg --photo-crop 766:958:0:-66
# just the <video poster> (frame 0 of the existing public/hero/hero.mp4)
python3 scripts/build-hero-assets.py --poster-only
# just the ID-card portrait from a photo (hero video and og.jpg untouched)
python3 scripts/build-hero-assets.py --portrait-only --photo inputs/photo-id.jpg --photo-crop 766:958:0:-66
# an "Ask me" answer clip (see clips/ANSWER-CLIPS.md)
python3 scripts/build-hero-assets.py --answer who inputs/answers/who.mp4
```

What it does:

1. **Crop:** detects the person against the light backdrop across 24 sampled frames, or uses `--crop`. It builds a **768:960 (4:5)** box around the whole body with `--margin` (default 3.5 %) of head and foot room, centred on the torso. Landscape and **portrait** sources both work. When the box is wider or taller than the source (a 720×1280 portrait clip needs 920×1150), the missing area is **padded with white** rather than cutting off the head or feet. The picture is then feathered into that padding (`--feather`, default 72 px) so no seam shows. Scaling uses Lanczos with accurate rounding, and the script warns if the source would need upscaling.
2. **Whiten:** `colorlevels`, with the max level set automatically from the measured backdrop (capped at 0.98; override with `--whiten-max`). An off-white wall becomes pure white, so `mix-blend-mode: multiply` melts it into the paper.
3. **Loop:** by default the whole clip (≤ 15 s) is used, with no stretching or retiming. The last 0.5 s of picture is cross-faded into the first 0.5 s with ffmpeg `xfade`, and the audio gets the identical cross-fade, sample-accurate and equal-power, in **numpy** (not `acrossfade`). The script finds where speech starts and ends and checks that both fade windows are silent, so the loop point never falls mid-word. If they aren't, it shortens the fade or stops with an error. A frame-integrity check guards against ffmpeg filter bugs. (On ffmpeg 7.1, `fps → colorlevels → pad` corrupts frames, so `fps` runs last.)
4. **Export:** `public/hero/hero.mp4` (H.264 yuv420p CRF 24 `-preset slow`, AAC 96k, `+faststart`) and `public/hero/hero.webm` (VP9 CRF 36, Opus 80k).
5. **Stills:** `public/hero/hero-poster.webp` is the `<video poster>`: frame 0 of the encoded `hero.mp4` (768×960, WebP q90, ~16 KB). The decoded yuv420p goes straight into libwebp (both BT.601 limited range), so it is the exact first frame that plays (no jump when playback starts) and its backdrop stays pure white for `mix-blend-mode: multiply`. Every full run regenerates it. `public/portrait-bust.webp` (480×600 head-to-shirt, from `--photo` or the sharpest frame; `--photo-crop` may reach past the photo's edges, e.g. a negative Y for headroom, and the overflow is filled with a backdrop matched to the photo's own edge colour and grain) and `public/og.jpg` (1200×630, from the sharpest frame or `--og-time`).

Current build: `python3 scripts/build-hero-assets.py inputs/intro.mp4`
(source 720×1280 @ 24 fps, 10 s, speech 0.59–9.37 s → a 9.5 s loop; `og.jpg` from the sharpest video frame).

Current ID-card portrait: `python3 scripts/build-hero-assets.py --portrait-only --photo inputs/photo-id.jpg --photo-crop 766:958:0:-66`
(766×1052 passport-style photo; full width, 66 px of matched backdrop added above the hair for headroom, cut at the collar).

Then set `HERO.enabled = true` in `src/lib/data.ts`.

**Video spec:** 8–15 s, landscape 16:9 or portrait 9:16 (≥ 720 px wide), the person standing centred and fully visible head-to-toe against a plain white or light wall, even lighting, a clear voice, and a brief pause at the start and end.

## Deploy (static)

Live: **https://uglucifer-ai.github.io/** (repo `UGLucifer-ai/UGLucifer-ai.github.io`, GitHub Pages user site served at the root, deployed by `.github/workflows/deploy.yml`).


`next.config.ts` sets `output: "export"`, so `npm run build` writes a static site to `out/`. For a GitHub Pages **project** site, build with `NEXT_PUBLIC_BASE_PATH=/<repo>`. `.github/workflows/deploy.yml` does this automatically on push to `main` once Pages is set to "GitHub Actions". After deploying, set `PROFILE.siteUrl` so the OG/Twitter image tags are emitted.

## Credits and licences

- **Fonts** (SIL Open Font License 1.1, from the official google/fonts repository, converted losslessly TTF → WOFF2): Inter Tight (The Inter Project Authors), Instrument Serif (The Instrument Serif Project Authors), JetBrains Mono (The JetBrains Mono Project Authors). The licences are in `src/fonts/OFL-*.txt`.
- **Brand logos:** [devicon](https://github.com/devicons/devicon) "original" SVGs, MIT licence (`public/logos/LICENSE-devicon.txt`), and [Simple Icons](https://github.com/simple-icons/simple-icons) paths coloured with each brand's official hex, CC0 1.0 (`public/logos/LICENSE-simple-icons.md`, `si-*.svg`). All trademarks belong to their owners; the logos are only used to identify the technologies.
- **Concept icons** (CI/CD, IaC, GitOps …) are custom line icons drawn in `TechLogo.tsx`.

## Lanyard physics (About ID card)

`src/lib/lanyard-sim.ts` is a dependency-free Verlet simulation run by `useLanyard` in `About.tsx`, loaded on demand with `import()` so it isn't in the first-load JS (the static card shows until it's ready) (fixed 1/120 s step with an accumulator, 12 constraint iterations, rendering interpolated between steps): anchor → fabric strap (6-link rope) → badge reel → coil cord (preloaded spring, 16–300 px; 220 px on mobile) → clip → card (rigid body, 4 corners + 6 sticks). Grab and pull with mouse or touch (pointer capture; `touch-action:none` only on the card); release and it snaps back and swings until it settles. A tap (< 6 px, < 250 ms) flips the card, a drag never does; Enter/Space flip, arrow keys swing it. The card is kept inside the section and viewport while dragging and never overflows horizontally. With `prefers-reduced-motion` it is a static card that only flips. Tune the constants in `PHYS`.

## "Ask me" (hero Q&A)

`src/components/hero/AskMe.tsx` + `src/lib/askme.ts`. A static, client-side Q&A beside the hero character (below it, behind an "Ask me" pill, under 960 px). Answers come **only** from the résumé and `src/lib/data.ts`, in first person; the knowledge base is lazy-loaded (`import()`) on first hover/focus/question, so it isn't in the first-load JS. Matching is a tiny hand-rolled scorer: normalised keywords and phrases with synonyms, plus light fuzzy matching (Damerau-Levenshtein ≤ 1–2, prefixes); a tool from the résumé's skills/experience gets a specific "yes, under …, used at …" answer, a known tool that is *not* on the résumé gets "that's not on my résumé, but ask me directly", and salary/availability/visa questions are always deferred to a direct conversation. Unknown questions get a polite fallback to Contact and LinkedIn.

Answers appear in a speech bubble (typed, or instant with reduced motion; full text in an `aria-live` region). There is no browser text-to-speech: typed questions get a text-only bubble and the intro video keeps playing. Tool → employer facts (`WHERE`) were generated from `inputs/resume.pdf`; regenerate them if the résumé changes.

### Answer clips (the character answers the chips himself)

Each suggested chip can have a pre-generated, lip-synced Google Flow clip, made like the intro. Scripts and full Flow prompts: **`clips/ANSWER-CLIPS.md`**; the captions are `CHIP_SCRIPTS` in `src/lib/askme.ts` (word for word the same).

- **Manifest:** `ANSWER_CLIP_IDS` in `src/lib/data.ts`. A listed chip plays `public/hero/answers/<id>.webm` (or `.mp4`, poster `<id>-poster.webp`); anything else, or a clip that fails to load, falls back to a text-only answer. Add clips one at a time.
- **Playback:** a second `<video>` stacked over the intro loop (same box, same `object-fit`, blend and mask) crossfades in (0.28 s, instant with reduced motion) once the clip is actually playing, so there's no flash; the loop pauses underneath. The chip click is the user gesture, so the clip plays **with sound** unless the visitor explicitly muted with the hero sound button (then it plays muted with captions). The caption is revealed in step with the clip's playback. Another chip mid-answer switches clips; a typed question stops the clip. Scrolling the hero out of view pauses the clip (like the loop) and it resumes when you come back. The hero sound button mutes/unmutes whichever is playing.
- **After a clip:** it crossfades back to the intro loop **from its first frame, muted** (the clips start and end in the same relaxed pose as the loop's first frame, and the intro shouldn't immediately start talking again). The sound button then shows ▶ and turns the intro's sound back on.
- **Build:** `python3 scripts/build-hero-assets.py --answer <id> inputs/answers/<id>.mp4` crops, pads and whitens exactly like the hero loop, using the box and levels saved in `scripts/hero-framing.json` (written by every full run; recomputed from `inputs/intro.mp4` if missing), so the character doesn't jump between the loop and an answer. If Flow framed the person at a different size or position (the first clip came out 6.7 % smaller and 18 px off-centre), it measures head-top, trouser hem and lower-body centre in both videos and scales/shifts the box so he lands exactly where he is in the loop (`--no-align` to disable). It trims leading/trailing silence to 0.2 s (`--lead`), applies no loop or cross-fade, and writes webm + mp4 + poster to `public/hero/answers/`. The clip must have the intro's aspect ratio (9:16).

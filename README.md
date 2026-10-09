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
| 01 | About: lanyard ID card | `sections/About.tsx` | `PROFILE`, `QUICK_FACTS`, `ID_CARD` | `PROFILE.resumeSummary` set |
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
        --photo inputs/photo-front-striped.jpg --photo-crop 2092:2615:490:572
# just the portrait + og.jpg from a photo
python3 scripts/build-hero-assets.py --portrait-only --photo inputs/photo-front-striped.jpg --photo-crop 2092:2615:490:572
```

What it does:

1. Auto-detects the person against the light backdrop (or uses `--crop`), crops to a 4:5 frame with the person centred, and scales to **768×960**.
2. Whitens the backdrop with `colorlevels=rimax=0.98:gimax=0.98:bimax=0.98`, so `mix-blend-mode: multiply` melts it into the paper.
3. Makes a seamless loop from the first ~10 s. The last 0.5 s of picture is cross-faded into the first 0.5 s with ffmpeg `xfade`. The audio gets the same cross-fade, sample-accurate and equal-power, in **numpy** (not `acrossfade`). Nothing is retimed, so lip-sync holds.
4. Exports `public/hero/hero.mp4` (H.264 yuv420p CRF 24 `-preset slow`, AAC 96k, `+faststart`) and `public/hero/hero.webm` (VP9 CRF 36, Opus 80k).
5. Writes `public/portrait-bust.webp` (480×600 head-to-shirt; from `--photo` or from the sharpest frame) and `public/og.jpg` (1200×630).

Then set `HERO.enabled = true` in `src/lib/data.ts`.

**Video spec:** 8–15 s, landscape 16:9 (1920×1080 ideal), the person standing centred and fully visible head-to-toe against a plain white or light wall, even lighting, a clear voice, and a brief pause at the start and end.

## Deploy (static)

`next.config.ts` sets `output: "export"`, so `npm run build` writes a static site to `out/`. For a GitHub Pages **project** site, build with `NEXT_PUBLIC_BASE_PATH=/<repo>`. `.github/workflows/deploy.yml` does this automatically on push to `main` once Pages is set to "GitHub Actions". After deploying, set `PROFILE.siteUrl` so the OG/Twitter image tags are emitted.

## Credits and licences

- **Fonts** (SIL Open Font License 1.1, from the official google/fonts repository, converted losslessly TTF → WOFF2): Inter Tight (The Inter Project Authors), Instrument Serif (The Instrument Serif Project Authors), JetBrains Mono (The JetBrains Mono Project Authors). The licences are in `src/fonts/OFL-*.txt`.
- **Brand logos:** [devicon](https://github.com/devicons/devicon) "original" SVGs, MIT licence (`public/logos/LICENSE-devicon.txt`), and [Simple Icons](https://github.com/simple-icons/simple-icons) paths coloured with each brand's official hex, CC0 1.0 (`public/logos/LICENSE-simple-icons.md`, `si-*.svg`). All trademarks belong to their owners; the logos are only used to identify the technologies.
- **Concept icons** (CI/CD, IaC, GitOps …) are custom line icons drawn in `TechLogo.tsx`.

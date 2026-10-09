# "Ask me" answer clips — Google Flow scripts and prompts

One lip-synced talking clip per suggested chip in the hero "Ask me" panel. When a chip is clicked and its clip exists, the character answers in his own voice (the clip crossfades over the intro loop, with the script below shown word for word as the caption). Chips without a clip answer text-only.

## How to make each clip

1. Open **Google Flow** and upload **`inputs/character.png`** as the reference image (the same image used for the intro video).
2. Use the **same model and the same aspect ratio as the intro: portrait 9:16** (the intro is 720×1280). A different aspect ratio can't be framed like the loop and the build script will refuse it.
3. Paste the full prompt for that clip (below) and generate. Check that the words match the script exactly, the voice matches the intro, there's no music or on-screen text, and he starts and ends in the hands-in-pockets pose.
4. Save the output as **`inputs/answers/<id>.mp4`** (for example `inputs/answers/who.mp4`). `inputs/` is never committed.
5. Build it (same crop box, padding and whitening as the hero loop; silence trimmed to 0.2 s; no loop or cross-fade):

   ```bash
   python3 scripts/build-hero-assets.py --answer <id> inputs/answers/<id>.mp4
   ```

   This writes `public/hero/answers/<id>.webm`, `<id>.mp4` and `<id>-poster.webp`.
6. Add `"<id>"` to `ANSWER_CLIP_IDS` in `src/lib/data.ts`, then commit and push. Clips can be added one at a time.

The captions come from `CHIP_SCRIPTS` in `src/lib/askme.ts`. If you change a script here, change it there too (and regenerate the clip).

Every script is first person, about 15–22 words (6–8 seconds spoken; Flow clips are about 8 s), and uses only facts from the résumé.

## Scripts at a glance

| id | chip | words | script |
|---|---|---|---|
| `who` | Who are you? | 22 | Hi, I'm Uday Charan Gopi, a Senior DevOps and Cloud Engineer. I automate and run secure infrastructure across AWS, Azure and GCP. |
| `whatdo` | What do you do? | 18 | I design and automate cloud and Kubernetes platforms: infrastructure as code with Terraform, CI/CD pipelines, and GitOps deployments. |
| `current` | Where do you work now? | 19 | Since May 2025, I've been a Senior DevOps Engineer at JPMC, building secure AWS and Azure infrastructure for banking. |
| `kubernetes` | Kubernetes experience? | 20 | I've run Kubernetes on EKS, AKS and OpenShift, handling upgrades, autoscaling and troubleshooting, and deploying with Helm and Argo CD. |
| `aws` | AWS experience? | 18 | I'm hands-on with AWS: EC2, EKS, VPC and IAM. At JPMC I build secure infrastructure for banking applications. |
| `cicd` | CI/CD experience? | 18 | I've built CI/CD pipelines with Jenkins, GitHub Actions and Azure DevOps, automating builds, testing, security scans and rollbacks. |
| `tools` | What tools do you use? | 20 | My core stack is AWS, Azure and GCP, plus Kubernetes, Docker, Helm, Argo CD, Terraform, Ansible, Jenkins, Prometheus and Grafana. |
| `contact` | How can I contact you? | 20 | Thanks for asking! You can reach me through the contact section or LinkedIn below. I'd love to hear from you. |
| `resume` | Download résumé | 17 | Sure, my résumé is downloading now. If it doesn't start, grab my résumé with the button below. |

## 1. `who` — "Who are you?"

**Save as:** `inputs/answers/who.mp4` · **Build:** `python3 scripts/build-hero-assets.py --answer who inputs/answers/who.mp4`

**Spoken script (22 words):**

> Hi, I'm Uday Charan Gopi, a Senior DevOps and Cloud Engineer. I automate and run secure infrastructure across AWS, Azure and GCP.

**Résumé source:** Résumé header ("Uday Charan · Sr. DevOps Engineer") + Professional Summary bullet 1 ("Senior DevOps and Cloud Engineer … architecting, automating, and operating secure, scalable enterprise infrastructure across AWS, Azure, GCP …").

**Google Flow prompt:**

```text
Use the uploaded reference image as the EXACT and ONLY visual reference for the
character.

Create a premium, high-quality 3D animated video of this exact character.

CHARACTER CONSISTENCY:
- The character must look exactly like the uploaded reference character.
- Preserve his exact face, facial structure, eyes, eyebrows, nose, lips, beard, hairstyle, hair color,
skin tone, body proportions, clothing, accessories, and overall appearance.
- Do not redesign the character.
- Do not change his outfit.
- Do not change his hairstyle.
- Do not change his facial features.
- Do not make him look like a different person.
- Do not add or remove accessories.
- Do not change his age or body shape.
- Maintain the same premium 3D Bitmoji/cartoon style as the reference image.

POSE AND POSITION:
- Start with the character standing exactly in the same relaxed pose shown in the uploaded reference
image: upright, hands in his pockets, facing the camera.
- End the video back in that exact same relaxed pose (hands in pockets, facing the camera), held still
for the last moment, so the clip blends seamlessly with his idle loop.
- Keep him standing upright in the exact CENTER of the frame.
- Keep his entire body visible from head to feet.
- Do not crop any part of his body.
- Do not change the basic pose.
- Only allow natural small movements required for speaking.

PERFORMANCE:
The character is answering a visitor's question directly to the camera.

EXACT SPOKEN SCRIPT:
"Hi, I'm Uday Charan Gopi, a Senior DevOps and Cloud Engineer. I automate and run secure infrastructure across AWS, Azure and GCP."

VOICE:
- Natural male voice, the same voice as in his intro video.
- Friendly, confident, professional tone.
- Natural speaking speed; the whole script takes about 6 to 8 seconds.
- Clear pronunciation. Say "AWS" as "A-W-S" and "GCP" as "G-C-P".
- Accurate lip synchronization.
- The complete script must be spoken continuously from beginning to end.
- Do not pause unnaturally.
- Do not restart the sentence.
- Do not change or improvise the words.
- A brief silent moment before he starts speaking and after he finishes.

NATURAL ANIMATION:
- Natural blinking.
- Natural eye movement.
- Subtle facial expressions.
- Small natural head movements.
- Natural hand gestures while speaking, returning to the hands-in-pockets pose at the end.
- Gentle body movement.
- No exaggerated gestures.
- No robotic movement.
- No sudden movements.
- No unnatural stretching or deformation.
- The character must remain standing in the center while speaking.

CAMERA:
- Fixed camera.
- Straight-on front-facing camera.
- Eye-level camera.
- No camera movement.
- No camera shake.
- No zoom in.
- No zoom out.
- No rotation.
- No camera cuts.
- No change in camera angle.
- Keep the exact same framing throughout the entire video.

BACKGROUND:
- Completely plain pure white background.
- Seamless white studio environment.
- No objects.
- No furniture.
- No scenery.
- No patterns.
- No gradients.
- No decorations.
- No additional characters.
- No text.
- No logos.

LIGHTING:
- Premium professional studio lighting.
- Soft even lighting.
- Natural soft shadow beneath the character.
- No dramatic lighting changes.
- No flickering.
- No changing exposure.
- No changing background brightness.

AUDIO:
- Voice only.
- NO background music.
- NO instrumental music.
- NO sound effects.
- NO ambient music.
- NO environmental sounds.
- NO footsteps.
- NO reverb.
- No additional voices.
- No background noise.

TEXT:
- NO subtitles.
- NO captions.
- NO titles.
- NO on-screen text.
- NO labels.
- NO speech bubbles.
- NO watermark.

QUALITY:
- High-quality cinematic 3D animation.
- Premium polished 3D rendering.
- Clean character edges.
- Consistent facial details.
- Stable character identity throughout the entire video.
- No face distortion.
- No face morphing.
- No disappearing face.
- No disappearing body parts.
- No extra fingers.
- No missing fingers.
- No duplicated limbs.
- No visual glitches.
- No flickering.
- No frame-to-frame character changes.

Create ONE continuous uninterrupted shot from beginning to end.

The character must remain in the center and continuously answer the question while making
subtle natural gestures.

Do not add anything that is not explicitly requested above.
```

## 2. `whatdo` — "What do you do?"

**Save as:** `inputs/answers/whatdo.mp4` · **Build:** `python3 scripts/build-hero-assets.py --answer whatdo inputs/answers/whatdo.mp4`

**Spoken script (18 words):**

> I design and automate cloud and Kubernetes platforms: infrastructure as code with Terraform, CI/CD pipelines, and GitOps deployments.

**Résumé source:** Professional Summary bullets 1–4: cloud + Kubernetes/GitOps (bullet 2), IaC with Terraform (bullet 3), enterprise CI/CD pipelines (bullet 4).

**Google Flow prompt:**

```text
Use the uploaded reference image as the EXACT and ONLY visual reference for the
character.

Create a premium, high-quality 3D animated video of this exact character.

CHARACTER CONSISTENCY:
- The character must look exactly like the uploaded reference character.
- Preserve his exact face, facial structure, eyes, eyebrows, nose, lips, beard, hairstyle, hair color,
skin tone, body proportions, clothing, accessories, and overall appearance.
- Do not redesign the character.
- Do not change his outfit.
- Do not change his hairstyle.
- Do not change his facial features.
- Do not make him look like a different person.
- Do not add or remove accessories.
- Do not change his age or body shape.
- Maintain the same premium 3D Bitmoji/cartoon style as the reference image.

POSE AND POSITION:
- Start with the character standing exactly in the same relaxed pose shown in the uploaded reference
image: upright, hands in his pockets, facing the camera.
- End the video back in that exact same relaxed pose (hands in pockets, facing the camera), held still
for the last moment, so the clip blends seamlessly with his idle loop.
- Keep him standing upright in the exact CENTER of the frame.
- Keep his entire body visible from head to feet.
- Do not crop any part of his body.
- Do not change the basic pose.
- Only allow natural small movements required for speaking.

PERFORMANCE:
The character is answering a visitor's question directly to the camera.

EXACT SPOKEN SCRIPT:
"I design and automate cloud and Kubernetes platforms: infrastructure as code with Terraform, CI/CD pipelines, and GitOps deployments."

VOICE:
- Natural male voice, the same voice as in his intro video.
- Friendly, confident, professional tone.
- Natural speaking speed; the whole script takes about 6 to 8 seconds.
- Clear pronunciation. Say "CI/CD" as "C-I-C-D".
- Accurate lip synchronization.
- The complete script must be spoken continuously from beginning to end.
- Do not pause unnaturally.
- Do not restart the sentence.
- Do not change or improvise the words.
- A brief silent moment before he starts speaking and after he finishes.

NATURAL ANIMATION:
- Natural blinking.
- Natural eye movement.
- Subtle facial expressions.
- Small natural head movements.
- Natural hand gestures while speaking, returning to the hands-in-pockets pose at the end.
- Gentle body movement.
- No exaggerated gestures.
- No robotic movement.
- No sudden movements.
- No unnatural stretching or deformation.
- The character must remain standing in the center while speaking.

CAMERA:
- Fixed camera.
- Straight-on front-facing camera.
- Eye-level camera.
- No camera movement.
- No camera shake.
- No zoom in.
- No zoom out.
- No rotation.
- No camera cuts.
- No change in camera angle.
- Keep the exact same framing throughout the entire video.

BACKGROUND:
- Completely plain pure white background.
- Seamless white studio environment.
- No objects.
- No furniture.
- No scenery.
- No patterns.
- No gradients.
- No decorations.
- No additional characters.
- No text.
- No logos.

LIGHTING:
- Premium professional studio lighting.
- Soft even lighting.
- Natural soft shadow beneath the character.
- No dramatic lighting changes.
- No flickering.
- No changing exposure.
- No changing background brightness.

AUDIO:
- Voice only.
- NO background music.
- NO instrumental music.
- NO sound effects.
- NO ambient music.
- NO environmental sounds.
- NO footsteps.
- NO reverb.
- No additional voices.
- No background noise.

TEXT:
- NO subtitles.
- NO captions.
- NO titles.
- NO on-screen text.
- NO labels.
- NO speech bubbles.
- NO watermark.

QUALITY:
- High-quality cinematic 3D animation.
- Premium polished 3D rendering.
- Clean character edges.
- Consistent facial details.
- Stable character identity throughout the entire video.
- No face distortion.
- No face morphing.
- No disappearing face.
- No disappearing body parts.
- No extra fingers.
- No missing fingers.
- No duplicated limbs.
- No visual glitches.
- No flickering.
- No frame-to-frame character changes.

Create ONE continuous uninterrupted shot from beginning to end.

The character must remain in the center and continuously answer the question while making
subtle natural gestures.

Do not add anything that is not explicitly requested above.
```

## 3. `current` — "Where do you work now?"

**Save as:** `inputs/answers/current.mp4` · **Build:** `python3 scripts/build-hero-assets.py --answer current inputs/answers/current.mp4`

**Spoken script (19 words):**

> Since May 2025, I've been a Senior DevOps Engineer at JPMC, building secure AWS and Azure infrastructure for banking.

**Résumé source:** Experience: "JPMC, Remote — May 2025 – Till Date — Sr. DevOps Engineer", bullet 1 ("secure, highly available cloud infrastructure for enterprise banking and financial applications across AWS and Azure").

**Google Flow prompt:**

```text
Use the uploaded reference image as the EXACT and ONLY visual reference for the
character.

Create a premium, high-quality 3D animated video of this exact character.

CHARACTER CONSISTENCY:
- The character must look exactly like the uploaded reference character.
- Preserve his exact face, facial structure, eyes, eyebrows, nose, lips, beard, hairstyle, hair color,
skin tone, body proportions, clothing, accessories, and overall appearance.
- Do not redesign the character.
- Do not change his outfit.
- Do not change his hairstyle.
- Do not change his facial features.
- Do not make him look like a different person.
- Do not add or remove accessories.
- Do not change his age or body shape.
- Maintain the same premium 3D Bitmoji/cartoon style as the reference image.

POSE AND POSITION:
- Start with the character standing exactly in the same relaxed pose shown in the uploaded reference
image: upright, hands in his pockets, facing the camera.
- End the video back in that exact same relaxed pose (hands in pockets, facing the camera), held still
for the last moment, so the clip blends seamlessly with his idle loop.
- Keep him standing upright in the exact CENTER of the frame.
- Keep his entire body visible from head to feet.
- Do not crop any part of his body.
- Do not change the basic pose.
- Only allow natural small movements required for speaking.

PERFORMANCE:
The character is answering a visitor's question directly to the camera.

EXACT SPOKEN SCRIPT:
"Since May 2025, I've been a Senior DevOps Engineer at JPMC, building secure AWS and Azure infrastructure for banking."

VOICE:
- Natural male voice, the same voice as in his intro video.
- Friendly, confident, professional tone.
- Natural speaking speed; the whole script takes about 6 to 8 seconds.
- Clear pronunciation. Say "JPMC" as "J-P-M-C" and "AWS" as "A-W-S".
- Accurate lip synchronization.
- The complete script must be spoken continuously from beginning to end.
- Do not pause unnaturally.
- Do not restart the sentence.
- Do not change or improvise the words.
- A brief silent moment before he starts speaking and after he finishes.

NATURAL ANIMATION:
- Natural blinking.
- Natural eye movement.
- Subtle facial expressions.
- Small natural head movements.
- Natural hand gestures while speaking, returning to the hands-in-pockets pose at the end.
- Gentle body movement.
- No exaggerated gestures.
- No robotic movement.
- No sudden movements.
- No unnatural stretching or deformation.
- The character must remain standing in the center while speaking.

CAMERA:
- Fixed camera.
- Straight-on front-facing camera.
- Eye-level camera.
- No camera movement.
- No camera shake.
- No zoom in.
- No zoom out.
- No rotation.
- No camera cuts.
- No change in camera angle.
- Keep the exact same framing throughout the entire video.

BACKGROUND:
- Completely plain pure white background.
- Seamless white studio environment.
- No objects.
- No furniture.
- No scenery.
- No patterns.
- No gradients.
- No decorations.
- No additional characters.
- No text.
- No logos.

LIGHTING:
- Premium professional studio lighting.
- Soft even lighting.
- Natural soft shadow beneath the character.
- No dramatic lighting changes.
- No flickering.
- No changing exposure.
- No changing background brightness.

AUDIO:
- Voice only.
- NO background music.
- NO instrumental music.
- NO sound effects.
- NO ambient music.
- NO environmental sounds.
- NO footsteps.
- NO reverb.
- No additional voices.
- No background noise.

TEXT:
- NO subtitles.
- NO captions.
- NO titles.
- NO on-screen text.
- NO labels.
- NO speech bubbles.
- NO watermark.

QUALITY:
- High-quality cinematic 3D animation.
- Premium polished 3D rendering.
- Clean character edges.
- Consistent facial details.
- Stable character identity throughout the entire video.
- No face distortion.
- No face morphing.
- No disappearing face.
- No disappearing body parts.
- No extra fingers.
- No missing fingers.
- No duplicated limbs.
- No visual glitches.
- No flickering.
- No frame-to-frame character changes.

Create ONE continuous uninterrupted shot from beginning to end.

The character must remain in the center and continuously answer the question while making
subtle natural gestures.

Do not add anything that is not explicitly requested above.
```

## 4. `kubernetes` — "Kubernetes experience?"

**Save as:** `inputs/answers/kubernetes.mp4` · **Build:** `python3 scripts/build-hero-assets.py --answer kubernetes inputs/answers/kubernetes.mp4`

**Spoken script (20 words):**

> I've run Kubernetes on EKS, AKS and OpenShift, handling upgrades, autoscaling and troubleshooting, and deploying with Helm and Argo CD.

**Résumé source:** Professional Summary bullet 2 (Kubernetes, Amazon EKS, OpenShift, Helm, Argo CD; cluster upgrades, autoscaling, production troubleshooting) + JPMC bullet 3 ("Kubernetes platforms using Amazon EKS and AKS").

**Google Flow prompt:**

```text
Use the uploaded reference image as the EXACT and ONLY visual reference for the
character.

Create a premium, high-quality 3D animated video of this exact character.

CHARACTER CONSISTENCY:
- The character must look exactly like the uploaded reference character.
- Preserve his exact face, facial structure, eyes, eyebrows, nose, lips, beard, hairstyle, hair color,
skin tone, body proportions, clothing, accessories, and overall appearance.
- Do not redesign the character.
- Do not change his outfit.
- Do not change his hairstyle.
- Do not change his facial features.
- Do not make him look like a different person.
- Do not add or remove accessories.
- Do not change his age or body shape.
- Maintain the same premium 3D Bitmoji/cartoon style as the reference image.

POSE AND POSITION:
- Start with the character standing exactly in the same relaxed pose shown in the uploaded reference
image: upright, hands in his pockets, facing the camera.
- End the video back in that exact same relaxed pose (hands in pockets, facing the camera), held still
for the last moment, so the clip blends seamlessly with his idle loop.
- Keep him standing upright in the exact CENTER of the frame.
- Keep his entire body visible from head to feet.
- Do not crop any part of his body.
- Do not change the basic pose.
- Only allow natural small movements required for speaking.

PERFORMANCE:
The character is answering a visitor's question directly to the camera.

EXACT SPOKEN SCRIPT:
"I've run Kubernetes on EKS, AKS and OpenShift, handling upgrades, autoscaling and troubleshooting, and deploying with Helm and Argo CD."

VOICE:
- Natural male voice, the same voice as in his intro video.
- Friendly, confident, professional tone.
- Natural speaking speed; the whole script takes about 6 to 8 seconds.
- Clear pronunciation. Say "EKS" as "E-K-S", "AKS" as "A-K-S" and "Argo CD" as "AR-go C-D".
- Accurate lip synchronization.
- The complete script must be spoken continuously from beginning to end.
- Do not pause unnaturally.
- Do not restart the sentence.
- Do not change or improvise the words.
- A brief silent moment before he starts speaking and after he finishes.

NATURAL ANIMATION:
- Natural blinking.
- Natural eye movement.
- Subtle facial expressions.
- Small natural head movements.
- Natural hand gestures while speaking, returning to the hands-in-pockets pose at the end.
- Gentle body movement.
- No exaggerated gestures.
- No robotic movement.
- No sudden movements.
- No unnatural stretching or deformation.
- The character must remain standing in the center while speaking.

CAMERA:
- Fixed camera.
- Straight-on front-facing camera.
- Eye-level camera.
- No camera movement.
- No camera shake.
- No zoom in.
- No zoom out.
- No rotation.
- No camera cuts.
- No change in camera angle.
- Keep the exact same framing throughout the entire video.

BACKGROUND:
- Completely plain pure white background.
- Seamless white studio environment.
- No objects.
- No furniture.
- No scenery.
- No patterns.
- No gradients.
- No decorations.
- No additional characters.
- No text.
- No logos.

LIGHTING:
- Premium professional studio lighting.
- Soft even lighting.
- Natural soft shadow beneath the character.
- No dramatic lighting changes.
- No flickering.
- No changing exposure.
- No changing background brightness.

AUDIO:
- Voice only.
- NO background music.
- NO instrumental music.
- NO sound effects.
- NO ambient music.
- NO environmental sounds.
- NO footsteps.
- NO reverb.
- No additional voices.
- No background noise.

TEXT:
- NO subtitles.
- NO captions.
- NO titles.
- NO on-screen text.
- NO labels.
- NO speech bubbles.
- NO watermark.

QUALITY:
- High-quality cinematic 3D animation.
- Premium polished 3D rendering.
- Clean character edges.
- Consistent facial details.
- Stable character identity throughout the entire video.
- No face distortion.
- No face morphing.
- No disappearing face.
- No disappearing body parts.
- No extra fingers.
- No missing fingers.
- No duplicated limbs.
- No visual glitches.
- No flickering.
- No frame-to-frame character changes.

Create ONE continuous uninterrupted shot from beginning to end.

The character must remain in the center and continuously answer the question while making
subtle natural gestures.

Do not add anything that is not explicitly requested above.
```

## 5. `aws` — "AWS experience?"

**Save as:** `inputs/answers/aws.mp4` · **Build:** `python3 scripts/build-hero-assets.py --answer aws inputs/answers/aws.mp4`

**Spoken script (18 words):**

> I'm hands-on with AWS: EC2, EKS, VPC and IAM. At JPMC I build secure infrastructure for banking applications.

**Résumé source:** Professional Summary bullet 6 ("Hands-on experience with AWS services including EC2, S3, IAM, VPC … and EKS") + JPMC bullets 1–2 (secure AWS infrastructure for banking and financial applications).

**Google Flow prompt:**

```text
Use the uploaded reference image as the EXACT and ONLY visual reference for the
character.

Create a premium, high-quality 3D animated video of this exact character.

CHARACTER CONSISTENCY:
- The character must look exactly like the uploaded reference character.
- Preserve his exact face, facial structure, eyes, eyebrows, nose, lips, beard, hairstyle, hair color,
skin tone, body proportions, clothing, accessories, and overall appearance.
- Do not redesign the character.
- Do not change his outfit.
- Do not change his hairstyle.
- Do not change his facial features.
- Do not make him look like a different person.
- Do not add or remove accessories.
- Do not change his age or body shape.
- Maintain the same premium 3D Bitmoji/cartoon style as the reference image.

POSE AND POSITION:
- Start with the character standing exactly in the same relaxed pose shown in the uploaded reference
image: upright, hands in his pockets, facing the camera.
- End the video back in that exact same relaxed pose (hands in pockets, facing the camera), held still
for the last moment, so the clip blends seamlessly with his idle loop.
- Keep him standing upright in the exact CENTER of the frame.
- Keep his entire body visible from head to feet.
- Do not crop any part of his body.
- Do not change the basic pose.
- Only allow natural small movements required for speaking.

PERFORMANCE:
The character is answering a visitor's question directly to the camera.

EXACT SPOKEN SCRIPT:
"I'm hands-on with AWS: EC2, EKS, VPC and IAM. At JPMC I build secure infrastructure for banking applications."

VOICE:
- Natural male voice, the same voice as in his intro video.
- Friendly, confident, professional tone.
- Natural speaking speed; the whole script takes about 6 to 8 seconds.
- Clear pronunciation. Say "JPMC" as "J-P-M-C", "AWS" as "A-W-S", "EKS" as "E-K-S", "EC2" as "E-C-two", "VPC" as "V-P-C" and "IAM" as "I-A-M".
- Accurate lip synchronization.
- The complete script must be spoken continuously from beginning to end.
- Do not pause unnaturally.
- Do not restart the sentence.
- Do not change or improvise the words.
- A brief silent moment before he starts speaking and after he finishes.

NATURAL ANIMATION:
- Natural blinking.
- Natural eye movement.
- Subtle facial expressions.
- Small natural head movements.
- Natural hand gestures while speaking, returning to the hands-in-pockets pose at the end.
- Gentle body movement.
- No exaggerated gestures.
- No robotic movement.
- No sudden movements.
- No unnatural stretching or deformation.
- The character must remain standing in the center while speaking.

CAMERA:
- Fixed camera.
- Straight-on front-facing camera.
- Eye-level camera.
- No camera movement.
- No camera shake.
- No zoom in.
- No zoom out.
- No rotation.
- No camera cuts.
- No change in camera angle.
- Keep the exact same framing throughout the entire video.

BACKGROUND:
- Completely plain pure white background.
- Seamless white studio environment.
- No objects.
- No furniture.
- No scenery.
- No patterns.
- No gradients.
- No decorations.
- No additional characters.
- No text.
- No logos.

LIGHTING:
- Premium professional studio lighting.
- Soft even lighting.
- Natural soft shadow beneath the character.
- No dramatic lighting changes.
- No flickering.
- No changing exposure.
- No changing background brightness.

AUDIO:
- Voice only.
- NO background music.
- NO instrumental music.
- NO sound effects.
- NO ambient music.
- NO environmental sounds.
- NO footsteps.
- NO reverb.
- No additional voices.
- No background noise.

TEXT:
- NO subtitles.
- NO captions.
- NO titles.
- NO on-screen text.
- NO labels.
- NO speech bubbles.
- NO watermark.

QUALITY:
- High-quality cinematic 3D animation.
- Premium polished 3D rendering.
- Clean character edges.
- Consistent facial details.
- Stable character identity throughout the entire video.
- No face distortion.
- No face morphing.
- No disappearing face.
- No disappearing body parts.
- No extra fingers.
- No missing fingers.
- No duplicated limbs.
- No visual glitches.
- No flickering.
- No frame-to-frame character changes.

Create ONE continuous uninterrupted shot from beginning to end.

The character must remain in the center and continuously answer the question while making
subtle natural gestures.

Do not add anything that is not explicitly requested above.
```

## 6. `cicd` — "CI/CD experience?"

**Save as:** `inputs/answers/cicd.mp4` · **Build:** `python3 scripts/build-hero-assets.py --answer cicd inputs/answers/cicd.mp4`

**Spoken script (18 words):**

> I've built CI/CD pipelines with Jenkins, GitHub Actions and Azure DevOps, automating builds, testing, security scans and rollbacks.

**Résumé source:** Professional Summary bullet 4 (CI/CD pipelines with automated build, testing, deployment and rollback) + JPMC bullets 5 and 8 (Jenkins, Azure DevOps, GitHub Actions; security validation/scanning in pipelines).

**Google Flow prompt:**

```text
Use the uploaded reference image as the EXACT and ONLY visual reference for the
character.

Create a premium, high-quality 3D animated video of this exact character.

CHARACTER CONSISTENCY:
- The character must look exactly like the uploaded reference character.
- Preserve his exact face, facial structure, eyes, eyebrows, nose, lips, beard, hairstyle, hair color,
skin tone, body proportions, clothing, accessories, and overall appearance.
- Do not redesign the character.
- Do not change his outfit.
- Do not change his hairstyle.
- Do not change his facial features.
- Do not make him look like a different person.
- Do not add or remove accessories.
- Do not change his age or body shape.
- Maintain the same premium 3D Bitmoji/cartoon style as the reference image.

POSE AND POSITION:
- Start with the character standing exactly in the same relaxed pose shown in the uploaded reference
image: upright, hands in his pockets, facing the camera.
- End the video back in that exact same relaxed pose (hands in pockets, facing the camera), held still
for the last moment, so the clip blends seamlessly with his idle loop.
- Keep him standing upright in the exact CENTER of the frame.
- Keep his entire body visible from head to feet.
- Do not crop any part of his body.
- Do not change the basic pose.
- Only allow natural small movements required for speaking.

PERFORMANCE:
The character is answering a visitor's question directly to the camera.

EXACT SPOKEN SCRIPT:
"I've built CI/CD pipelines with Jenkins, GitHub Actions and Azure DevOps, automating builds, testing, security scans and rollbacks."

VOICE:
- Natural male voice, the same voice as in his intro video.
- Friendly, confident, professional tone.
- Natural speaking speed; the whole script takes about 6 to 8 seconds.
- Clear pronunciation. Say "CI/CD" as "C-I-C-D".
- Accurate lip synchronization.
- The complete script must be spoken continuously from beginning to end.
- Do not pause unnaturally.
- Do not restart the sentence.
- Do not change or improvise the words.
- A brief silent moment before he starts speaking and after he finishes.

NATURAL ANIMATION:
- Natural blinking.
- Natural eye movement.
- Subtle facial expressions.
- Small natural head movements.
- Natural hand gestures while speaking, returning to the hands-in-pockets pose at the end.
- Gentle body movement.
- No exaggerated gestures.
- No robotic movement.
- No sudden movements.
- No unnatural stretching or deformation.
- The character must remain standing in the center while speaking.

CAMERA:
- Fixed camera.
- Straight-on front-facing camera.
- Eye-level camera.
- No camera movement.
- No camera shake.
- No zoom in.
- No zoom out.
- No rotation.
- No camera cuts.
- No change in camera angle.
- Keep the exact same framing throughout the entire video.

BACKGROUND:
- Completely plain pure white background.
- Seamless white studio environment.
- No objects.
- No furniture.
- No scenery.
- No patterns.
- No gradients.
- No decorations.
- No additional characters.
- No text.
- No logos.

LIGHTING:
- Premium professional studio lighting.
- Soft even lighting.
- Natural soft shadow beneath the character.
- No dramatic lighting changes.
- No flickering.
- No changing exposure.
- No changing background brightness.

AUDIO:
- Voice only.
- NO background music.
- NO instrumental music.
- NO sound effects.
- NO ambient music.
- NO environmental sounds.
- NO footsteps.
- NO reverb.
- No additional voices.
- No background noise.

TEXT:
- NO subtitles.
- NO captions.
- NO titles.
- NO on-screen text.
- NO labels.
- NO speech bubbles.
- NO watermark.

QUALITY:
- High-quality cinematic 3D animation.
- Premium polished 3D rendering.
- Clean character edges.
- Consistent facial details.
- Stable character identity throughout the entire video.
- No face distortion.
- No face morphing.
- No disappearing face.
- No disappearing body parts.
- No extra fingers.
- No missing fingers.
- No duplicated limbs.
- No visual glitches.
- No flickering.
- No frame-to-frame character changes.

Create ONE continuous uninterrupted shot from beginning to end.

The character must remain in the center and continuously answer the question while making
subtle natural gestures.

Do not add anything that is not explicitly requested above.
```

## 7. `tools` — "What tools do you use?"

**Save as:** `inputs/answers/tools.mp4` · **Build:** `python3 scripts/build-hero-assets.py --answer tools inputs/answers/tools.mp4`

**Spoken script (20 words):**

> My core stack is AWS, Azure and GCP, plus Kubernetes, Docker, Helm, Argo CD, Terraform, Ansible, Jenkins, Prometheus and Grafana.

**Résumé source:** Technical Skills table: Cloud Platforms (AWS, Microsoft Azure, GCP), Containers & Orchestration (Kubernetes, Docker, Helm, Argo CD), IaC (Terraform, Ansible), CI/CD (Jenkins), Monitoring (Prometheus, Grafana).

**Google Flow prompt:**

```text
Use the uploaded reference image as the EXACT and ONLY visual reference for the
character.

Create a premium, high-quality 3D animated video of this exact character.

CHARACTER CONSISTENCY:
- The character must look exactly like the uploaded reference character.
- Preserve his exact face, facial structure, eyes, eyebrows, nose, lips, beard, hairstyle, hair color,
skin tone, body proportions, clothing, accessories, and overall appearance.
- Do not redesign the character.
- Do not change his outfit.
- Do not change his hairstyle.
- Do not change his facial features.
- Do not make him look like a different person.
- Do not add or remove accessories.
- Do not change his age or body shape.
- Maintain the same premium 3D Bitmoji/cartoon style as the reference image.

POSE AND POSITION:
- Start with the character standing exactly in the same relaxed pose shown in the uploaded reference
image: upright, hands in his pockets, facing the camera.
- End the video back in that exact same relaxed pose (hands in pockets, facing the camera), held still
for the last moment, so the clip blends seamlessly with his idle loop.
- Keep him standing upright in the exact CENTER of the frame.
- Keep his entire body visible from head to feet.
- Do not crop any part of his body.
- Do not change the basic pose.
- Only allow natural small movements required for speaking.

PERFORMANCE:
The character is answering a visitor's question directly to the camera.

EXACT SPOKEN SCRIPT:
"My core stack is AWS, Azure and GCP, plus Kubernetes, Docker, Helm, Argo CD, Terraform, Ansible, Jenkins, Prometheus and Grafana."

VOICE:
- Natural male voice, the same voice as in his intro video.
- Friendly, confident, professional tone.
- Natural speaking speed; the whole script takes about 6 to 8 seconds.
- Clear pronunciation. Say "AWS" as "A-W-S", "GCP" as "G-C-P" and "Argo CD" as "AR-go C-D".
- Accurate lip synchronization.
- The complete script must be spoken continuously from beginning to end.
- Do not pause unnaturally.
- Do not restart the sentence.
- Do not change or improvise the words.
- A brief silent moment before he starts speaking and after he finishes.

NATURAL ANIMATION:
- Natural blinking.
- Natural eye movement.
- Subtle facial expressions.
- Small natural head movements.
- Natural hand gestures while speaking, returning to the hands-in-pockets pose at the end.
- Gentle body movement.
- No exaggerated gestures.
- No robotic movement.
- No sudden movements.
- No unnatural stretching or deformation.
- The character must remain standing in the center while speaking.

CAMERA:
- Fixed camera.
- Straight-on front-facing camera.
- Eye-level camera.
- No camera movement.
- No camera shake.
- No zoom in.
- No zoom out.
- No rotation.
- No camera cuts.
- No change in camera angle.
- Keep the exact same framing throughout the entire video.

BACKGROUND:
- Completely plain pure white background.
- Seamless white studio environment.
- No objects.
- No furniture.
- No scenery.
- No patterns.
- No gradients.
- No decorations.
- No additional characters.
- No text.
- No logos.

LIGHTING:
- Premium professional studio lighting.
- Soft even lighting.
- Natural soft shadow beneath the character.
- No dramatic lighting changes.
- No flickering.
- No changing exposure.
- No changing background brightness.

AUDIO:
- Voice only.
- NO background music.
- NO instrumental music.
- NO sound effects.
- NO ambient music.
- NO environmental sounds.
- NO footsteps.
- NO reverb.
- No additional voices.
- No background noise.

TEXT:
- NO subtitles.
- NO captions.
- NO titles.
- NO on-screen text.
- NO labels.
- NO speech bubbles.
- NO watermark.

QUALITY:
- High-quality cinematic 3D animation.
- Premium polished 3D rendering.
- Clean character edges.
- Consistent facial details.
- Stable character identity throughout the entire video.
- No face distortion.
- No face morphing.
- No disappearing face.
- No disappearing body parts.
- No extra fingers.
- No missing fingers.
- No duplicated limbs.
- No visual glitches.
- No flickering.
- No frame-to-frame character changes.

Create ONE continuous uninterrupted shot from beginning to end.

The character must remain in the center and continuously answer the question while making
subtle natural gestures.

Do not add anything that is not explicitly requested above.
```

## 8. `contact` — "How can I contact you?"

**Save as:** `inputs/answers/contact.mp4` · **Build:** `python3 scripts/build-hero-assets.py --answer contact inputs/answers/contact.mp4`

**Spoken script (20 words):**

> Thanks for asking! You can reach me through the contact section or LinkedIn below. I'd love to hear from you.

**Résumé source:** Résumé header (email, phone, LinkedIn). Deliberately does not read out the email or phone number; the bubble shows them as links.

**Google Flow prompt:**

```text
Use the uploaded reference image as the EXACT and ONLY visual reference for the
character.

Create a premium, high-quality 3D animated video of this exact character.

CHARACTER CONSISTENCY:
- The character must look exactly like the uploaded reference character.
- Preserve his exact face, facial structure, eyes, eyebrows, nose, lips, beard, hairstyle, hair color,
skin tone, body proportions, clothing, accessories, and overall appearance.
- Do not redesign the character.
- Do not change his outfit.
- Do not change his hairstyle.
- Do not change his facial features.
- Do not make him look like a different person.
- Do not add or remove accessories.
- Do not change his age or body shape.
- Maintain the same premium 3D Bitmoji/cartoon style as the reference image.

POSE AND POSITION:
- Start with the character standing exactly in the same relaxed pose shown in the uploaded reference
image: upright, hands in his pockets, facing the camera.
- End the video back in that exact same relaxed pose (hands in pockets, facing the camera), held still
for the last moment, so the clip blends seamlessly with his idle loop.
- Keep him standing upright in the exact CENTER of the frame.
- Keep his entire body visible from head to feet.
- Do not crop any part of his body.
- Do not change the basic pose.
- Only allow natural small movements required for speaking.

PERFORMANCE:
The character is answering a visitor's question directly to the camera.

EXACT SPOKEN SCRIPT:
"Thanks for asking! You can reach me through the contact section or LinkedIn below. I'd love to hear from you."

VOICE:
- Natural male voice, the same voice as in his intro video.
- Friendly, confident, professional tone.
- Natural speaking speed; the whole script takes about 6 to 8 seconds.
- Clear pronunciation.
- Accurate lip synchronization.
- The complete script must be spoken continuously from beginning to end.
- Do not pause unnaturally.
- Do not restart the sentence.
- Do not change or improvise the words.
- A brief silent moment before he starts speaking and after he finishes.

NATURAL ANIMATION:
- Natural blinking.
- Natural eye movement.
- Subtle facial expressions.
- Small natural head movements.
- Natural hand gestures while speaking, returning to the hands-in-pockets pose at the end.
- Gentle body movement.
- No exaggerated gestures.
- No robotic movement.
- No sudden movements.
- No unnatural stretching or deformation.
- The character must remain standing in the center while speaking.

CAMERA:
- Fixed camera.
- Straight-on front-facing camera.
- Eye-level camera.
- No camera movement.
- No camera shake.
- No zoom in.
- No zoom out.
- No rotation.
- No camera cuts.
- No change in camera angle.
- Keep the exact same framing throughout the entire video.

BACKGROUND:
- Completely plain pure white background.
- Seamless white studio environment.
- No objects.
- No furniture.
- No scenery.
- No patterns.
- No gradients.
- No decorations.
- No additional characters.
- No text.
- No logos.

LIGHTING:
- Premium professional studio lighting.
- Soft even lighting.
- Natural soft shadow beneath the character.
- No dramatic lighting changes.
- No flickering.
- No changing exposure.
- No changing background brightness.

AUDIO:
- Voice only.
- NO background music.
- NO instrumental music.
- NO sound effects.
- NO ambient music.
- NO environmental sounds.
- NO footsteps.
- NO reverb.
- No additional voices.
- No background noise.

TEXT:
- NO subtitles.
- NO captions.
- NO titles.
- NO on-screen text.
- NO labels.
- NO speech bubbles.
- NO watermark.

QUALITY:
- High-quality cinematic 3D animation.
- Premium polished 3D rendering.
- Clean character edges.
- Consistent facial details.
- Stable character identity throughout the entire video.
- No face distortion.
- No face morphing.
- No disappearing face.
- No disappearing body parts.
- No extra fingers.
- No missing fingers.
- No duplicated limbs.
- No visual glitches.
- No flickering.
- No frame-to-frame character changes.

Create ONE continuous uninterrupted shot from beginning to end.

The character must remain in the center and continuously answer the question while making
subtle natural gestures.

Do not add anything that is not explicitly requested above.
```

## 9. `resume` — "Download résumé"

**Save as:** `inputs/answers/resume.mp4` · **Build:** `python3 scripts/build-hero-assets.py --answer resume inputs/answers/resume.mp4`

**Spoken script (17 words):**

> Sure, my résumé is downloading now. If it doesn't start, grab my résumé with the button below.

**Résumé source:** The résumé PDF itself (public/resume.pdf, downloaded by the chip). No factual claims.

**Google Flow prompt:**

```text
Use the uploaded reference image as the EXACT and ONLY visual reference for the
character.

Create a premium, high-quality 3D animated video of this exact character.

CHARACTER CONSISTENCY:
- The character must look exactly like the uploaded reference character.
- Preserve his exact face, facial structure, eyes, eyebrows, nose, lips, beard, hairstyle, hair color,
skin tone, body proportions, clothing, accessories, and overall appearance.
- Do not redesign the character.
- Do not change his outfit.
- Do not change his hairstyle.
- Do not change his facial features.
- Do not make him look like a different person.
- Do not add or remove accessories.
- Do not change his age or body shape.
- Maintain the same premium 3D Bitmoji/cartoon style as the reference image.

POSE AND POSITION:
- Start with the character standing exactly in the same relaxed pose shown in the uploaded reference
image: upright, hands in his pockets, facing the camera.
- End the video back in that exact same relaxed pose (hands in pockets, facing the camera), held still
for the last moment, so the clip blends seamlessly with his idle loop.
- Keep him standing upright in the exact CENTER of the frame.
- Keep his entire body visible from head to feet.
- Do not crop any part of his body.
- Do not change the basic pose.
- Only allow natural small movements required for speaking.

PERFORMANCE:
The character is answering a visitor's question directly to the camera.

EXACT SPOKEN SCRIPT:
"Sure, my résumé is downloading now. If it doesn't start, grab my résumé with the button below."

VOICE:
- Natural male voice, the same voice as in his intro video.
- Friendly, confident, professional tone.
- Natural speaking speed; the whole script takes about 6 to 8 seconds.
- Clear pronunciation. Say "résumé" as "REZ-oo-may".
- Accurate lip synchronization.
- The complete script must be spoken continuously from beginning to end.
- Do not pause unnaturally.
- Do not restart the sentence.
- Do not change or improvise the words.
- A brief silent moment before he starts speaking and after he finishes.

NATURAL ANIMATION:
- Natural blinking.
- Natural eye movement.
- Subtle facial expressions.
- Small natural head movements.
- Natural hand gestures while speaking, returning to the hands-in-pockets pose at the end.
- Gentle body movement.
- No exaggerated gestures.
- No robotic movement.
- No sudden movements.
- No unnatural stretching or deformation.
- The character must remain standing in the center while speaking.

CAMERA:
- Fixed camera.
- Straight-on front-facing camera.
- Eye-level camera.
- No camera movement.
- No camera shake.
- No zoom in.
- No zoom out.
- No rotation.
- No camera cuts.
- No change in camera angle.
- Keep the exact same framing throughout the entire video.

BACKGROUND:
- Completely plain pure white background.
- Seamless white studio environment.
- No objects.
- No furniture.
- No scenery.
- No patterns.
- No gradients.
- No decorations.
- No additional characters.
- No text.
- No logos.

LIGHTING:
- Premium professional studio lighting.
- Soft even lighting.
- Natural soft shadow beneath the character.
- No dramatic lighting changes.
- No flickering.
- No changing exposure.
- No changing background brightness.

AUDIO:
- Voice only.
- NO background music.
- NO instrumental music.
- NO sound effects.
- NO ambient music.
- NO environmental sounds.
- NO footsteps.
- NO reverb.
- No additional voices.
- No background noise.

TEXT:
- NO subtitles.
- NO captions.
- NO titles.
- NO on-screen text.
- NO labels.
- NO speech bubbles.
- NO watermark.

QUALITY:
- High-quality cinematic 3D animation.
- Premium polished 3D rendering.
- Clean character edges.
- Consistent facial details.
- Stable character identity throughout the entire video.
- No face distortion.
- No face morphing.
- No disappearing face.
- No disappearing body parts.
- No extra fingers.
- No missing fingers.
- No duplicated limbs.
- No visual glitches.
- No flickering.
- No frame-to-frame character changes.

Create ONE continuous uninterrupted shot from beginning to end.

The character must remain in the center and continuously answer the question while making
subtle natural gestures.

Do not add anything that is not explicitly requested above.
```

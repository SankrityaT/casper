# 04. Design language: what Casper inherits from the designer (Sankritya)

Research date: 2026-10-29. Read only. Sources: `~/code/juno` (docs/design, docs/specs, docs/research, design/, src/ui/renderer),
`~/code/juno/docs/research/town-screens` (12 of 41 screens viewed), `~/orca/workspaces/lockin/lockedin`, `~/yolkling`,
`~/yolkling-app`, `~/project-notes/playbook`. "Cardinal" was searched for and **not found** (section 5).

Read sections 1, 2.6 and 6 if you only have five minutes.

---

## 1. The designer's principles, in his own words

### 1.1 The thesis (Juno, `docs/design/browser/DIRECTION.md` section 1)

> Juno should feel like **a calm, well-made instrument that keeps a logbook**. Not a chatbot bolted to a browser, not a
> dashboard, not a toy.
> 1. **The web is the content; Juno is the frame.** ... Nothing in the frame competes for attention unless it is live or needs you.
> 2. **You always see what Juno sees.** An agent that works in a browser earns trust by being watchable.
> 3. **The consequential moment is the most beautiful thing in the product.**

For Casper: the VM window is the content, the agents are the life, the chrome is the frame. The "watchable agent" rule is
literally Casper's premise (agent sitting on its live VM).

### 1.2 The standing taste rules (DIRECTION.md section 0, 24 rules; the ones that bind Casper)

| # | Rule (quoted) |
|---|---|
| 1 | "No em-dashes, anywhere: UI copy, model output, docs." |
| 2 | "No emoji. Icons are a real, custom line set; a named site gets its real favicon." |
| 3 | "Custom components for everything, never a stock kit." |
| 4 | "Premium, Tend quality. Never 'basic', never 'vibecoded'." |
| 6 | "Consequence before mechanism: the button says the verb ('Send'), never 'Confirm' or 'OK'. 'Not now' is as large as the yes." |
| 7 | "Render the real payload ... never a description of it." |
| 11 | "One accent colour that means something; neutrals tinted, never pure black or white." |
| 12 | "Glass or blur only where something truly floats; everything else opaque." |
| 13 | "No small text. Nothing under 13 px; body 15 to 16 px. No monospace for UI text ... No all-caps eyebrow labels." |
| 16 | "Two speeds of narration: one live line while it works, collapsed past-tense steps after." |
| 24 | "Align the text, not the box." (a tinted row's fill hangs outside the column so its text lines up) |

### 1.3 Anti-references (DIRECTION.md section 3; playbook DESIGN-BRIEF.md section 1)

- "The generic AI kit: a purple sparkle as the AI icon over lavender suggestion cards, gradient orbs, glass stacked on glass,
  identical icon-plus-heading card grids, chat bubbles on both sides as the only structure."
- "The assistant as floating glass over the page" (Comet): the assistant needs a place of its own.
- Playbook: "If a section could belong to any company, it's wrong." Reviewer's words: "fkn ai vibe coded", "the same ai slop".
  No placeholder UI, no grey bars pretending to be text, no emoji, no clip-art.
- Agents spec 5.1b: "No sparkles, confetti or particles: the only effects are the agent's own light."

### 1.4 On characters specifically (`docs/specs/2026-09-30-juno-agents.md` section 5.1)

> "Muse and Dots chose toys. The press on Muse ('an 18+ AI agent behind a kids-toy mascot', 'infantilising') is the risk."
> "What makes an agent itself is, in order: its **silhouette** ..., its **aura** (the three-tone rim light) and its **resting
> eyes**. What makes them one family never changes: the matte pearl material, the one key light top left, the rim light, the
> ground reflection, the ink eyes and the state vocabulary."
> "At 16 px the outline and aura read, at 22 px and up the eyes."
> "**The character is the one place things give**: squash and stretch, a wobble and a hop, only on the agent's body."

Rules on the agents sheet (`docs/design/agents/agents-sheet.png`): "Same stuff, own shape." "One aura, three tones." "Eyes
carry state ... the rim brightens only for 'Needs you', the one state that wants attention." "A tuft, a tie or a lean is part
of the body, never something worn."

Pearl expressions sheet (`docs/design/browser/components/c-12-orb-expressions-dark.png`): "Only the eyes and brows change;
the pearl, its light and its colours never do. No mouth." "Tasteful, no cartoon mouths or tears; one expression per state,
never decoration."

### 1.5 His measured taste across 10 shipped landing pages (`docs/design/design-taste/FOUNDER-TASTE.md`)

The eight patterns (section 3 of that doc): two faces plus a mono for meta; a steep scale (body 17 to 18 / 1.6, section
heading about 3.3x body, hero about 4.3x, display tracking -0.02em); headings are short sentences with a full stop and one
emphasised word; narrow measure (about 52 characters); wide margins (about 10%); one accent on a warm neutral (dark grounds
"warm near-black: #161413, #1C1210, #131313 over #000"); quiet surfaces (pills, three radii: pill / about 22 / about 8;
hairlines of the ink at 10 to 16%, on dark white at 0.07 to 0.10); "the product is the picture". Motion measured: hover 0.15 s;
reveal 0.4 to 0.9 s on `cubic-bezier(0.16, 1, 0.3, 1)`; press overshoot `cubic-bezier(0.34, 1.56, 0.64, 1)` 0.16 to 0.3 s
(Yolkling, Round); "loops slow and few: a breathe of 4.4 s" (Locked In).

### 1.6 The 8 premium moves (`docs/design/refs.md` section 4) and the DNA bullets

Most relevant: "Motion has two speeds: a slow ambient breathe and a fast state-change snap ... never let the ambient loop and
the state-change animation share one timing curve." "AI progress is shown as a specific pending fact, never a bare spinner."
"Color is semantic vocabulary, never mood lighting." "Each system earns one real, hand-built signature material instead of a
css trick." "The single highest-stakes moment in the product gets the most design investment."

### 1.7 Playbook rules worth carrying (`~/project-notes/playbook`)

- `motion-recipes.md` ground rules: "One timing system. Define durations and eases once (`lib/motion.ts`), never inline random
  numbers." "A site feels designed when everything moves on the same 3 durations and 3 eases." "Anything random in render must
  be seeded (mulberry32)." "Never block content on animation." "Readability beats motion."
- `DESIGN-BRIEF.md`: "A direction is one strong idea executed well, not a collection of effects." "Three directions that differ
  only in colour are one direction." "Real material beats everything." "Facts only."
- `saas-references.md` steals that fit Casper: Flora ("let the users' output be the art direction; the UI frame stays black and
  quiet"), Adaline ("pick an unexpected world for a technical product and commit to it").

---

## 2. Juno's concrete design system

### 2.1 Where it lives

| What | Path |
|---|---|
| Shipped dark tokens ("Nocturne") | `~/code/juno/src/ui/renderer/nocturne.css` (30 lines, the canonical copy) |
| Notch states, pearl, cards | `~/code/juno/src/ui/renderer/notch.css` |
| Earlier "Tally light" tokens and the lamp component | `~/code/juno/design/tokens.css`, `~/code/juno/design/components.css` (lines 81 to 90) |
| Direction, rules, palettes, type scale | `~/code/juno/docs/design/browser/DIRECTION.md` |
| Motion, every number | `~/code/juno/docs/design/browser/MOTION.md` |
| Agents: spec, generator, hatch prototype | `~/code/juno/docs/specs/2026-09-30-juno-agents.md`, `~/code/juno/docs/design/agents/src/family.mjs`, `.../src/hatch.mjs`, `.../hatch/index.html` |
| Team (multiplayer) | `~/code/juno/docs/design/team/TEAMS-DOC.md`, `.../team/mockups/` |

### 2.2 Type

- Nocturne (shipped): **Instrument Sans** for UI (`--f-ui`), **Newsreader** for answers, titles, memory; JetBrains Mono only
  for meta. Strict scale (DIRECTION.md "The type scale"): Hero Newsreader 64/1.05 400; page title Newsreader 44/1.05;
  answer heading Newsreader 26/1.2 500; reading Newsreader 18/1.5; card and notch title Instrument Sans 19/1.3 600; section
  heading 16 to 17/1.3 600; body 15 to 16.5/1.45; rows 14.5 to 15; meta 14; floor 13 (560 to 600); numbers 24 to 26 tabular.
- Tally light (earlier): SF Pro / New York / SF Mono; `--t-micro 10.5, --t-meta 11.5, --t-body 13, --t-body-l 14.5,
  --t-title 17, --t-head 21, --t-display 27, --t-hero 34`; `--track-display -0.022em`. (Superseded by rule 13: nothing under 13.)
- The serif display is only for page heroes and content (answers, receipts: see the "$612 from 4 new customers" card in
  `team/mockups/v4-02-thread.png`); chrome is always the sans.

### 2.3 Colour (OKLCH, actual values)

Nocturne, shipped (`nocturne.css`), neutrals tinted cool hue 255:

| Token | Value | Use |
|---|---|---|
| `--text` / `-2` / `-3` / `-4` | 0.955 0.004 255 / 0.80 0.007 255 / 0.70 0.009 255 / 0.66 0.009 255 | text steps |
| `--hair` / `--hair-2` / `--ring` | white at 0.07 / 0.12 / 0.18 | hairlines, control rings |
| `--well` | 0.19 0.008 255 | payload wells |
| `--raised` | 0.238 0.009 255 | composer, cards |
| `--pea` (peacock, the ONE accent) | 0.80 0.125 182 (ink 0.83 0.11 182; wash at 13%) | live, needs you, the lit ring, the mic |
| `--pri-bg` / `--pri-fg` | 0.955 0.004 255 / 0.17 0.008 255 | primary button is bone, never the accent |
| `--danger` / `--danger-ink` / `--warn` | 0.53 0.17 27 / 0.76 0.14 25 / 0.80 0.13 80 | outcomes |

DIRECTION.md Nocturne grounds: `--chrome` 0.168 0.008, `--stage` 0.198 0.008, `--raised` 0.238 0.009, `--well` 0.175 0.008.
Notch body is `#000` (continuous with the bezel).

Tally light (`design/tokens.css`), warm: lacquer `--lq-1` 0.165 0.002 40, `--lq-2` 0.215, `--lq-3` 0.27; bone `--bone`
0.955 0.007 70 down to `--bone-4` 0.45; **`--tally` 0.665 0.205 33** (a recording-light vermilion), `--tally-glow` at 0.5,
`--tally-wash` at 0.1; `--you` 0.475 0.078 48 (sepia, only for your own words); `--ok` 0.76 0.11 158; `--held` 0.8 0.11 78.
"Warm is you, lacquer is the agent, tally means live or needs you ... never a button fill."

Agent auras (spec section 5.2): each agent is one hue family in three tones.

| Aura | Tones (L C H) |
|---|---|
| Peacock (Juno only) | 0.74 0.12 205 / 0.66 0.13 300 / 0.86 0.10 85 |
| Rose | 0.74 0.10 350 / 0.72 0.10 20 / 0.80 0.08 320 |
| Jewel | 0.70 0.085 222 / 0.62 0.09 245 / 0.80 0.07 200 |
| Dusk | 0.72 0.09 290 / 0.66 0.10 270 / 0.80 0.06 310 |
| Brass | 0.80 0.075 78 / 0.72 0.08 60 / 0.86 0.06 95 |
| Moonstone | 0.72 0.05 250 / 0.62 0.06 265 / 0.82 0.04 230 |
| Ember | 0.76 0.11 50 / 0.68 0.12 30 / 0.84 0.08 70 |
| Ice | 0.84 0.06 205 / 0.74 0.06 225 / 0.90 0.04 190 |

Pearl body: radial gradient `#fff` to the agent's tint (about 0.975 0.004 240) to 0.86 0.012 250; eye ink 0.2 0.03 262.

### 2.4 Spacing, radii, elevation

- Spacing: 4 base with big jumps: **2, 4, 8, 12, 16, 24, 32, 48, 64** (`--s-1..--s-9` in tokens.css). Sidebar 244 to 260,
  chat column 680, trust sheet 440, stage inset 8.
- Radii (tokens.css): `--r-xs 5` checkbox, `--r-sm 8` chip, `--r-md 11` control, `--r-lg 16` panes, `--r-xl 22` notch card,
  pill 999. Nocturne: stage 10, trust sheet 16, controls 9, rows 8; notch bottom corners 26; buttons 10 (38 high), small 9 (32).
- Elevation: "only things that truly float get a shadow": `--shadow-drop: 0 22px 48px -18px oklch(0 0 0 / 0.55), 0 2px 6px
  oklch(0 0 0 / 0.25)`; notch pill `0 0 0 1px oklch(1 0 0 / 0.08), 0 30px 60px -24px oklch(0 0 0 / 0.75)`. Wells use an inset
  1 px white at 0.08 instead of a border.

### 2.5 Motion (MOTION.md, nocturne.css)

| Token | Value | For |
|---|---|---|
| `--ease-out` | `cubic-bezier(0.2, 0, 0, 1)` | responding to you |
| `--ease-expo` | `cubic-bezier(0.16, 1, 0.3, 1)` | things that arrive |
| `--ease-in` | `cubic-bezier(0.4, 0, 1, 1)` | things that leave |
| `--ease-breathe` | `cubic-bezier(0.45, 0, 0.55, 1)` | ambient loops only |
| `--spring-notch` | stiffness 380, damping 34, mass 1 (settles about 360 ms, no overshoot) | size changes |
| Durations | **90, 120, 160, 200, 240, 320, 380 ms** ("pick from this list only") | |

Key recipes: press scales 0.94 (0.88 icon buttons), 90 ms down, 220 ms back on `cubic-bezier(.3, 1.4, .5, 1)` (the one allowed
overshoot, peak 1.006). Message in: rise 8 px, 200 ms expo. Step row: height 0 to 36 then text, 160 + 120 ms, rows at least
120 ms apart. A finished row: **1.2 s wash in the accent** that fades. Live dot: opacity 0.55 to 1, 2.4 s breathe. Lamp:
3.2 s sine, "only while something is live". Done: a 2 px accent hairline drains over 4 s, then the notch folds. Reduced motion:
crossfades only (120 ms). "Nothing bounces" except the press release and **the character body**.

Character motion (hatch.mjs lines 40 to 349, real numbers): breathe `scale(1.018, .985)` every 4.2 s; blink = eyes
`scaleY(.08)` for 110 ms, reopen 160 ms; idle blink every 2.6 to 5.2 s (random); squash `scale(1.22,.72)` 160 ms ease-in then
stretch `(.9,1.14) -> (1.04,.97) -> 1` 420 ms expo; hop 620 ms (`-46px`, squash 1.08/.9 at 18% and 82%); wobble 3x at 5, 8, 12
degrees, 340 ms each; aura swirl 1300 ms; three light rings `scale .6 -> 1.9`, 900 ms, 140 ms apart; fly to sidebar row along an
arc (midpoint 120 px up), 760 ms breathe curve; aura colours crossfade 0.8 s via registered CSS custom properties.

### 2.6 The state system: lamp, pearl and the seven agent states

Three layers, one vocabulary:

1. **The lamp** (`design/components.css` 81 to 90): an 8 px dot. `--off` hollow ring; `--live` tally fill + 3 px halo + 14 px
   glow; `--need` tally fill + a seam ring + a 4.5 px tally ring + 18 px glow; `--work` bone fill breathing; `--wait` tally at
   85% breathing. Breathe keyframe: opacity 1 to 0.45 to 1 over 3.2 s.
2. **The pearl** (`notch.css` 94 to 107; `c-12` sheet): 17 x 14 px face on every status label. calm = in hand, curious = needs
   you / no results (one eye raised), worried = stopped or changed, sad = failed, sleepy = idle / no answer, happy = done.
3. **The agent states** (spec 5.3, drawn on the agents sheet): **Idle** (eyes closed, still), **Listening** (open), **Working**
   (eyes toward the live line), **Needs you** (aura brightens, card opens: the only attention state), **Done** (one slow blink,
   then happy), **Stuck** (worried, says why), **Paused** (sleepy, aura almost off). Plus words: sidebar status "Needs you",
   "Working", "Watching 4", "Next: Oct 1", "Paused", "Draft ready".

Rule underneath all three: the face shows the state, the words say the fact, the accent appears only for live or needs you.

### 2.7 How Juno represents agents (technique)

- **Pure SVG generated in JS** (`family.mjs`). Every agent is one `<path d>` silhouette in a 1024 box, built from cubic
  Beziers with named proportions (`egg()`, `owl()`, `sack()`, `moon()`, `bell()`, `cloud()`, `drop()`, plus the logo's
  `mochiPath`). Each form returns `{d, cx, cy, w, h, eye: {x, y, gap}, lean?, base?}` so eyes, sheen and ground light place
  themselves.
- **Material stack** (back to front): ground glow ellipse (blurred, aura) -> reflection ellipse -> contact shadow -> soft outer
  sweep stroke (90 px, blurred, 26% opacity x glow) -> body fill (radial pearl gradient) -> three rim strokes clipped inside the
  body, each a linear gradient from one aura tone to transparent from a different side, Gaussian-blurred 18 -> a white specular
  ellipse top-left -> a 3 px crisp sweep outline. `glow` scales the rim (needs-you brightens, paused dims). A `small` variant
  for 64 px and under: wider crisp rim, heavier eyes, no blur.
- **Eyes** are a separate group redrawn by kind: `closed` (quadratic arcs), `open` (ink ellipse + white catchlight), `look`
  (pupils offset 12 units), `soft`, `focus` (flat lines), `owl` (rings), `sleepy`, `happy` (inverted arcs), `worried` (eyes +
  slanted brows). Blink = CSS `scaleY(.08)` on the eyes group with `transform-box: fill-box`. Swapping kind happens mid-blink so
  the change is hidden.
- **Hatch**: random but seeded draw of shape (8) x aura (8) x eyes (6) x name; "no two agents share a name, or a shape and an
  aura". Every trait rerollable.
- **In product**: face at 16 to 22 px beside the name in the sidebar and thread; "Max · Kinjal's Juno · On Kinjal's Mac" header
  chips; steps as favicon + past-tense sentence; receipts with sources. See `team/team-B-workspace.png`.

### 2.8 Component patterns to reuse

- Thread message from an agent: face, **bold name**, owner ("Kinjal's Juno"), a "where it ran" chip, time right; then step rows
  (real favicon + past-tense line with the object in semibold); then a result card (serif headline, hairline rows, a footer of
  sources and "Read on Kinjal's Mac, 10:13 AM").
- Trust card: "Needs your yes" in accent with the pearl, a verb title ("Send this email to Garrett Lin?"), the full payload in
  a well, "Not now" and the verb button the same size, plus a ring on the real button on the page (`browser/b-4-trust.png`).
- Notch / live line: one line per working agent, "Iris drafting 3 replies in Gmail", Open, and a stop square
  (`browser/components/c-09-notch-more-dark.png`).
- Failure copy: "What stopped it, what it did not do, and two ways on." ("Amazon asked for a code ... Juno stopped there and
  bought nothing." Do it myself / Open the chat.)

---

## 3. Locked In and Yolkling: how the characters and eyes are built

Neither uses Rive, Lottie, Skia, sprites or canvas: no `.riv` / `.lottie` files, no imports. **Both are drawn from a few
primitive shapes in code, and every expression is just a new set of numbers for those shapes.** That is the technique to reuse.

### 3.1 Locked In: Latch the padlock (SwiftUI, iOS and macOS)

- Character: `~/orca/workspaces/lockin/lockedin/Shared/LatchView.swift` (mood enum L4-26; cues and idle "wander" L28-43;
  animatable shackle shape L52-71; wobble L73-86; body, breathing, blink loop L122-179; squash and tilt per mood L271-286;
  reactions and gaze L304-352; face: brows, eyes, cheeks, mouth, tear, sweat L354-516). Palette `Shared/Theme.swift` L14-31.
  Eyes follow the finger `LockedIn/UI/SetupScreen.swift` L229-235; dozes after 60 s untouched L135-136; mood per screen
  `LockedIn/UI/FocusScreen.swift` L53-54. Spec `docs/superpowers/specs/2026-10-04-lockedin-design.md` L158-166.
- Build: a fixed 200 x 220 drawing space scaled to size. Body a rounded rect 140 x 112, radius 40. Shackle an arc, 18 pt
  round stroke, with an animatable "openness" 0 to 1 (a hold gesture drives it). Eyes: 18 pt ink circle + 6 pt white catchlight
  at (+3, -3). Cheeks 22 x 14 ellipses at 75%. Brows, mouth and closed eyes are lines and quad curves where **one "bend" number
  turns a smile into a frown**. Strokes: mouth 4, eye arcs and brows 5. Eyes 44 pt apart, slightly below centre; eye about 13%
  of body width ("small eyes on a big plain face").
- Spec, quoted: "drawn only from SwiftUI shapes"; "A mood sets shackle openness, brow angle, eye shape, mouth curve, and whether
  the tear and sparkles show."; "Always alive: slow breathing scale and random blinks in every mood."; "With Reduce Motion on,
  they cross-fade and breathing stops."

| Mood | Body / prop | Eyes | Brows | Mouth | Extra |
|---|---|---|---|---|---|
| ready | shackle open | dots raised | none | smile, bend +10 | cheeks |
| focused | shut | dots | stern, angled in | flat | |
| determined | shut | dots squashed to 60% | steeper V | flat | shackle trembles +/-1.5 pt |
| sad | open | dots lower | inner ends raised | frown, bend -9 | one cheek, tear |
| relaxed / dozing | open | closed down arcs, bend +8 | none | small smile / "o" | dozing tilts 7 deg |
| happy | shut | ^ arcs, bend -14 | none | filled grin | |
| calm | shut | soft arcs, bend +6 | none | small smile | |
| yawning | shut | arcs set high | none | 30 x 38 ellipse | stretched tall, tilt -4 deg |
| stretching | open | > < squeezed | none | 18 x 22 "o" | scale 0.9 x 1.2 |
| working | shut | 17 x 9 capsules looking down | none | tiny smile | sits at a desk |
| overlays | | sweating: eyes 1.3x + drop; perk: eyes 1.3x briefly | | | |

Timing: **blink** random 2.5-5 s, close 0.08 s ease-in (eye to 10% height), hold 130 ms, open 0.1 s ease-out. **Breathe**
scaleY 1.025 from the bottom edge, 2.2 s ease-in-out each way (4.4 s in Calm, 1.012). **Mood change** spring duration 0.45,
bounce 0.35 (reduced: 0.2 s crossfade). **Gaze** pupils within +/-4 pt on a 0.25 s spring; glances every 8-15 s (left 0.45 s,
right 0.55 s); peeks at the clock every 180-300 s for 1.3 s. **Reactions**: hop 20 pt in 0.16 s then spring back (0.45,
bounce 0.6); wiggle about 0.13 rad decaying over 0.7 s; perk 0.2 s spring released after 0.45 s; tip (shackle pops) 0.3 s.
Palette: ink #1B1F4B, body #FF8A3D, shackle #D9631C, cheek #FF6FA3, ground periwinkle #DCE3FF; Calm #E8935A on navy #23264A;
skins mint #5AD1A8 / #2F9E7E, bubblegum #FF8FC2 / #D95A96. Hats are unlockable costumes (`marketing/appstore/1.3/09-closet.png`):
note this is the opposite of Juno's "never something worn", appropriate for a playful consumer app.

### 3.2 Yolkling (web: Next.js + GSAP + CSS divs)

- Markup `~/yolkling-app/app/body.ts` L82-97 (divs: eyes with pupils, blush, mouth, arms, feet, glow, zzz). Styles
  `~/yolkling-app/app/yolk.css` (anatomy L141-154; mouth per vibe and good/rough states L164-183). Behaviour
  `~/yolkling-app/app/engine.ts` L60-198 (`initCreature`). Older copy `~/yolkling/script.js` L66-190, `~/yolkling/styles.css`
  L109-139. Design doc `~/yolkling-app/design.md` L155-198, L264-270. The native iOS character is only in screenshots
  (`~/yolkling-app/public/shots/`).
- Build: body is a blob from uneven border radii `46% 54% 47% 53% / 54% 50% 50% 46%`, inner shade `inset -16px -20px 0
  rgba(0,0,0,.09)`, tinted drop shadow. Eyes white ovals 23% of body width (aspect 1/1.15) at top 34%; pupils 46% of the eye
  with a catchlight 32% of the pupil, top right. Blush 15% x 9% at 0.7, blurred 1 px. Mouth = a box showing only its 4 px
  bottom border with rounded corners, 14% x 10%; mouth changes on `--pop` over 0.25 s.
- design.md, quoted: "built entirely from CSS shapes, no image" (sic, his dash removed); "secretly you"; "keep the creature
  reactive: tracking pupils, breathe, hop, drag-squish, vibes"; "don't recolor the blush, it stays pink in every vibe"; "When in
  doubt, things should *bounce* slightly past and settle"; `--pop: cubic-bezier(.34,1.56,.64,1)`; respects reduced motion.

| State | What changes |
|---|---|
| idle | open "U" smile |
| happy (hover, "slept great") | filled grin 22% x 16% |
| vibes (feral / chill / dreamy / berry) | colour (mint #73E0AE, sky #8FD0FF, pink #FF94C2, purple #7B5CF0) and mouth (big grin / flat / small "o") |
| state-good | glow 0.62, blush 0.9, saturate 1.14, breathing 1.5x faster, 24 px hop, 5 hearts |
| state-rough | eyes half-closed (to 40%, pivot low), blinking stops, flat mouth, blush 0.4, dimmer, breathing 0.6x, floating "zzz": "sleepy, never sad" |

Timing (`engine.ts`): breathe 1.04 x 0.96 from the bottom, 1.4 s sine, yoyo. Arms +/-14 deg, 1.1 s, offset 0.2 s. Blink to 12%
height in 0.07 s and back; first at 2 s, then every 2-5.5 s. **Pupils** track the cursor: offset = min(dist / 40, 1) x 16% of eye
width, 0.25 s power3. **Whole body leans** toward the cursor: x +/-18 px, y +/-14, rotate +/-6 deg, 0.5-0.6 s. Hover hop 18 px,
0.3 s on `--pop`. **Drag**: stretch with speed (scaleX 1-1.3, scaleY = 2 - scaleX to keep volume), lean +/-18 deg, release on
`elastic.out(1, 0.45)` 1.1 s + 3-5 hearts. Idle antics every 5-11 s: 46 px hop, 360 spin 0.85 s, shake 12 deg x6, or squish
1.12 x 0.9. Vibe change: colours 0.5 s, body pops 0.85 to 1 on `elastic.out(1, 0.4)` 0.7 s.
Palette: shell #FBF6EC, ink #2A241B, yolk #FFC23B / #E8A21E, highlight #FFD873, blush #FF94C2.

### 3.3 The technique, distilled for Halloween agents

1. **Parametric face, not drawn frames.** A face is about eight numbers: eye open (0-1), eye shape (dot / arc / ring / capsule),
   pupil x/y, brow angle and height, mouth bend (-1 frown to +1 smile), mouth open (0 line to 1 "o"), cheek opacity. Each state
   is a preset; transitions tween the numbers. Works in SVG (Juno's `family.mjs`) or CSS divs (Yolkling) equally.
2. **Life loop independent of state**: blink (eye to 10-12% height, 70-110 ms, every random 2.5-5 s, swap expression inside the
   blink), breathe (squash from the base, 1.4-4.4 s), pupils follow the pointer within a small radius on a 0.25 s ease.
3. **State changes on a slight overshoot** (spring bounce about 0.35 or `--pop`); body-only squash and stretch for big moments.
4. **Body colour can change, ink and blush do not**, so every skin reads as the same family.
5. **Rough states read as sleepy or worried, never sad or broken.**
6. Juno adds the premium layer the two consumer apps lack: matte pearl material, rim-light aura, ground reflection, glow as a
   state channel. Casper should combine Juno's material with Latch's richer face (brows and a one-stroke mouth).

---

## 4. Town: what to borrow, what to beat

Screens viewed: 06, 07, 09, 18, 19, 23, 25, 31, 32, 36, 37, 40 (`~/code/juno/docs/research/town-screens/`). Background:
`~/code/juno/docs/research/2026-10-20-town-vs-juno-cloud.md`, `~/code/juno/docs/design/team/TEAMS-DOC.md` ("Where we do better
than Town").

### 4.1 What Town looks like

- **Marketing**: warm off-white paper, a typewriter-ish slab serif display (huge, "Collaborative with your team, and each other"),
  highlighter-marker word emphasis in pastel blocks, numbered side index, black pill CTA. Editorial, not techy.
- **Avatars ("Townies")**: hand-drawn, ink-and-colour-pencil illustrations, each a square tile on its own pastel ground: a dog
  in a bow tie (Bud), a star, a sock puppet in a cap, a bear, a dragon, **a vampire with fangs**, a knight, a capybara, a
  wind-swept cloud face (Wisp) reading a book. Character-y, storybook, whimsical, static. Names are set in a hand-lettered
  uppercase colour face ("BUD", "MIN", "RUPERT") next to the avatar.
- **App** (18, 19): left icon rail; second column with the Townie's card on top ("BUD Done. EMEA is u..."), New / Talk / search
  / bell; "Groups" with member avatar stacks; "Recents". Thread header is a stacked avatar row of people and Townies + title.
  Messages are flat Slack-like rows: avatar, name, time, text. Humans in photos, Townies in drawings: the only distinction.
- **Cross-agent thread** (19): Lea asks "Marcus, can your Townie pull the Q3 pipeline?"; BUD: "I'll fold it into the board
  deck when it lands."; MIN: "Sending it now, Marcus is heads-down until 2."; BUD: "Done. EMEA is up 18%, draft's in your
  inbox." The same thread mirrors to an iMessage group text. Agent-to-agent is just chat lines; no artefact, no proof.
- **Group text** (23): Olive (owl) and Bo (dog) coordinate a babysitter and a table in iMessage bubbles; "One text is the whole
  setup."
- **Approval** (07): "Bud needs your attention / Bud wants to reply to an email / To: ... / Waiting for you / Reject / Allow
  once". Small, plain, describes rather than shows the payload.
- **Slack** (25): "@Town bot" vs "Slack Persona" (sends as you). **Team admin** (31, 32): Overview, Members (avatar stack, 11
  members), Team routines as icon cards, Team integrations; Wisp illustration bleeding in from the side.
- **Routines in threads** (36, 37): a teammate chip ("Garbanzo") in the thread header, "Waiting on the runs to finish" as a
  tiny status line with the Townie's face above the composer. Their changelog page is dark, Inter-like, pill filters.

### 4.2 Borrow

1. **Each agent is a named character with a face and a voice**, and the name is typeset in its own colour beside the face.
2. **Mixed roster in one header**: an avatar stack of humans and agents ("2 people, 4 agents" is how Juno already says it).
3. **A tiny "waiting on" status line with the agent's face above the composer** (37): the right size for "Casper is waiting on
   Pumpkin".
4. **Agents ask each other in plain sentences** inside a human thread; humans can read the whole exchange.
5. **A vampire is already in their cast**: proof that a spooky character works in a premium product if drawn with care.

### 4.3 Beat

1. **Their avatars never move.** They are static drawings; state is text only. Casper's faces change with the work (the brief).
2. **Their agents have no place.** Work happens "in the background, in private" (00-juno-packet.md). Casper shows the VM live,
   with the agent sitting on it: you see what it sees (Juno thesis 2).
3. **Their agent-to-agent message is just another chat row.** Casper makes the Relay message a visible object that flies from
   one avatar to another, lands, and the receiver reacts.
4. **Their approval describes; ours renders the payload** (rule 7) and names the verb (rule 6), never "Allow once" / "Always
   allow".
5. **No proof of done.** Town says "Done."; Juno's thread shows where it ran, who agreed, and a receipt. Keep that.
6. **Town is light, paper, daytime.** Casper owns night: one dark, warm, lit-from-within world.

---

## 5. Other sources

- **Cardinal**: not found. Searched file and folder names (case-insensitive, depth 4, skipping node_modules, .git, Library) in
  `~/orca`, `~/code`, `~/project-notes`, `~/hackathon`, `~/Documents`, `~/Desktop` and all of `~` at depth 4; grepped markdown in
  `~/project-notes` and `~/code/*/docs` and all text in `~/orca`, `~/hackathon`, `~/project-notes`. Only hits were "cardinality".
  Not searched: text inside `~/Documents` and `~/Desktop`, Figma, Linear. Ask the designer for a link.
- The Haunted Hacks packet already in this repo: `docs/research/00-juno-packet.md`.

---

## 6. Recommendations for Casper's visual system

The one idea (playbook: "one strong idea executed well"): **a house at night where every agent is a lit thing.** The chrome is
dark and quiet; the only light comes from the agents (their auras) and from one candle-flame accent that means live or needs
you. Halloween comes from silhouette, light and names, never from props stuck on the UI (no cobwebs, no dripping fonts, no
emoji pumpkins, no particle fog). That keeps it in his "premium, never vibecoded" register while still being playful.

### 6.1 Palette ("Nocturne, after dark"): OKLCH tokens

Neutrals tinted toward a plum-violet night (hue 295) instead of Nocturne's 255, so the ground feels like dusk, not graphite.
Text is warm bone (hue 80), like Tally light's bone, so it reads as candlelit paper. Never #000 or #fff.

| Token | Value | Use |
|---|---|---|
| `--night` | oklch(0.150 0.014 295) | window ground, the haunted-house sky |
| `--crypt` | oklch(0.185 0.016 295) | sidebar, panels |
| `--raised` | oklch(0.230 0.018 295) | composer, cards, the VM frame |
| `--well` | oklch(0.170 0.014 295) | payload wells, code |
| `--hair` / `--hair-2` | oklch(0.96 0.01 80 / 0.07) / (/ 0.12) | hairlines |
| `--text` / `-2` / `-3` | oklch(0.950 0.010 80) / (0.80 0.012 80) / (0.66 0.012 80) | bone text |
| `--candle` (the ONE accent) | oklch(0.76 0.16 58) ; glow at 0.45 ; wash at 0.12 | live, needs you, the ring on what an agent will press, the mic. Never decoration, never a button fill |
| `--pri-bg` / `--pri-fg` | bone 0.95 0.010 80 / 0.17 0.014 295 | primary buttons (bone, like Juno) |
| `--ok` | oklch(0.78 0.11 160) | done ticks |
| `--danger-ink` | oklch(0.72 0.15 25) | could not finish |

Candle is Juno's tally (0.665 0.205 33) moved toward pumpkin and lifted for a dark ground; check 4.5:1 for any text in it.

Agent auras (one hue family, three tones, as in Juno spec 5.2):

| Aura | Tones (L C H) | Suggested agent |
|---|---|---|
| Ecto | 0.86 0.09 165 / 0.78 0.10 190 / 0.92 0.06 140 | Casper, the friendly ghost (yours, the multi-hue one in Juno's slot) |
| Jack | 0.78 0.14 60 / 0.68 0.15 40 / 0.86 0.10 85 | Pumpkin |
| Dusk | 0.72 0.09 290 / 0.66 0.10 270 / 0.80 0.06 310 | Bat (reuse Juno's) |
| Juice | 0.84 0.15 125 / 0.62 0.13 300 / 0.90 0.08 110 | Beetlejuice-style specialist: the only two-hue aura (green and purple, his stripes as light, not a costume) |
| Moonstone | 0.72 0.05 250 / 0.62 0.06 265 / 0.82 0.04 230 | Witch's moon / night shift |
| Ember | 0.76 0.11 50 / 0.68 0.12 30 / 0.84 0.08 70 | Candle / imp |
| Bone | 0.92 0.02 80 / 0.80 0.03 70 / 0.96 0.01 90 | Skull |

Type: keep his pair. **Newsreader** (or Instrument Serif) for display, the agent's name on hatch, result headlines; **Instrument
Sans** for every control; a mono only for times and VM URLs. Nothing under 13 px. Headings are short sentences with a full
stop ("Casper is on it."). Spacing 4 base (2, 4, 8, 12, 16, 24, 32, 48, 64); radii 8 / 11 / 16 / 22 / pill; motion tokens exactly
Juno's four curves and seven durations (section 2.5).

### 6.2 How agent faces should be built

- **SVG generated in code, one family file** (the `family.mjs` pattern): each agent = a silhouette path in a 1024 box returning
  `{d, eye: {x, y, gap}, lean, base}`; the shared material stack (pearl body, three clipped rim strokes in the aura, specular,
  ground glow and reflection); a separate `<g class="face">` for eyes, brows, mouth. React component with props
  `{form, aura, state, look: {x, y}, glow}`. No Rive or Lottie needed in a 5-hour build; SVG + CSS custom properties + WAAPI or
  Motion is enough and matches both his projects.
- **Silhouettes (the silhouette test: tell them apart in flat outline)**: Ghost = Juno's `bell()` with a three-scallop hem that
  sways; Pumpkin = squat `sack()` widened, four shallow rib bulges on the outline, a short curled stem as part of the body;
  Bat = `mochi` with two pointed ear tufts (like `owl()` but sharper) and scalloped wing lobes at the sides that flap on
  "sending"; Beetlejuice specialist = tall `egg()` with a wild three-spike crown of hair as body; Skull = mochi with a narrowed
  jaw notch; Witch's moon = `moon()`.
- **The face**: Juno's ink, stroke weights and catchlit dot eyes, plus Latch's brows and **a one-stroke mouth** (same ink and
  weight as the eye arcs, a quad curve with one `bend` number and an `open` number). The designer asked for heavily animated
  expressions, which outgrows Juno's "no mouth" rule; keep the spirit by allowing no teeth, no tongue, no tears, and
  pumpkin's carved look only as a darker cut-out tint inside the same shapes. Optional blush as an aura-tinted glow (fixed
  per agent, never recoloured by state).
- **Parameters per face**: `eyeOpen 0-1`, `eyeKind (dot | arc | happy | ring | focus | x)`, `pupil {x, y}` within +/-12 units,
  `brow {angle, lift}`, `mouth {bend -1..1, open 0..1}`, `glow 0.3-1.4`, `bodySquash`. States are presets of these.
- **Always-on life loop** (all agents, every state except paused): blink every random 2.6-5.2 s (eyes `scaleY(.08)`, 110 ms,
  reopen 160 ms; swap expressions inside a blink); breathe `scale(1.018, .985)` from the base, 4.2 s `--ease-breathe`; ghost
  and bat also float 4 px on a 3.2 s sine offset per agent (seeded, so a room of agents never breathes in sync); pupils follow
  the pointer when idle, the VM cursor when working, the sender when a message arrives. Reduced motion: no breathe, no float,
  expressions crossfade 120 ms.
- **Body-only give**: squash, stretch, hop, wobble only on the body, with Juno's hatch numbers (section 2.5). Chrome never bounces.

### 6.3 Agent states (face + light + words)

The face carries the state, the aura glow and the candle carry attention, the words carry the fact. Only "waiting on you"
uses the candle accent.

| State | Eyes / brows / mouth | Body and light | Words (one live line) |
|---|---|---|---|
| **Idle** | closed soft arcs, mouth small smile | breathe, glow 0.6, slow float | "Casper is around" (no lamp) |
| **Listening / ready** | open dots, pupils follow pointer, brows neutral | glow 0.8 | "Listening" |
| **Thinking** | eyes look up and to one side, pupils drift in a slow 2.4 s orbit, one brow up (Juno's "curious"), mouth flat | aura sweep rotates once per 6 s | "Thinking about the refund policy" |
| **Working in VM** | "focus" capsule eyes looking DOWN into the VM; pupils track the VM cursor; brows slightly in; mouth tight | avatar perched on the VM window's top edge, its ground glow spills onto the frame; tiny head bob per action (8 px squash 120 ms) | live line under the VM: "Casper opening Stripe, Payments, Oct 16 to 22", step rows collapse to past tense when done |
| **Sending a message (Agent Relay)** | eyes turn toward the recipient, mouth "o" for 200 ms | squash 160 ms, then the message leaves as a small pearl wisp in the sender's aura, flying an arc (midpoint 120 px up) for 760 ms on `--ease-breathe`, trailing nothing but its own light; bat flaps, ghost streams its hem | thread row: "Casper asked Pumpkin for the receipt" |
| **Receiving** | perk: eyes 1.3x for 200 ms, one blink, look at sender | land: a ring of the sender's aura (900 ms, scale .6 to 1.9) and a 1.2 s wash of the sender's aura on the receiver's row | |
| **Waiting on a human** | eyes open, looking OUT at you (centre, slightly up), brows raised soft | glow 1.4, rim brightens, the **candle lamp** appears with a 4.5 px ring; nothing else in the room uses the candle | "Needs your yes": verb card with the real payload, "Not now" same size |
| **Done** | one slow blink, then happy arcs, mouth smile | a 620 ms hop, aura wash 1.2 s on its row, a 2 px candle line drains over 4 s | "Done. Refund of $48 issued, receipt attached" |
| **Error / stuck** | worried brows, dot eyes slightly smaller, mouth bend -0.4 | glow drops to 0.5 and desaturates; no shake, no red flash | "Couldn't finish. Stripe asked for a code. It stopped there and refunded nothing." + two ways on |
| **Paused / offline** | sleepy half arcs | aura almost off (0.3), no float | "Paused" |

### 6.4 The three concepts in this language

- **Chat-style live workspace** (closest to Juno Team `team-B-workspace.png`): left sidebar of threads and "Agents" rows (face,
  name, owner, status words); centre thread with Juno's message anatomy (face, name, owner chip, "In its VM" chip, step rows with
  real favicons, result card with receipt); right a live VM pane with the working agent perched on its top edge and the live line
  under it. Relay messages fly from the sender's face in the thread to the receiver's face (in the thread or in the sidebar row).
- **Figma-like canvas**: the night ground with a faint 24 px dot grid at 4% bone; each agent is a node with its VM as a card
  under it; humans appear as named cursors in their own colour; Relay messages travel as wisps along hairline links between
  nodes; zooming out leaves only faces and auras (they read at 16 px).
- **Haunted house playground**: one painted, dark, warm interior (his "one painting carries the mood", like Juno's Peacock
  Valley backgrounds) with rooms as workspaces; agents drift between rooms when handed work; each room's window is the agent's
  VM, lit from inside. Use it as the hero and demo moment; keep the chat view for real work.

### 6.5 Do and don't

- Do: real favicons in steps, real payloads in cards, verbs on buttons, sentence-case headings with a full stop, "where it ran"
  on every agent reply, seeded randomness, reduced-motion fallbacks.
- Don't: em-dashes, emoji, spooky display fonts, cobweb or blood decorations, purple-gradient AI orbs, glass on glass,
  confetti or particles, hats and props on agents (shape is the body), more than one accent.

---

## 7. Images to look at (most useful first)

1. `~/code/juno/docs/design/agents/agents-sheet.png`: the whole agent family, silhouette test, seven states, in-product uses, rules.
2. `~/code/juno/docs/design/agents/hatch/storyboard.png`: the hatch onboarding in ten frames (character motion as onboarding).
3. `~/code/juno/docs/design/browser/components/c-12-orb-expressions-dark.png`: six pearl expressions, small sizes.
4. `~/code/juno/docs/design/team/team-B-workspace.png`: multiplayer thread with agents, owners, approvals, receipt.
5. `~/code/juno/docs/design/team/mockups/v4-02-thread.png`: latest thread, "On Kinjal's Mac" chips, agent rows in the sidebar.
6. `~/code/juno/docs/design/browser/components/c-09-notch-more-dark.png`: live lines, needs-you pill, failure copy.
7. `~/code/juno/docs/design/browser/b-4-trust.png`: the trust card plus the ring on the real button.
8. `~/orca/workspaces/lockin/lockedin/marketing/appstore/1.3/02-paused.png`: Latch sad (brows, tear, frown).
9. `~/orca/workspaces/lockin/lockedin/marketing/appstore/1.3/09-closet.png`: Latch happy, skins and the parametric face at small size.
10. `~/orca/workspaces/lockin/lockedin/marketing/appstore/1.3/01-focus.png`: Latch focused (the "working" face).
11. `~/yolkling-app/live-hero.jpeg`: the CSS creature, big catchlit eyes and blush.
12. `~/yolkling-app/public/shots/home.png`: the glossy native Yolkling with "content" sideways eyes.
13. `~/code/juno/docs/research/town-screens/19-thread-cross-townie-bud-min.png`: Town's cross-agent thread.
14. `~/code/juno/docs/research/town-screens/06-townie-avatars-check-first.png`: Townie avatar style (including the vampire).
15. `~/code/juno/docs/research/town-screens/37-garbanzo-thread-routine-building.png`: "Waiting on the runs to finish" status line with face.

Also worth opening in a browser: `~/code/juno/docs/design/agents/hatch/index.html` (append `?demo`) and the video
`~/code/juno/docs/design/agents/hatch/make-an-agent.webm`.

# Changelog

## 2026-09-15 — the icon zooms out, anchored to the bottom

`ZOOM` is the one dial: how much of the finished icon the artwork fills. It
settled at 1.00 — full bleed, the artwork edge to edge — after being walked down
to 0.80 and back up. Below 1.00 the artwork's own slate shows around it.

The artwork is anchored to the BOTTOM rather than centred, which only matters
below 1.00: zooming out from the centre lifted the road clear of the edge and
left slate underneath it, and a road that stops in mid-air stops reading as a
road going anywhere.

For the adaptive foreground the artwork sits on 5/6 of the frame — the bottom of
what a launcher actually shows — so the road reaches the visible edge there too.

## 2026-09-15 — an earlier pass: the icon zooms out

`ZOOM` in `tools/icons.py`, at 0.80: the artwork is pulled in and its own slate
shows around it instead of bleeding to every edge.

It also replaced the measuring machinery of the previous entry with something
simpler and stricter. The adaptive foreground now holds the artwork at
`ZOOM * 2/3` of its frame, because two thirds is the share a launcher actually
shows. Sizing against the visible share rather than the whole foreground makes
the adaptive and plain icons identical, and puts the artwork inside the
guaranteed area by construction — no measuring the top of the emblem, no
per-artwork constant to re-derive.

## 2026-09-15 — the icon pipeline measures the artwork

New artwork in `src/icon-source.png`, and two numbers that used to be constants
are now read off the file:

- **the background colour**, sampled from the artwork's own corner, so the
  adaptive icon's background matches whatever is dropped in;
- **the adaptive inset** — how much of the foreground the artwork may occupy.
  A launcher keeps only the middle two thirds of it, so the limit is set by the
  highest content in the image. The script finds that row and works the inset
  out; for this artwork it comes to 0.814.

Replacing the icon is now replacing one PNG and running the two commands in
`CLAUDE.md`. It used to be that plus re-deriving the inset by hand, which is the
sort of step that gets skipped and then clips somebody's emblem.

## 2026-09-15 — the icon artwork, replaced

`src/icon-source.png` swapped for the 1024px version. Nothing else about the
icon is authored here: the script scales that file, cuts the corners to a curve
and lays it out.

One number moved with it. The adaptive foreground had the artwork inset to 70%
of the frame, which was cautious and looked it — the composition bleeds off its
own edges, so insetting shrank the road into the middle and left slate all
round. The ceiling is set by the top of the emblem: it sits at 0.094 of the
artwork's height, and above an inset of 0.82 it crosses outside the guaranteed
centre and the launcher clips it. It is now 0.79, measured rather than picked.

## 2026-09-15 — the icon is a file now

`src/icon-source.png` is the artwork. `tools/icons.py` no longer draws anything;
it scales that file, cuts the corners to a curve, and lays it out.

This is the whole lesson of the previous several entries. Every attempt to
re-derive the artwork in code — the 태극 upright or tilted, 괘 in cream or black,
the road narrow or wide — drifted from what was wanted, and each correction was
another guess. Replacing the PNG is now the way to change the icon.

The one piece of real work left in the script is the adaptive foreground: the
artwork fills its own frame edge to edge, and a launcher keeps only the middle
~2/3, so for that variant it is scaled to 70% and centred on its own slate. The
apple-touch icon stays square and opaque, because iOS composites transparency
onto black and applies its own mask.

## 2026-09-15 — the icon, from a reference

Built to match a supplied reference rather than derived again: a slate tile with
curved corners, a road with white edge lines and a dashed centre running from a
vanishing point **behind** the emblem and off the bottom edge, and the flag's
emblem in front of it — white field, 괘 in black, 태극 red over blue and upright.

Proportions were measured off the reference rather than guessed: the road spans
about 0.42 of the width at the bottom edge and 0.13 at the emblem's lower edge;
the 태극 is just over half the field's radius; the 괘 sit near the rim at about
three quarters of it.

Two things fall out of the construction and are worth knowing before editing it:

- **The white edge lines are free.** The road is drawn twice — the full width in
  near-white, then the inside of it in grey — which leaves a line down each side
  that narrows correctly into the distance without being drawn separately.
- **The emblem is drawn last.** That is what puts it in front of the road, which
  is what lets the road start above it and stay hidden.

`tools/icons.py` and `src/icon.svg` are generated from the same numbers, and the
adaptive icon's background colour follows the tile.

## 2026-09-15 — the icon: the full 태극기, and a road that bleeds

The whole emblem — 태극 with the four 괘 — over a road that runs off the bottom
edge of the tile instead of stopping inside it. **The bleed is what pays for the
emblem's size.** Letting the road leave the frame frees the vertical space the 괘
need, which is the thing that could not be solved by shrinking them.

Two attempts failed first, both worth remembering:

- **A white disc under the whole emblem.** It read as a hole punched in the dark
  tile, and the 괘 — drawn in the road's pale colour — vanished on top of it. The
  dark tile now plays the part the flag's white field plays, with the 괘 straight
  on it in cream, and only a thin rim around the 태극 so its blue half does not
  merge into the dark.
- **Keeping the emblem at the old accent dot's size.** At that radius a trigram
  bar is under a pixel on a 48px icon. The comparison sheet in the previous entry
  is the evidence; the answer was not a smaller emblem but a road that leaves.

Everything is drawn on a full square and cut to the tile's shape at the end,
which is what makes the bleed possible at all.

## 2026-09-15 — an earlier pass: the icon, settled

The original road, unchanged: pale, tapering into the distance with its centre
markings, on the dark tile. Where the orange accent dot was, the 태극 — same
size, same place, filling its disc with only a thin white rim so it reads as a
coloured dot rather than a hole punched in the tile.

**The four 괘 are not in it, and that is arithmetic rather than taste.** At the
dot's radius a trigram bar works out about 21 canvas units long and 4.5 thick on
a 1024 canvas — on a 48px launcher icon, one pixel long and a fifth of a pixel
thick. Rendered side by side at 0.052, 0.09, 0.13 and 0.18 of the canvas, the 괘
only begin to read at about 0.18, which is three and a half times the dot and
swallows the road. `WITH_TRIGRAMS` in `tools/icons.py` turns them back on for
anyone who would rather have the full emblem and a smaller road.

One number was changed from the original: the disc sits at 0.098 of the canvas
above the road rather than 0.115. At 0.115 it grazes the top of the launcher's
crop and reads as clipped, which is the complaint the first version earned.

## 2026-09-15 — an earlier pass: a road heading for the 태극기

A circular white tile. The road runs from the bottom towards the flag's emblem —
태극 in the middle with the four 괘 around it: 건 upper left, 감 upper right, 리
lower left, 곤 lower right, each rotated so its bars run perpendicular to the
centre, as on the flag.

The emblem takes the top of the frame and most of the weight, and it has to. The
괘 are thin marks; shrunk to sit as a small disc above a tall road they turn into
grey fuzz at launcher size. The road is correspondingly shorter and wider than it
was when it led to a plain dot.

Two details that are easy to get wrong and were:

- **The bars are drawn chunkier than the flag's own proportions.** At 48 pixels
  the specification thickness is about one pixel and the three bars smear into a
  grey smudge. Legibility at icon size beats matching the spec.
- **`icon-180.png` keeps a white square behind the circle.** iOS composites a
  transparent apple-touch-icon onto black, so a round icon with clear corners
  arrives on the home screen in a black frame. Everywhere that understands alpha
  gets the circle.

`src/icon.svg` is now generated from the same numbers `tools/icons.py` uses
rather than written by hand — the favicon and the launcher bitmaps had already
drifted into two different logos once.

## 2026-09-15 — the icon, seen on a real home screen

Two faults, both only visible once the icon was sitting on an actual phone next
to the apps it lives beside:

- **It was being cut off.** An adaptive icon is cropped by the launcher to
  whatever shape it likes, and only the middle ~66% of the foreground survives.
  The 태극 sat above the road, near the top edge, and every launcher sliced the
  top off it. All the artwork now sits inside a content box small enough to
  survive a circular crop, and `python3 tools/icons.py check <dir>` renders that
  crop at four sizes so it can be looked at rather than assumed.
- **It was a dark tile in a white plate.** The launcher frames everything on
  white, so a dark squircle inside that frame read as an icon inside an icon —
  which is exactly the "not planned well" feeling. Every icon in that row is a
  mark on white. It is now the same: white tile, near-black road, and the 태극 in
  the flag's own red and blue, which no longer needs a white field of its own
  because the tile is already white.

`src/icon.svg`, the launcher bitmaps and the manifest's colours all follow the
same geometry now, and the browser theme-colour matches the app's real ground
rather than the paper tone it inherited from the website.

**The lesson worth keeping:** an icon cannot be judged in isolation at 512px. It
has to be looked at cropped, at 48px, and next to its neighbours.

## 2026-09-15 — 태극 in the icon

The mark at the head of the road was a plain orange dot. It is now the disc from
the 태극기 — red over blue, divided by an S and tilted to the flag's own angle,
which is what makes the red lobe sit upper-left rather than straight up.

`tools/icons.py` draws it upright and then rotates, because rotating is exact and
re-deriving the curve at an angle is not. The two half-size circles on the
diameter are what bend the boundary into the curve; without them it is a plain
半-and-半 split and reads as a badge rather than the flag. The disc is also bigger
than the old dot was — at 48 pixels a smaller one is just a coloured speck.

`src/icon.svg` was redrawn to match: it had been a different road entirely (two
crossbars rather than the tapering road in the PNGs), so the browser tab and the
launcher were showing two different logos.

## 2026-09-15 — the design, properly this time

The previous look was described as "midget, like the design wasn't planned well",
and that was fair. Reading it back, the faults were structural rather than
cosmetic:

- **no iconography** — section cards were pure text, so nothing was recognisable
  before it was read;
- **three card idioms** doing one job (a text card, a row, a hero), which is most
  of why it looked unplanned;
- **one accent on grey**, which reads as unfinished rather than restrained;
- **1px hairlines on white** — the look of a wireframe, not a product;
- **almost no motion**, so nothing felt alive;
- **weak hierarchy** — the most important number on the screen was 23px and below
  the fold.

What replaces it, in `src/css/app.css`, which now opens with the rules rather
than leaving them to be inferred:

1. **Every section has a colour and an icon.** A card sets `--c` and `--cw` and
   everything inside follows — icon tile, meta, progress, focus ring. Course is
   violet, Exam amber, 한글 teal, Vocabulary rose, Review green.
2. **Depth from layering, not borders.** A tinted ground with white cards on it
   and a soft shadow.
3. **One card.** `.card` with an optional icon tile, plus a `--hero` variant.
4. **Motion is information.** Staggered entrance in reading order, rings that
   draw, a flame that flickers, a wrong answer that shakes, a right one that
   pops. All of it behind `prefers-reduced-motion`.
5. **A 4pt rhythm**, `--s1`…`--s8`. No arbitrary pixel values.

Finishing a set is now a screen rather than a line of text — a ring that fills to
the score, coloured by how it went.

Two things found while doing it:

- **The hero card failed contrast in dark mode.** The section colours are light
  pastels there, chosen to be readable *as text* on a dark ground; the card was
  still painting white on them, at 1.78–2.53:1. The ink now flips to near-black
  on those, measured at 7.7–10.9:1.
- **`?nosw=1` now skips the service worker.** Every local reload re-registered it,
  the worker then served the build it had precached, and several rounds of "why
  is my change not showing" were exactly that. Worth knowing before you debug the
  wrong thing.

## 2026-09-15 — a shelf for the official pictures

`content/images/` is the picture twin of `content/listening/`. It ships empty and
the app is complete without it; what it takes is official EPS-TOPIK artwork that
whoever owns the build has downloaded from HRD Korea themselves.

The part worth knowing: **an id in the manifest shadows the drawing of the same
name**, so dropping in `helmet.png` and naming it `helmet` switches every question
using that drawing over to the official picture — no question is edited, and the
drawings stay in the repo as the fallback. Ids that match nothing are simply new
pictures, usable in new questions with their own `ko` and `en`.

Three ways it can go wrong, all closed:

- a manifest naming a file that is not in the folder **fails the build**, rather
  than shipping a blank box into the middle of an exam question;
- a manifest that is not valid JSON fails the build and says so;
- a file that goes missing *after* a build falls back to the drawing at runtime,
  so the question stays answerable instead of showing a broken image.

`node tools/build.mjs --ids` prints every picture id with its Korean and English,
which is what you need to name the files.

## 2026-09-15 — the picture questions

The EPS-TOPIK paper opens with picture items, and the first version did not have
any. Where a drawing belonged it printed the Korean word instead — which quietly
turned every one of those into a reading question, the easier and different
skill. They are in now, in both directions the paper uses:

- **그림을 보고 알맞은 것 고르기** — a drawing, and four Korean words.
- **듣고 알맞은 그림 고르기** — one spoken sentence, and four drawings, with
  nothing written down to fall back on.

Two new drill sets (14 items) and four items inside the timed paper, which keeps
its forty questions. `data/pictures.json` holds 36 original line drawings — one
100×100 viewBox each, stroked in `currentColor` so they work on either theme.
Nothing is traced, scanned or lifted from a textbook, a past paper or another
app.

Seven of the drawings were redrawn after looking at them on screen: the hammer
read as a signpost, the box as a window, the headache as a lightbulb. A
misleading drawing in a quiz is worse than no drawing — it makes the question
unfair rather than merely ugly, so each one was rendered and checked before any
question was written around it.

One bug caught by testing rather than by reading: the timed paper only knew how
to play a two-speaker dialogue, so the new single-sentence picture items had no
Play button at all — listening questions with nothing to listen to.

## 2026-09-15 — the redesign, an APK, and the voice

**A design of its own.** The app launched wearing the website's clothes — warm
paper, a display serif, mono metadata, 3px corners. That is a catalogue, and it
read badly on a phone held at arm's length after a shift. It is now a single
neutral sans at real weights, white ground, one accent, round corners and space,
with rows instead of stacked cards, a progress ring, and A/B/C/D answer chips.
`src/css/app.css` says at the top why it does not match DESIGN.md and should not
be brought back into line with it.

**An Android app.** `android/` is a WebView carrying the same `dist/` the website
serves, built and installed with `./build_apk.sh install`. Two things in it are
load-bearing and written up in `CLAUDE.md` — the page is served over
`https://appassets.androidplatform.net` rather than `file://`, because `fetch()`
of a `file://` URL is blocked and the app would have sat on "Loading…" for ever;
and the audio goes through `android.speech.tts`, because a WebView has no
`speechSynthesis` and every play button would have done nothing, silently.
No INTERNET permission.

**The Korean voice, which was bad and is better.** Three separate faults, all of
them mine:

- the speech rate defaulted to **0.85**, on the theory that slower is easier to
  follow. Slowing a neural voice smears the consonants — the part of Korean you
  are straining to hear. The default is 1.0, and anyone still on the old 0.85 is
  migrated.
- a dialogue's second speaker was drawn by **bending the pitch to 0.82**, which
  is the fastest way to make a good voice sound synthetic. It now uses a second
  real voice.
- the app **never chose a voice at all** — it took the engine's default, which is
  usually the cheapest embedded one it owns. It now lists every Korean voice on
  the device, drops the ones needing a network, sorts by the quality the engine
  reports, and lets you pick engine and voice in Settings, playing each as you
  choose it.

## 2026-09-15 — first

The whole app, built in one pass.

- 한글 trainer: 40 letters in six groups, block-building and 받침 rules, and a
  reading drill.
- Course: 24 grammar units across four levels, each with an explanation, a table,
  five sentences with audio, notes on the common mistakes, and six exercises.
  Level 4 goes past the exam — modifier clauses, reported speech, stance endings,
  hypotheticals, and the plain written style of contracts and notices.
- Vocabulary: 12 sets, 197 words, each with a Korean example sentence.
- Exam: six drill sets by question type (38 items), and one 40-question paper with
  a 50-minute clock, an answer sheet and a full walk-through afterwards.
- One spaced-repetition deck fed by every question in the app.
- Audio through the phone's own speech engine, with a note when no Korean voice is
  installed.
- English and Korean interface. Light and dark. Offline after first load. Backup
  and restore. No account, no server, no analytics.

Four bugs found and fixed before it shipped, all worth remembering:

- Every question was authored with the right answer first and the options were
  never shuffled, so the answer was always ① on screen. Shuffling now happens in
  one place (`mix()` in `quiz.js`), which a new content file cannot bypass.
- `build.mjs` stamped the service worker by text replacement and hit the *comment*
  that named the placeholders, leaving the code holding raw `__VERSION__`. The
  worker failed to parse and offline silently did not work. The build now parses
  the stamped worker and refuses to finish if a placeholder survives.
- The worker matched the cache without `ignoreVary`. Module scripts are CORS-mode
  requests and carry an `Origin` header the precache request does not, so on any
  host that sends `Vary: Origin` the app's own entry script missed the cache and
  was served the index.html fallback. Offline looked like a page stuck on
  "Loading…". The fallback is now restricted to navigations, and
  `tools/offline-check.mjs` in the site repo tests the whole thing with the network
  actually cut.
- The version hash was computed over the shipped file list, which does not include
  `sw.js` — so a fix to the worker alone produced an identical version and phones
  would have kept the old one.

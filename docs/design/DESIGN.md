# HANGIL: the app's design

**Premium minimal.** Calm, quiet, precise, warm, unhurried.

This governs the **app**. The website has its own DESIGN.md in the site repo,
with its paper, serif and 3px radii, and the two are deliberately different: a
catalogue read at a desk and a phone held after a shift want different things.

Values live in [`src/css/tokens.css`](../../src/css/tokens.css). This file says
what they are for. Change both together. `preview.html` beside this file shows
all of it, before and after, in both themes.

---

## What "premium minimal" means here

The app already had good bones: one card component, depth from shadow rather
than borders, a colour per section, motion with meaning, a 4pt rhythm. All of
that stays. What changes is the **volume**:

- **Colour is a signal, not a surface.** A section's colour appears on three
  things only: the glyph or icon in its tile, its percentage pill, and its
  progress line. Icon tiles are neutral grey. Nothing large is filled with a
  section colour.
- **One dark, quiet primary.** Buttons, the Today hero card and focus rings use
  `--primary`, the deep navy of the app icon. It replaces the violet and orange
  hero fills.
- **Type speaks at a normal volume.** No tracked-out capitals. Meta lines are
  small, grey and in sentence case ("Lesson 3", not "LESSON 3 · DONE · 100%").
  Headings are a little lighter. Korean subtitles are grey, not coloured.
- **Thinner everything.** Progress lines are 4px, down from 10. Icon strokes
  are 1.7, down from 1.9. Shadows are softer.
- **Scores are pills.** Any percentage shown on a card is a gauge pill, never
  digits in a meta line. See below.

## Palette

Contrast is measured, WCAG 2.x, as text on `--surface` (light) or `#17181B` (dark).

| Role | Token | Light | Dark | Contrast L / D |
|---|---|---|---|---|
| Page background | `--ground` | `#F8F8F7` | `#0E0F11` | n/a |
| Cards | `--surface` | `#FFFFFF` | `#17181B` | n/a |
| Icon tiles, quiet fills | `--sunk` | `#F1F1EF` | `#1F2124` | n/a |
| Progress tracks | `--sunk-2` | `#E7E7E4` | `#2A2C30` | n/a |
| Tab-bar edge, table rules | `--hairline` | `#ECECEA` | `#24262A` | n/a |
| Text | `--ink` | `#131416` | `#EDEEF0` | 18.4 / 15.3 |
| Secondary text | `--ink-soft` | `#5D6169` | `#A3A7AF` | 6.2 / 7.4 |
| Meta, icons only | `--ink-faint` | `#8E929A` | `#72767E` | 3.1 / 3.9 ⚠ |
| Primary | `--primary` | `#15304F` | `#C9D6EA` | 13.4 / 12.1 |
| Alphabet | `--c-hangeul` | `#0F6B7C` | `#7CCBDA` | 6.2 / 9.7 |
| Course | `--c-course` | `#5145CD` | `#AFA8F5` | 6.8 / 8.2 |
| Vocabulary | `--c-vocab` | `#A6345F` | `#EE9CBC` | 6.4 / 8.6 |
| Exam | `--c-exam` | `#96591A` | `#E3B07A` | 5.6 / 9.1 |
| Review, right answer | `--c-review` `--good` | `#2E7A4C` | `#86D3A2` | 5.2 / 10.0 |
| Trades | `--c-trade` | `#2C55B5` | `#9DB7F2` | 6.8 / 8.9 |
| Today, streak | `--c-today` | `#B4471B` | `#F0997A` | 5.4 / 8.1 |
| Wrong answer | `--bad` | `#B3261E` | `#FF8F84` | 6.5 / 8.0 |

⚠ `--ink-faint` is below 4.5:1 on purpose and is never used for body text:
only for meta at 12.5px or larger, and for icons. That rule carries over
unchanged from the previous palette (3.3:1).

**A section's wash is derived, never listed:**
`color-mix(in srgb, var(--c) var(--wash), transparent)`, at 13% light and 16%
dark. The old palette listed seven `--cw-*` tokens by hand.

**Text on a filled colour** uses `--on-fill`: white in light mode, `#0E0F11`
in dark mode, where the fills are light pastels. White on the dark-mode fills
is under 2:1. This is the old `--hero-ink` rule under a clearer name. White
on each light-mode fill measures 5.2–13.4:1.

## Type

**Pretendard** (Variable), SIL Open Font License 1.1, by Kil Hyung-jin. It
draws Korean and Latin as one family, so a line mixing 기본 모음 and "Lesson 1"
reads as one voice, which system fonts do not manage on most phones.

**It is bundled, never fetched.** The app makes no network requests (rule 2
in CLAUDE.md). The file is `PretendardVariable.woff2` from the 1.3.9 release:
**2.06 MB**, every weight from 45 to 920, and all 11,172 Hangul syllables.

*Why not the 270 KB subset files:* they hold only the 2,350 syllables of
KS X 1001. The alphabet practice composes syllables from letters, so it can
produce blocks outside that set. Any such block would appear in a fallback
font, and the alphabet is the one place where a block in a different face can
be taken for a different letter. The full file costs about 2 MB, and in
exchange every syllable is drawn by the same font.

The font goes in `src/fonts/`, and its licence goes in `THIRD-PARTY-NOTICES.md`.

| Use | Token | Size / weight / line | Tracking |
|---|---|---|---|
| Screen title | `--t-display` | 30 / 700 / 1.12 | −0.035em |
| Hero card title | `--t-title` | 21 / 680 / 1.25 | −0.03em |
| Card title | `--t-card` | 16.5 / 620 / 1.3 | −0.02em |
| Body | `--t-body` | 16 / 400 / 1.55 | −0.01em |
| Korean under study | `--t-ko-lg` | 22 / 600 / 1.45 | 0 |
| Korean subtitle | `--t-ko-sub` | 14 / 500 / 1.3 | 0 |
| Meta | `--t-meta` | 12.5 / 500 / 1.2 | 0, sentence case |
| Numbers in pills | `--t-num` | 13 / 680 / 1 | tabular figures |

Korean is never tracked negative. Letters and blocks being taught are always
real text, never SVG (see "The traps" in CLAUDE.md).

## The percentage pill

The score on a card is a **gauge pill**: a 64 × 28 capsule whose fill rises
to the score, with the number on top.

- **Track:** the section's wash. **Fill:** the section colour, with a straight
  right edge (a rounded edge makes 25% look like a half-moon).
- **The number is drawn twice.** In the section colour on the track, and in
  `--on-fill` clipped to the fill's width, so it stays readable at every
  score, including when the edge of the fill cuts through it.
- **States:**
  - scored: the gauge;
  - up next: an outlined pill in `--primary` reading "Up next";
  - not started: the plain chevron.
- **Where it goes:** alphabet lessons (`letters[id].score`), course units
  that have a score (`done[id].score`), and exam question types, where "best
  7/8" becomes a pill at 88%. The weak-spot screen keeps its bar and
  percentage, because there the number IS the content.
- **Markup:** never put the fill in an `<i>`. Browsers italicise it by default,
  and the clipped copy of the number leans while the other copy does not.

## Shape, space, depth

| | Token | Value |
|---|---|---|
| Card | `--r-card` | 20px |
| Button | `--r-btn` | 16px, 52px tall |
| Icon tile | `--r-tile` | 14px, 48 × 48 |
| Pill | `--r-pill` | 999px |
| Touch target | `--tap` | 48px, unchanged and not negotiable |
| Spacing | `--s1`…`--s8` | 4, 8, 12, 16, 24, 32, 44, 60, unchanged |
| Card padding | | 16px; list gap 10px |
| Progress line | `--bar` | 4px |
| Shadow | `--e1` | `0 1px 2px` at 4% plus `0 4px 16px` at 4.5% |

Depth is still shadow on a tinted ground, never a 1px border around a card.

## Icons

The app's own outline set in `icon()` (`src/js/util.js`), 24px grid, round
caps and joins, stroke **1.7**. It already matches **Lucide** (ISC licence) in
style, so if a new mark is ever needed, draw it the way Lucide would or take
Lucide's. Never use a filled icon, and never draw Hangul as an icon.

## Components

- **Card:** white on the ground, 20px radius, `--e1`. Neutral icon tile with
  the glyph in `--c`. Meta, then title, then Korean subtitle. A pill or a
  chevron on the right.
- **Hero card (Today):** `--primary` fill, `--primary-ink` text, meta at 70%
  opacity. One per screen.
- **Buttons:** primary is `--primary` filled; ghost is `--surface` with `--e1`.
  52px tall, 16px radius. No coloured glow shadows.
- **Tab bar:** a translucent ground with a blur and a hairline top edge. The
  active tab is `--ink` with a 4px dot under the label, not a filled block.
- **Streak:** a white pill with `--e1`, a dot and the number in `--c-today`.
- **Progress line:** 4px, `--sunk-2` track, `--c` fill. Its label sits above
  it: "Lessons" on the left, "6 of 8" on the right.

## Motion

Unchanged in intent: things enter in reading order, progress animates, and a
wrong answer shakes, all behind `prefers-reduced-motion`. One change: **no
spring overshoot.** `--ease-spring` is retired, and a right answer and the
result score settle with `--ease` instead of popping. Calm things do not
bounce.

## Do and don't

- **Do** measure every new colour pair in both themes before using it as text.
- **Do** keep colour to small marks. If a screen looks colourful, something is
  filled that should be tinted.
- **Don't** reintroduce uppercase tracked meta lines.
- **Don't** add a font, a weight file or a colour outside tokens.css without
  asking.
- **Don't** load anything from the network. Not the font, not icons, nothing.
- **Don't** shrink a touch target to make something look lighter.

## References

| File | What it informed |
|---|---|
| `references/current-alphabet-list.png` | The baseline: the alphabet list as it shipped in 1.0.1/1.0.2, where scores were digits in the meta line. The pill exists because of this screen. |
| `references/current-today.png` | The baseline Today screen: the filled violet hero card, coloured icon tiles, tracked caps. |

There were no outside style references. The direction is the owner's brief,
"premium minimalist", and the choices above (gauge pill, quiet colour,
Pretendard) were picked from `preview.html` on 2026-10-20.

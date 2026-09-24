# Changelog

## 2026-09-25 — six romanizations corrected, and a check that keeps them right

**Six `rom` values were wrong, and are fixed.** A learner memorises the
romanization exactly as it is printed, so a wrong one teaches the wrong sound:

- 주의 `jui` → `juui` — ㅢ is always *ui*.
- 체류 `chelyu` → `cheryu` — ㄹ before a vowel is *r*.
- 그라인더 `geurainedeo` → `geuraindeo` — a typo.
- 월급명세서 `wolgeup…` → `wolgeum…`, 화학물질 `hwahak-` → `hwahang-`, and
  방독마스크 `bangdok-` → `bangdong-`. A stop before ㄴ or ㅁ is said as a nasal,
  and Revised Romanization writes it that way, as 작년 *jangnyeon* already did.

**`tools/romanize.mjs` romanizes a whole word**, where `hangul.js` does one
syllable said on its own. It applies the RR rules that work across a syllable
boundary: 연음, ㄹ as *r* or *l*, 비음화, ㄹ after a consonant, 구개음화, and
ㅎ's aspiration. Like RR, it leaves tensification unwritten. It is a checker
only, and nothing in `src/` imports it, so the app is unchanged.

**`check-content.mjs` now fails on any `rom` that disagrees with it.** That
covers all 742 `rom` values that sit beside a `ko`: words, the alphabet
examples, the reading drills and the course's sentences. The 40 letters' own
`rom` values are left out, because a letter is not a word. Case is ignored
because RR capitalises names, and a hyphen inside a word is allowed because RR
permits one where a reading could be confused.

**Seven words are exceptions, listed one per line with a reason:**

- The house convention of keeping the h where ㅎ meets a stop: 막히다,
  깨끗하다, 따뜻하다 and 시작하다. Strict RR would write *makida*. This is a
  choice still to be made, not a fact, so the romanizer stays strict and the
  exceptions stay visible.
- Two nouns, 낙하 and 괴롭힘, where RR itself keeps the h.
- 밥하고, which is undecided.

The check also fails on an exception that is no longer needed, so the list
cannot quietly go stale. Tests for the romanizer are in
`tests/romanize.test.mjs`.

## 2026-09-25 — twelve more vocabulary sets

**Vocabulary: 24 sets, 404 words**, up from 12 and 197. The new sets, v13–v24,
are in `data/vocab-3.json` and `data/vocab-4.json`, easiest first: describing
things, where things are, actions at work, weather and seasons, feelings,
shopping, the phone, the dormitory, the bank and sending money home, holidays
and time off, the contract and the rules, and asking for help or reporting a
problem. With the trades that makes 612 words in the app.

Every headword is new: none repeats a word in v01–v12 or in either trades file,
checked by script rather than by eye. Each has an example sentence in the
grammar the course has taught by that point, so the early sets stay in the
present tense and 세요, and the contract and help sets are where 아야 돼요,
(으)면 안 돼요 and the formal register turn up.

**Ten new topic tags, and two reused.** The dormitory set is tagged
`daily-life` and the bank set `money-wages`, because they are the same subject as
v08 and v06 — a weak spot in paying rent is a weak spot in home and daily life.
The other ten sets each get their own.

**Romanization follows the existing sets where Revised Romanization is
ambiguous.** A stop before ㅎ keeps the h, as 막히다 *makhida* already does:
깨끗하다 *kkaekkeuthada*, 따뜻하다 *ttatteuthada*, 시작하다 *sijakhada*. Strict RR
would write the aspiration instead for a verb or adjective. Compounds are written
as one word without hyphens, the way 외국인등록증 is, and not the way the trades
files hyphenate them.

## v1.0.1 — 2026-09-24 — tests, and four faults from a full review

**Tests.** `node --test 'tests/*.test.mjs'` — Node's own runner, nothing to
install. They cover the syllable arithmetic in `hangul.js` (every one of the
11,172 syllables round-trips), the review schedule, the two decks staying apart,
`MIN_ATTEMPTS`, backup and restore, every review key resolving to its content,
and the alphabet lessons' generated questions.

**A failed download no longer deletes review history.** The review screens
forgot any key that did not resolve, assuming its content had been removed. But
a file that failed to download was quietly left out and cached that way for the
session, so one bad request for `course-3.json` erased the schedule of six units.
`load()` now names what did not arrive and tries again next time, and a key is
only forgotten when `gone()` says so after a complete load.

**Alphabet listening questions no longer offer two options said alike.** Wrong
options were kept apart by romanization, which spells vowels modern Korean has
merged — 재 and 제, 괘 and 궤, 져 and 저. `said()` in `hangul.js` keys a syllable
by how it sounds, and one option per sound is kept.

**Android 7–9 has a theme again.** `DayNight` is API 29; below that the theme's
parent did not exist. Android 10 and later are unchanged.

**The release APK is signed with a real key.** The website had been serving the
debuggable, debug-signed build. See DEPLOY.md, *The release key* — including the
one-time uninstall-and-restore for anyone on the old APK.

## 2026-09-20 — new artwork, same scene, a sky that is not quite white

Replaced `src/icon-artwork.png` with the supplied file as it arrived — 3072px,
the same 태극 over the hill with the road running off the bottom, but redrawn:
the hill's field is now white, the road and ridge sit lower and read heavier, and
the sky is `#F0F3F6` rather than pure white.

The pipeline needed no instruction again. The file bleeds on all four edges, so
`_bleeds` left it as drawn instead of re-framing; the tint on record is still
`none`, which is right for artwork that arrives with a ground somebody chose;
corners stay at `CORNER`, Claude's 0.235. The circular-crop check is clean at
192, 120, 72 and 48 — nothing of the 괘 or the road leaves the safe circle.

**`ic_bg` moved with the artwork: `#FFFFFF` -> `#F0F3F6`.** It is what
`ground_of` measures on the new file, and the same reasoning as last time
applies — the background layer is covered by an opaque foreground today, but a
colour on record that does not match the artwork is a trap for whoever makes the
foreground anything but opaque.

**The pale-ground caveat from the last entry still stands**, and slightly less
so: `#F0F3F6` is a faint step away from a white launcher rather than none at all,
and the white field below the ridge now gives the scene an internal edge it did
not have. It is still the artwork's own decision, not the pipeline's.

## 2026-09-18 — the same scene, drawn flat on white

New artwork: the 태극 rising over the hill with the road running up to it and off
the bottom edge, as before, but drawn flat — a white sky, the 괘 in black, the
road and the hill's ridge in the flag's blue. Replaces the gold-field version.

Nothing in the pipeline had to be told anything. The file bleeds on all four
edges, so `_bleeds` left it exactly as drawn rather than re-framing it; the tint
on record is `none`, and this artwork arrives with a ground somebody chose, so it
stays `none`. Corners at `CORNER` — Claude's 0.235 — as they have been.

**`ic_bg` was still the old gold.** The adaptive icon's background colour had
been `#CAA96E`, sampled from artwork that no longer exists, and nothing would
have shown it: `foreground()` writes an opaque square that covers the background
layer entirely. It is now `#FFFFFF`, which is what the artwork's own ground
measures. A colour that is covered is still a colour on record, and a wrong one
is a trap for whoever next makes the foreground anything but opaque.

**The thing to weigh: a white ground has no edge of its own.** Every previous
file supplied its own hard edge — the crest's navy rim, the medallion's navy
tile, the gold field — and that was deliberate, because a pale icon dissolves
into a pale home screen. This one's sky is the home screen's colour. The emblem
still reads at 48px and the check sheet's circular crop is clean, but on a white
launcher the tile has no visible boundary, and Samsung's icon frames put a white
squircle behind it either way. That is the artwork's own decision, not the
pipeline's, so nothing here overrides it — but it is what to look at first on the
phone.

## 2026-09-17 — artwork that fills its own frame

The icon is the same crest opened out into a scene: the 태극 rising over a hill,
the 괘 in the sky, the road running up to it and off the bottom edge. Gold field,
edge to edge, corners curved.

**This one had to NOT be re-framed, and the pipeline would have done it anyway.**
Everything before it was a subject sitting in a field of ground — a disc on a
wall, a crest on cream — so the pipeline trims the margin and re-frames the
subject to Claude's 0.735. This artwork has no margin. Its content touches all
four edges, measured gap zero on every side. Re-framing it would have centred the
whole scene inside a fresh gold square, adding a border that was never drawn and
lifting the road away from the bottom edge it was drawn to run off. The result
would have looked like a mistake nobody could name.

So `_bleeds` asks whether the content reaches the frame, and artwork that does is
left exactly as drawn — full bleed, like Claude's coral filling its own tile. The
three inset files still re-frame; this one does not, and nothing had to be told
which was which.

That is the third thing this pipeline now measures rather than assumes, after
where the artwork is and whether it has holes. The pattern holds: every one of
them was a constant that would have been silently wrong on the next file.

## 2026-09-17 — the crest, and holes that are not holes

The icon is new artwork again: a flat crest — gold disc inside a heavy navy rim,
the 태극 and 괘 across the top, the road running up into it, on cream.

**It keeps its own ground, and that is the point.** The tint step exists to put
artwork on a coloured tile, and the obvious move was to put this on the navy that
the medallion had been given. It was the wrong move. This artwork arrives with a
ground somebody chose, and a heavy navy rim that already does the job a coloured
tile was doing — supplying the hard edge that stops the icon dissolving into a
pale home screen. Cream is a tint; it is simply a light one. So `none` became a
real answer for `tools/tint-icon.py` rather than a way of switching it off.

**Keying the inside would have quietly damaged it.** The medallion is cut metal:
its road, 괘 and lower field are holes with the wall showing through, so the tint
has to reach inside the disc or they stay white while everything around them
turns. This crest has no holes at all — every part of it is drawn, and its 괘 are
drawn *white*. White sits only about 40 from cream, close enough that a ramp
tuned for holes catches it: tinting this artwork the old way came out with the 괘
dimmed and muddy, for no reason and with nothing to indicate it had happened.

So the tool measures instead of assuming, asking how much of the subject actually
reads as ground. The cut-metal medallion scores 17.0%; this crest scores 3.4%,
and that 3.4% is its antialiased rim rather than anything intended. The line sits
at 8%, between two measurements rather than near either.

The check sheet is the reason this was caught before it shipped — `icons.py
check` renders at 192 down to 32, and a dimmed 괘 is invisible at full size.

## 2026-09-17 — a tinted tile, and the holes are part of the artwork

The medallion now sits on a deep navy tile (`#15304F`) instead of the wall it was
photographed on, the way Claude's mark sits on coral.

**The holes were the whole problem.** The medallion is cut metal: the road, the
괘 and the entire lower field are not drawn, they are absences with the white wall
showing through. Colouring the area around the disc would have left every one of
them white, the cut-out would have read as white paint, and the effect the
artwork is built on would have been lost. So the wall is replaced everywhere it
appears — around the disc and inside every hole.

The tile also keeps the wall's own light. The replacement is the tint multiplied
by how bright the wall was at each pixel, so the vignette and the soft drop
shadow survive as shading in the colour instead of becoming a grey smudge lying
on a flat tile.

**The obvious tint was the wrong one.** The app's own accent `#C2410C` looked
like the principled choice — it is HANGIL's colour and it is in the same family
as Claude's coral. On screen it was mud: bronze and burnt orange sit at nearly
the same value, and below about 64px the disc stopped separating from its tile at
all. What makes Claude's icon work is not the hue, it is the size of the contrast
step between mark and tile, and that is the thing worth copying. Navy gives the
bronze something to be metal against and lets the 태극 red stay the brightest
thing in the icon. `#0E7490` was the runner-up.

This arrived as a new tool rather than a flag on `icons.py`. Recolouring is
inventing appearance, and `icons.py` not inventing appearance is the rule that
ended several rounds of the icon drifting away from what was asked for. So
`tools/tint-icon.py` owns it, `src/icon-artwork.png` keeps the untouched supplied
file, and `src/icon-source.png` is now an output rather than something to edit.

One more thing worth writing down: the Samsung **App info** screen draws every
icon inside its own white chip, so it cannot tell a white-tiled icon from a navy
one. Only the launcher can.

## 2026-09-17 — the medallion, and a threshold that finds itself

The icon is a photograph of a laser-cut metal medallion: the 태극 and two 괘 in
bronze across the top, the road cut clean through the lower half so the wall
shows through it. Zoomed to match Claude's icon, corners curved.

**"The same zoom as Claude's logo" is a number, so it was measured.** Claude's
macOS icon puts a 606px mark inside an 824px tile — the mark fills **0.735** of
it. That is now `CONTENT`, with the `sips` one-liner to re-derive it left in the
comment. The corner needed nothing: Claude's curve starts 0.303 of the way along
the top edge, and since that is a continuous squircle rather than a circular arc,
the equivalent plain radius is about 0.237 — near enough to the 0.235 already
there that changing it would have been noise.

**The threshold for "where is the artwork" now finds itself.** It could not stay
a fixed number, because a photograph breaks every rule a vector file follows. The
medallion sits on a lit wall: it has a soft drop shadow, and the wall vignettes
towards the corners. At the cutoff that was correct for the flat emblem, the
measured content came out as **97% of the frame** — shadow and vignette included
— when the disc itself is 46%. Framing to that would have produced a small disc
marooned in a large square, and the zoom that was asked for would not have
happened at all. Nothing would have errored.

So the cutoff is swept rather than chosen. The artwork's extent is measured at
each step, and the lowest threshold whose measurement has stopped moving is
taken. Real edges are steep, so past them the measurement settles; shadows,
washes and vignettes fade gradually and keep shrinking the box. Across the three
files this icon has had, it picks 16, 6 and 40 — none of them written down.

The ground colour is now the median of a border ring rather than one corner
pixel, for the same reason: on a photographed wall the corner is the darkest part
of a vignette, and extending the frame with it leaves a visible seam.

## 2026-09-17 — the exam items are tagged by grammar too

Grammar tags used to come only from the unit that taught them, so a grammar weak
spot practised that unit's six exercises and nothing else. The 292 drill, trade
and paper items carried a *shape* tag but nothing about which grammar point they
turned on. They do now, and the practice sets are a different thing for it:

    obligation     6 -> 32 items   (course 6, drills 4, trades 22)
    negation       6 -> 28
    time-clauses   6 -> 20
    ability        6 -> 17
    conditional    6 -> 17

A weak spot on 아/어야 되다 now pulls from a plastics sign, a woodworking
instruction and the course unit in the same twelve questions, which is what makes
it a weak spot rather than one bad afternoon on one screen.

`tools/propose-grammar-tags.py` did the first pass and stays in the repo. It is a
proposer, not an authority: every one of its suggestions was read before being
written, and the ones it got wrong are in its `OVERRIDE` map rather than papered
over by bending a rule until it fits one item and breaks three.

**What an item tests depends on its shape**, and getting that wrong was the whole
difficulty. A first attempt scanned each item's text for grammar and put
`conditional` on 33% of the app and `negation` on 31% — the `safety` mistake
again, a tag so broad it means nothing. The rule that worked splits by shape: for
a **gap-fill** what is tested is whatever goes in the gap, so only the options
count; for a **meaning-equivalence** item it is the prompt sentence you have to
re-express; a **sign** is two words on a wall so the work is in the answer; and a
**passage or multi-line dialogue is comprehension**, so it gets no grammar tag at
all. Nothing then exceeded 10%.

**A bug that was invisible until the proposals were read by hand.** ㄹ and ㄴ
batchim are *composed* into the syllable — 할, 쓸, 한 are single code points — so
a pattern like `ㄹ 때` never matches 할 때 or 쓸 때, and `어야` never matches 써야.
Nothing errored; the counts were just quietly far too low. `ability` was finding
one item in 292. Building character classes of every syllable ending in ㄹ and ㄴ
took it to fifteen, and `time-clauses` from ten to sixteen.

Four false positives were found the same way and fixed: 어떻게 되세요 is a fixed
polite formula and not 게 되다; 조입니다 is 조이다 + ㅂ니다 and not the copula, which
no regex can see; a 없 belonging to ㄹ 수 없다 was also being counted as plain
없다; and 에서 is the ordinary locative in nearly every one of these sentences, so
`place-particles` was marking items without being what they turn on — it is left
to unit g05, where the 에/에서 choice is the actual question.

## 2026-09-17 — the app now knows what you do not know

The review deck has always scheduled **items**. An item is a key, so the deck
could bring back the four questions you missed but could not tell you that all
four were about 에 against 에서. Tags are the other half of that, and they turn
the deck from a timer into something that can name a weak spot out loud.

**Tags are declared once and inherited.** A unit, drill, trade or vocabulary set
carries `tags`; every item inside inherits them. Writing a tag onto each of 841
items would have been 841 chances to forget one, and what a unit teaches is a
property of the unit, not of its sixth exercise. On top of that each item gets a
**shape** tag worked out from its own fields — a stem with a gap in it is a
gap-fill wherever it lives — derived rather than authored, because it is already
knowable from the data and asking a person to restate it only creates a way to
be wrong. 52 containers were tagged by hand; 841 items ended up tagged.

**`#/weak` orders them worst first** and says the useful thing: *에 against 에서 —
three of twelve right, 25%*. Each row practises 12 items drawn from everywhere
that tag appears, which is the point: a passage weakness pulls from the drills,
the trades and the papers at once, not from one screen you had a bad afternoon
on. The home screen surfaces the single worst one, and only once there is one —
a list of failings on the home screen is a reason to close the app.

Three rules keep it honest.

- **Nothing appears below six answers.** Two wrong out of two is a small sample,
  not a weak spot. Naming it would be inventing a finding, which is the same
  fault as printing a pass mark.
- **A blank on a paper is not counted.** `mock.js` records only questions that
  were actually answered. Running out of time is not the same as not knowing,
  and counting it as one puts the blame in the wrong place.
- **A tag has to be worth acting on.** "Particles" is useless advice. "에 against
  에서" is a thing you can fix in ten minutes.

**A bug caught by looking at the numbers.** The trades were first tagged
`["industry", "safety"]`, which put `safety` on 376 items and quietly turned it
into a synonym for "the trades" — a weak spot nobody could act on. Nothing
errored; it just would have been useless. Safety now sits only where safety is
genuinely the subject: the safety word set and the signs drill.

**The checker got teeth.** `check-content.mjs` now fails on a tag used but not
declared in `tags.json` **and** on one declared but not used. A typo in a tag id
is otherwise invisible: it makes a new tag that never aggregates with anything
and never appears on any screen. Verified by introducing `coplua` and watching it
fail from both ends.

**Known gap, written down rather than half-fixed.** Grammar tags come from the
unit, so a grammar weak spot practises that unit's six exercises. The 292 exam
drill, trade and paper items are tagged by shape, not by which grammar point they
test. Tagging those by grammar is a real content pass and would make these
practice sets much richer — it is the next thing to do here.

## 2026-09-17 — the course now teaches, instead of presenting

A grammar unit used to be one long page: the explanation, a table, five
sentences, the mistakes people make, then a button to a quiz. That is a good
*reference* and a poor *lesson*. Everything arrives at once, nothing makes you
stop, and the English sits beside every Korean sentence so the Korean never has
to be read.

There is now a **walk-through** — one idea per card, tapped through — and the
page stays exactly where it was, for looking things up. Three ideas drive it.

**The example comes before the rule.** You are shown a real sentence, and then
told what it was doing. `unitCards()` zips the sentences against the explanation
paragraphs in that order on purpose. Rule-first teaching hands you an abstraction
and asks you to hold it with nothing yet to hang it on.

**The English is behind one tap.** A translation next to the Korean gets read
instead of the Korean. One tap is a small enough price to make you try first, and
trying first is the part that sticks. The vocabulary list got the same thing as a
**Cover the English** toggle — and covering a word's gloss also covers its example
sentence's translation, because leaving that visible puts the answer one line
below the cover and makes the exercise pointless.

**Minimal pairs do the teaching, and this is the real change.** Every one of the
24 units now carries a `pairs[]` field: the same sentence twice, differing by one
thing.

    공장에 있어요.     I'm at the factory.
    공장에서 일해요.   I work at the factory.

Two characters apart, and the note underneath says why. Where a unit teaches a
set rather than an addition, the pair contrasts two members of the set instead —
있어요 against 없어요, 안 가요 against 가지 않아요. Either way the rule is the
same: hold everything constant but the one thing, so the change in meaning has
only one possible cause. Forty-eight of them, written by hand. A pair whose sides
differ in more than one way teaches nothing, which is why this took the longest.

**The alphabet got a chart.** Forty letters on one page, and the columns are the
point: ㄱ, then ㅋ underneath it, then ㄲ under that. Read down a column and you
are reading a family — plain, plus a puff of air, doubled. 한글 was designed that
way, and laying it out flat as a list throws away the single fact that makes it
learnable in a week. Tapping any letter now opens what it is built from, how it
is said, and one real word it turns up in: 여권 for ㅕ, 잔업 for ㅈ, 끼임 for ㄲ.
Every one of the forty has an example word and appears exactly once in the chart,
in its own family's column.

**The vocabulary sets got a walk-through too** — Korean first, audio, then the
meaning and the example on request, before the drill.

**A colour bug, found by looking.** The deck pinned itself to the course violet,
so the vocabulary walk-through came out purple on a pink screen. `head()` already
sets the section colour per screen; the deck just had to inherit it rather than
declare its own. The floor now sits on `html, body` and every screen overrides it.

### Where this came from

The shape is borrowed from Bunpo, which the owner of this build uses, and the
borrowing is of *method* only — how a lesson is paced, that examples precede
rules, that translations hide, that pairs isolate. Every Korean sentence, every
pair, every note and every example word here was written for this app, the same
as the rest of `data/`. That is rule 4 at the top of CLAUDE.md and it did not
bend for this.

## 2026-09-17 — 업종별: the eight job groups, and a second paper

The app was missing the part of the EPS-TOPIK that is hardest to revise for
without material: the **job-related questions**. It now has them.

**What the exam actually does.** Worth writing down, because it is the thing most
easily got wrong. The ordinary paper is forty questions: **32 common and 8
job-related**. The job-related eight are drawn from one of **eight job groups**,
they sit in the **reading** half, and they apply **only to applicants for
manufacturing work** — agriculture, fishing, construction and service applicants
get common questions in their place. You pick your group when you apply, not in
the exam room. The Special EPS-TOPIK, the round for former workers returning to
Korea, carries a larger share of them. HRD Korea publishes the job-related bank
in advance, which is unusual and is the single most useful fact about them: those
questions are meant to be studied rather than guessed at.

So the trade is **optional**, and the app is built that way throughout. Nothing
assumes one is set, the home screen shows no trade card until you choose, and the
trades screen opens by telling you who does *not* need it. An app that made every
user declare an industry would be asking most of them to answer a question that
does not apply to them.

**The content.** `data/trades-1..2.json` — eight groups, each with 26 words and 20
questions, 208 words and 160 questions in total. 고무·플라스틱, 전기·전자,
금속·재료, 기계·금형, 식품가공, 섬유·의복, 화학·제약, 펄프·종이·목재. Written for
this app in the shapes the paper uses, like everything else in `data/`: the sign
on the wall, the work order, the line on the drum, the notice about the cold
room. Each word carries a sentence it would really appear in.

**The paper now changes shape when you set a trade.** `readingFor()` in `mock.js`
swaps eight of the short reading items for eight of your trade's, giving 32 + 8 —
the real split. It deliberately leaves the passages alone, because a passage
carries two or three questions and pulling one out of the middle strands the
rest. With no trade set nothing happens and you sit the twenty common reading
questions, which is the paper a non-manufacturing applicant actually gets. The
job-related ones are not marked during the paper — the real one does not mark
them either — but they are tagged 업종별 in the walk-through afterwards.

**A second practice paper.** One paper gets memorised. `exam-mock-2.json` leans on
the life around the job rather than the machine in front of you — the wage slip,
the dormitory, the bank, the fire drill, the clinic — because that is where the
real reading half spends its second twenty minutes. There is a wage slip in it
that you have to read the deductions out of, which is a thing worth being able to
do for reasons well beyond the exam.

**A guide.** Six short reads on the exam itself: what the paper is, the
job-related questions, the question shapes, how it is marked, where the fifty
minutes go, and what actually moves a score. It says plainly that the app will
not tell you whether you passed and why — the cut score is set per round and
differs by industry, so any pass mark written into an app is a number invented to
sound useful.

**A content checker, and what it caught.** `tools/check-content.mjs` walks every
question in `data/` and fails on a duplicated option, an answer that is not in
first place, a missing explanation, or a `pic` id with no drawing behind it. All
four are invisible on screen: a duplicated option just looks like a hard
question. Run against the existing content it immediately found one — `g01`
exercise 2 in `course-1.json` had its answer second. The answer was right and
`mix()` shuffles anyway, so nothing was broken on screen; but the whole point of
the answer-first convention is that a person can proof-read a file by reading
down the first option, and one file quietly opting out defeats that. Fixed.

**The trade colour.** A new section colour, since every section owns one: #1D4ED8
light, #6FA8FF dark. The hue matters — it sits at 224, between the 한글 cyan at
193 and the course violet at 250, so it is not mistaken for either on the home
grid where all three appear together. 6.7:1 as text on white; white on the dark
pastel is 2.41:1, which is exactly why `--hero-ink` flips, and it was checked
rather than assumed.

**The offline check now covers the new files.** `offline-check.mjs` in the site
repo walked three screens; it walks seven, one per content file. A file added to
`data/` but left out of the precache list fails there and nowhere else — the app
still loads, and only the screen that needed it comes up empty.

## 2026-09-16 — new artwork, and the icon now frames itself

The icon is new artwork: a flat 2D 태극 in a thin black ring with the road
running up into it, the four 괘 around it, on a light grey ground (#EAECEB).
Corners curved, as asked. A shaded, brushed-metal version was tried first and
dropped — at 48px the modelling turned to mud, and the flat one holds its shapes.

Two things were fixed in the process, both of which would have bitten the next
person to drop in a new file.

**The artwork now gets re-framed to the tile.** Artwork is drawn to be looked at,
not to be 48 pixels on a home screen. The metal file arrived with about 15% of
blank ground on every side; on the launcher the emblem swam in its own padding
and read small beside apps that fill their tile. `tools/icons.py` now measures
where the artwork actually is and re-frames it, so a replacement file needs
nobody to eyeball a crop. The flat file came framed tighter — 0.876 of its width
— and needed almost none of it, which is the point: the script found that out
rather than being told.

**But it cannot simply be trimmed to a chosen width.** The guaranteed-visible
area of an adaptive icon is a *circle*, and the four 괘 sit on the diagonals.
On the metal version they reached 1.21x the emblem's half-width, so filling a
sensible-looking 84% of the tile put their tips outside that circle and a round
launcher sliced them off — precisely what that file's generous margin had been
avoiding. So the fill is derived from how far the artwork reaches rather than
how wide it is.

That measurement is why swapping in the flat version cost nothing: it is wider
and flatter, reaches only 1.096x, and its circular limit came out at 0.91 — so
the 0.84 ceiling governs, with room to spare. The same two lines handled two
quite differently shaped files without anyone eyeballing a crop.

A smaller trap underneath both: **what counts as blank has to be measured too.**
The metal file carried an invisible off-white wash over its lower half, and any
threshold low enough to keep a drop shadow also kept the wash — which made the
trim a no-op and the reach measurement nonsense. The flat file has no wash but
does have faint edge noise, enough that a naive cutoff reads it as filling 99.7%
of the canvas and again trims nothing. So the cutoff is sampled from a border
ring and set just above whatever it finds: 10 on one file, 21 on the other, and
neither number written down anywhere.

## 2026-09-16 — the website was shipping an APK of 191 MB holding 2.6 MB

The website's build is the app without 한국산업인력공단's 180 MB of listening
audio. Removing the audio and rebuilding produced an APK that was still 191 MB.

Gradle packages the APK incrementally: when a file leaves `assets/` it rewrites
the zip's central directory but leaves the old entry's bytes stranded in the
file. Zip readers only follow the directory, so the APK installed and ran
correctly and every check passed — the file was just 189 MB of dead weight that
nothing would have caught except putting it on the scales. `build_apk.sh` now
forces a full repackage and warns when the file is far larger than its entries.

The same pass found that stripping the audio left `manifest.json` still listing
all sixty tracks. The app reads the manifest, not the folder, so the Exam screen
advertised "60 tracks" and the Listening screen drew sixty players pointing at
files that were not there — the app's own well-written empty state never fired.
`tools/strip-audio.py` now empties the manifest alongside the audio, and both the
APK and the website copy go through it.

## 2026-09-16 — the 한글 card showed a syllable that does not exist

The Today screen's 한글 card carried an icon drawn as SVG strokes — three lines
and a box that together formed a syllable-shaped block. It was meant to read as
"some Hangul". It read as a word, and the word was nonsense.

That is a bad thing to put in front of somebody who is being taught, on the next
screen along, how syllable blocks are assembled. A learner does not see an
abstract mark; they see a block and try to read it, and fail, and wonder what
they missed. Reported by the person actually using the app, which is the only
way this kind of thing gets found.

The card now shows the real character **가** — the first syllable of the 가나다
chart and the first thing anyone learning 한글 meets — set as text in the Korean
font rather than drawn.

**The rule that falls out of it:** never draw Hangul with strokes. Set it as
text. A glyph built out of paths is a glyph nobody proofread, and in a language
app the one thing that must never be wrong is the language.

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

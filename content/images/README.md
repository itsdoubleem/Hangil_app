# content/images — the shelf for official EPS pictures

This folder ships **empty**, and the app works fully without it. Every picture
question already has a drawing: `data/pictures.json` holds 36 original line
drawings made for this app, and they test the same thing the paper tests.

What this folder is for is the **official EPS-TOPIK pictures** — the ones printed
in HRD Korea's standard textbook and past papers, which a learner may want to see
exactly as they appear on the day. HRD Korea publishes that material free on the
EPS programme site.

**Do not take these files out of another app.** Download them from the source
that publishes them. Whatever you put here ships inside your build of HANGIL and
inside the APK, so only add files you are entitled to distribute. If you are not
sure, do not add them — the app loses nothing, because every question still has
its own drawing.

## The useful part: an id here replaces the drawing

The ids are the same ones the questions already use. Drop in an image, name it
after an existing drawing, and **every question using that drawing switches to
your image** — no question has to be edited.

1. Put the image files in this folder. `.png`, `.jpg`, `.webp` or `.svg`.
2. Register them in `manifest.json`:

```json
{
  "source": "HRD Korea, EPS-TOPIK standard textbook",
  "images": {
    "helmet":      { "file": "helmet.png", "alt": "A worker wearing a safety helmet" },
    "forklift":    { "file": "forklift.png", "alt": "A forklift carrying a pallet" },
    "eps-2024-q3": { "file": "q3.png", "alt": "Two workers lifting a crate together",
                     "ko": "상자를 같이 듭니다", "en": "lifting a box together" }
  }
}
```

- An id that **matches a drawing** (`helmet`, `forklift`, `box`, …) replaces it.
  Run `node tools/build.mjs` to see the full list of ids.
- An id that matches **nothing** is a new picture. Use it in a question with
  `"pic": "eps-2024-q3"` or inside `"picOptions"`, and give it `ko` and `en` so
  the app can name it after the learner answers.
- `alt` is what a screen reader says. Write what is *in* the picture, not
  "picture 3".

3. Rebuild. `node tools/build.mjs` lists what it found and **fails if the
   manifest names a file that is not there** — a missing image is a blank box in
   an exam question, which is the kind of thing nobody notices until a learner
   does.

## Sizing

Square-ish images work best; they are drawn into the same box as the line
drawings and scaled to fit, never cropped. Anything much over 200 KB each is
worth compressing: every file here is precached so the app keeps working offline,
and it ships inside the APK.

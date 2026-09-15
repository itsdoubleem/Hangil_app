# 한길 HANGIL

Korean for the EPS-TOPIK, and for after it.

**[Open it →](https://itsdoubleem.github.io/hangil/)** ·
**[Android APK](https://itsdoubleem.github.io/downloads/hangil.apk)** · free ·
works offline · no account

---

Two halves, one review deck.

**The exam.** The question shapes the EPS-TOPIK paper uses — what a sign means,
which word fills the gap, which sentence says the same thing, what the two people
in the conversation just agreed — plus a forty-question paper with a fifty-minute
clock that does not stop.

**The course.** Twenty-four grammar units, from *this is a passport* to reading
the sentence in a contract that says wages shall be paid on a fixed date at least
once a month. Each unit is an explanation written out in full, a table, five real
sentences with audio, the mistakes people actually make, and a mixed exercise set.

**One deck underneath.** Everything you answer goes into spaced repetition and
comes back at a widening gap. Get it wrong and it starts again from today.

Also: a 한글 trainer for absolute beginners, 197 words grouped by where you hear
them, and a shelf for official EPS listening files you download yourself.

## What this is not

It is not the exam and it cannot tell you whether you will pass. The practice
questions were written for this app in the shapes the real paper uses — they are
not a past paper. The cut score is set by HRD Korea for each round and is not a
fixed number, so the app scores out of 200 and stops there.

It is not affiliated with HRD Korea, the EPS programme, or any exam body.

It is not a legal reader. The last unit teaches you to read the grammar of a
contract, which is worth a great deal and is not advice. 고용노동부 고객상담센터
☎ **1350** is free and has interpreters.

## Your data

Nothing leaves the device. No server, no account, no analytics. Your progress is
in your browser's storage and nowhere else, and once the app has loaded it makes
no network requests at all. Clear the browser's data and it is gone — there is a
backup file in Settings.

## Build it

```bash
node tools/build.mjs      # -> dist/  (the web app)
./build_apk.sh install    # -> hangil-debug.apk, installed on a connected phone
python3 tools/icons.py src   # only when the icon changes
```

No framework, no bundler, no dependencies. `dist/` is a static folder any host can
serve. See `CLAUDE.md` for how to add content and `DEPLOY.md` for how it ships.

## Licence

MIT for the code. The Korean course text, vocabulary and practice questions in
`data/` were written for this app and are published under the same licence.

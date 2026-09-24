# 한길 HANGIL

[![License: MIT](https://img.shields.io/badge/license-MIT-c2410c.svg)](LICENSE)

Korean for the EPS-TOPIK, and for after it.

**[Open it →](https://itsdoubleem.github.io/hangil/)** ·
**[Android APK](https://itsdoubleem.github.io/downloads/hangil.apk)** · free ·
works offline · no account

---

Two halves, one review deck.

**The exam.** The question shapes the EPS-TOPIK paper uses — what a sign means,
which word fills the gap, which sentence says the same thing, what the two people
in the conversation just agreed — plus two forty-question papers with a
fifty-minute clock that does not stop.

**업종별 — your trade.** The eight job groups the exam's job-related questions
come from: 고무·플라스틱, 전기·전자, 금속·재료, 기계·금형, 식품가공, 섬유·의복,
화학·제약, 펄프·종이·목재. Each one is the vocabulary of that floor and twenty
questions in the paper's own shape — the safety sign, the work order, the
warning on the drum. Set yours in Settings and the practice paper puts eight of
them in the reading half, which is the split the real paper uses. If you are
applying for agriculture, fishing, construction or service work you do not get
these questions at all, and the app does not pretend otherwise.

**The course.** Twenty-four grammar units, from *this is a passport* to reading
the sentence in a contract that says wages shall be paid on a fixed date at least
once a month. Each unit walks you through it one card at a time — the sentence
first, then what it was doing — and the English stays hidden until you ask for
it, so the Korean is the thing you actually read.

At the centre of every unit is a pair: the same sentence twice, one thing
different. 공장에 있어요 / 공장에서 일해요. Two characters apart, and the whole
difference between where you are and what you are doing. The full written
explanation, the table, the sentences and the mistakes people make are all still
there on the unit's page, for looking up later.

**One deck underneath.** Everything you answer goes into spaced repetition and
comes back at a widening gap. Get it wrong and it starts again from today.

**And it keeps score of what, not just how much.** Every question is counted
against what it was about — the grammar it tested, the kind of question it was,
the words it used. So the app does not only say you got fourteen wrong; it says
*에 against 에서 — three of twelve right*, and gives you twelve more drawn from
everywhere that turns up. Nothing appears until there are at least six answers
behind it, because less than that is a small sample and not a weak spot.

Also: a 한글 trainer for absolute beginners — including a chart of all forty
letters laid out by family, so ㄱ, ㅋ and ㄲ sit in one column and you can see
that Korean has far fewer shapes than it first appears. 612 words grouped by
where you hear them, six short reads on what the paper is and how it is marked,
and a shelf for official EPS listening files you download yourself.

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
node tools/check-content.mjs   # proof-reads data/ — run this first
node --test 'tests/*.test.mjs' # the code's own tests; Node's built-in runner, nothing to install
node tools/build.mjs      # -> dist/  (the web app)
./build_apk.sh install    # -> hangil-debug.apk, installed on a connected phone
python3 tools/icons.py src   # only when the icon changes
```

No framework, no bundler, no dependencies. `dist/` is a static folder any host can
serve. How it ships is in [`DEPLOY.md`](DEPLOY.md), and what changed and why in
[`CHANGELOG.md`](CHANGELOG.md).

## Licence

[MIT](LICENSE), © 2026 DOUBLEEM — for the code, and for the Korean course text,
vocabulary and practice questions in `data/`, which were written for this app.

The Android app links a few Apache-2.0 libraries, and a personal build can carry
HRD Korea's official listening files, which are theirs and never part of a public
build. Both are set out in [`THIRD-PARTY-NOTICES.md`](THIRD-PARTY-NOTICES.md).

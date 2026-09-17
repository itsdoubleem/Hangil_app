#!/usr/bin/env python3
"""Removes the official EPS-TOPIK audio from a built tree, manifest included.

    python3 tools/strip-audio.py <dir>        # e.g. dist/ or the APK's assets/www

The audio is 한국산업인력공단's, it is 180 MB, and it ships only in a personal
build — see DEPLOY.md. Deleting the mp3s is the obvious half. The half that was
missed: `content/listening/manifest.json` still listed all sixty tracks, so the
app went on advertising "60 tracks" on the Exam screen and drew sixty audio
players pointing at files that were no longer there.

The app already handles an empty shelf properly — the Listening screen explains
what the files are and where 한국산업인력공단 publishes them, and the card that
links to it does not appear. That path is reached by the manifest having no
sets, so this empties it. The source and licence stay: they describe material
the reader is being pointed at, and they are what the attribution condition
attaches to.
"""
import json
import pathlib
import sys

AUDIO = {".mp3", ".m4a", ".ogg", ".wav"}


def main(root):
    d = pathlib.Path(root) / "content" / "listening"
    if not d.is_dir():
        print(f"  no {d} — nothing to strip")
        return
    gone = 0
    for f in d.iterdir():
        if f.suffix.lower() in AUDIO:
            f.unlink()
            gone += 1

    man = d / "manifest.json"
    if man.exists():
        m = json.loads(man.read_text(encoding="utf-8"))
        had = sum(len(s.get("tracks", [])) for s in m.get("sets", []))
        m["sets"] = []
        man.write_text(json.dumps(m, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"  stripped {gone} audio files and emptied a manifest of {had} tracks")
    else:
        print(f"  stripped {gone} audio files (no manifest)")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "dist")

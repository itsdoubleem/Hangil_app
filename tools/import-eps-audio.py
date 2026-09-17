#!/usr/bin/env python3
"""Imports the official EPS-TOPIK listening files into content/listening/.

    python3 tools/import-eps-audio.py <folder with the downloaded .zip files>

The archives come from 한국산업인력공단 at epstopik.hrdkorea.or.kr:

    EPS-TOPIK_textbook1_listen.zip   표준교재 1 · 일상생활 한국어
    EPS-TOPIK_textbook2_listen.zip   표준교재 2 · 직장생활 한국어

Each holds ~150-180 tracks, of which 30 per book are the EPS-TOPIK 듣기 문제 —
the exam-practice listening at the end of every unit. Those are the ones taken.

WHAT THIS SCRIPT MUST NEVER DO
------------------------------
The material is published under KOGL Type 3 — 출처표시 + 변경금지: attribution
required, derivative works prohibited. So the files are copied byte for byte.
They are never re-encoded to save space, never trimmed, never split into
per-question clips, and the questions are never transcribed into the app's own
JSON. All of those would be derivative works. Renaming a file and listing it in
a manifest is not.

The audio is NOT committed and NOT shipped to the website — see DEPLOY.md. It is
180 MB, and it belongs to HRD Korea; a learner should get it from them.
"""
import json
import pathlib
import re
import sys
import zipfile

BOOKS = [
    ("EPS-TOPIK_textbook1_listen.zip", "t1",
     "표준교재 1 · 일상생활 한국어",
     "Everyday Korean. The EPS-TOPIK listening set from the end of each unit."),
    ("EPS-TOPIK_textbook2_listen.zip", "t2",
     "표준교재 2 · 직장생활 한국어",
     "Workplace Korean. The EPS-TOPIK listening set from the end of each unit."),
]

SOURCE = "한국산업인력공단 · EPS-TOPIK 한국어 표준교재 듣기파일 (2024)"
LICENCE = "KOGL 제3유형: 출처표시 + 변경금지"


def real_name(info):
    """Entry names are UTF-8 when the flag says so, and CP949 otherwise."""
    if info.flag_bits & 0x800:
        return info.filename
    try:
        return info.filename.encode("cp437").decode("cp949")
    except Exception:
        return info.filename


def main(src_dir):
    src = pathlib.Path(src_dir)
    out = pathlib.Path(__file__).resolve().parent.parent / "content" / "listening"
    out.mkdir(parents=True, exist_ok=True)
    for old in out.glob("*.mp3"):
        old.unlink()

    sets, total = [], 0
    for zip_name, tag, title, note in BOOKS:
        path = src / zip_name
        if not path.exists():
            print(f"  skipped {zip_name} — not in {src}")
            continue
        z = zipfile.ZipFile(path)
        tracks = []
        for info in sorted(z.infolist(), key=real_name):
            name = real_name(info).split("/")[-1]
            if "EPS" not in name or not name.lower().endswith(".mp3"):
                continue
            num = re.search(r"Track\s*(\d+)", name)
            fname = f"{tag}-{num.group(1) if num else len(tracks) + 1}.mp3"
            (out / fname).write_bytes(z.read(info))       # byte for byte
            tracks.append({"title": name[:-4], "file": fname})
            total += info.file_size
        if tracks:
            sets.append({"title": title, "source": SOURCE, "note": note, "tracks": tracks})
            print(f"  {title}: {len(tracks)} tracks")

    manifest = {
        "note": ("Official EPS-TOPIK listening files published free by 한국산업인력공단 at "
                 "epstopik.hrdkorea.or.kr. Used under KOGL Type 3 — attribution required, "
                 "no derivative works — so every file here is exactly as published: not "
                 "re-encoded, not trimmed, not split."),
        "source": SOURCE,
        "licence": LICENCE,
        "sets": sets,
    }
    (out / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"{sum(len(s['tracks']) for s in sets)} tracks, {total / 1048576:.0f} MB -> {out}")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else ".")

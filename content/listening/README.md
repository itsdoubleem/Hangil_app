# content/listening — the shelf for official audio

This folder ships **empty**, and the app works fully without it. Every Korean
sentence elsewhere in HANGIL is spoken by the phone's own speech engine, which is
why there is no audio to download and why the app still talks with the network
off.

What this folder is for is the **official EPS-TOPIK listening material**. HRD
Korea publishes the standard textbook and its listening files free on the EPS
programme site, and a worker who has downloaded them can put them here and study
them inside the app instead of in a file manager.

**Do not take these files out of another app.** Download them from the source
that publishes them. Whatever you put here ships with your build of HANGIL, so
only add files you are entitled to distribute — if you are not sure, do not add
them, and the app loses nothing.

## How to add a set

1. Put the audio files in this folder (`.mp3`, `.m4a` or `.ogg`).
2. Add an entry to `manifest.json`:

```json
{
  "sets": [
    {
      "title": "Standard textbook — chapter 1",
      "source": "HRD Korea, EPS-TOPIK standard textbook",
      "note": "Downloaded from the official EPS site.",
      "tracks": [
        { "title": "1-1 인사", "file": "ch01-01.mp3", "script": "남자: 안녕하세요…" }
      ]
    }
  ]
}
```

`script` is optional; when it is there the app shows it under a fold, so you can
listen first and read afterwards.

3. Rebuild (`node tools/build.mjs`). The build lists the folder and the service
   worker caches what it finds, so the audio works offline too.

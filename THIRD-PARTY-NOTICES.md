# Third-party notices

한길 HANGIL is written without a framework or a bundler, so the web app carries no
third-party code at all: every file in `src/` and `data/` was written for it. The
notices below are for what the **Android app** links, and for the one kind of
material a personal build can carry that is not ours.

---

## Android libraries (APK only)

The APK declares one library in `android/app/build.gradle`, `androidx.webkit`, and
Gradle brings in what that one depends on. All of it is compiled into `classes.dex`
and therefore redistributed inside the APK:

| Library | Version | Licence |
|---|---|---|
| `androidx.webkit:webkit` | 1.14.0 | Apache-2.0 |
| `androidx.core:core` | 1.1.0 | Apache-2.0 |
| `androidx.annotation:annotation` | 1.8.1 | Apache-2.0 |
| `androidx.annotation:annotation-experimental` | 1.4.1 | Apache-2.0 |
| `androidx.lifecycle:lifecycle-runtime`, `lifecycle-common` | 2.0.0 | Apache-2.0 |
| `androidx.arch.core:core-common` | 2.0.0 | Apache-2.0 |
| `androidx.versionedparcelable:versionedparcelable` | 1.1.0 | Apache-2.0 |
| `androidx.collection:collection` | 1.0.0 | Apache-2.0 |
| `org.jetbrains.kotlin:kotlin-stdlib` | 2.2.10 | Apache-2.0 |
| `org.jetbrains:annotations` | 13.0 | Apache-2.0 |
| `org.jspecify:jspecify` | 1.0.0 | Apache-2.0 |

This is the full runtime classpath, not only what `build.gradle` names — list it
again after any dependency change with

```bash
cd android && gradle -q :app:dependencies --configuration releaseRuntimeClasspath
```

and check it against the `META-INF/*.version` files inside the built APK.
Apache-2.0 requires that its licence text travel with a binary that contains the
work; a copy of the Apache License 2.0 is at
<https://www.apache.org/licenses/LICENSE-2.0>.

None of these is part of the web build at `/hangil/`.

## Fonts

No font file is embedded, in either build. The app asks for the system UI font and,
for Korean, the system's Korean font (`Apple SD Gothic Neo`, `Noto Sans KR`,
`Malgun Gothic`), and falls back to whatever the device provides. It never fetches
a webfont, and the Android package holds no `INTERNET` permission, so it could not.

## Speech

The Korean is spoken by the device's own text-to-speech engine, or in Chrome and
Edge by the browser's online voice. No voice or recording ships with the app.

## Official EPS-TOPIK listening files (personal builds only)

`content/listening/` is a shelf for the listening files that 한국산업인력공단
(HRD Korea) publishes free at epstopik.hrdkorea.or.kr. They are HRD Korea's
material, not ours, and are **not** covered by this project's licence.

They are never committed to this repository and never distributed with a public
build: the website and the APK it serves are built with the shelf emptied
(`tools/strip-audio.py`, `HANGIL_NO_AUDIO=1`). Anyone who wants them imports them
into their own build with `tools/import-eps-audio.py`, from HRD Korea's own
download.

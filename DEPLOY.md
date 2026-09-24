# Shipping HANGIL

It is a static folder. There is no server, no environment and nothing to
configure.

## The one path that matters

```bash
cd ~/Hangil_app
node tools/build.mjs                         # -> dist/  (prints a version hash)
rm -rf ~/doubleem-site/public/hangil
rsync -a --exclude='*.mp3' --exclude='*.m4a' --exclude='*.ogg' --exclude='*.wav' \
      dist/ ~/doubleem-site/public/hangil/
cd ~/doubleem-site
npm run build                                # site builds it into dist/
git add -A && git commit -m "hangil: …" && git push
```

Pushing to `main` deploys the site via `.github/workflows/deploy.yml`. The app is
then live at **https://itsdoubleem.github.io/hangil/**.

## The official listening audio never goes to the website

`content/listening/` may hold ~180 MB of EPS-TOPIK audio imported with
`tools/import-eps-audio.py`. It belongs in the phone build and nowhere else:

- it is 한국산업인력공단's material, and a learner should get it from HRD Korea;
- 180 MB is a permanent weight in a git repo and a 180 MB APK for every worker
  who taps download.

Strip it with the tool rather than by hand:

```bash
rsync -a --delete ~/Hangil_app/dist/ ~/doubleem-site/public/hangil/
python3 ~/Hangil_app/tools/strip-audio.py ~/doubleem-site/public/hangil
```

**Deleting the mp3s is only half of it.** `content/listening/manifest.json` lists
every track, and the app reads the manifest, not the folder — so deleting the
audio alone left the Exam screen advertising "60 tracks" and the Listening screen
drawing sixty players pointing at 404s. `strip-audio.py` empties the manifest's
`sets` too, which is what puts the app into the empty state it already handles
well: the Listening screen explains what the files are and where 한국산업인력공단
publishes them, and the card that links to it does not appear at all. The source
and licence stay in the manifest — they are the attribution for material the
reader is being pointed at.

`build_apk.sh` runs the same tool when `HANGIL_NO_AUDIO=1` is set, so the APK the
website serves and the website itself agree.

Check after copying, every time — and check it against the running app, not just
the folder:

```bash
find ~/doubleem-site/public/hangil -name '*.mp3' | wc -l    # must print 0
```

Then open `/hangil/#/listening` and confirm it shows the empty state rather than
a wall of dead players.

## Weigh the APK against what is inside it

Gradle packages the APK incrementally. When a file leaves `assets/` it rewrites
the zip's central directory but leaves the old entry's bytes stranded in the
file. Every zip reader follows the directory, so the APK installs and runs
perfectly — it is simply enormous. Dropping the 180 MB of audio for the website
build this way produced a **191 MB APK holding 2.6 MB of actual entries**, and
nothing catches that except weighing it.

`build_apk.sh` now deletes `android/app/build/outputs/apk` before assembling to
force a full repackage, and warns if the file on disk is far larger than its
entries. Do not remove either.

## After any change to a screen that appears on the website

```bash
cd ~/doubleem-site
npm run dev                       # serves the copied build at /hangil/index.html
node tools/capture-hangil.mjs     # rewrites public/assets/hangil/*
```

The captures come from the shipping build, never from a mock-up. A page showing a
screen the app no longer has is worse than no page.

## What to check before pushing

1. `node tools/build.mjs` prints a version and no error. It parses the stamped
   service worker, so a build that completes means `sw.js` at least loads.
2. **Run the offline check.** From the site repo, with the built site being served:

   ```bash
   npx astro preview --port 8140
   node tools/offline-check.mjs          # exits non-zero if offline is broken
   ```

   It registers the worker, cuts the network, reloads and walks three screens. This
   is the claim the website makes and it has broken silently twice — see the two
   service-worker traps in `CLAUDE.md`. Doing it by hand (load, airplane mode,
   reload) is fine too; skipping it is not.
3. Open the browser's network panel and use the app. Every request must be for the
   app's own files, and there must be none at all after it has loaded.
4. At 390px wide, no page scrolls sideways.

## Version and caching

`build.mjs` derives the version from a hash of everything that ships, so a build
with no changes produces the same service worker and phones do not churn their
caches. A changed file means a new cache name, and the new worker deletes the old
cache on activation.

A phone that already has the app will pick up a new version on its next load with
a connection; the load after that is the new one. This is normal service-worker
behaviour and is not worth engineering around for a study app.

## The Android app

```bash
./build_apk.sh                          # -> hangil-debug.apk, for your own phone
./build_apk.sh install                  # the same, then adb install to a connected phone
HANGIL_NO_AUDIO=1 ./build_apk.sh release   # -> hangil-release.apk, the one the website offers
```

It runs `tools/build.mjs` first and stages `dist/` into the APK's assets, so the
APK and the website always carry the same build, and prints the SHA-256 and the
signing certificate.

**The debug APK never goes on the website.** It is debuggable — anyone with a
cable and adb can read or rewrite a learner's progress through `run-as`, and the
WebView can be inspected — and it is signed with `~/.android/debug.keystore`,
which is this Mac's and is regenerated if lost.

### The release key

Android installs an update only if it is signed with the same key as the app
already on the phone. Lose the key and nobody can update; they have to
uninstall, and because the app sets `allowBackup=false`, uninstalling deletes
their progress. So the key is made once, kept outside every repo, and backed up.

```bash
keytool -genkeypair -keystore ~/keys/hangil-release.jks -alias hangil \
  -keyalg RSA -keysize 4096 -validity 10000
```

Then write `android/keystore.properties` (gitignored — never commit it):

```properties
storeFile=/Users/<you>/keys/hangil-release.jks
storePassword=…
keyAlias=hangil
keyPassword=…
```

Without that file `./build_apk.sh release` stops rather than produce an
unsigned APK, which no phone will install.

**Moving from the debug key is a one-time break.** APKs published before the
release key existed were debug-signed, and a release-signed APK will not install
over one. Anyone who installed the old one has to export a backup from Settings,
uninstall, install the new APK and restore the backup. Say so on the download
page when the first release-signed APK goes up.

The APK is **not** just the web build in a box. It has the phone's speech engine
behind the play buttons, which a browser cannot reach, and it ships with no
INTERNET permission — a claim the website makes, so do not add one casually.

After replacing the APK, copy it to the site **and** regenerate both hashes in the
same commit — `apps/hangil.md` prints one and the site README prints the other,
and a stale hash is worse than no hash:

```bash
cp hangil-release.apk ~/doubleem-site/public/downloads/hangil.apk
shasum -a 256 ~/doubleem-site/public/downloads/*.apk
```

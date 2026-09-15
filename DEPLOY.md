# Shipping HANGIL

It is a static folder. There is no server, no environment and nothing to
configure.

## The one path that matters

```bash
cd ~/Hangil_app
node tools/build.mjs                         # -> dist/  (prints a version hash)
rm -rf ~/doubleem-site/public/hangil
cp -R dist/. ~/doubleem-site/public/hangil/
cd ~/doubleem-site
npm run build                                # site builds it into dist/
git add -A && git commit -m "hangil: …" && git push
```

Pushing to `main` deploys the site via `.github/workflows/deploy.yml`. The app is
then live at **https://itsdoubleem.github.io/hangil/**.

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
./build_apk.sh              # -> hangil-debug.apk, and prints its SHA-256
./build_apk.sh install      # the same, then adb install to a connected phone
```

It runs `tools/build.mjs` first and stages `dist/` into the APK's assets, so the
APK and the website always carry the same build. Debug-signed with
`~/.android/debug.keystore`: fine for sideloading, not a Play Store artifact.

The APK is **not** just the web build in a box. It has the phone's speech engine
behind the play buttons, which a browser cannot reach, and it ships with no
INTERNET permission — a claim the website makes, so do not add one casually.

After replacing the APK, copy it to the site **and** regenerate both hashes in the
same commit — `apps/hangil.md` prints one and the site README prints the other,
and a stale hash is worse than no hash:

```bash
cp hangil-debug.apk ~/doubleem-site/public/downloads/hangil.apk
shasum -a 256 ~/doubleem-site/public/downloads/*.apk
```

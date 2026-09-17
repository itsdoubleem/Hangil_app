#!/bin/sh
# Build the sideloadable APK.
#
#   ./build_apk.sh              -> hangil-debug.apk    (debug-signed, for your phone)
#   ./build_apk.sh release      -> hangil-release.apk  (unsigned unless a key is set up)
#   ./build_apk.sh install      -> build the debug APK and adb install it
#
# Runs tools/build.mjs first and stages dist/ into the APK's assets, so the APK
# and the website always carry the same build. Debug-signed with
# ~/.android/debug.keystore: fine for sideloading onto your own phone, not a
# Play Store artifact.
set -e
cd "$(dirname "$0")"

case "$1" in
  release) TASK=assembleRelease; OUT=hangil-release.apk
           ART=android/app/build/outputs/apk/release/app-release.apk
           UNSIGNED=android/app/build/outputs/apk/release/app-release-unsigned.apk ;;
  install|'') TASK=assembleDebug; OUT=hangil-debug.apk
           ART=android/app/build/outputs/apk/debug/app-debug.apk; UNSIGNED= ;;
  *)       echo "unknown mode: $1  (use nothing | release | install)" >&2; exit 1 ;;
esac

# Gradle needs a JDK. Android Studio ships one; use it rather than asking the
# machine to have `java` on PATH, which it does not.
if [ -z "$JAVA_HOME" ] && [ -d "/Applications/Android Studio.app/Contents/jbr/Contents/Home" ]; then
  JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
  export JAVA_HOME
fi

# Gradle also needs to be told where the SDK is. Doing it with the environment
# rather than android/local.properties keeps a machine-specific absolute path out
# of the repo — local.properties is the usual answer and it is the usual thing to
# accidentally commit.
if [ -z "$ANDROID_HOME" ] && [ -d "$HOME/Library/Android/sdk" ]; then
  ANDROID_HOME="$HOME/Library/Android/sdk"
  export ANDROID_HOME
fi

node tools/build.mjs
python3 tools/icons.py android android/app/src/main/res

# The APK carries the same dist/ the website serves. Staged fresh every time so a
# deleted file cannot linger inside the APK after it has gone from the build.
rm -rf android/app/src/main/assets/www
mkdir -p android/app/src/main/assets/www
cp -R dist/. android/app/src/main/assets/www/
# HANGIL_NO_AUDIO=1 builds the APK the website serves: the same app without the
# ~180 MB of official EPS-TOPIK listening. That audio is 한국산업인력공단's and
# belongs in a personal build only — see DEPLOY.md. The app copes on its own:
# with no audio the Listening screen explains where to get it and the card that
# links to it does not appear.
if [ -n "$HANGIL_NO_AUDIO" ]; then
  echo "audio excluded from this APK (HANGIL_NO_AUDIO)"
  python3 tools/strip-audio.py android/app/src/main/assets/www
fi
# The service worker is not used inside the app (see app.js) and shipping it would
# only invite a stale copy of files that cannot go stale.
rm -f android/app/src/main/assets/www/sw.js

# Force a full repackage. Gradle packages the APK incrementally: when a file
# leaves assets/ it rewrites the zip's central directory but leaves the old
# entry's bytes stranded in the file. Zip readers only follow the directory, so
# the APK installs and runs correctly — it is just enormous. Dropping the 180 MB
# of audio for the website build this way produced a 191 MB APK holding 2.6 MB
# of actual entries, which nothing would have caught except weighing it.
rm -rf android/app/build/outputs/apk android/app/build/intermediates/apk

GRADLE=$(ls -d "$HOME"/.gradle/wrapper/dists/gradle-*/*/gradle-*/bin/gradle 2>/dev/null | tail -1)
if [ -z "$GRADLE" ]; then
  echo "No Gradle found. Open android/ in Android Studio once, or install Gradle." >&2
  exit 1
fi

( cd android && "$GRADLE" --no-daemon "$TASK" )

if [ -f "$ART" ]; then
  cp "$ART" "$OUT"
elif [ -n "$UNSIGNED" ] && [ -f "$UNSIGNED" ]; then
  cp "$UNSIGNED" "$OUT"
else
  echo "gradle finished but no artifact at $ART" >&2
  exit 1
fi

echo
echo "$OUT  $(wc -c < "$OUT") bytes"
shasum -a 256 "$OUT"

# Weigh the file against what is actually inside it. A large gap means stranded
# bytes are back (see the rm above), which is invisible to every other check.
python3 - "$OUT" <<'PY'
import sys, zipfile
p = sys.argv[1]
on_disk = __import__("os").path.getsize(p)
packed = sum(i.compress_size for i in zipfile.ZipFile(p).infolist())
if on_disk > packed * 1.5 + 1_000_000:
    print(f"WARNING: {on_disk/1048576:.0f} MB on disk but only "
          f"{packed/1048576:.1f} MB of entries — stranded bytes, not a clean build.")
PY

APKSIGNER=$(ls "$HOME"/Library/Android/sdk/build-tools/*/apksigner 2>/dev/null | tail -1)
[ -n "$APKSIGNER" ] && "$APKSIGNER" verify --print-certs "$OUT" 2>/dev/null | head -2 || true

if [ "$1" = "install" ]; then
  ADB="$HOME/Library/Android/sdk/platform-tools/adb"
  [ -x "$ADB" ] || ADB=adb
  echo
  "$ADB" devices -l
  "$ADB" install -r "$OUT"
  echo "installed. Look for HANGIL in the app drawer."
fi

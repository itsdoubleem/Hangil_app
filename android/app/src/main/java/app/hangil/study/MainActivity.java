package app.hangil.study;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Insets;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.speech.tts.Voice;
import android.view.KeyEvent;
import android.view.WindowInsets;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.webkit.WebViewAssetLoader;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Locale;

/**
 * HANGIL's whole Android app: a WebView holding the same build the website
 * serves, plus one thing the web version cannot have — the phone's own Korean
 * text-to-speech engine.
 *
 * Two decisions here are load-bearing.
 *
 * 1. The page is served over https://appassets.androidplatform.net, not file://.
 *    The app fetches its content as JSON, and fetch() of a file:// URL is blocked
 *    in a WebView — on file:// the app would load its shell and then sit on
 *    "Loading…" for ever. The https origin is also a secure context and gives
 *    localStorage somewhere stable to live, so progress survives an update.
 *
 * 2. Audio goes through android.speech.tts, not the Web Speech API. Chrome for
 *    Android has speechSynthesis; the WebView does not implement it. Every play
 *    button in this app would do nothing, silently. The bridge below is what the
 *    web build already looks for.
 */
public class MainActivity extends Activity {

    private static final String ORIGIN = "https://appassets.androidplatform.net";
    private static final String START  = ORIGIN + "/assets/www/index.html";

    private WebView web;
    private TextToSpeech tts;
    private volatile boolean ttsReady = false;
    private volatile boolean koreanOk = false;
    private int insetTop = 0, insetBottom = 0;

    private SharedPreferences prefs;
    // The two Korean voices in use: [0] is the narrator and the first speaker in a
    // dialogue, [1] is the second speaker. Two real voices, because shifting the
    // pitch of one voice to fake a second speaker is what made the audio sound
    // synthetic — a neural voice stops sounding human the moment you bend it.
    private final Voice[] picked = new Voice[2];

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);

        final WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        web = new WebView(this);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setMediaPlaybackRequiresUserGesture(false);
        // The page is one long scroll; Android's scrollbar sits on top of the
        // content and adds nothing here.
        web.setVerticalScrollBarEnabled(false);
        web.setHorizontalScrollBarEnabled(false);
        web.setOverScrollMode(WebView.OVER_SCROLL_NEVER);
        // The system font scale is deliberately NOT overridden. Someone who has
        // made their phone's text bigger has done so on purpose.

        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest req) {
                return loader.shouldInterceptRequest(req.getUrl());
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                // Insets usually arrive before the page does, so set them again
                // once there is a document to set them on.
                applyInsets();
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
                // Nothing outside the app's own origin opens in here. There is no
                // INTERNET permission anyway, so a stray link would fail oddly
                // rather than do nothing; refusing it is clearer.
                return !req.getUrl().toString().startsWith(ORIGIN);
            }
        });

        // Keep the page out from under the status bar and the gesture pill.
        //
        // The CSS asks for this with env(safe-area-inset-*), which works on iOS
        // and in a browser. An Android WebView reports env() as zero even though
        // the system draws edge to edge from targetSdk 35, so the app's heading
        // sat behind the clock. Padding the WebView itself did not hold either —
        // it re-lays-out and loses it. What does work is handing the measured
        // insets to the page as the two CSS variables the stylesheet already
        // uses, which also lets the background keep running under the bars.
        web.setOnApplyWindowInsetsListener((v, insets) -> {
            int top, bottom;
            if (Build.VERSION.SDK_INT >= 30) {
                Insets bars = insets.getInsets(WindowInsets.Type.systemBars());
                top = bars.top; bottom = bars.bottom;
            } else {
                top = insets.getSystemWindowInsetTop();
                bottom = insets.getSystemWindowInsetBottom();
            }
            float d = getResources().getDisplayMetrics().density;
            insetTop = Math.round(top / d);
            insetBottom = Math.round(bottom / d);
            applyInsets();
            return insets;
        });

        web.addJavascriptInterface(new Bridge(), "HangilNative");
        setContentView(web);

        prefs = getSharedPreferences("hangil", MODE_PRIVATE);
        startTts(prefs.getString("engine", null));

        if (state != null) web.restoreState(state);
        else web.loadUrl(START);
    }

    /* ---- speech ---------------------------------------------------------
     *
     * Android hands you a default engine and a default voice, and on most phones
     * that is the cheapest embedded voice the engine owns. This picks
     * deliberately instead: every Korean voice on the device, network ones
     * dropped (the app has no INTERNET permission, so they would fail silently),
     * sorted by the quality the engine itself reports, best first.
     *
     * Two engines are usually present on a Samsung phone — Google's and
     * Samsung's — and which sounds better is a matter of taste, so the choice is
     * exposed in Settings rather than decided here.
     */
    private void startTts(final String enginePkg) {
        if (tts != null) { tts.stop(); tts.shutdown(); tts = null; }
        ttsReady = false; koreanOk = false;
        picked[0] = null; picked[1] = null;

        final TextToSpeech.OnInitListener init = status -> {
            if (status != TextToSpeech.SUCCESS) { notifyVoiceChanged(); return; }
            int r = tts.setLanguage(Locale.KOREAN);
            koreanOk = r != TextToSpeech.LANG_MISSING_DATA && r != TextToSpeech.LANG_NOT_SUPPORTED;
            choose(prefs.getString("voice", null));
            ttsReady = true;
            // One line on startup saying what the phone actually offers. The
            // engine and voice in use are the first thing to check when someone
            // says the Korean sounds wrong.
            StringBuilder sb = new StringBuilder("engine=").append(tts.getDefaultEngine());
            try {
                sb.append(" engines=");
                for (TextToSpeech.EngineInfo e : tts.getEngines()) sb.append(e.name).append(',');
            } catch (Exception e) { sb.append("<failed:").append(e).append('>'); }
            sb.append(" koVoices=").append(koreanVoices().size())
              .append(" using=").append(picked[0] == null ? "none" : picked[0].getName())
              .append('/').append(picked[1] == null ? "none" : picked[1].getName());
            Log.i("HangilTTS", sb.toString());
            notifyVoiceChanged();
        };

        tts = (enginePkg == null || enginePkg.isEmpty())
                ? new TextToSpeech(this, init)
                : new TextToSpeech(this, init, enginePkg);

        tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
            @Override public void onStart(String id) { }
            @Override public void onDone(String id) { finished(id); }
            @Override public void onError(String id) { finished(id); }
        });
    }

    /** Korean voices on this engine, best-reported-quality first. */
    private List<Voice> koreanVoices() {
        List<Voice> out = new ArrayList<>();
        try {
            if (tts == null || tts.getVoices() == null) return out;
            for (Voice v : tts.getVoices()) {
                if (v == null || v.getLocale() == null) continue;
                if (!"kor".equalsIgnoreCase(v.getLocale().getISO3Language())) continue;
                if (v.isNetworkConnectionRequired()) continue;
                if (v.getFeatures() != null
                        && v.getFeatures().contains(TextToSpeech.Engine.KEY_FEATURE_NOT_INSTALLED)) continue;
                out.add(v);
            }
        } catch (Exception ignored) { }
        Collections.sort(out, (a, b) -> b.getQuality() - a.getQuality());
        return out;
    }

    /** Settle on a narrator voice and a second one for dialogues. */
    private void choose(String wantedName) {
        List<Voice> ko = koreanVoices();
        if (ko.isEmpty()) return;

        Voice first = null;
        if (wantedName != null) {
            for (Voice v : ko) if (wantedName.equals(v.getName())) { first = v; break; }
        }
        if (first == null) first = ko.get(0);

        Voice second = null;
        for (Voice v : ko) if (!v.getName().equals(first.getName())) { second = v; break; }

        picked[0] = first;
        picked[1] = second != null ? second : first;
        try { tts.setVoice(first); } catch (Exception ignored) { }
    }

    private void notifyVoiceChanged() {
        if (web == null) return;
        web.post(() -> web.evaluateJavascript("window.__hangilVoices && window.__hangilVoices()", null));
    }

    private void applyInsets() {
        if (web == null) return;
        final String js = "document.documentElement.style.setProperty('--sat','" + insetTop + "px');"
                        + "document.documentElement.style.setProperty('--sab','" + insetBottom + "px');";
        web.post(() -> web.evaluateJavascript(js, null));
    }

    /** Tells the page an utterance ended, so a two-speaker dialogue plays in order. */
    private void finished(final String id) {
        if (web == null || id == null) return;
        final String js = "window.__hangilSpoke && window.__hangilSpoke(" + JSONObject.quote(id) + ")";
        web.post(() -> web.evaluateJavascript(js, null));
    }

    /**
     * The names in here are called as strings from JavaScript. Renaming one — or
     * letting R8 rename one — makes the audio stop with no error on either side.
     */
    private class Bridge {
        @JavascriptInterface public boolean isNative() { return true; }
        @JavascriptInterface public boolean ready() { return ttsReady; }
        @JavascriptInterface public boolean koreanAvailable() { return koreanOk; }

        @JavascriptInterface
        public void speak(String text, float rate, int speaker, String id) {
            if (!ttsReady || text == null || text.isEmpty()) { finished(id); return; }
            tts.setSpeechRate(rate <= 0 ? 1f : rate);
            // Pitch stays at 1. It is the engine's own, and bending it is what
            // made the voice sound like a machine reading a phone number.
            tts.setPitch(1f);
            Voice v = picked[speaker == 1 ? 1 : 0];
            if (v != null) { try { tts.setVoice(v); } catch (Exception ignored) { } }
            tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, id);
        }

        @JavascriptInterface public void stop() { if (tts != null) tts.stop(); }

        /**
         * Speech engines to offer. getEngines() alone is not enough — on One UI
         * it returns only the system default even though Samsung's engine is
         * installed and resolvable — so any known engine that is actually on the
         * phone is added to the list. Binding by name works where enumeration
         * does not, and if one of them fails to start, choosing it simply falls
         * back with the voice list empty, which Settings shows plainly.
         */
        @JavascriptInterface
        public String engines() {
            JSONArray arr = new JSONArray();
            java.util.LinkedHashMap<String, String> found = new java.util.LinkedHashMap<>();
            try {
                for (TextToSpeech.EngineInfo e : tts.getEngines()) {
                    found.put(e.name, (e.label == null || e.label.isEmpty()) ? e.name : e.label);
                }
            } catch (Exception ignored) { }

            final String[][] known = {
                { "com.google.android.tts", "Google speech services" },
                { "com.samsung.SMT",        "Samsung text-to-speech" },
            };
            PackageManager pm = getPackageManager();
            for (String[] k : known) {
                if (found.containsKey(k[0])) continue;
                try { pm.getPackageInfo(k[0], 0); found.put(k[0], k[1]); }
                catch (Exception notInstalled) { }
            }

            for (java.util.Map.Entry<String, String> e : found.entrySet()) {
                try {
                    JSONObject o = new JSONObject();
                    o.put("pkg", e.getKey());
                    o.put("label", e.getValue());
                    arr.put(o);
                } catch (Exception ignored) { }
            }
            return arr.toString();
        }

        /** Korean voices on the current engine, best first. */
        @JavascriptInterface
        public String voices() {
            JSONArray arr = new JSONArray();
            try {
                for (Voice v : koreanVoices()) {
                    JSONObject o = new JSONObject();
                    o.put("name", v.getName());
                    o.put("quality", v.getQuality());
                    arr.put(o);
                }
            } catch (Exception ignored) { }
            return arr.toString();
        }

        @JavascriptInterface
        public String current() {
            JSONObject o = new JSONObject();
            try {
                o.put("engine", tts != null ? tts.getDefaultEngine() : null);
                o.put("chosenEngine", prefs.getString("engine", ""));
                o.put("voice", picked[0] != null ? picked[0].getName() : "");
                o.put("second", picked[1] != null ? picked[1].getName() : "");
            } catch (Exception ignored) { }
            return o.toString();
        }

        @JavascriptInterface
        public void useEngine(String pkg) {
            prefs.edit().putString("engine", pkg == null ? "" : pkg).remove("voice").apply();
            runOnUiThread(() -> startTts(pkg));
        }

        @JavascriptInterface
        public void useVoice(String name) {
            prefs.edit().putString("voice", name == null ? "" : name).apply();
            runOnUiThread(() -> { choose(name); notifyVoiceChanged(); });
        }
    }

    @Override
    public boolean onKeyDown(int code, KeyEvent e) {
        if (code == KeyEvent.KEYCODE_BACK && web != null && web.canGoBack()) {
            web.goBack();
            return true;
        }
        return super.onKeyDown(code, e);
    }

    @Override protected void onSaveInstanceState(Bundle out) { super.onSaveInstanceState(out); web.saveState(out); }
    @Override protected void onPause() { if (tts != null) tts.stop(); super.onPause(); }

    @Override
    protected void onDestroy() {
        if (tts != null) { tts.stop(); tts.shutdown(); tts = null; }
        super.onDestroy();
    }
}

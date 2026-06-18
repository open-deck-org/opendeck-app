package org.opendeck;

import android.net.Uri;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;

import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeWebViewClient;

import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Serves deck content from a DISTINCT origin so untrusted deck JS stays isolated
 * from the Capacitor shell (https://localhost) and the bridge.
 *
 *   Shell:  https://localhost/...                  (Capacitor local server)
 *   Decks:  https://decks.opendeck/<id>/<path>    (intercepted here)
 *
 * Files are read from filesDir/decks/<id>/... — where the JS store's Filesystem
 * backend (Directory.Library) writes imported packages on Android.
 *
 * Also accepts deck://<id>/<path> for parity with iOS, though the app uses the
 * https host on Android (player.js).
 */
public class DeckWebViewClient extends BridgeWebViewClient {

    private static final String DECK_HOST = "decks.opendeck";
    private final File root;

    public DeckWebViewClient(Bridge bridge) {
        super(bridge);
        this.root = new File(bridge.getContext().getFilesDir(), "decks");
    }

    @Override
    public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
        Uri url = request.getUrl();
        boolean isDeckScheme = "deck".equals(url.getScheme());
        boolean isDeckHost = "https".equals(url.getScheme()) && DECK_HOST.equals(url.getHost());
        if (!isDeckScheme && !isDeckHost) {
            return super.shouldInterceptRequest(view, request); // shell assets
        }

        try {
            List<String> segments = url.getPathSegments();
            String deckId;
            StringBuilder rel = new StringBuilder();

            if (isDeckScheme) {
                deckId = url.getHost();                 // deck://<id>/<path>
                for (int i = 0; i < segments.size(); i++) appendSeg(rel, segments.get(i));
            } else {
                deckId = segments.isEmpty() ? "" : segments.get(0); // /<id>/<path>
                for (int i = 1; i < segments.size(); i++) appendSeg(rel, segments.get(i));
            }
            String relPath = rel.length() == 0 ? "index.html" : rel.toString();

            File deckRoot = new File(root, deckId).getCanonicalFile();
            File target = new File(deckRoot, relPath).getCanonicalFile();

            // Path-traversal guard + existence.
            if (!target.getPath().startsWith(deckRoot.getPath()) || !target.exists()) {
                return notFound();
            }

            Map<String, String> headers = new HashMap<>();
            headers.put("Access-Control-Allow-Origin", "*");
            headers.put("Cache-Control", "no-store");
            headers.put("X-Content-Type-Options", "nosniff");

            WebResourceResponse resp = new WebResourceResponse(
                    mimeFor(target.getName()), "utf-8", new FileInputStream(target));
            resp.setResponseHeaders(headers);
            resp.setStatusCodeAndReasonPhrase(200, "OK");
            return resp;
        } catch (Exception e) {
            return notFound();
        }
    }

    private static void appendSeg(StringBuilder sb, String seg) {
        if (sb.length() > 0) sb.append('/');
        sb.append(seg);
    }

    private WebResourceResponse notFound() {
        InputStream body = new ByteArrayInputStream("Not found".getBytes());
        WebResourceResponse resp = new WebResourceResponse("text/plain", "utf-8", body);
        resp.setStatusCodeAndReasonPhrase(404, "Not Found");
        return resp;
    }

    private static String mimeFor(String name) {
        int dot = name.lastIndexOf('.');
        String ext = dot >= 0 ? name.substring(dot + 1).toLowerCase() : "";
        switch (ext) {
            case "html": case "htm": return "text/html";
            case "js": case "mjs":   return "text/javascript";
            case "css":  return "text/css";
            case "json": return "application/json";
            case "svg":  return "image/svg+xml";
            case "png":  return "image/png";
            case "jpg": case "jpeg": return "image/jpeg";
            case "gif":  return "image/gif";
            case "webp": return "image/webp";
            case "avif": return "image/avif";
            case "woff": return "font/woff";
            case "woff2": return "font/woff2";
            case "ttf":  return "font/ttf";
            case "otf":  return "font/otf";
            case "mp4":  return "video/mp4";
            case "webm": return "video/webm";
            case "mp3":  return "audio/mpeg";
            case "wav":  return "audio/wav";
            case "wasm": return "application/wasm";
            default:     return "application/octet-stream";
        }
    }
}

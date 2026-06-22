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
 *   Shell:  https://localhost/...                       (Capacitor local server)
 *   Decks:  https://<id>.decks.opendeck/<path>          (intercepted here)
 *
 * Each deck gets its OWN subdomain, so each deck is a distinct web origin. That
 * isolates decks from the shell AND from each other: deck A cannot read deck B's
 * origin-scoped storage (localStorage/IndexedDB/cookies) or fetch its files.
 * <id> is the content hash (25-char base36), a valid single DNS label.
 *
 * Files are read from filesDir/decks/<id>/... — where the JS store's Filesystem
 * backend (Directory.Library) writes imported packages on Android.
 *
 * Also accepts deck://<id>/<path> for parity with iOS.
 */
public class DeckWebViewClient extends BridgeWebViewClient {

    private static final String DECK_DOMAIN = ".decks.opendeck";
    // A deck loads only its own (same-origin) subresources and must not phone
    // home — mirrors the iOS handler's CSP. 'self' resolves to the deck's own
    // subdomain origin; no remote hosts are allowed in connect-src/img-src/etc.
    private static final String DECK_CSP =
        "default-src 'self' data: blob:; img-src 'self' data: blob:; " +
        "media-src 'self' data: blob:; font-src 'self' data:; " +
        "style-src 'self' 'unsafe-inline'; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' data: blob:";
    private final File root;

    public DeckWebViewClient(Bridge bridge) {
        super(bridge);
        this.root = new File(bridge.getContext().getFilesDir(), "decks");
    }

    @Override
    public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
        Uri url = request.getUrl();
        String host = url.getHost() == null ? "" : url.getHost();
        boolean isDeckScheme = "deck".equals(url.getScheme());
        boolean isDeckHost = "https".equals(url.getScheme()) && host.endsWith(DECK_DOMAIN);
        if (!isDeckScheme && !isDeckHost) {
            return super.shouldInterceptRequest(view, request); // shell assets
        }

        try {
            List<String> segments = url.getPathSegments();
            // deck://<id>/<path>           -> id is the host
            // https://<id>.decks.opendeck/ -> id is the leading subdomain label
            String deckId = isDeckScheme
                    ? host
                    : host.substring(0, host.length() - DECK_DOMAIN.length());
            StringBuilder rel = new StringBuilder();
            for (int i = 0; i < segments.size(); i++) appendSeg(rel, segments.get(i));
            String relPath = rel.length() == 0 ? "index.html" : rel.toString();

            File deckRoot = new File(root, deckId).getCanonicalFile();
            File target = new File(deckRoot, relPath).getCanonicalFile();

            // Path-traversal guard (trailing separator so "/a" can't match "/ab")
            // + existence. deckId itself is a single hash label, so it cannot
            // contain separators to escape `root`.
            String prefix = deckRoot.getPath() + File.separator;
            boolean inRoot = target.getPath().equals(deckRoot.getPath()) || target.getPath().startsWith(prefix);
            if (deckId.isEmpty() || !inRoot || !target.exists()) {
                return notFound();
            }

            Map<String, String> headers = new HashMap<>();
            // No Access-Control-Allow-Origin: each deck is its own origin and only
            // loads its own (same-origin) assets. Omitting CORS means a sibling
            // deck origin cannot read this deck's files via fetch().
            headers.put("Content-Security-Policy", DECK_CSP);
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

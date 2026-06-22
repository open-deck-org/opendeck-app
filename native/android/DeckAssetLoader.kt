package org.opendeck

import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import com.getcapacitor.BridgeWebViewClient
import com.getcapacitor.Bridge
import java.io.File
import java.io.FileInputStream

/**
 * Serves decks on Android from a DISTINCT host so deck content is a different
 * origin than the Capacitor shell (https://localhost), keeping untrusted deck
 * JS away from the bridge.
 *
 *   Shell:  https://localhost/...                  (Capacitor)
 *   Decks:  https://<id>.decks.opendeck/...        (intercepted below)
 *
 * Each deck gets its own subdomain == its own web origin, so decks are isolated
 * from the shell AND from each other (no shared localStorage/IndexedDB, and a
 * sibling origin can't fetch this deck's files).
 *
 * Files are read from filesDir/decks/<id>/... where store.js's Filesystem
 * backend (Directory.Data) writes them.
 *
 * Wire it up by setting this WebViewClient on the bridge's WebView, e.g. in a
 * custom BridgeActivity.onStart() after `bridge` is available:
 *
 *     bridge.webView.webViewClient = DeckWebViewClient(bridge)
 *
 * The player resolves deck URLs to `deck://<id>/...` on native; map that to the
 * intercept host by overriding deckUrl() OR keep deck:// and intercept the
 * custom scheme here (Android WebView lets shouldInterceptRequest see any URL).
 */
class DeckWebViewClient(bridge: Bridge) : BridgeWebViewClient(bridge) {

    private val root = File(bridge.context.filesDir, "decks")

    companion object {
        private const val DECK_DOMAIN = ".decks.opendeck"
        // Mirror the iOS handler's CSP: a deck loads only its own ('self')
        // subresources and cannot phone home or reach another deck's origin.
        private const val DECK_CSP =
            "default-src 'self' data: blob:; img-src 'self' data: blob:; " +
            "media-src 'self' data: blob:; font-src 'self' data:; " +
            "style-src 'self' 'unsafe-inline'; " +
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' data: blob:"
    }

    override fun shouldInterceptRequest(
        view: android.webkit.WebView?,
        request: WebResourceRequest?
    ): WebResourceResponse? {
        val url = request?.url ?: return super.shouldInterceptRequest(view, request)

        // Accept deck://<id>/<path> and https://<id>.decks.opendeck/<path>
        val host = url.host.orEmpty()
        val isDeckScheme = url.scheme == "deck"
        val isDeckHost = url.scheme == "https" && host.endsWith(DECK_DOMAIN)
        if (!isDeckScheme && !isDeckHost) {
            return super.shouldInterceptRequest(view, request)
        }

        // id is the host (deck://) or the leading subdomain label (https://).
        val deckId = if (isDeckScheme) host else host.dropLast(DECK_DOMAIN.length)
        var rel = url.pathSegments.joinToString("/").ifEmpty { "index.html" }
        if (rel.endsWith("/")) rel += "index.html"

        val deckRoot = File(root, deckId).canonicalFile
        val target = File(deckRoot, rel).canonicalFile

        // Path-traversal guard (trailing separator so "/a" can't match "/ab").
        val inRoot = target.path == deckRoot.path || target.path.startsWith(deckRoot.path + File.separator)
        if (deckId.isEmpty() || !inRoot || !target.exists()) {
            return WebResourceResponse("text/plain", "utf-8", 404, "Not Found", emptyMap(), null)
        }

        val mime = mimeFor(target.extension)
        // No Access-Control-Allow-Origin: a deck loads only its own same-origin
        // assets; omitting CORS stops a sibling deck origin reading these files.
        val headers = mapOf(
            "Content-Security-Policy" to DECK_CSP,
            "Cache-Control" to "no-store",
            "X-Content-Type-Options" to "nosniff"
        )
        return WebResourceResponse(mime, "utf-8", 200, "OK", headers, FileInputStream(target))
    }

    private fun mimeFor(ext: String): String = when (ext.lowercase()) {
        "html", "htm" -> "text/html"
        "js", "mjs" -> "text/javascript"
        "css" -> "text/css"
        "json" -> "application/json"
        "svg" -> "image/svg+xml"
        "png" -> "image/png"
        "jpg", "jpeg" -> "image/jpeg"
        "gif" -> "image/gif"
        "webp" -> "image/webp"
        "avif" -> "image/avif"
        "woff" -> "font/woff"
        "woff2" -> "font/woff2"
        "ttf" -> "font/ttf"
        "mp4" -> "video/mp4"
        "webm" -> "video/webm"
        "mp3" -> "audio/mpeg"
        "wasm" -> "application/wasm"
        else -> "application/octet-stream"
    }
}

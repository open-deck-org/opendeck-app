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
 *   Shell:  https://localhost/...            (Capacitor)
 *   Decks:  https://decks.opendeck/<id>/... (intercepted below)
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

    override fun shouldInterceptRequest(
        view: android.webkit.WebView?,
        request: WebResourceRequest?
    ): WebResourceResponse? {
        val url = request?.url ?: return super.shouldInterceptRequest(view, request)

        // Accept both deck://<id>/<path> and https://decks.opendeck/<id>/<path>
        val isDeckScheme = url.scheme == "deck"
        val isDeckHost = url.scheme == "https" && url.host == "decks.opendeck"
        if (!isDeckScheme && !isDeckHost) {
            return super.shouldInterceptRequest(view, request)
        }

        val deckId = if (isDeckScheme) url.host.orEmpty() else url.pathSegments.firstOrNull().orEmpty()
        val segments = if (isDeckScheme) url.pathSegments else url.pathSegments.drop(1)
        var rel = segments.joinToString("/").ifEmpty { "index.html" }
        if (rel.endsWith("/")) rel += "index.html"

        val deckRoot = File(root, deckId).canonicalFile
        val target = File(deckRoot, rel).canonicalFile

        // Path-traversal guard.
        if (!target.path.startsWith(deckRoot.path) || !target.exists()) {
            return WebResourceResponse("text/plain", "utf-8", 404, "Not Found", emptyMap(), null)
        }

        val mime = mimeFor(target.extension)
        val headers = mapOf(
            "Access-Control-Allow-Origin" to "*",
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

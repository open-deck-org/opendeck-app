import Foundation
import WebKit

/// Serves `deck://<deckId>/<path>` from the unzipped deck tree under
/// Application Support/decks/<deckId>/...  (where store.js's Filesystem
/// backend writes packages on iOS / macOS Catalyst).
///
/// Because `deck://` is a different origin than Capacitor's `capacitor://`,
/// deck content loaded into the player iframe is sandboxed away from the shell
/// and the Capacitor bridge — even with `allow-same-origin` on the iframe.
///
/// Install: see DeckBridge.swift (registers this on the WKWebView config).
final class DeckSchemeHandler: NSObject, WKURLSchemeHandler {

    static let scheme = "deck"

    /// Directory.Data on iOS maps to Application Support.
    private let root: URL

    init(root: URL) {
        self.root = root.standardizedFileURL
    }

    convenience override init() {
        let base = try! FileManager.default.url(
            for: .applicationSupportDirectory, in: .userDomainMask,
            appropriateFor: nil, create: true)
        self.init(root: base.appendingPathComponent("decks", isDirectory: true))
    }

    func webView(_ webView: WKWebView, start task: WKURLSchemeTask) {
        guard let url = task.request.url, let deckId = url.host else {
            task.didFailWithError(URLError(.badURL)); return
        }

        var rel = url.path
        if rel.isEmpty || rel == "/" { rel = "/index.html" }

        let fileURL = root
            .appendingPathComponent(deckId, isDirectory: true)
            .appendingPathComponent(rel)
            .standardizedFileURL

        // Path-traversal guard: never serve outside the deck's own folder. Use a
        // trailing separator so deck "a" can't reach sibling "ab" via a prefix match.
        let deckRoot = root.appendingPathComponent(deckId, isDirectory: true).standardizedFileURL
        let prefix = deckRoot.path.hasSuffix("/") ? deckRoot.path : deckRoot.path + "/"
        guard fileURL.path == deckRoot.path || fileURL.path.hasPrefix(prefix) else {
            task.didFailWithError(URLError(.noPermissionsToReadFile)); return
        }

        guard let data = try? Data(contentsOf: fileURL) else {
            let resp = HTTPURLResponse(url: url, statusCode: 404, httpVersion: "HTTP/1.1", headerFields: nil)!
            task.didReceive(resp)
            task.didReceive(Data("Not found".utf8))
            task.didFinish()
            return
        }

        let headers = [
            "Content-Type": Self.mime(for: fileURL.pathExtension),
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
            // A deck can load its OWN resources ('self' == deck://<id>) but cannot
            // phone home or reach another deck's origin (no scheme-wide `deck:`).
            "Content-Security-Policy":
                "default-src 'self' data: blob:; img-src 'self' data: blob:; " +
                "media-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; " +
                "script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' data: blob:"
        ]
        let resp = HTTPURLResponse(url: url, statusCode: 200, httpVersion: "HTTP/1.1", headerFields: headers)!
        task.didReceive(resp)
        task.didReceive(data)
        task.didFinish()
    }

    func webView(_ webView: WKWebView, stop task: WKURLSchemeTask) {}

    private static func mime(for ext: String) -> String {
        switch ext.lowercased() {
        case "html", "htm": return "text/html; charset=utf-8"
        case "js", "mjs":   return "text/javascript; charset=utf-8"
        case "css":         return "text/css; charset=utf-8"
        case "json":        return "application/json; charset=utf-8"
        case "svg":         return "image/svg+xml"
        case "png":         return "image/png"
        case "jpg", "jpeg": return "image/jpeg"
        case "gif":         return "image/gif"
        case "webp":        return "image/webp"
        case "avif":        return "image/avif"
        case "woff":        return "font/woff"
        case "woff2":       return "font/woff2"
        case "ttf":         return "font/ttf"
        case "mp4":         return "video/mp4"
        case "webm":        return "video/webm"
        case "mp3":         return "audio/mpeg"
        case "wasm":        return "application/wasm"
        default:            return "application/octet-stream"
        }
    }
}

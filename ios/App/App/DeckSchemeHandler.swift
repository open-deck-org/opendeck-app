import Foundation
import WebKit

/// Serves `deck://<deckId>/<path>` from the unzipped deck tree under
/// Library/decks/<deckId>/...  — where the JS store's Capacitor Filesystem
/// backend (Directory.Library) writes imported packages on iOS & macOS.
///
/// `deck://` is a different origin than Capacitor's `capacitor://`, so a deck
/// loaded in the player iframe is isolated from the shell and the bridge.
final class DeckSchemeHandler: NSObject, WKURLSchemeHandler {

    static let scheme = "deck"

    private let root: URL

    /// Directory.Library on iOS == FileManager `.libraryDirectory`.
    static func decksRoot() -> URL {
        let base = FileManager.default.urls(for: .libraryDirectory, in: .userDomainMask).first!
        return base.appendingPathComponent("decks", isDirectory: true)
    }

    override init() {
        self.root = DeckSchemeHandler.decksRoot().standardizedFileURL
        super.init()
    }

    func webView(_ webView: WKWebView, start task: WKURLSchemeTask) {
        guard let url = task.request.url, let deckId = url.host else {
            task.didFailWithError(URLError(.badURL)); return
        }

        var rel = url.path
        if rel.isEmpty || rel == "/" { rel = "/index.html" }

        let deckRoot = root.appendingPathComponent(deckId, isDirectory: true).standardizedFileURL
        let fileURL = deckRoot.appendingPathComponent(rel).standardizedFileURL

        // Path-traversal guard: never serve outside the deck's own folder.
        guard fileURL.path.hasPrefix(deckRoot.path) else {
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
            // A deck may load its own bundled resources, but cannot phone home.
            "Content-Security-Policy":
                "default-src 'self' deck: data: blob:; img-src 'self' deck: data: blob:; " +
                "media-src 'self' deck: data: blob:; font-src 'self' deck: data:; " +
                "style-src 'self' 'unsafe-inline' deck:; " +
                "script-src 'self' 'unsafe-inline' 'unsafe-eval' deck:; connect-src 'self' deck: data: blob:"
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
        case "otf":         return "font/otf"
        case "mp4":         return "video/mp4"
        case "webm":        return "video/webm"
        case "mp3":         return "audio/mpeg"
        case "wav":         return "audio/wav"
        case "wasm":        return "application/wasm"
        default:            return "application/octet-stream"
        }
    }
}

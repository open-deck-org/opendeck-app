import UIKit
import Capacitor
import WebKit

/// Capacitor bridge view controller that registers the `deck://` scheme handler
/// on the webview configuration. Wired up by pointing Main.storyboard's view
/// controller at this class (customClass = DeckViewController, module = App).
class DeckViewController: CAPBridgeViewController {

    override func webViewConfiguration(for instanceConfiguration: InstanceConfiguration) -> WKWebViewConfiguration {
        // "Call super's implementation and modify the result" — per Capacitor docs.
        let config = super.webViewConfiguration(for: instanceConfiguration)
        config.setURLSchemeHandler(DeckSchemeHandler(), forURLScheme: DeckSchemeHandler.scheme)
        return config
    }
}

/// Forwards an inbound .deck/.zip file (Files, AirDrop, share sheet, email) into
/// the JS shell as a `opendeck:import` CustomEvent, which app.js listens for.
enum DeckImport {

    static func handle(url: URL) {
        let scoped = url.startAccessingSecurityScopedResource()
        defer { if scoped { url.stopAccessingSecurityScopedResource() } }

        guard let data = try? Data(contentsOf: url) else { return }
        let base64 = data.base64EncodedString()
        let filename = url.lastPathComponent
            .replacingOccurrences(of: "\\", with: "")
            .replacingOccurrences(of: "'", with: "")
        let id = Int(Date().timeIntervalSince1970 * 1000)

        // Expose the payload as a global and ask the shell to consume it. The
        // `id` dedupes the retried injections below (idempotent on the JS side).
        let js = """
        window.__OPENDECK_PENDING = { base64: '\(base64)', filename: '\(filename)', id: \(id) };
        if (window.__opendeckConsumePending) window.__opendeckConsumePending();
        """

        // On a cold launch-by-file the webview/page isn't ready yet; re-inject
        // for a few seconds until it lands (dedup by id makes repeats safe).
        attemptDispatch(js: js, retries: 24)
    }

    private static func attemptDispatch(js: String, retries: Int) {
        DispatchQueue.main.async {
            guard let webView = bridgeWebView() else {
                if retries > 0 { schedule(js, retries) }
                return
            }
            // Poll cheaply until the shell has loaded and defined the consumer,
            // THEN inject the (potentially multi-MB) payload exactly once.
            webView.evaluateJavaScript("typeof window.__opendeckConsumePending") { result, _ in
                if (result as? String) == "function" {
                    webView.evaluateJavaScript(js, completionHandler: nil)
                } else if retries > 0 {
                    schedule(js, retries)
                }
            }
        }
    }

    private static func schedule(_ js: String, _ retries: Int) {
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) {
            attemptDispatch(js: js, retries: retries - 1)
        }
    }

    private static func bridgeWebView() -> WKWebView? {
        for scene in UIApplication.shared.connectedScenes.compactMap({ $0 as? UIWindowScene }) {
            for window in scene.windows {
                if let vc = window.rootViewController as? CAPBridgeViewController {
                    return vc.webView
                }
            }
        }
        if let vc = (UIApplication.shared.delegate as? AppDelegate)?.window?.rootViewController as? CAPBridgeViewController {
            return vc.webView
        }
        return nil
    }
}

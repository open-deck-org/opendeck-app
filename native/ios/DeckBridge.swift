import Foundation
import Capacitor
import WebKit

/// Wires the deck:// scheme handler into Capacitor's WKWebView and forwards
/// inbound .deck/.zip files (Files, AirDrop, share sheet, email) into the JS
/// shell as a `opendeck:import` CustomEvent.
///
/// USAGE
/// 1. Add DeckSchemeHandler.swift + this file to the App target.
/// 2. Subclass the bridge view controller (Main.storyboard -> set the VC class
///    to `DeckViewController`), OR register the handler in your AppDelegate
///    before the web view loads (see registerDeckScheme()).
/// 3. Add the document types from Info.plist.snippet.xml.

final class DeckViewController: CAPBridgeViewController {

    /// Capacitor lets you customize the WKWebViewConfiguration here. Scheme
    /// handlers MUST be set before the web view is created.
    override func instanceDescriptor() -> InstanceDescriptor {
        let descriptor = super.instanceDescriptor()
        return descriptor
    }

    override func webView(with frame: CGRect, configuration: WKWebViewConfiguration) -> WKWebView {
        configuration.setURLSchemeHandler(DeckSchemeHandler(), forURLScheme: DeckSchemeHandler.scheme)
        return super.webView(with: frame, configuration: configuration)
    }
}

enum DeckImport {

    /// Called from AppDelegate/SceneDelegate when the OS opens a .deck/.zip.
    /// Reads the file and dispatches it to the JS shell as base64.
    static func handle(url: URL) {
        let needsStop = url.startAccessingSecurityScopedResource()
        defer { if needsStop { url.stopAccessingSecurityScopedResource() } }

        guard let data = try? Data(contentsOf: url) else { return }
        let base64 = data.base64EncodedString()
        let filename = url.lastPathComponent
            .replacingOccurrences(of: "\\", with: "")
            .replacingOccurrences(of: "'", with: "")

        let js = """
        window.dispatchEvent(new CustomEvent('opendeck:import', {
          detail: { base64: '\(base64)', filename: '\(filename)' }
        }));
        """

        DispatchQueue.main.async {
            bridgeWebView()?.evaluateJavaScript(js, completionHandler: nil)
        }
    }

    private static func bridgeWebView() -> WKWebView? {
        let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
        for scene in scenes {
            for window in scene.windows {
                if let vc = window.rootViewController as? CAPBridgeViewController {
                    return vc.webView
                }
            }
        }
        return nil
    }
}

/* In AppDelegate.swift add:

    func application(_ app: UIApplication, open url: URL,
                     options: [UIApplication.OpenURLOptionsKey : Any] = [:]) -> Bool {
        if url.isFileURL { DeckImport.handle(url: url); return true }
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

   For scene-based apps, also handle:
    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        URLContexts.forEach { DeckImport.handle(url: $0.url) }
    }
*/

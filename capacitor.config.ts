import type { CapacitorConfig } from '@capacitor/cli';

/**
 * OpenDeck — generic HTML presentation player.
 *
 * The shell UI (deck library / import / settings) is served from `www` over
 * Capacitor's own scheme (capacitor://localhost on iOS, https://localhost on
 * Android). Decks themselves are served from a SEPARATE origin so untrusted
 * deck JS can never reach the Capacitor bridge:
 *   - iOS / macOS (Catalyst): a custom `deck://` WKURLSchemeHandler
 *   - Android: a WebViewAssetLoader on a distinct host
 *   - Web / PWA dev: a service worker serving `/__deck__/<id>/...`
 * See docs/NATIVE-INTEGRATION.md for the paste-ready handler code.
 */
const config: CapacitorConfig = {
  appId: 'org.opendeck',
  appName: 'OpenDeck',
  webDir: 'www',
  server: {
    androidScheme: 'https',
    iosScheme: 'capacitor',
  },
  ios: {
    contentInset: 'never',
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;

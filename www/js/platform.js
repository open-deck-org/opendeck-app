// Thin platform detection. On device, Capacitor injects `window.Capacitor`
// and registers native plugins under `window.Capacitor.Plugins` — so we can
// use the bridge with NO bundler and no per-plugin JS imports.

export function isNative() {
  return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
}

// 'ios' | 'android' | 'web'
export function platformName() {
  if (window.Capacitor && window.Capacitor.getPlatform) return window.Capacitor.getPlatform();
  return 'web';
}

// Native plugin accessor, e.g. plugin('Filesystem'). Returns undefined on web.
export function plugin(name) {
  return window.Capacitor && window.Capacitor.Plugins ? window.Capacitor.Plugins[name] : undefined;
}

#!/usr/bin/env node
// apply-branding.example.mjs
//
// ILLUSTRATION ONLY — adapt to your real toolchain.
//
// Demonstrates the overlay step: start from generic committed defaults, then,
// if a private build.config.json and brand assets exist, lay them on top.
// A contributor without the overlay still gets a complete, generic build.
//
// Usage: node apply-branding.example.mjs

import { readFileSync, existsSync, copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

const root = process.cwd();
const EXAMPLE = join(root, "build", "build.config.example.json");
const PRIVATE = join(root, "build.config.json"); // private overlay, gitignored

function loadConfig() {
  // 1) committed generic defaults
  const base = JSON.parse(readFileSync(EXAMPLE, "utf8"));
  delete base["// note"];

  // 2) private overlay, if present
  if (existsSync(PRIVATE)) {
    const overlay = JSON.parse(readFileSync(PRIVATE, "utf8"));
    return deepMerge(base, overlay);
  }
  console.log("[branding] No private overlay found — building GENERIC player.");
  return base;
}

function deepMerge(a, b) {
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) {
    out[k] = v && typeof v === "object" && !Array.isArray(v)
      ? deepMerge(a[k] ?? {}, v)
      : v;
  }
  return out;
}

function copyAsset(src, dest) {
  if (!src || !existsSync(src)) return false;
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(src, dest);
  return true;
}

const cfg = loadConfig();
console.log(`[branding] productName = ${cfg.productName}`);
console.log(`[branding] appId       = ${cfg.appId}`);
console.log(`[branding] official    = ${cfg.store?.official === true}`);

// Overlay brand assets onto the build's resolved icon/logo slots.
// Replace these destinations with your toolchain's real asset paths.
const iconApplied = copyAsset(cfg.brand?.icon, join(root, "dist", "app-icon.png"));
const logoApplied = copyAsset(cfg.brand?.logo, join(root, "dist", "app-logo.svg"));
console.log(`[branding] icon ${iconApplied ? "applied" : "placeholder"}, logo ${logoApplied ? "applied" : "placeholder"}`);

// Refuse to mark a build "official" unless a publisher is actually configured —
// a small guard so a generic build can never accidentally claim to be official.
if (cfg.store?.official === true && !cfg.store?.publisher) {
  console.error("[branding] ERROR: store.official=true but no publisher set. Refusing.");
  process.exit(1);
}

console.log("[branding] done. Now hand off to your real build/sign step.");

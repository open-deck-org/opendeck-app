# Build: generic core vs. branded overlay

> **This is a pattern to adapt, not a drop-in.** It can't be wired blindly to a
> codebase I can't see. The files here (`build.config.example.*`,
> `apply-branding.example.mjs`) show the structure; you adapt them to your
> actual app. The goal: **the public repo compiles to a complete, vanilla,
> fully-working player on its own** — branding and signing are applied only from
> a *private* overlay you control.

## Why

Two things should be true at once:

1. Anyone can clone this repo and build a working OpenDeck-class player. Nothing
   essential is missing.
2. "The official OpenDeck in the store" is unambiguously the build *you* sign,
   because only you hold the name, icon, signing keys, and store credentials.

The way to get both is to keep all branded/secret inputs out of the repo and
inject them at build time from a private source.

## The split

**In this public repo (generic):**

- All source code and logic.
- A neutral default product name (e.g. `Deck Player`) and a placeholder icon.
- `build.config.example.*` — committed example config with safe defaults.
- The build scripts that read a config and produce the app.

**In a private overlay (never committed here):**

- `build.config.json` (real) — the OpenDeck name, bundle/app IDs, store metadata.
- Branded assets — the OpenDeck icon, logo, splash.
- Code-signing keys / certificates and store API credentials.

The private overlay can be: a separate private repo you check out alongside
this one, a CI secret store, or a local untracked directory. Whatever you pick,
**this repo must never contain the keys or the branded assets.**

## How a build resolves

```
1. Start from committed defaults (generic name, placeholder icon).
2. If a private build.config.json is present, overlay it (name, IDs, metadata).
3. If private assets are present, copy them over the placeholders.
4. Build.
5. (Official builds only) Sign with the private keys and submit to the store.
```

A contributor with no overlay runs steps 1 → 4 and gets a working, generically
branded player. You, with the overlay, get the official signed build.

## Guard rails to add

- Add the overlay paths to `.gitignore` (`build.config.json`, `assets/brand/`,
  `*.p12`, `*.mobileprovision`, `*.keystore`, etc.). A starter `.gitignore` is
  in this folder.
- In CI, inject the overlay from secrets — never print it to logs.
- Consider a pre-commit / CI check that fails if a known-secret filename or a
  high-entropy blob is staged.

## Files in this folder

- `build.config.example.json` — the shape of the config, with generic defaults.
- `apply-branding.example.mjs` — a minimal, engine-agnostic illustration of the
  overlay step (reads config, copies brand assets over placeholders). Replace
  the I/O with your real toolchain's hooks.
- `gitignore-snippet.txt` — paths to add to the repo `.gitignore`.

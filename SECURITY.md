# Security Policy

## Reporting a vulnerability

Please report security issues **privately** — do not open a public issue.

- Preferred: open a private advisory via GitHub Security Advisories on this repo
  (`Security` tab → `Report a vulnerability`).
- Or email: **security@open-deck.org**

Please include enough detail to reproduce (a sample `.deck`, steps, and the
affected build/platform). We'll acknowledge your report, keep you updated, and
credit you when a fix ships — unless you'd prefer to stay anonymous.

## Scope notes for a `.deck` player

Because a `.deck` package contains third-party HTML/JavaScript, the security
boundary is the player. Issues we especially want to hear about:

- Path traversal / "zip slip" during extraction.
- A deck escaping its sandbox to reach privileged player APIs, the file system,
  the network, or stored credentials.
- Decompression-bomb or resource-exhaustion vectors.

See the Security Considerations section of the `.deck` specification for the
behaviors a conforming player is expected to enforce.

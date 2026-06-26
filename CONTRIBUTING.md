# Contributing to OpenDeck

Thanks for your interest in OpenDeck. Contributions are welcome — bug reports,
fixes, features, docs, and independent players or producers for the `.deck`
format.

A few things up front so you know exactly what you're contributing to:

- **The code is Apache 2.0.** Your contributions are licensed under the same
  terms (Apache License 2.0). You keep the copyright to your work; you grant the
  project — and everyone who receives the code — the Apache 2.0 rights to it,
  including the patent grant.
- **No CLA.** We don't ask you to sign a copyright-assignment agreement or hand
  over rights to your work. Instead we use the lightweight **Developer
  Certificate of Origin** (see below). You keep ownership of what you write.
- **The app is free and will stay free.** There are no paid tiers and no in-app
  purchases. You're not contributing to a paid product. The official store
  builds are published by the OpenDeck project (see `TRADEMARKS.md`); the code
  advantage is zero — anyone can build the same app from this repo.

## Sign your commits (DCO)

Every commit must be signed off, certifying you have the right to submit it
under the project's license. This is the full text of the
[Developer Certificate of Origin](./DCO) — by signing off you agree to it.

Signing off is one flag on `git commit`:

```bash
git commit -s -m "Fix rail thumbnail scaling on portrait decks"
```

That appends a line to your commit message:

```
Signed-off-by: Your Name <your.email@example.com>
```

Use your real name and an email you can be reached at. If you forget, fix the
last commit with `git commit --amend -s`, or a range with
`git rebase --signoff`.

## Before you open a pull request

1. **Open an issue first for anything non-trivial.** A quick discussion saves
   everyone time, especially for features or behavior changes.
2. **Keep PRs focused.** One logical change per PR is far easier to review and
   land than a grab-bag.
3. **Match the existing style.** Follow the conventions already in the code;
   don't reformat unrelated lines.
4. **Test your change.** Describe how you verified it. If it touches deck
   rendering, say which browsers / platforms you checked.
5. **Update docs** when behavior changes.

## Working on the `.deck` format itself?

The format is governed in its own repository under CC0, not here. Code changes
to OpenDeck's producer/player live in this repo; changes to the *format
contract* (the manifest, the package layout, conformance) belong in the spec
repo so every implementation can track them. If a code change depends on a format
change, link the two.

## Building alternative players or producers

You don't need our permission. The format is open (CC0) and this code is Apache
2.0. If you ship a player to end users, just give it your own name and icon
(see `TRADEMARKS.md`) — and tell us, we'd love to link to it.

## Reporting security issues

Please **don't** open a public issue for security problems. See
`SECURITY.md` for private reporting (or, until that exists, contact the
maintainer directly).

## Code of conduct

By participating you agree to abide by our [Code of Conduct](./CODE_OF_CONDUCT.md).

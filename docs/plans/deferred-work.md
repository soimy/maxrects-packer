# Deferred work

Work that was found and deliberately **not** done yet, so the findings survive instead of living only
in review comments. Each item is a decision with its own PR — nothing here is a mechanical fix.

**This ledger lives at `docs/plans/deferred-work.md`, with the rest of the repository's plans.** Designs
and specifications go to `docs/spec/`, named `YYYY-MM-DD-<topic>.md`. Neither directory is part of the
published site (`srcExclude` in `docs/.vitepress/config.mts`), and both are tracked source that
`npm run docs:clean` must never touch — `npm run verify:docs` fails when it does.

## Code changes (found while closing the test-coverage gaps, PR #73)

One behaviour question the measurements raised while the dead code around it was removed. The
measurements came from the coverage report and from deleting the code in question and re-running the
suite.

- **`add()` tags a non-exclusive bin with only the first rect's tag** (`src/maxrects-packer.ts:78`).
  In non-exclusive mode one bin may hold several tag groups — `test/maxrects-packer.spec.js` pins a bin
  whose rects carry `one`, `one`, `two`, `two` — so that tag names just one of them, and `save()`
  serializes it while `load()` restores it. `addArray()` leaves the bins it opens untagged
  (`src/maxrects-packer.ts:203`, where the dead `bin.tag = tag` line used to sit), and the choice made
  when that line was deleted was to keep that difference rather than spread the label. Decide whether
  `bin.tag` should exist outside `exclusiveTag: true` at all: tagging in both paths is a user-visible
  metadata change, tagging in neither drops a field from `save()` output. Neither direction changes a
  packing decision — a bin copies its `options` at construction, so a bin created in non-exclusive
  mode never gates on its own tag, even if `packer.options.exclusiveTag` is flipped later.

## Clone re-decides rotation

Found while auditing the JSDoc against the code; a behaviour decision of its own, so it is not fixed
on the spot.

- **`MaxRectsBin.clone()` re-packs the copies, and a rotated rect arrives with its footprint already
  swapped** (`src/maxrects-bin.ts:132`, `:196`). The replay therefore scores a different rect than the
  source did. Measured on the bundle with `allowRotation: true`:

  | Case | Source | `clone()` |
  | --- | --- | --- |
  | 18×18 packer, border 2, 10×11 + 3×1 + 13×13 + 11×2 | 17×15, `1×3 @12,2` and `2×11 @13,2` rotated | 15×18, all three unrotated, different placements |
  | 16×19 holding `11×15 @2,2` and `1×15 @13,2` rotated, untouched since | 16×19 | **throws** "the bin holds a rect it can no longer place" |

  The rotated fixture and the 80-bin sweep in `test/clone.spec.js` reach neither case; a seeded sweep
  over tight bins with rotation on hits them in roughly 2% of trials.

  Fix direction, measured through the public API rather than guessed: restore each copy to the
  orientation its source was handed over in before replaying it — set `rot` to false, and swap
  `width`/`height` yourself when that did not do it, because `Rectangle.rot`'s setter swaps for a
  `Rectangle` and does nothing for the plain `{width, height}` objects the README advertises. With that
  normalization both reproducers above reproduce their source exactly, and the existing sweep still
  passes. That makes the change about five lines plus the seeded sweep, in its own PR: it changes what
  `clone()` returns for every bin holding rotated rects.

## `load()` can drop the placeholder it appends

Found while documenting what `load()` does with a saved bin the current packer could not hold; the
guide now states the append, and this is the part of it that looks like a bug rather than a design.

- **A saved bin whose `maxWidth`/`maxHeight` exceeds the packer's is appended as an
  `OversizedElementBin`, and a later entry can overwrite it** (`src/maxrects-packer.ts:272`). The
  oversized branch calls `this.bins.push(...)` and ignores the `index` the callback already has, while
  the normal branch assigns `this.bins[index] = newBin`. Measured on the sources: a 1024×1024 packer
  holding one bin that loads `[saved 2048-wide bin, saved 512-wide bin]` ends with two `MaxRectsBin`s
  and **no placeholder** — the second entry wrote over index 1, where the first had just been appended
  — while a fresh packer loading the same array keeps both, because the append landed at index 0 and
  the second entry at index 1. The placeholder is also built as
  `new OversizedElementBin(bin.width, bin.height, {})`, so it carries none of the saved bin's
  `options` or `tag`: the round trip does not preserve the gate for that bin either.
  Decide between giving the oversized entry its own index — the callback already receives it — and
  pushing it past the packer's existing bins, and whether the placeholder should inherit the saved
  `options`/`tag`. A `save()`/`load()` round trip that silently loses a bin is why this is recorded
  rather than left to the guide's prose.

## Test infrastructure

- **`test/efficiency.spec.js > combined best of` sits close to vitest's 5s default timeout.** It
  measures the whole candidate table, so its runtime follows the table rather than a fixed amount of
  work. Measured on GitHub's runners: 3328ms on a green Node 22 run, 6055ms in the run where Node 20
  and 24 failed together with `Test timed out in 5000ms` while 22 passed on the same commit — load,
  not a regression, and re-running the jobs turned all three green. Nothing sets `testTimeout` in
  `vitest.config.js`, so the default is what both the 3.3s and the 6.1s run were judged against. Fix:
  give that one test an explicit timeout (it is a measurement, not a unit test) or raise the global
  default; its own PR, since it changes what a gate tolerates.
- **Three return-value promises are documented but unasserted.** `add()` "returns that same object",
  `addArray()` "returns nothing", and the `add(width, height, data)` overload returns an internal
  `Rectangle` rather than anything the caller passed — no spec asserts any of the three. Searched the
  suite: the only `toBe(<a rect>)` calls are six `not.toBe(rect)` isolation checks in
  `test/clone.spec.js`, and every test that captures an `add(...)` result passes an inline literal, so
  it can only prove the return is defined. The in-place half *is* pinned — the caller's own object is
  checked (`expect(rect.oversized).toBe(true)`) — which is why a regression that quietly returned a
  copy would keep every gate green. Three assertions across `test/maxrects-packer.spec.js` and
  `test/maxrects-bin.spec.js` close it; its own PR, since it changes what the suite promises.

## Custom heading anchors read out with their braces

Found while scanning the built pages for unrendered markdown; cosmetic, and accepted for now rather
than churned.

- **`{#custom-id}` on a heading shows up in the permalink's `aria-label`.** VitePress 1.6.4 strips the
  attribute from the heading text and the visible id is clean — measured on
  `dist/contributor/behavior-contracts.html`: all nine section headings render without braces, while
  eight of them carry `Permalink to "… {#the-id}"` in the anchor's `aria-label`, so a screen reader
  reads the braces out. Nine headings in that file use the syntax and exactly one of them
  (`#clone-isolates-the-two-bins`) is linked from another page; the rest make the anchors of the
  *numbered* sections clean (`#tag-grouping`) instead of the slug VitePress would derive
  (`_2-tag-grouping`).
- Options, for whoever picks this up: drop the eight unreferenced attributes and accept the `_N-` slugs
  (nothing links to them today), or keep the ids and treat the label as an upstream quirk worth
  reporting. This ledger does not choose.

## Documentation structure

**Done** — the layout this section used to plan is superseded by
[issue #81](https://github.com/soimy/maxrects-packer/issues/81) and its integration spike
(`docs/spec/2026-09-30-docs-migration-spike.md`). The site is VitePress with TypeDoc generating the API
markdown, so the tree is tracked source and the build products are the ignored part:

| Path | Holds | Git |
| --- | --- | --- |
| `docs/*.md`, `docs/user/`, `docs/contributor/`, `docs/releases/` | Handwritten site pages | tracked |
| `docs/spec/`, `docs/plans/` | Designs, specifications and this ledger | tracked, excluded from the site |
| `docs/.vitepress/` | Site configuration | tracked, except `cache/` and `dist/` |
| `docs/api/` | API markdown generated from JSDoc by `npm run docs:api` | ignored, never edited by hand |
| `docs/.vitepress/dist/` | Built site | ignored |

`npm run docs:clean` deletes exactly `docs/api/`, `docs/.vitepress/cache/` and
`docs/.vitepress/dist/`; `npm run verify:docs` asserts both that boundary and the ignore rules, and
runs in CI. The `doc*` script names remain as aliases so existing habits keep working.

Done with the content migration: the README is an entry point again, its detail moved into
`docs/user/`, `CONTRIBUTING.md` points at `docs/contributor/` for development, testing, architecture,
behaviour contracts, compatibility and releasing, and `AGENTS.md` carries the documentation map and the
routing rules.

The documentation workflow (`.github/workflows/docs.yml`) builds on pull requests, uploads the site as
an artifact and deploys it from `master`, and the build writes the legacy-URL redirects for the pages
the old TypeDoc site published. The repository's Pages source was switched to **GitHub Actions** and
the first deployment went live on 2026-10-01; root, the API pages and all 11 legacy redirect URLs were
checked on the published site after it.

The old theme is retired: `typedoc-unhoax-theme`, `assets/custom.css` and `assets/custom.js` are gone
from `devDependencies`, the repository and the `files` allowlist, which takes the published tarball from
30 files to 28 (`assets/favicon.ico` stays).

Done with that switch: `gh-pages` and the `doc:publish` alias that used it are gone from
`package.json` and `devDependencies`, and the `gh-pages` branch is deleted — with the Pages source on
GitHub Actions it was the old publishing path rather than a fallback. `cz-conventional-changelog`
is unrelated stale tooling (interactive commitizen commits only). The published tarball is otherwise
unaffected: `docs/` is not in the `files` allowlist.

## Workflow and packaging follow-ups

Noticed while auditing the stack before its first deployment. None of these is broken today — every run
on the three pull requests is green — so each waits for a commit of its own.

- **The workflows pin action majors that are several releases behind.** `.github/workflows/docs.yml` uses
  `actions/checkout@v4`, `actions/setup-node@v4`, `actions/configure-pages@v5`,
  `actions/upload-pages-artifact@v3` and `actions/deploy-pages@v4`; the current majors read through the
  API on 2026-09-30 are v7, v7, v6, v5 and v5. `node.js.yml` and `release.yml` sit on
  `checkout@v4`/`setup-node@v4` too, and the repository has no Dependabot or Renovate configuration, so
  nothing raises these on its own — one `ci:` PR should move all three files together rather than leaving
  the new workflow on majors the others do not use. Worth doing before the first deployment, because
  `actions/deploy-pages` is the one step that has never run here (the job is gated on a push to `master`)
  and its inputs have to be re-checked against the current `action.yml` — the versions in use were
  verified against `upload-pages-artifact@v3` and `configure-pages@v5`.
- **The README's only local image is `assets/favicon32.png`, 2911 bytes, and it is not in the `files`
  allowlist.** `AGENTS.md` frames the fix as adding the whole `assets` directory for ~468 kB, but
  `assets/preview.png` alone is 444695 of those bytes, so a single allowlist entry would do it for
  +2.9 kB — if the npm page resolves a relative image out of the tarball at all. That could not be
  checked from here (npmjs.com answers 403 to a plain request) and npm's renderer may resolve against the
  repository instead, in which case there is nothing to fix. The file is also served by neither site:
  the old index only used it as an `<img>` in the README's heading, and that URL already 404s on the
  published TypeDoc site.
- **A CommonJS TypeScript consumer cannot import the package under `node16`/`nodenext`.** Measured on the
  published tarball, in a `.cts` file compiled with `module`/`moduleResolution` `node16`:
  `import { MaxRectsPacker } from "maxrects-packer"` is TS1479 ("the referenced file is an ECMAScript
  module and cannot be imported with `require`") and `import pkg = require("maxrects-packer")` is TS1471,
  while `await import(...)`, `moduleResolution` `node10`/`bundler` and a JavaScript `require()` all work;
  neither `skipLibCheck` nor the compiler version changes anything (TS 6 and TS 7 both). No gate can see
  it: `verify:package` compiles its type fixture in an ESM consumer, which is exactly what makes
  `node16`/`nodenext` read it as ESM, and the runtime `require()` path it does cover is fine. The fix is
  an `exports` map with per-format conditions and declarations — which also seals off the deep imports
  `maxrects-packer/dist/...` that the entry-points section above keeps working, so it belongs to 3.0.0.
  Documented as a sharp edge in `docs/user/troubleshooting.md` meanwhile.

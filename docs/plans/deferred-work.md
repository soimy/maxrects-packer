# Deferred work

Work that was found and deliberately **not** done yet, so the findings survive instead of living only
in review comments. Each item is a decision with its own PR — nothing here is a mechanical fix.

**This ledger lives at `docs/plans/deferred-work.md`, with the rest of the repository's plans.** Designs
and specifications go to `docs/spec/`, named `YYYY-MM-DD-<topic>.md`. Neither directory is part of the
published site (`srcExclude` in `docs/.vitepress/config.mts`), and both are tracked source that
`npm run docs:clean` must never touch — `npm run verify:docs` fails when it does.

## `place()` recurses without bound when `padding` is not a number

**Verified resolved on 2026-10-13** — both constructors throw for numeric `NaN`, `Infinity` and
`-Infinity` padding, while other JavaScript values keep their original coercion behaviour. Omitted or
`undefined` padding still defaults to `0`. `updateBinSize()` reports failure before changing dimensions
or free space when its result is non-finite, instead of "growing" the bin to `NaN`, which is the state
`place()` retried forever. The misplaced `{ padding: 1 }` object still constructs successfully, but
placement now returns immediately: oversized through the packer, `undefined` from a bin. After correcting
padding, resetting the bin rebuilds its initial free space and makes it usable again. A `NaN` rect is also
refused without changing free space or dimensions, and the bin can accept the next valid rect.

Compared with the pre-PR implementation, `null`, booleans, `[]` and objects with numeric `valueOf()`
still pack the measured 100×100 rect into a 128×128 bin; `"2"` and `[2]` still refuse that input, because
the probe concatenates instead of adding. No up-front number conversion or options-object detection is
introduced. An unconditional "dimensions did not change" guard in `updateBinSize()` would break valid
placements: with padding 2 and `pot: false`, adding 100×100, 150×50 and 150×48 places the last rect in
the existing 252×100 bin even though its padded node extends past the reported width. The existing
finite-result guard is retained. The measurements below are kept as the record of what the fix is
measured against. Tracked in
[issue #43](https://github.com/soimy/maxrects-packer/issues/43).

Found while triaging the untracked issues on 2026-10-11: [issue #43](https://github.com/soimy/maxrects-packer/issues/43)
had been open since 2022 with no reproduction, and it is still live on `master`.

- **A non-numeric `padding` makes `place()` re-enter itself forever** (`src/maxrects-bin.ts:225`, `:246`).
  The report passes the options object into the padding slot —
  `new MaxRectsPacker(512, 512, { padding: 1 })`, where the signature is `(width, height, padding,
  options)` — and a plain `NaN` does the same. Every size in the bin arithmetic is then `NaN`, so
  `updateBinSize()`'s bounds check `!(tmpWidth > this.maxWidth || tmpHeight > this.maxHeight)` reads as
  "fits" (`src/maxrects-bin.ts:403`, `:427`), the bin "grows" and the method reports success, and
  `place()` recurses to try the same placement again. Measured on the bundle built from `45cb7ce`:
  numeric padding places a 512×512 rect into a 512×512 packer, while `{padding: 1}` and `NaN` never
  return — at recursion depth 300 the bin is `NaN×NaN` holding 599 free rects (two are added per
  round) and every round runs the O(n²) `pruneFreeList()`, so the process hangs and dies with
  `RangeError: Maximum call stack size exceeded` after 113 s rather than failing fast. Nothing
  validates the constructor's numbers (`src/maxrects-packer.ts:57`), and the growth retry has no
  bound. Decide between rejecting a non-finite `padding` at construction, bounding the retry in
  `place()`, or both: the first is the clearer error but is a new throw for JavaScript callers, the
  second is the general guard against any other `NaN` source. TypeScript callers already get a compile
  error for the call above; JavaScript callers get the hang. Tracked in
  [issue #43](https://github.com/soimy/maxrects-packer/issues/43).

## Code changes (found while closing the test-coverage gaps, PR #73)

One behaviour question the measurements raised while the dead code around it was removed. The
measurements came from the coverage report and from deleting the code in question and re-running the
suite.

- **`add()` tags a non-exclusive bin with only the first rect's tag** (`src/maxrects-packer.ts`).
  **Implemented in [PR #124](https://github.com/soimy/maxrects-packer/pull/124), pending merge (2026-10-13):** neither `add()` overload nor `addArray()`
  assigns automatic bin labels in non-exclusive mode. Rect tags and grouping are unchanged; explicit
  or loaded labels remain metadata and round-trip through persistence. New `save()` output omits the
  formerly automatic first-tag label, a breaking metadata change targeted at 3.0.0. Regression tests
  cover both overloads, both rect tag locations, `addArray()`, persistence and the default exclusive gate.
  Historically, a mixed bin could carry the first rect's tag through `save()`/`load()`, whereas bins
  opened by `addArray()` were unlabelled. No packing decision depended on that label: each bin copies
  its options at construction and a non-exclusive bin never gates on its tag. Tracked in
  [issue #93](https://github.com/soimy/maxrects-packer/issues/93).

## Clone re-decides rotation

**Verified resolved on 2026-10-11** — `clone()` reproduces its source for rotated rects. The bin records
which placements turned their rect, and `clone()` undoes those turns before replaying, so the replay is
handed the orientation the caller gave — which the stored state alone cannot say, because a rect this bin
turned and one handed over already rotated look alike. The record is per placement and lives on the bin: a
rect the caller sealed rejects a new property, and such a rect packed fine before the record existed. The
reproducers below and seeded sweeps over tight bins of plain and already-rotated rects are pinned in
`test/clone.spec.js`. The replay runs under the bin's current `options`, so a rect the caller edits after
placement, or `options` changed after it, are outside the guarantee: the first can land elsewhere or be
refused, the second falls back to the stored orientation. Tracked in
[issue #117](https://github.com/soimy/maxrects-packer/issues/117). Kept for the record.

Found while auditing the JSDoc against the code; a behaviour decision of its own, so it was not fixed
on the spot.

- **`MaxRectsBin.clone()` re-packed the copies, and a rotated rect arrived with its footprint already
  swapped** (`src/maxrects-bin.ts:132`, `:196`). The replay therefore scored a different rect than the
  source did. Measured on the bundle with `allowRotation: true`:

  | Case | Source | `clone()` |
  | --- | --- | --- |
  | 18×18 packer, border 2, 10×11 + 3×1 + 13×13 + 11×2 | 17×15, `1×3 @12,2` and `2×11 @13,2` rotated | 15×18, all three unrotated, different placements |
  | 16×19 holding `11×15 @2,2` and `1×15 @13,2` rotated, untouched since | 16×19 | **throws** "the bin holds a rect it can no longer place" |

  The rotated fixture and the 80-bin sweep in `test/clone.spec.js` reached neither case; a seeded sweep
  over tight bins with rotation on hits them in roughly 2% of trials.

  What landed: the bin records, per placement, whether it turned its rect, because the state alone cannot
  say (a rect this bin turned and one the caller handed over already rotated are both `rot` true with the
  dimensions swapped). `clone()` undoes those turns before replaying, so the replay is handed the
  orientation the caller gave. The record lives on the bin rather than on the rect — writing a field onto
  the caller's rect is what a sealed rect rejects, and it packed fine before the record existed. Measured on the bundle over seeded tight bins: the
  documented input went from 55 mismatches and 20 throws in 1302 rotated bins to 0 and 0, the
  already-rotated inputs from 43/19 in 1670 and 30/16 in 1432 to 0/0, and the mixed input from 29/30 in
  1475 to 0/0. Restoring the orientation unconditionally instead — without the mark — trades the documented
  input for the already-rotated one (30 mismatches became 367 in 1432 bins). A `WeakMap` keyed by rect
  would have been the alternative to the mark, and is out of reach: the bundles promise ES5, and
  `scripts/verify-es5.mjs` fails the build on it.

## `rects` is a public array with the bin's bookkeeping beside it

Noticed while reviewing #121. Sound for the library's own paths — `add()`, `repack()` and `reset(true)` all
maintain the record — so this records the exposure rather than a bug.

- **`MaxRectsBin.rects` is a public mutable array, and `turnedByPlacement` is positional beside it**
  (`src/maxrects-bin.ts`). Each record names the rect it was made for, so a consumer that splices, sorts or
  assigns into `rects` leaves records that no longer line up, and those are ignored: the affected rect is
  replayed in the orientation it is stored in, which is what `clone()` did before the record existed. What
  the record cannot do is make a reshaped bin reproduce: the copy comes from the replay, not from the array,
  so a consumer who restructures `rects` and then clones gets the placements the stored rects pack into, not
  the reshaped list. Saying so in the types (`readonly T[]`) is breaking for anyone who pushes to the array,
  so it belongs to 3.0.0 if it is wanted at all.

## `load()` can drop the placeholder it appends

**Verified resolved on 2026-10-10** — the placeholder now lands at its own index and carries the saved
`options`, `tag` and `maxWidth`/`maxHeight` over, so a `save()`/`load()` round trip no longer loses
that bin; tracked in [issue #89](https://github.com/soimy/maxrects-packer/issues/89). Kept for the
record.

Found while documenting what `load()` does with a saved bin the current packer could not hold; the
guide then stated the append, and this is the part of it that looked like a bug rather than a design.

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

## `clone()` on an oversized placeholder drops the restored state

Found while reviewing PR #114; a decision of its own, so it is recorded rather than fixed on the
spot.

- **`OversizedElementBin.clone()` does not carry the state `load()` restores.** Measured on the merged
   branch: a placeholder holding two saved free rects, `maxWidth`/`maxHeight` 2048×512, the saved
   `options` clones to another placeholder at its own 128×128 size with
   `{smart: false, pot: false, square: false}`, no free rects, and the same `tag`. The copy is
   re-derived from `this.rects[0]`, so the free space PR #114 restores is the first thing it drops.
   The only internal caller is the non-exclusive tag probe (`src/maxrects-packer.ts:170`), where a
   placeholder fails the probe either way, so nothing depends on the difference today. Invariant 8
   says state travels and behaviour does not; here most of the state does not travel either, and
   `clone()` is public API, so a caller can reach the difference directly. Tracked in
   [issue #118](https://github.com/soimy/maxrects-packer/issues/118).

## Test infrastructure

- **Three return-value promises are documented but unasserted.** `add()` "returns that same object",
  `addArray()` "returns nothing", and the `add(width, height, data)` overload returns an internal
  `Rectangle` rather than anything the caller passed — no spec asserts any of the three. Searched the
  suite: the only `toBe(<a rect>)` calls are six `not.toBe(rect)` isolation checks in
  `test/clone.spec.js`, and every test that captures an `add(...)` result passes an inline literal, so
  it can only prove the return is defined. The in-place half *is* pinned — the caller's own object is
  checked (`expect(rect.oversized).toBe(true)`) — which is why a regression that quietly returned a
  copy would keep every gate green. Three assertions across `test/maxrects-packer.spec.js` and
  `test/maxrects-bin.spec.js` close it; its own PR, since it changes what the suite promises. Tracked in
   [issue #97](https://github.com/soimy/maxrects-packer/issues/97).

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
  reporting. This ledger does not choose. Tracked in
   [issue #101](https://github.com/soimy/maxrects-packer/issues/101).

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
  verified against `upload-pages-artifact@v3` and `configure-pages@v5`. Tracked in
 [issue #119](https://github.com/soimy/maxrects-packer/issues/119).
- **Verified resolved on 2026-10-10** — npm does not resolve a relative README image against the
  package, so the icon stayed broken on the page even though the file is in the repository; the
  README heading now uses an absolute URL, which renders on both sites. `assets/*.png` stays out of
  the `files` allowlist: publishing it would have grown the tarball from ~66 kB to ~530 kB, and the
  renderer does not look inside the package for a relative path anyway. Tracked in
   [issue #102](https://github.com/soimy/maxrects-packer/issues/102).
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
  Documented as a sharp edge in `docs/user/troubleshooting.md` meanwhile. Tracked in
   [issue #98](https://github.com/soimy/maxrects-packer/issues/98).

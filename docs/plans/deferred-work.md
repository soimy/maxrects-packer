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
  swapped** (`src/maxrects-bin.ts:130`, `:194`). The replay therefore scores a different rect than the
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

## Test infrastructure

- **`test/efficiency.spec.js > combined best of` sits close to vitest's 5s default timeout.** It
  measures the whole candidate table, so its runtime follows the table rather than a fixed amount of
  work. Measured on GitHub's runners: 3328ms on a green Node 22 run, 6055ms in the run where Node 20
  and 24 failed together with `Test timed out in 5000ms` while 22 passed on the same commit — load,
  not a regression, and re-running the jobs turned all three green. Nothing sets `testTimeout` in
  `vitest.config.js`, so the default is what both the 3.3s and the 6.1s run were judged against. Fix:
  give that one test an explicit timeout (it is a measurement, not a unit test) or raise the global
  default; its own PR, since it changes what a gate tolerates.

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

Still open: the documentation CI job (artifact upload and deployment) with the legacy-URL redirects
inventoried in the spike report, and retiring the old theme, `gh-pages` and the theme assets from
`devDependencies` and the `files` allowlist. The published tarball is unaffected: `docs/` is not in the
`files` allowlist.

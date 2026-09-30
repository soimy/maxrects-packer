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

Still open from the migration: the content move (README and CONTRIBUTING) and the AGENTS routing rules,
the documentation CI job and the legacy-URL redirects, and retiring the old theme, `gh-pages` and the
theme assets from `devDependencies` and the `files` allowlist. The published tarball is unaffected:
`docs/` is not in the `files` allowlist.
